const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const journal = require('./journal.js');

const args = process.argv.slice(2);
const task = args.find(a => a.startsWith('--task='))?.split('=')[1] || 'scan';
const year = args.find(a => a.startsWith('--year='))?.split('=')[1] || '2026';

const dataRoot = path.resolve(__dirname, '../data');
const dayDir = path.join(dataRoot, 'day', year);
const voucherDir = path.join(dataRoot, 'voucher', 'staging', year);

function loadAER(filename) {
    const filePath = path.join(voucherDir, filename);
    if (!fs.existsSync(filePath)) return null;
    return yaml.load(fs.readFileSync(filePath, 'utf8'));
}

function saveAER(filename, aer) {
    const filePath = path.join(voucherDir, filename);
    fs.writeFileSync(filePath, yaml.dump(aer, { lineWidth: -1 }));
}

function loadDayFile(dateStr) {
    const filePath = path.join(dayDir, `d.${dateStr}.yaml`);
    if (!fs.existsSync(filePath)) return null;
    return yaml.load(fs.readFileSync(filePath, 'utf8'));
}

function saveDayFile(dateStr, dayobj) {
    const filePath = path.join(dayDir, `d.${dateStr}.yaml`);
    fs.writeFileSync(filePath, yaml.dump(dayobj, { lineWidth: -1 }));
}

function compactToStandard(dateStr) {
    return dateStr.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
}

// 判断 AER 文件是否需要处理：sourceDate 字段存在且为空字符串，且日期 >= Q2（2026-04-01）
function isAERToFix(aer) {
    if (!aer || aer.sourceDate !== '') return false;
    // 从 comment.artifact 中提取日期，或从 date 字段提取
    const dateStr = aer.date || '';
    if (dateStr >= '2026-04-01') return true;
    if (/^\d{8}$/.test(dateStr) && dateStr >= '20260401') return true;
    return false;
}

// 判断日期是否在 Q2+ 范围内
function isQ2OrLater(dateStr) {
    if (/^\d{8}$/.test(dateStr)) return dateStr >= '20260401';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr >= '2026-04-01';
    return false;
}

