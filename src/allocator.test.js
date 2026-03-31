const assert = require('assert');
const allocator = require('./allocator.js');

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

console.log('=== allocator.js 测试 ===');

test('getCandidateTodos - 获取候选todo', () => {
    const candidates = allocator.getCandidateTodos();
    assert.ok(Array.isArray(candidates));
    assert.ok(candidates.length > 0);
    assert.ok(candidates[0].task_id);
    assert.ok(candidates[0].todo_name);
});

test('sortTodosByPrinciples - 排序todo', () => {
    const candidates = [
        { task_id: 'A', deadline: null, jt_balance: 100, priority: 10 },
        { task_id: 'B', deadline: '2026-03-31', jt_balance: 50, priority: 20 },
        { task_id: 'C', deadline: '2026-04-30', jt_balance: 200, priority: 15 }
    ];
    const sorted = allocator.sortTodosByPrinciples(candidates, ['A']);
    assert.strictEqual(sorted[0].task_id, 'B');
});

test('selectTodoForTimeSlice - 选择todo', () => {
    const selected = allocator.selectTodoForTimeSlice(60, 1, []);
    if (selected) {
        assert.ok(selected.task_id);
        assert.ok(selected.todo_name);
        assert.ok(selected.jt_cost);
    }
});

test('getRecentTaskIds - 获取最近使用的task', () => {
    const recentIds = allocator.getRecentTaskIds(7);
    assert.ok(Array.isArray(recentIds));
});

test('allocateJT - 分配JT给task', () => {
    const result = allocator.allocateJT('PSMD', 100);
    assert.strictEqual(result, true);
});

test('deductJT - 扣除JT', () => {
    const result = allocator.deductJT('PSMD', 'term + COM matedata -> deploy metadata -> deploy view', 50);
    assert.strictEqual(typeof result, 'boolean');
});

console.log('\n=== 测试结果 ===');
console.log(`通过: ${passed}`);
console.log(`失败: ${failed}`);
console.log(`总计: ${passed + failed}`);

module.exports = { passed, failed };
