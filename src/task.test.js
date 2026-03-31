const assert = require('assert');
const task = require('./task.js');

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

console.log('=== task.js 测试 ===');

test('parseTitle - 解析task.todo格式', () => {
    const result = task.parseTitle('PSMD.完成术语初稿');
    assert.strictEqual(result.taskId, 'PSMD');
    assert.strictEqual(result.todoName, '完成术语初稿');
});

test('parseTitle - 处理todo中的点号', () => {
    const result = task.parseTitle('ego.新版ego, instance or model');
    assert.strictEqual(result.taskId, 'ego');
    assert.strictEqual(result.todoName, '新版ego, instance or model');
});

test('parseTitle - 只有task没有todo', () => {
    const result = task.parseTitle('PSMD');
    assert.strictEqual(result.taskId, 'PSMD');
    assert.strictEqual(result.todoName, null);
});

test('loadTask - 加载存在的task', () => {
    const taskData = task.loadTask('PSMD');
    assert.ok(taskData !== null);
    assert.strictEqual(taskData.id, 'PSMD');
    assert.ok(Array.isArray(taskData.todos));
});

test('loadTask - 加载不存在的task', () => {
    const taskData = task.loadTask('nonexistent');
    assert.strictEqual(taskData, null);
});

test('getTodo - 获取存在的todo', () => {
    const todo = task.getTodo('PSMD', 'term + COM matedata -> deploy metadata -> deploy view');
    assert.ok(todo !== null);
    assert.strictEqual(todo.name, 'term + COM matedata -> deploy metadata -> deploy view');
});

test('listTasks - 列出所有task', () => {
    const tasks = task.listTasks();
    assert.ok(Array.isArray(tasks));
    assert.ok(tasks.includes('PSMD'));
    assert.ok(tasks.includes('ego'));
    assert.ok(tasks.includes('raw'));
});

test('getHistoryDrafts - 获取历史手稿', () => {
    const drafts = task.getHistoryDrafts('PSMD', 'term + COM matedata -> deploy metadata -> deploy view');
    assert.ok(Array.isArray(drafts));
    assert.ok(drafts.length > 0);
});

console.log('\n=== 测试结果 ===');
console.log(`通过: ${passed}`);
console.log(`失败: ${failed}`);
console.log(`总计: ${passed + failed}`);

module.exports = { passed, failed };