// ========== scan 模式 ==========
if (task === 'scan') {
    console.log(`\n=== fix.js 扫描报告 (${year}) ===\n`);
    
    const aerFiles = fs.readdirSync(voucherDir)
        .filter(f => f.startsWith('AER.') && f.endsWith('.yaml'));
    
    const aerList = [];
    for (const f of aerFiles) {
        const aer = loadAER(f);
        if (aer) {
            aerList.push({ filename: f, data: aer });
        }
    }
    
    // 只处理 sourceDate === '' 的 AER
    let sourceDateEmpty = 0;
    let sourceDateFixed = 0;
    let sourceDateMissing = 0;
    let dateCompact = 0;
    let dateStandard = 0;
    
    for (const { filename, data: aer } of aerList) {
        if (aer.sourceDate === '') {
            sourceDateEmpty++;
        } else if (aer.sourceDate && aer.sourceDate.trim() !== '') {
            sourceDateFixed++;
        } else {
            sourceDateMissing++;
        }
        
        if (/^\d{8}$/.test(aer.date)) {
            dateCompact++;
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(aer.date)) {
            dateStandard++;
        }
    }
    
    console.log(`一、AER 凭证概况`);
    console.log(`  总数: ${aerList.length} 个`);
    console.log(`  sourceDate 已正确: ${sourceDateFixed} 个`);
    console.log(`  sourceDate 为空字符串（待补录）: ${sourceDateEmpty} 个`);
    console.log(`  sourceDate 字段不存在: ${sourceDateMissing} 个（不处理）`);
    console.log(`  date 字段为紧凑格式（待转换）: ${dateCompact} 个`);
    console.log(`  date 字段为标准格式: ${dateStandard} 个`);
    
    // 重复 AER 检测（只在 sourceDate==='' 的文件中检测）
    const fixableAERs = aerList.filter(({ data: aer }) => isAERToFix(aer));
    
    const aerByArtifact = {};
    for (const { filename, data: aer } of fixableAERs) {
        const comment = aer.comment && aer.comment[0];
        if (comment && comment.artifact) {
            const key = `${aer.date}|${comment.artifact}`;
            if (!aerByArtifact[key]) {
                aerByArtifact[key] = [];
            }
            aerByArtifact[key].push(filename);
        }
    }
    
    const duplicates = Object.entries(aerByArtifact)
        .filter(([_, files]) => files.length > 1);
    
    console.log(`\n二、重复 AER 检测（仅 sourceDate 为空的文件）`);
    console.log(`  检测条件: 同 date + 同 artifact`);
    console.log(`  发现 ${duplicates.length} 组重复`);
    
    let totalToDelete = 0;
    for (const [key, files] of duplicates) {
        const sorted = files.sort((a, b) => {
            const numA = parseInt(a.replace('AER.', '').replace('.yaml', ''));
            const numB = parseInt(b.replace('AER.', '').replace('.yaml', ''));
            return numA - numB;
        });
        const keep = sorted[0];
        const del = sorted.slice(1);
        totalToDelete += del.length;
        console.log(`\n  组: ${key}`);
        console.log(`    保留: ${keep}（编号最小）`);
        console.log(`    删除: ${del.join(', ')}`);
    }
    
    // 建立索引：artifact 路径 → AER 编号（只用 sourceDate 为空的文件）
    const aerIndex = new Map();
    for (const { filename, data: aer } of fixableAERs) {
        const comment = aer.comment && aer.comment[0];
        if (comment && comment.artifact) {
            const aerNumber = filename.replace('.yaml', '');
            aerIndex.set(comment.artifact, aerNumber);
        }
    }
    
    console.log(`\n三、AER 索引`);
    console.log(`  已建立索引: ${aerIndex.size} 条（artifact → AER 编号）`);
    
    // 扫描 day 文件（只处理 Q2+）
    const dayFiles = fs.readdirSync(dayDir)
        .filter(f => f.startsWith('d.') && f.endsWith('.yaml'));
    
    let totalSlices = 0;
    let slicesWithAer = 0;
    let slicesWithoutAer = 0;
    let slicesMatchIndex = 0;
    let slicesNoMatch = 0;
    let slicesAmountZero = 0;
    let slicesNeedGenerate = 0;
    
    const missingSlices = [];
    
    for (const f of dayFiles) {
        const dateStr = f.replace('d.', '').replace('.yaml', '');
        if (!isQ2OrLater(dateStr)) continue;  // 只处理 Q2+
        
        const dayobj = loadDayFile(dateStr);
        if (!dayobj || !dayobj.time) continue;
        
        for (let i = 0; i < dayobj.time.length; i++) {
            const ts = dayobj.time[i];
            if (ts.type !== 'work' && ts.type !== 'check') continue;
            totalSlices++;
            
            if (ts.aer && ts.aer.trim() !== '') {
                slicesWithAer++;
            } else {
                slicesWithoutAer++;
                
                if (ts.amount == 0) {
                    slicesAmountZero++;
                    missingSlices.push({ date: dateStr, ts, reason: 'amount=0, 标记 null' });
                } else {
                    if (ts.output && aerIndex.has(ts.output)) {
                        slicesMatchIndex++;
                        missingSlices.push({ date: dateStr, ts, reason: `匹配已有 ${aerIndex.get(ts.output)}`, aer: aerIndex.get(ts.output) });
                    } else {
                        slicesNoMatch++;
                        slicesNeedGenerate++;
                        missingSlices.push({ date: dateStr, ts, reason: '需生成新 AER', amount: ts.amount });
                    }
                }
            }
        }
    }
    
    console.log(`\n四、Day 文件 aer 字段`);
    console.log(`  扫描: ${dayFiles.length} 个 day 文件`);
    console.log(`  work/check 时间片总数: ${totalSlices} 个`);
    console.log(`  已有 aer 字段: ${slicesWithAer} 个`);
    console.log(`  缺失 aer 字段: ${slicesWithoutAer} 个`);
    console.log(`    ├── 可从索引匹配: ${slicesMatchIndex} 个`);
    console.log(`    ├── amount=0（标记 null）: ${slicesAmountZero} 个`);
    console.log(`    └── 需生成新 AER: ${slicesNoMatch} 个`);
    
    // 列出缺失详情
    if (missingSlices.length > 0) {
        console.log(`\n五、缺失详情`);
        for (const m of missingSlices) {
            const tsDesc = `[${m.ts.type}] ${m.ts.task || ''} ${m.ts.todo || ''}`.trim();
            if (m.aer) {
                console.log(`  ${m.date} ${tsDesc} → ${m.reason}`);
            } else if (m.ts.amount == 0) {
                console.log(`  ${m.date} ${tsDesc} → ${m.reason}`);
            } else {
                console.log(`  ${m.date} ${tsDesc} amount=${m.ts.amount} → ${m.reason}`);
            }
        }
    }
    
    // AER 编号连续性
    const aerNumbers = aerFiles
        .map(f => parseInt(f.replace('AER.', '').replace('.yaml', '')))
        .filter(n => !isNaN(n))
        .sort((a, b) => a - b);
    
    const maxAerNum = aerNumbers.length > 0 ? Math.max(...aerNumbers) : 0;
    const gaps = [];
    for (let i = 1; i < maxAerNum; i++) {
        if (!aerNumbers.includes(i)) gaps.push(i);
    }
    
    console.log(`\n六、AER 编号连续性`);
    console.log(`  当前最大编号: AER.${maxAerNum}`);
    console.log(`  空缺编号: ${gaps.length > 0 ? gaps.map(n => `AER.${n}`).join(', ') : '无'}`);
    
    // 待确认操作汇总
    console.log(`\n七、待确认操作`);
    console.log(`  1. 补录 ${sourceDateEmpty} 个 AER 的 sourceDate（标准格式 YYYY-MM-DD）`);
    console.log(`  2. 转换 ${dateCompact} 个 AER 的 date 字段为标准格式`);
    console.log(`  3. 删除 ${totalToDelete} 个重复 AER 文件`);
    console.log(`  4. 为 ${slicesMatchIndex} 个时间片补录 aer 字段（从索引匹配）`);
    console.log(`  5. 为 ${slicesAmountZero} 个时间片写入 aer: null（amount=0）`);
    console.log(`  6. 为 ${slicesNoMatch} 个时间片生成新 AER 凭证（编号从 AER.${maxAerNum + 1} 开始）`);
    
    console.log(`\n=== 扫描完成 ===\n`);
}

