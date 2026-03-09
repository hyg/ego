const test = require('node:test');
const assert = require('assert');
const schema = require('./schema.js');
const dayjs = require('dayjs');

test('validate season schema - valid data', (t) => {
    const validSeason = {
        year: 2026,
        season: 1,
        beginmonth: 1,
        beginday: 1,
        lastmonth: 3,
        lastday: 31,
        timetype: [{ name: 'work' }, { name: 'free' }],
        map: {
            '1': {
                '1a': { start: 0, end: 45959 }
            }
        },
        dayplan: {
            '2a': {
                timeslice: { '60': 1 },
                time: [
                    { amount: 15, type: 'free', name: '休整' }
                ]
            }
        }
    };
    
    const result = schema.validateSeason(validSeason);
    assert.strictEqual(result.valid, true);
});

test('validate season schema - invalid data', (t) => {
    const invalidSeason = {
        year: 'invalid',
        season: 5,
        beginmonth: 13,
        timetype: []
    };
    
    const result = schema.validateSeason(invalidSeason);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
});

test('validate day schema - valid data', (t) => {
    const validDay = {
        date: '20260101',
        mode: '2',
        plan: '2a',
        time: [
            { begin: '20260101031500', amount: 15, type: 'free', name: '休整' }
        ]
    };
    
    const result = schema.validateDay(validDay);
    assert.strictEqual(result.valid, true);
});

test('validate day schema - invalid date format', (t) => {
    const invalidDay = {
        date: '2026-01-01',
        mode: '2',
        plan: '2a',
        time: []
    };
    
    const result = schema.validateDay(invalidDay);
    assert.strictEqual(result.valid, false);
});

test('validate voucher schema - valid data', (t) => {
    const validVoucher = {
        date: '2025-01-01 08:35:36',
        title: '微信支付账单',
        VoucherID: '1000039901000601016326240126373',
        VoucherType: '交易单号',
        amount: 200,
        summary: '红包'
    };
    
    const result = schema.validateVoucher(validVoucher);
    assert.strictEqual(result.valid, true);
});

test('validate task schema - valid data', (t) => {
    const validTask = {
        name: 'ego',
        id: '1cJ9sN',
        'parent id': 0,
        start: '2012-01-01T00:00:00.000Z',
        dependencies: null,
        readme: 'task description'
    };
    
    const result = schema.validateTask(validTask);
    assert.strictEqual(result.valid, true);
});

test('validate task schema - invalid parent id type', (t) => {
    const invalidTask = {
        name: 'ego',
        id: '1cJ9sN',
        'parent id': 'invalid'
    };
    
    const result = schema.validateTask(invalidTask);
    assert.strictEqual(result.valid, false);
});
