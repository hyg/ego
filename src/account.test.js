const assert = require('assert');
const account = require('./account.js');

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

console.log('=== account.js 测试 ===');

test('loadAccounts - 加载账户配置', () => {
    const accounts = account.loadAccounts();
    assert.ok(accounts.ego);
    assert.ok(accounts.PSMD);
    assert.ok(accounts.raw);
});

test('loadResources - 加载资源类型', () => {
    const resources = account.loadResources();
    assert.ok(resources.rmb);
    assert.ok(resources.time);
    assert.ok(resources.token);
});

test('loadPricing - 加载定价配置', () => {
    const pricing = account.loadPricing(2026, 2);
    assert.strictEqual(pricing.template_1, 1);
    assert.strictEqual(pricing.template_2, 2);
});

test('buyTimeFromRaw - 购买时间凭证', () => {
    const voucher = account.buyTimeFromRaw('PSMD', 2, 195);
    assert.ok(voucher);
    // VoucherID指向外部凭证，内部凭证可以为空
    assert.ok(voucher.date);
    assert.strictEqual(voucher.AccountingEntry.debit.length, 2);
    assert.strictEqual(voucher.AccountingEntry.credit.length, 2);
});

test('allocateToken - 分配token凭证', () => {
    const voucher = account.allocateToken('PSMD', 1000);
    assert.ok(voucher);
    assert.ok(voucher.date);
    assert.strictEqual(voucher.AccountingEntry.debit.length, 1);
    assert.strictEqual(voucher.AccountingEntry.credit.length, 1);
});

console.log('\n=== 测试结果 ===');
console.log(`通过: ${passed}`);
console.log(`失败: ${failed}`);
console.log(`总计: ${passed + failed}`);

module.exports = { passed, failed };
