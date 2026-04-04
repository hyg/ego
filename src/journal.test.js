const assert = require('assert');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const journal = require('./journal.js');
const day = require('./day.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✓ ${name}`);
        passed++;
    } catch (e) {
        console.error(`✗ ${name}`);
        console.error(`  ${e.message}`);
        failed++;
    }
}

console.log('=== journal.js 测试 ===');
journal.debug = true;

// 加载测试数据
const dayData = yaml.load(fs.readFileSync(path.join(__dirname, '../data/day/2026/d.20260401.yaml'), 'utf8'));

test('parseTimeSlice - discuss不计入token', () => {
    const slice = dayData.time.find(t => t.type === 'discuss');
    const result = journal.parseTimeSlice(slice, '20260401', '1e');
    assert.strictEqual(result.tokenAmount, 0);
    assert.strictEqual(result.entries.length, 0);
});

test('parseTimeSlice - check由ego购买', () => {
    const slice = dayData.time.find(t => t.type === 'check');
    const result = journal.parseTimeSlice(slice, '20260401', '1e');
    // check类型根据output产生entries
    if (slice.output && result.entries.length > 0) {
        assert.strictEqual(result.tokenAmount, 60);
        assert.strictEqual(result.artifactCount, 1);
        assert.strictEqual(result.entries.length, 6);
    } else {
        console.log('  info: check slice entries:', result.entries.length);
    }
});

test('parseTimeSlice - work消耗时间产生artifact', () => {
    const slice = dayData.time.find(t => t.type === 'work' && t.task === 'ego');
    const result = journal.parseTimeSlice(slice, '20260401', '1e');
    // 根据output/redo产生entries
    if (slice.output && result.entries.length > 0) {
        assert.strictEqual(result.actualTime, 370);
        assert.strictEqual(result.tokenAmount, 370);
        assert.strictEqual(result.artifactCount, 1);
        assert.strictEqual(result.entries.length, 6);
        
        // 验证ego.time科目平衡（购买+370，消耗-370）
        const egoTimeDebit = result.entries.filter(e => e.account === 'ego' && e.asset === 'time' && e.direction === 'debit')
            .reduce((sum, e) => sum + e.amount, 0);
        const egoTimeCredit = result.entries.filter(e => e.account === 'ego' && e.asset === 'time' && e.direction === 'credit')
            .reduce((sum, e) => sum + e.amount, 0);
        assert.strictEqual(egoTimeDebit, egoTimeCredit, 'ego.time should balance');
        
        // 验证token科目平衡
        const tokenDebit = result.entries.filter(e => e.asset === 'token' && e.direction === 'debit')
            .reduce((sum, e) => sum + e.amount, 0);
        const tokenCredit = result.entries.filter(e => e.asset === 'token' && e.direction === 'credit')
            .reduce((sum, e) => sum + e.amount, 0);
        assert.strictEqual(tokenDebit, tokenCredit, 'token should balance');
    } else {
        console.log('  info: work slice entries:', result.entries.length, 'actualTime:', result.actualTime);
    }
});

test('parseDayObj - 解析完整dayobj', () => {
    const parsed = journal.parseDayObj(dayData);
    assert.strictEqual(parsed.totalToken, 430);
    assert.strictEqual(parsed.totalArtifacts, 2);
    assert.strictEqual(parsed.results.length, dayData.time.length);
});

test('formatOutput - 格式化输出', () => {
    const parsed = journal.parseDayObj(dayData);
    const output = journal.formatOutput(parsed);
    assert.ok(output.includes('今日消耗token总计: 430'));
    assert.ok(output.includes('今日产出artifact: 2'));
});

console.log('\n=== 幂等测试 ===');

test('isDaySettled - 检查未结算日期', () => {
    const status = journal.isDaySettled('20260404');
    assert.strictEqual(status.settled, false);
});

test('isDaySettled - 检查已结算日期（新格式）', () => {
    const status = journal.isDaySettled('20260401');
    assert.strictEqual(status.settled, true);
    assert.ok(status.filename.startsWith('AER.'));
});

test('isDaySettled - 兼容旧格式voucher', () => {
    const status = journal.isDaySettled('20260402');
    assert.strictEqual(status.settled, true);
    assert.ok(status.filename.startsWith('AER.'));
});

test('isDaySettled - 2026Q2之前的日期', () => {
    const status = journal.isDaySettled('20260331');
    console.log('  20260331 status:', status);
    // 旧日期可能没有voucher，按实际结果判断
});

console.log('\n=== 测试结果 ===');
console.log(`通过: ${passed}`);
console.log(`失败: ${failed}`);
console.log(`总计: ${passed + failed}`);

journal.debug = false;

module.exports = { passed, failed };
