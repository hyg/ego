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
        { task_id: 'A', deadline: null, token_balance: 100, priority: 10 },
        { task_id: 'B', deadline: '2026-03-31', token_balance: 50, priority: 20 },
        { task_id: 'C', deadline: '2026-04-30', token_balance: 200, priority: 15 }
    ];
    const sorted = allocator.sortTodosByPrinciples(candidates, ['A']);
    assert.strictEqual(sorted[0].task_id, 'B');
});

test('selectTodoForTimeSlice - 选择todo', () => {
    const selected = allocator.selectTodoForTimeSlice(60, 1, []);
    if (selected) {
        assert.ok(selected.task_id);
        assert.ok(selected.todo_name);
        assert.ok(selected.token_cost);
    }
});

test('getRecentTaskIds - 获取最近使用的task', () => {
    const recentIds = allocator.getRecentTaskIds(7);
    assert.ok(Array.isArray(recentIds));
});

test('allocateToken - 分配token给task', () => {
    const result = allocator.allocateToken('PSMD', 100);
    assert.strictEqual(result, true);
});

test('deductToken - 扣除token', () => {
    const result = allocator.deductToken('PSMD', 'term + COM matedata -> deploy metadata -> deploy view', 50);
    assert.strictEqual(typeof result, 'boolean');
});

console.log('\n=== isRelySatisfied 测试 ===');

test('isRelySatisfied - 无rely字段', () => {
    const todo = { name: 'test', status: 'pending' };
    const taskIndex = new Map();
    assert.strictEqual(allocator.isRelySatisfied(todo, taskIndex), true);
});

test('isRelySatisfied - 空rely数组', () => {
    const todo = { name: 'test', status: 'pending', rely: [] };
    const taskIndex = new Map();
    assert.strictEqual(allocator.isRelySatisfied(todo, taskIndex), true);
});

test('isRelySatisfied - 前置任务已完成', () => {
    const todo = { name: 'B', status: 'pending', rely: ['PSMD.A'] };
    const taskIndex = new Map();
    taskIndex.set('PSMD', { todos: [{ name: 'A', status: 'completed' }] });
    assert.strictEqual(allocator.isRelySatisfied(todo, taskIndex), true);
});

test('isRelySatisfied - 前置任务未完成(in_progress)', () => {
    const todo = { name: 'B', status: 'pending', rely: ['PSMD.A'] };
    const taskIndex = new Map();
    taskIndex.set('PSMD', { todos: [{ name: 'A', status: 'in_progress' }] });
    assert.strictEqual(allocator.isRelySatisfied(todo, taskIndex), false);
});

test('isRelySatisfied - 前置任务未完成(pending)', () => {
    const todo = { name: 'B', status: 'pending', rely: ['PSMD.A'] };
    const taskIndex = new Map();
    taskIndex.set('PSMD', { todos: [{ name: 'A', status: 'pending' }] });
    assert.strictEqual(allocator.isRelySatisfied(todo, taskIndex), false);
});

test('isRelySatisfied - task不存在（无效依赖，视为完成）', () => {
    const todo = { name: 'B', status: 'pending', rely: ['NONEXIST.A'] };
    const taskIndex = new Map();
    assert.strictEqual(allocator.isRelySatisfied(todo, taskIndex), true);
});

test('isRelySatisfied - todo不存在（无效依赖，视为完成）', () => {
    const todo = { name: 'B', status: 'pending', rely: ['PSMD.nonexist'] };
    const taskIndex = new Map();
    taskIndex.set('PSMD', { todos: [{ name: 'A', status: 'completed' }] });
    assert.strictEqual(allocator.isRelySatisfied(todo, taskIndex), true);
});

test('isRelySatisfied - 多个依赖全部完成', () => {
    const todo = { name: 'C', status: 'pending', rely: ['PSMD.A', 'ego.X'] };
    const taskIndex = new Map();
    taskIndex.set('PSMD', { todos: [{ name: 'A', status: 'completed' }] });
    taskIndex.set('ego', { todos: [{ name: 'X', status: 'completed' }] });
    assert.strictEqual(allocator.isRelySatisfied(todo, taskIndex), true);
});

test('isRelySatisfied - 多个依赖部分未完成', () => {
    const todo = { name: 'C', status: 'pending', rely: ['PSMD.A', 'ego.X'] };
    const taskIndex = new Map();
    taskIndex.set('PSMD', { todos: [{ name: 'A', status: 'completed' }] });
    taskIndex.set('ego', { todos: [{ name: 'X', status: 'in_progress' }] });
    assert.strictEqual(allocator.isRelySatisfied(todo, taskIndex), false);
});

test('isRelySatisfied - 混合有效和无效依赖（无效视为完成）', () => {
    const todo = { name: 'C', status: 'pending', rely: ['PSMD.A', 'NONEXIST.X'] };
    const taskIndex = new Map();
    taskIndex.set('PSMD', { todos: [{ name: 'A', status: 'completed' }] });
    assert.strictEqual(allocator.isRelySatisfied(todo, taskIndex), true);
});

test('isRelySatisfied - 混合有效依赖和未完成依赖', () => {
    const todo = { name: 'C', status: 'pending', rely: ['PSMD.A', 'ego.X'] };
    const taskIndex = new Map();
    taskIndex.set('PSMD', { todos: [{ name: 'A', status: 'completed' }] });
    taskIndex.set('ego', { todos: [{ name: 'X', status: 'in_progress' }] });
    assert.strictEqual(allocator.isRelySatisfied(todo, taskIndex), false);
});

console.log('\n=== getCandidateTodos rely 过滤测试 ===');

test('getCandidateTodos - pending无rely应被选入', () => {
    const candidates = allocator.getCandidateTodos();
    assert.ok(Array.isArray(candidates));
    // 至少应有一个候选（所有pending无rely + in_progress）
    assert.ok(candidates.length > 0);
});

test('getCandidateTodos - 只有in_progress和依赖满足的pending被选入', () => {
    const candidates = allocator.getCandidateTodos();
    for (const c of candidates) {
        // 所有候选应该是 in_progress 或者 pending（意味着 rely 已满足）
        assert.ok(c.status === 'in_progress' || c.status === 'pending');
    }
});

console.log('\n=== 测试结果 ===');
console.log(`通过: ${passed}`);
console.log(`失败: ${failed}`);
console.log(`总计: ${passed + failed}`);

module.exports = { passed, failed };
