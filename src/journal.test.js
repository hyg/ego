const assert = require('assert');
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

test('parseRule - 解析ego_allocate_jt规则', () => {
    const parsed = journal.parseRule('ego_allocate_jt', {
        task_id: 'PSMD',
        jt_amount: 100
    });
    assert.ok(parsed);
    assert.ok(parsed.entries);
    assert.strictEqual(parsed.entries.length, 2);
    assert.strictEqual(parsed.entries[0].account, 'PSMD');
    assert.strictEqual(parsed.entries[0].asset, 'jt');
    assert.strictEqual(parsed.entries[0].amount, 100);
    assert.strictEqual(parsed.entries[0].direction, 'debit');
});

test('parseRule - 解析task_buy_time规则', () => {
    const parsed = journal.parseRule('task_buy_time', {
        task_id: 'PSMD',
        time_amount: 60,
        jt_amount: 120
    });
    assert.ok(parsed);
    assert.strictEqual(parsed.entries.length, 4);
});

test('parseRule - 不存在的规则', () => {
    const parsed = journal.parseRule('nonexistent', {});
    assert.strictEqual(parsed, null);
});

test('settleTimeSlice - 结算时间片', () => {
    journal.debug = true;  // 测试模式，不实际写入
    const timeSlice = {
        type: 'work',
        task: 'PSMD',
        todo: '测试任务',
        amount: 60,
        template: 2
    };
    const result = journal.settleTimeSlice(timeSlice, '20260401');
    assert.ok(result);
    assert.ok(result.entries);
});

console.log('\n=== 测试结果 ===');
console.log(`通过: ${passed}`);
console.log(`失败: ${failed}`);
console.log(`总计: ${passed + failed}`);

module.exports = { passed, failed };
