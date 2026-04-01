const assert = require('assert');
const path = require('path');
const fs = require('fs');
const migrate = require('./migrate.js');

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

console.log('=== migrate.js 测试 ===');

test('loadTask - 加载task', () => {
    const taskData = migrate.loadTask('PSMD');
    assert.ok(taskData);
    // id现在是哈希值（8位十六进制）
    assert.ok(/^[0-9a-f]{8}$/.test(taskData.id));
});

test('saveTask - 保存task', () => {
    const testData = {
        id: 'test_migrate_unit',
        name: '测试迁移',
        type: 'test',
        todos: []
    };
    
    const result = migrate.saveTask(testData);
    assert.strictEqual(result, true);
    
    // 清理测试文件
    const testFile = path.join(__dirname, '../data/task/test_migrate_unit.yaml');
    if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
    }
});

test('migrate - 迁移2026S1', () => {
    const tasks = migrate.migrate(2026, 1);
    assert.ok(Array.isArray(tasks));
});

console.log('\n=== 测试结果 ===');
console.log(`通过: ${passed}`);
console.log(`失败: ${failed}`);
console.log(`总计: ${passed + failed}`);

module.exports = { passed, failed };
