const assert = require('assert');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const journal = require('./journal.js');

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

// 加载测试数据
const dayData = yaml.load(fs.readFileSync(path.join(__dirname, '../data/day/2026/d.20260401.yaml'), 'utf8'));

test('parseTimeSlice - discuss不计入JT', () => {
    const slice = dayData.time.find(t => t.type === 'discuss');
    const result = journal.parseTimeSlice(slice, '20260401', '1e');
    assert.strictEqual(result.jtAmount, 0);
    assert.strictEqual(result.entries.length, 0);
});

test('parseTimeSlice - check由ego购买', () => {
    const slice = dayData.time.find(t => t.type === 'check');
    const result = journal.parseTimeSlice(slice, '20260401', '1e');
    assert.strictEqual(result.jtAmount, 60);
    assert.strictEqual(result.artifactCount, 1);
    assert.strictEqual(result.entries.length, 6);
});

test('parseTimeSlice - work有redo字段表示未完成', () => {
    const slice = dayData.time.find(t => t.type === 'work' && t.task === 'PSMD');
    const result = journal.parseTimeSlice(slice, '20260401', '1e');
    assert.strictEqual(result.isCompleted, false);
    assert.strictEqual(result.actualTime, 0);
    assert.strictEqual(result.redoEstimate, 60);
    assert.strictEqual(result.jtAmount, 0);
    assert.strictEqual(result.actions.length, 1);
    assert.strictEqual(result.actions[0].type, 'writeback_todo');
});

test('parseTimeSlice - work消耗时间产生artifact', () => {
    const slice = dayData.time.find(t => t.type === 'work' && t.task === 'ego');
    const result = journal.parseTimeSlice(slice, '20260401', '1e');
    assert.strictEqual(result.actualTime, 370);
    assert.strictEqual(result.jtAmount, 370);
    assert.strictEqual(result.artifactCount, 1);
    assert.strictEqual(result.entries.length, 6);
    
    // 验证ego.time科目平衡（购买+370，消耗-370）
    const egoTimeDebit = result.entries.filter(e => e.account === 'ego' && e.asset === 'time' && e.direction === 'debit')
        .reduce((sum, e) => sum + e.amount, 0);
    const egoTimeCredit = result.entries.filter(e => e.account === 'ego' && e.asset === 'time' && e.direction === 'credit')
        .reduce((sum, e) => sum + e.amount, 0);
    assert.strictEqual(egoTimeDebit, egoTimeCredit, 'ego.time should balance');
    
    // 验证JT科目平衡
    const jtDebit = result.entries.filter(e => e.asset === 'jt' && e.direction === 'debit')
        .reduce((sum, e) => sum + e.amount, 0);
    const jtCredit = result.entries.filter(e => e.asset === 'jt' && e.direction === 'credit')
        .reduce((sum, e) => sum + e.amount, 0);
    assert.strictEqual(jtDebit, jtCredit, 'jt should balance');
});

test('parseDayObj - 解析完整dayobj', () => {
    const parsed = journal.parseDayObj(dayData);
    assert.strictEqual(parsed.totalJT, 430);
    assert.strictEqual(parsed.totalArtifacts, 2);
    assert.strictEqual(parsed.results.length, dayData.time.length);
});

test('formatOutput - 格式化输出', () => {
    journal.debug = true;
    const parsed = journal.parseDayObj(dayData);
    const output = journal.formatOutput(parsed);
    assert.ok(output.includes('今日消耗JT总计: 430'));
    assert.ok(output.includes('今日产出artifact: 2'));
    journal.debug = false;
});

console.log('\n=== 测试结果 ===');
console.log(`通过: ${passed}`);
console.log(`失败: ${failed}`);
console.log(`总计: ${passed + failed}`);

module.exports = { passed, failed };
