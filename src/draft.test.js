const assert = require('assert');
const draft = require('./draft.js');

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

console.log('=== draft.js 测试 ===');

test('assembleHistoryDrafts - 汇编历史手稿', () => {
    const content = draft.assembleHistoryDrafts('PSMD', 'term + COM matedata -> deploy metadata -> deploy view');
    assert.ok(typeof content === 'string');
    if (content) {
        assert.ok(content.includes('历史工作记录'));
    }
});

test('generateInitialDraft - 生成初始手稿', () => {
    const content = draft.generateInitialDraft('PSMD.term + COM matedata', '20260301');
    assert.ok(typeof content === 'string');
    assert.ok(content.includes('term + COM matedata'));
});

test('getTodoDrafts - 获取todo手稿', () => {
    const drafts = draft.getTodoDrafts('PSMD', 'term + COM matedata -> deploy metadata -> deploy view');
    assert.ok(Array.isArray(drafts));
});

test('getTaskDrafts - 获取task所有手稿', () => {
    const drafts = draft.getTaskDrafts('PSMD');
    assert.ok(Array.isArray(drafts));
});

test('getPrioritizedTodos - 获取优先级todo列表', () => {
    const result = draft.getPrioritizedTodos();
    assert.ok(result.external_front);
    assert.ok(result.internal_front);
    assert.ok(result.normal);
});

console.log('\n=== 测试结果 ===');
console.log(`通过: ${passed}`);
console.log(`失败: ${failed}`);
console.log(`总计: ${passed + failed}`);

module.exports = { passed, failed };
