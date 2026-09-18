const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const config = require('./config.js');
const asset = require('./asset.js');
const task = require('./task.js');
const season = require('./season.js');

function log(...s) {
    s[0] = log.caller.name + "> " + s[0];
    console.log(...s);
}

/**
 * 分录规则系统
 * 
 * 规则：
 * - discuss: 不计入token消耗（raw不对外销售）
 * - check: 由ego购买时间，归档artifact
 * - work: 由task购买时间，消耗时间产生artifact
 * - 有redo字段: 未完成，写回task元数据
 */

module.exports = {
    debug: false,
    
    // 解析单个时间片，返回分录和操作
    parseTimeSlice: function (timeSlice, datestr, plan) {
        const result = {
            type: timeSlice.type,
            entries: [],
            actions: [],
            tokenAmount: 0,
            artifactCount: 0
        };
        
        // discuss: 不计入token消耗
        if (timeSlice.type === 'discuss') {
            result.description = '不计入token消耗（raw不对外销售）';
            return result;
        }
        
        // check: 由ego购买时间，归档artifact
        if (timeSlice.type === 'check') {
            return this.parseCheckSlice(timeSlice, datestr, plan);
        }
        
        // work: 由task购买时间
        if (timeSlice.type === 'work') {
            return this.parseWorkSlice(timeSlice, datestr, plan);
        }
        
        return result;
    },
    
    // 解析check时间片
    parseCheckSlice: function (timeSlice, datestr, plan) {
        const actualTime = timeSlice.amount;
        const pricing = season.getPricing(datestr);
        const templateType = plan ? plan.charAt(0) : 1;
        const tokenRate = templateType === '2' ? pricing.template_2 : pricing.template_1;
        const tokenAmount = actualTime * tokenRate;
        
        const result = {
            type: 'check',
            entries: [],
            actions: [],
            tokenAmount: tokenAmount,
            artifactCount: 1,
            description: 'ego购买时间，归档artifact'
        };
        
        if (actualTime > 0 && !this.debug) {
            // [购买时间]
            result.entries.push(
                { account: 'ego', asset: 'time', amount: actualTime, direction: 'debit' },
                { account: 'raw', asset: 'time', amount: actualTime, direction: 'credit' },
                { account: 'raw', asset: 'token', amount: tokenAmount, direction: 'debit' },
                { account: 'ego', asset: 'token', amount: tokenAmount, direction: 'credit' }
            );
            
            // [消耗时间→artifact]
            result.entries.push(
                { account: 'ego', asset: 'artifact.draft', amount: 1, direction: 'debit' },
                { account: 'ego', asset: 'time', amount: actualTime, direction: 'credit' }
            );
            
            result.artifactFile = timeSlice.output;
        }
        
        return result;
    },
    
    /**
     * 解析work时间片
     *
     * 行为矩阵：
     * | amount | redo | draft追加 | time_slice追加 | 财务记账 | status写回 | amount写回 |
     * |--------|------|:---------:|:--------------:|:--------:|:----------:|:----------:|
     * | >0     | 无   | ✅        | ✅             | ✅       | completed  | → 0        |
     * | >0     | 有   | ✅        | ✅             | ✅       | in_progress| → redo     |
     * | 0      | 无   | ❌        | ❌             | ❌       | completed  | → 0        |
     * | 0      | 有   | ❌        | ❌             | ❌       | in_progress| → redo     |
     *
     * amount=0时：
     *   - output文件已在cleardayobj中删除
     *   - 不生成财务分录
     *   - 不追加history_drafts和time_slices
     *   - 但仍写回redo/status到task元数据
     */
    parseWorkSlice: function (timeSlice, datestr, plan) {
        const taskId = timeSlice.task || timeSlice.subject;
        const todoName = timeSlice.todo || timeSlice.title;
        
        if (!taskId) {
            return {
                type: 'work',
                entries: [],
                actions: [],
                tokenAmount: 0,
                artifactCount: 0,
                description: '无特定task，跳过'
            };
        }
        
        // 处理redo字段
        let actualTime = timeSlice.amount;
        const redoEstimate = timeSlice.redo;
        
        if (timeSlice.trueamount != null) {
            actualTime = timeSlice.trueamount;
        }
        
        const isCompleted = !redoEstimate;
        const pricing = season.getPricing(datestr);
        const templateType = plan ? plan.charAt(0) : 1;
        const tokenRate = templateType === '2' ? pricing.template_2 : pricing.template_1;
        const tokenAmount = actualTime * tokenRate;
        
        const result = {
            type: 'work',
            taskId: taskId,
            todoName: todoName,
            entries: [],
            actions: [],
            tokenAmount: tokenAmount,
            artifactCount: actualTime > 0 ? 1 : 0,
            isCompleted: isCompleted,
            actualTime: actualTime,
            redoEstimate: redoEstimate
        };
        
        if (actualTime > 0 && !this.debug) {
            // [购买时间]
            result.entries.push(
                { account: taskId, asset: 'time', amount: actualTime, direction: 'debit' },
                { account: 'raw', asset: 'time', amount: actualTime, direction: 'credit' },
                { account: 'raw', asset: 'token', amount: tokenAmount, direction: 'debit' },
                { account: taskId, asset: 'token', amount: tokenAmount, direction: 'credit' }
            );
            
            // [消耗时间→artifact]
            result.entries.push(
                { account: taskId, asset: 'artifact.draft', amount: 1, direction: 'debit' },
                { account: taskId, asset: 'time', amount: actualTime, direction: 'credit' }
            );
            
            result.artifactFile = timeSlice.output;
        }
        
        // amount>0时始终生成writeback_todo action（含已完成和未完成）
        if (actualTime > 0) {
            result.actions.push({
                type: 'writeback_todo',
                task_id: taskId,
                todo_name: todoName,
                amount: redoEstimate || 0,
                isCompleted: isCompleted,
                actualTime: actualTime,
                draft: timeSlice.output,
                time_slice: {
                    date: datestr,
                    amount: actualTime,
                    template: plan,
                    token_cost: tokenAmount,
                    draft: timeSlice.output
                }
            });
        }
        
        // amount=0时：仅更新 status/amount，不生成财务分录，不追加 time_slice/history_draft
        if (actualTime == 0) {
            result.actions.push({
                type: 'writeback_todo',
                task_id: taskId,
                todo_name: todoName,
                amount: redoEstimate || 0,
                isCompleted: isCompleted,
                actualTime: 0
            });
        }
        
        return result;
    },
    
    // 解析整个dayobj，返回所有分录和操作
    parseDayObj: function (dayobj) {
        const results = [];
        let totalToken = 0;
        let totalArtifacts = 0;
        
        for (const timeSlice of dayobj.time) {
            // amount=0 的 work/check 时间片：仍需生成 writeback_todo action（更新 status）
            if (timeSlice.amount == 0 && (timeSlice.type === 'work' || timeSlice.type === 'check')) {
                const result = this.parseTimeSlice(timeSlice, dayobj.date, dayobj.plan);
                results.push(result);
                continue;
            }
            
            if (timeSlice.amount == 0) {
                continue;
            }
            
            const result = this.parseTimeSlice(timeSlice, dayobj.date, dayobj.plan);
            results.push(result);
            totalToken += result.tokenAmount;
            totalArtifacts += result.artifactCount;
        }
        
        return {
            results: results,
            totalToken: totalToken,
            totalArtifacts: totalArtifacts
        };
    },
    
    // 检查当天是否已结算
    // 优先通过 sourceDate 字段匹配（标准格式 YYYY-MM-DD）
    // 兼容旧格式：检查 date 字段（紧凑格式 YYYYMMDD）
    isDaySettled: function (dateStr) {
        const year = dateStr.substring(0, 4);
        const existingAERs = asset.loadAER(year);
        
        // 将紧凑格式转换为标准格式
        const standardDate = dateStr.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
        
        for (const [filename, aer] of Object.entries(existingAERs)) {
            // 新格式：sourceDate 为标准格式
            if (aer.sourceDate === standardDate) {
                return { settled: true, filename: filename, voucher: aer };
            }
            // 旧格式兼容：sourceDate 为空字符串时，检查 date 字段
            if (aer.sourceDate === '' || aer.sourceDate === undefined) {
                const aerDate = aer.date ? aer.date.toString().replace(/-/g, '').slice(0, 8) : '';
                if (aerDate === dateStr) {
                    return { settled: true, filename: filename, voucher: aer };
                }
            }
        }
        return { settled: false };
    },
    
    // 清理已结算的数据（用于重新结算）
    undoSettle: function (dateStr) {
        const year = dateStr.substring(0, 4);
        const existingAERs = asset.loadAER(year);
        const vouchersToRemove = [];
        
        // 将紧凑格式转换为标准格式
        const standardDate = dateStr.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
        
        // 找到当天所有voucher
        for (const [filename, aer] of Object.entries(existingAERs)) {
            if (aer.sourceDate === standardDate) {
                vouchersToRemove.push({ filename: filename, voucher: aer });
            }
        }
        
        if (vouchersToRemove.length === 0) {
            return { undone: false, reason: 'no vouchers found' };
        }
        
        // 恢复token余额并清理time_slices
        for (const { filename, voucher } of vouchersToRemove) {
            const comment = voucher.comment || [];
            for (const c of comment) {
                if (c.token && c.task) {
                    const taskData = task.loadTask(c.task);
                    if (taskData && taskData.token_balance !== undefined) {
                        taskData.token_balance += c.token;
                        
                        // 清理对应的time_slices
                        if (taskData.todos) {
                            for (const todo of taskData.todos) {
                                if (todo.name === c.todo && todo.time_slices) {
                                    todo.time_slices = todo.time_slices.filter(ts => ts.date !== dateStr);
                                }
                                if (todo.name === c.todo && todo.history_drafts) {
                                    const draftPath = c.artifact ? c.artifact.replace('../../draft/', '') : null;
                                    if (draftPath) {
                                        todo.history_drafts = todo.history_drafts.filter(d => !d.includes(dateStr));
                                    }
                                }
                            }
                        }
                        
                        task.saveTask(taskData);
                        log("restored token_balance:", c.task, taskData.token_balance);
                    }
                }
            }
            
            // 删除voucher文件（从staging中删除）
            const stagingPath = asset.getVoucherPath(year, 'staging');
            const filepath = path.join(stagingPath, filename);
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
                log("removed voucher:", filename);
            }
        }
        
        return { undone: true, count: vouchersToRemove.length };
    },
    
    // 执行结算（生成凭证并写入）
    settleDayObj: function (dayobj) {
        const dateStr = dayobj.date.toString();
        
        // 检查是否已结算
        const settleStatus = this.isDaySettled(dateStr);
        if (settleStatus.settled) {
            log("day already settled, undoing:", settleStatus.filename);
            this.undoSettle(dateStr);
        }
        
        const parsed = this.parseDayObj(dayobj);
        const vouchers = [];
        
        for (const result of parsed.results) {
            if (result.entries.length > 0) {
                // 生成凭证
                const voucher = asset.createVoucher(
                    'over_settle',
                    result.entries,
                    [{ 
                        type: result.type,
                        task: result.taskId,
                        todo: result.todoName,
                        time: result.actualTime,
                        token: result.tokenAmount,
                        artifact: result.artifactFile
                    }],
                    null,
                    dateStr
                );
                vouchers.push(voucher);
            }
            
            // 执行操作（如写回todo）
            for (const action of result.actions) {
                if (action.type === 'writeback_todo') {
                    this.writebackTodo(action);
                }
            }
            
            // 更新task的token余额
            if (result.taskId && result.tokenAmount > 0) {
                const taskData = task.loadTask(result.taskId);
                if (taskData) {
                    if (!taskData.token_balance) taskData.token_balance = 0;
                    taskData.token_balance -= result.tokenAmount;
                    task.saveTask(taskData);
                    log("updated task token_balance:", result.taskId, taskData.token_balance);
                }
            }
        }
        
        return {
            vouchers: vouchers,
            totalToken: parsed.totalToken,
            totalArtifacts: parsed.totalArtifacts,
            writebackTodos: parsed.results.flatMap(r => r.actions)
        };
    },
    
    /**
     * 写回todo到task元数据
     *
     * 行为矩阵：
     * | amount | redo | history_drafts | time_slices | status   | amount字段 | output文件 |
     * |--------|------|:-------------:|:-----------:|:--------:|:----------:|:----------:|
     * | >0     | 无   | 追加          | 追加        | completed| → 0        | 保留       |
     * | >0     | 有   | 追加          | 追加        | in_progress| → redo  | 保留       |
     * | 0      | 无   | 不追加        | 不追加      | completed| → 0        | 确认删除   |
     * | 0      | 有   | 不追加        | 不追加      | in_progress| → redo  | 确认删除   |
     */
    writebackTodo: function (action) {
        const taskData = task.loadTask(action.task_id);
        if (!taskData) {
            log("task not found:", action.task_id);
            return;
        }
        
        if (!taskData.todos) {
            taskData.todos = [];
        }
        
        // 规范化draft路径（去除 ../../draft/ 前缀）
        let draftPath = action.draft;
        if (draftPath && draftPath.startsWith('../../draft/')) {
            draftPath = draftPath.substring('../../draft/'.length);
        }
        
        // 查找现有todo
        let todo = taskData.todos.find(t => t.name === action.todo_name);
        
        if (todo) {
            // 更新status和amount
            if (action.isCompleted) {
                todo.status = 'completed';
                todo.amount = 0;
            } else {
                todo.status = 'in_progress';
                todo.amount = action.amount;
            }
            
            // 追加time_slice（仅actualTime > 0时）
            if (action.actualTime > 0 && action.time_slice) {
                if (!todo.time_slices) {
                    todo.time_slices = [];
                }
                const normalizedSlice = { ...action.time_slice };
                if (normalizedSlice.draft && normalizedSlice.draft.startsWith('../../draft/')) {
                    normalizedSlice.draft = normalizedSlice.draft.substring('../../draft/'.length);
                }
                
                // 检查是否已存在相同日期和draft的时间片
                const exists = todo.time_slices.some(s => 
                    s.date === normalizedSlice.date && s.draft === normalizedSlice.draft
                );
                if (!exists) {
                    todo.time_slices.push(normalizedSlice);
                }
            }
            
            // 追加history_draft（仅actualTime > 0时）
            if (action.actualTime > 0 && draftPath) {
                if (!todo.history_drafts) {
                    todo.history_drafts = [];
                }
                // 清理并规范化所有现有路径，然后去重
                const normalized = todo.history_drafts.map(d => {
                    if (d.startsWith('../../draft/')) {
                        return d.substring('../../draft/'.length);
                    }
                    return d;
                });
                todo.history_drafts = [...new Set(normalized)];
                
                // 追加新路径
                if (!todo.history_drafts.includes(draftPath)) {
                    todo.history_drafts.push(draftPath);
                }
            }
        } else {
            // 创建新todo（规范化路径）
            let normalizedTimeSlice = null;
            if (action.actualTime > 0 && action.time_slice) {
                normalizedTimeSlice = { ...action.time_slice };
                if (normalizedTimeSlice.draft && normalizedTimeSlice.draft.startsWith('../../draft/')) {
                    normalizedTimeSlice.draft = normalizedTimeSlice.draft.substring('../../draft/'.length);
                }
            }
            let normalizedDraftPath = (action.actualTime > 0 && draftPath) ? draftPath : null;
            
            taskData.todos.push({
                name: action.todo_name,
                status: action.isCompleted ? 'completed' : 'in_progress',
                amount: action.isCompleted ? 0 : action.amount,
                time_slices: normalizedTimeSlice ? [normalizedTimeSlice] : [],
                history_drafts: normalizedDraftPath ? [normalizedDraftPath] : []
            });
        }
        
        // amount=0时，确保output文件已删除（cleardayobj可能未覆盖所有场景）
        if (action.actualTime === 0 && action.draft) {
            const draftFullPath = path.resolve(__dirname, '..', action.draft);
            try {
                if (fs.existsSync(draftFullPath)) {
                    fs.unlinkSync(draftFullPath);
                    log("deleted output file for amount=0:", action.draft);
                }
            } catch (e) {
                log("delete output file failed:", action.draft, e.code);
            }
        }
        
        task.saveTask(taskData);
        log("writeback todo:", action.task_id, action.todo_name, "amount:", action.amount);
    },
    
    // 格式化输出（用于显示）
    formatOutput: function (parsed) {
        let output = '';
        
        for (const result of parsed.results) {
            output += `--- 时间片 ---\n`;
            output += `类型: ${result.type}\n`;
            
            if (result.type === 'discuss') {
                output += `说明: ${result.description}\n\n`;
                continue;
            }
            
            if (result.type === 'check') {
                output += `token成本: ${result.tokenAmount} token (ego购买，归档artifact)\n`;
                output += `产出: ${result.artifactCount}个artifact\n`;
                if (result.entries.length > 0) {
                    output += `\n分录:\n`;
                    output += `  [购买时间]\n`;
                    output += `  借: ego (time) +${result.entries[0].amount}分钟\n`;
                    output += `  贷: raw (time) -${result.entries[1].amount}分钟\n`;
                    output += `  借: raw (token) +${result.entries[2].amount}token\n`;
                    output += `  贷: ego (token) -${result.entries[3].amount}token\n`;
                    output += `  [消耗时间→artifact]\n`;
                    output += `  借: ego.artifact +1 (归档成本: ${result.tokenAmount}token)\n`;
                    output += `  贷: ego (time) -${result.entries[5].amount}分钟\n`;
                    if (result.artifactFile) {
                        output += `  artifact文件: ${result.artifactFile}\n`;
                    }
                }
                output += `\n`;
                continue;
            }
            
            if (result.type === 'work') {
                output += `任务: ${result.taskId}: ${result.todoName}\n`;
                output += `实际工作: ${result.actualTime} 分钟\n`;
                if (result.isCompleted) {
                    output += `状态: 已完成\n`;
                } else {
                    output += `预计还需: ${result.redoEstimate} 分钟\n`;
                    output += `状态: 未完成\n`;
                }
                output += `token消耗: ${result.tokenAmount} token\n`;
                output += `产出: ${result.artifactCount}个artifact\n`;
                
                if (result.entries.length > 0) {
                    output += `\n分录:\n`;
                    output += `  [购买时间]\n`;
                    output += `  借: ${result.taskId} (time) +${result.entries[0].amount}分钟\n`;
                    output += `  贷: raw (time) -${result.entries[1].amount}分钟\n`;
                    output += `  借: raw (token) +${result.entries[2].amount}token\n`;
                    output += `  贷: ${result.taskId} (token) -${result.entries[3].amount}token\n`;
                    output += `  [消耗时间→artifact]\n`;
                    output += `  借: ${result.taskId} (artifact.draft) +1 (成本: ${result.tokenAmount}token)\n`;
                    output += `  贷: ${result.taskId} (time) -${result.entries[5].amount}分钟\n`;
                    if (result.artifactFile) {
                        output += `  artifact文件: ${result.artifactFile}\n`;
                    }
                }
                
                if (result.actions.length > 0) {
                    output += `操作: 写回task元数据，todo回到pending（预计${result.redoEstimate}分钟）\n`;
                }
                output += `\n`;
            }
        }
        
        output += `=== 汇总 ===\n`;
        output += `今日消耗token总计: ${parsed.totalToken} token\n`;
        output += `今日产出artifact: ${parsed.totalArtifacts} 个\n`;
        
        const writebacks = parsed.results.flatMap(r => r.actions);
        if (writebacks.length > 0) {
            output += `\n=== 需要写回task元数据的todo ===\n`;
            for (const action of writebacks) {
                output += `  - ${action.task_id}: ${action.todo_name}\n`;
                output += `    预计时间: ${action.amount}分钟\n`;
                if (action.draft) {
                    output += `    draft: ${action.draft}\n`;
                }
            }
        }
        
        return output;
    }
};
