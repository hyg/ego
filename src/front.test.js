const assert = require('assert');
const front = require('./front.js');

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

console.log('=== front.js 测试 ===');

test('getFrontType - 获取对外锋面', () => {
    const frontType = front.getFrontType('PSMD');
    assert.strictEqual(frontType, 'external');
});

test('isExternalFront - 检查对外锋面', () => {
    assert.strictEqual(front.isExternalFront('PSMD'), true);
    assert.strictEqual(front.isExternalFront('raw'), false);
});

test('isInternalFront - 检查对内锋面', () => {
    assert.strictEqual(front.isInternalFront('PSMD'), false);
});

test('calculatePriority - 计算优先级', () => {
    const priority = front.calculatePriority('PSMD');
    assert.ok(typeof priority === 'number');
    assert.ok(priority > 0);
});

test('getExternalFrontTasks - 获取对外锋面列表', () => {
    const tasks = front.getExternalFrontTasks();
    assert.ok(Array.isArray(tasks));
    assert.ok(tasks.some(t => t.id === 'PSMD'));
});

test('getInternalFrontTasks - 获取对内锋面列表', () => {
    const tasks = front.getInternalFrontTasks();
    assert.ok(Array.isArray(tasks));
});

test('generateFrontReport - 生成锋面报告', () => {
    const report = front.generateFrontReport();
    assert.ok(typeof report === 'string');
    assert.ok(report.includes('锋面报告'));
});

console.log('\n=== 测试结果 ===');
console.log(`通过: ${passed}`);
console.log(`失败: ${failed}`);
console.log(`总计: ${passed + failed}`);

module.exports = { passed, failed };