// ========== fix 模式 ==========
if (task === 'fix') {
    console.log(`\n=== fix.js 执行修复 (${year}) ===\n`);
    
    const aerFiles = fs.readdirSync(voucherDir)
        .filter(f => f.startsWith('AER.') && f.endsWith('.yaml'));
    
    const aerList = [];
    for (const f of aerFiles) {
        const aer = loadAER(f);
        if (aer) {
            aerList.push({ filename: f, data: aer });
        }
    }
    
    // 只处理 sourceDate === '' 的 AER
    const fixableList = aerList.filter(({ data: aer }) => isAERToFix(aer));
    console.log(`可处理 AER: ${fixableList.length} 个（sourceDate 为空字符串）`);
    
    // 1. 补录 sourceDate + 转换 date 格式
    let patched = 0;
    for (const { filename, data: aer } of fixableList) {
        // 补录 sourceDate：从 comment.artifact 中提取日期
        const comment = aer.comment && aer.comment[0];
        if (comment && comment.artifact) {
            const match = comment.artifact.match(/(\d{8})\.[\da-z]+\.md$/);
            if (match) {
                aer.sourceDate = compactToStandard(match[1]);
            }
        }
        
        // 转换 date 字段为标准格式
        if (/^\d{8}$/.test(aer.date)) {
            aer.date = compactToStandard(aer.date);
        }
        
        saveAER(filename, aer);
        patched++;
    }
    console.log(`补录 sourceDate + 转换 date: ${patched} 个`);
    
    // 2. 删除重复 AER（重新加载，因为文件已更新）
    const aerFiles2 = fs.readdirSync(voucherDir)
        .filter(f => f.startsWith('AER.') && f.endsWith('.yaml'));
    const aerList2 = [];
    for (const f of aerFiles2) {
        const aer = loadAER(f);
        if (aer) {
            aerList2.push({ filename: f, data: aer });
        }
    }
    
    const aerByArtifact = {};
    for (const { filename, data: aer } of aerList2) {
        const comment = aer.comment && aer.comment[0];
        if (comment && comment.artifact) {
            const key = `${aer.date}|${comment.artifact}`;
            if (!aerByArtifact[key]) {
                aerByArtifact[key] = [];
            }
            aerByArtifact[key].push(filename);
        }
    }
    
    let deleted = 0;
    for (const [key, files] of Object.entries(aerByArtifact)) {
        if (files.length <= 1) continue;
        const sorted = files.sort((a, b) => {
            const numA = parseInt(a.replace('AER.', '').replace('.yaml', ''));
            const numB = parseInt(b.replace('AER.', '').replace('.yaml', ''));
            return numA - numB;
        });
        const keep = sorted[0];
        const del = sorted.slice(1);
        for (const f of del) {
            const filePath = path.join(voucherDir, f);
            fs.unlinkSync(filePath);
            deleted++;
            console.log(`删除重复: ${f}`);
        }
    }
    console.log(`删除重复 AER: ${deleted} 个`);
    
    // 3. 建立索引（用所有 AER）
    const aerFiles3 = fs.readdirSync(voucherDir)
        .filter(f => f.startsWith('AER.') && f.endsWith('.yaml'));
    const aerList3 = [];
    for (const f of aerFiles3) {
        const aer = loadAER(f);
        if (aer) {
            aerList3.push({ filename: f, data: aer });
        }
    }
    
    const aerIndex = new Map();
    for (const { filename, data: aer } of aerList3) {
        const comment = aer.comment && aer.comment[0];
        if (comment && comment.artifact) {
            aerIndex.set(comment.artifact, filename.replace('.yaml', ''));
        }
    }
    
    // 4. 扫描 day 文件，补录 aer 字段（只处理 Q2+）
    const dayFiles = fs.readdirSync(dayDir)
        .filter(f => f.startsWith('d.') && f.endsWith('.yaml'));
    
    let matched = 0;
    let nullAer = 0;
    let generated = 0;
    let fixedFormat = 0;
    
    for (const f of dayFiles) {
        const dateStr = f.replace('d.', '').replace('.yaml', '');
        if (!isQ2OrLater(dateStr)) continue;  // 只处理 Q2+
        
        const dayobj = loadDayFile(dateStr);
        if (!dayobj || !dayobj.time) continue;
        
        let changed = false;
        
        for (const ts of dayobj.time) {
            if (ts.type !== 'work' && ts.type !== 'check') continue;
            
            // 修正 aer 字段格式：从 '601' 改为 'AER.601'
            if (ts.aer && /^\d+$/.test(ts.aer.toString())) {
                ts.aer = `AER.${ts.aer}`;
                fixedFormat++;
                changed = true;
            }
            
            if (ts.aer && ts.aer.trim() !== '') continue;
            
            if (ts.amount == 0) {
                ts.aer = null;
                nullAer++;
                changed = true;
            } else if (ts.output && aerIndex.has(ts.output)) {
                ts.aer = aerIndex.get(ts.output);
                matched++;
                changed = true;
            } else if (ts.amount > 0) {
                // 使用 journal.parseTimeSlice 生成 entries
                const parsed = journal.parseTimeSlice(ts, dateStr, '1d');
                
                if (parsed.entries.length > 0) {
                    const comment = [{
                        type: ts.type,
                        task: ts.task,
                        todo: ts.todo,
                        time: ts.type === 'work' ? ts.amount : undefined,
                        token: ts.amount,
                        artifact: ts.output || ''
                    }];
                    
                    // 获取下一个 AER ID
                    const existingAERs = fs.readdirSync(voucherDir).filter(f => f.startsWith('AER.') && f.endsWith('.yaml'));
                    const aerNumbers = existingAERs.map(f => parseInt(f.replace('AER.', '').replace('.yaml', ''))).filter(n => !isNaN(n));
                    const nextAerNum = aerNumbers.length > 0 ? Math.max(...aerNumbers) + 1 : 1;
                    
                    // 手动创建 AER 文件（避免 asset.createVoucher 的 ID 冲突）
                    const voucher = {
                        date: compactToStandard(dateStr),
                        VoucherID: '',
                        AccountingEntry: { debit: [], credit: [] },
                        comment: comment,
                        sourceDate: compactToStandard(dateStr),
                        AccountingSoftwareID: `fix.js:${ts.type === 'work' ? 'createWorkAER' : 'createCheckAER'}`
                    };
                    
                    for (const entry of parsed.entries) {
                        const item = {
                            AccountTitle: entry.account,
                            asset: entry.asset,
                            amount: entry.amount
                        };
                        if (entry.direction === 'debit') {
                            voucher.AccountingEntry.debit.push(item);
                        } else {
                            voucher.AccountingEntry.credit.push(item);
                        }
                    }
                    
                    saveAER(`AER.${nextAerNum}.yaml`, voucher);
                    ts.aer = `AER.${nextAerNum}`;
                    generated++;
                    changed = true;
                    console.log(`生成 AER.${nextAerNum} (${dateStr} ${ts.type} ${ts.task || ''} ${ts.todo || ''} amount=${ts.amount})`);
                }
            }
        }
        
        if (changed) {
            saveDayFile(dateStr, dayobj);
        }
    }
    
    console.log(`\n修复完成:`);
    console.log(`  修正 aer 字段格式: ${fixedFormat} 个`);
    console.log(`  补录 aer 字段（从索引匹配）: ${matched} 个`);
    console.log(`  写入 aer: null: ${nullAer} 个`);
    console.log(`  生成新 AER: ${generated} 个`);
    
    console.log(`\n=== 执行完成 ===\n`);
}
