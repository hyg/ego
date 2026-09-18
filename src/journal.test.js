const assert = require('assert');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const journal = require('./journal.js');
const day = require('./day.js');

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

test('parseTimeSlice - discuss不计入token', () => {
    const slice = dayData.time.find(t => t.type === 'discuss');
    const result = journal.parseTimeSlice(slice, '20260401', '1e');
    assert.strictEqual(result.tokenAmount, 0);
    assert.strictEqual(result.entries.length, 0);
});

test('parseTimeSlice - check由ego购买', () => {
    const slice = dayData.time.find(t => t.type === 'check');
    const result = journal.parseTimeSlice(slice, '20260401', '1e');
    if (slice.output && result.entries.length > 0) {
        assert.strictEqual(result.tokenAmount, 60);
        assert.strictEqual(result.artifactCount, 1);
        assert.strictEqual(result.entries.length, 6);
    } else {
        console.log('  info: check slice entries:', result.entries.length);
    }
});

test('parseTimeSlice - work消耗时间产生artifact', () => {
    const slice = dayData.time.find(t => t.type === 'work' && t.task === 'ego');
    const result = journal.parseTimeSlice(slice, '20260401', '1e');
    if (slice.output && result.entries.length > 0) {
        assert.strictEqual(result.actualTime, 370);
        assert.strictEqual(result.tokenAmount, 370);
        assert.strictEqual(result.artifactCount, 1);
        assert.strictEqual(result.entries.length, 6);
        
        const egoTimeDebit = result.entries.filter(e => e.account === 'ego' && e.asset === 'time' && e.direction === 'debit')
            .reduce((sum, e) => sum + e.amount, 0);
        const egoTimeCredit = result.entries.filter(e => e.account === 'ego' && e.asset === 'time' && e.direction === 'credit')
            .reduce((sum, e) => sum + e.amount, 0);
        assert.strictEqual(egoTimeDebit, egoTimeCredit, 'ego.time should balance');
        
        const tokenDebit = result.entries.filter(e => e.asset === 'token' && e.direction === 'debit')
            .reduce((sum, e) => sum + e.amount, 0);
        const tokenCredit = result.entries.filter(e => e.asset === 'token' && e.direction === 'credit')
            .reduce((sum, e) => sum + e.amount, 0);
        assert.strictEqual(tokenDebit, tokenCredit, 'token should balance');
    } else {
        console.log('  info: work slice entries:', result.entries.length, 'actualTime:', result.actualTime);
    }
});

test('parseDayObj - 解析完整dayobj', () => {
    const parsed = journal.parseDayObj(dayData);
    assert.strictEqual(parsed.totalToken, 430);
    assert.strictEqual(parsed.totalArtifacts, 2);
    assert.strictEqual(parsed.results.length, dayData.time.length);
});

test('formatOutput - 格式化输出', () => {
    const parsed = journal.parseDayObj(dayData);
    const output = journal.formatOutput(parsed);
    assert.ok(output.includes('今日消耗token总计: 430'));
    assert.ok(output.includes('今日产出artifact: 2'));
});

console.log('\n=== 幂等测试 ===');

test('isDaySettled - 检查未结算日期', () => {
    const status = journal.isDaySettled('20260404');
    assert.strictEqual(status.settled, false);
});

test('isDaySettled - 检查已结算日期（新格式）', () => {
    const status = journal.isDaySettled('20260401');
    assert.strictEqual(status.settled, true);
    assert.ok(status.filename.startsWith('AER.'));
});

test('isDaySettled - 兼容旧格式voucher', () => {
    const status = journal.isDaySettled('20260402');
    assert.strictEqual(status.settled, true);
    assert.ok(status.filename.startsWith('AER.'));
});

test('isDaySettled - 2026Q2之前的日期', () => {
    const status = journal.isDaySettled('20260331');
    console.log('  20260331 status:', status);
});

console.log('\n=== parseWorkSlice 行为矩阵测试 ===');

test('parseWorkSlice - amount>0 无redo: isCompleted=true, 生成action', () => {
    journal.debug = true;
    const slice = {
        amount: 30, task: 'PSMD', todo: 'test_todo',
        output: '../../draft/2026/20260909.01.md'
    };
    const result = journal.parseWorkSlice(slice, '20260909', '1d');
    assert.strictEqual(result.isCompleted, true);
    assert.strictEqual(result.actualTime, 30);
    assert.strictEqual(result.actions.length, 1);
    assert.strictEqual(result.actions[0].type, 'writeback_todo');
    assert.strictEqual(result.actions[0].isCompleted, true);
    assert.strictEqual(result.actions[0].actualTime, 30);
    journal.debug = false;
});

test('parseWorkSlice - amount>0 有redo: isCompleted=false, 生成action', () => {
    journal.debug = true;
    const slice = {
        amount: 0, redo: 30, task: 'PSMD', todo: 'test_todo',
        output: '../../draft/2026/20260404.01.md'
    };
    const result = journal.parseWorkSlice(slice, '20260404', '1d');
    assert.strictEqual(result.isCompleted, false);
    assert.strictEqual(result.redoEstimate, 30);
    journal.debug = false;
});

test('parseWorkSlice - amount=0 无redo: 不生成action, isCompleted=true', () => {
    journal.debug = true;
    const slice = { amount: 0, task: 'PSMD', todo: 'test_todo' };
    const result = journal.parseWorkSlice(slice, '20260909', '1d');
    assert.strictEqual(result.isCompleted, true);
    assert.strictEqual(result.actions.length, 0);
    assert.strictEqual(result.entries.length, 0);
    assert.strictEqual(result.actualTime, 0);
    journal.debug = false;
});

test('parseWorkSlice - amount=0 有redo: 不生成action, isCompleted=false', () => {
    journal.debug = true;
    const slice = { amount: 0, redo: 30, task: 'PSMD', todo: 'test_todo' };
    const result = journal.parseWorkSlice(slice, '20260909', '1d');
    assert.strictEqual(result.isCompleted, false);
    assert.strictEqual(result.actions.length, 0);
    assert.strictEqual(result.entries.length, 0);
    assert.strictEqual(result.actualTime, 0);
    assert.strictEqual(result.redoEstimate, 30);
    journal.debug = false;
});

test('parseWorkSlice - amount=0 不生成财务分录', () => {
    journal.debug = true;
    const slice = { amount: 0, task: 'PSMD', todo: 'test_todo' };
    const result = journal.parseWorkSlice(slice, '20260909', '1d');
    assert.strictEqual(result.tokenAmount, 0);
    assert.strictEqual(result.entries.length, 0);
    assert.strictEqual(result.artifactCount, 0);
    journal.debug = false;
});

test('parseWorkSlice - amount>0 生成财务分录', () => {
    const savedDebug = journal.debug;
    journal.debug = false;
    const slice = {
        amount: 30, task: 'PSMD', todo: 'test_todo',
        output: '../../draft/2026/20260909.01.md'
    };
    const result = journal.parseWorkSlice(slice, '20260909', '1d');
    assert.ok(result.entries.length > 0);
    assert.ok(result.tokenAmount > 0);
    assert.strictEqual(result.artifactCount, 1);
    journal.debug = savedDebug;
});

test('parseWorkSlice - amount>0 无redo: action含draft和time_slice', () => {
    journal.debug = true;
    const slice = {
        amount: 30, task: 'PSMD', todo: 'test_todo',
        output: '../../draft/2026/20260909.01.md'
    };
    const result = journal.parseWorkSlice(slice, '20260909', '1d');
    const action = result.actions[0];
    assert.strictEqual(action.draft, '../../draft/2026/20260909.01.md');
    assert.ok(action.time_slice);
    assert.strictEqual(action.time_slice.amount, 30);
    assert.strictEqual(action.time_slice.date, '20260909');
    journal.debug = false;
});

test('parseWorkSlice - amount>0 有redo: action含redo信息', () => {
    journal.debug = true;
    const slice = {
        amount: 10, redo: 20, task: 'PSMD', todo: 'test_todo',
        output: '../../draft/2026/20260404.01.md'
    };
    const result = journal.parseWorkSlice(slice, '20260404', '1d');
    const action = result.actions[0];
    assert.strictEqual(action.isCompleted, false);
    assert.strictEqual(action.amount, 20);
    assert.strictEqual(action.actualTime, 10);
    journal.debug = false;
});

test('parseWorkSlice - 无task字段: 跳过', () => {
    const slice = { amount: 30, todo: 'test_todo' };
    const result = journal.parseWorkSlice(slice, '20260909', '1d');
    assert.strictEqual(result.description, '无特定task，跳过');
    assert.strictEqual(result.actions.length, 0);
    assert.strictEqual(result.entries.length, 0);
});

test('formatOutput - completed状态显示', () => {
    const parsed = {
        results: [{
            type: 'work',
            taskId: 'PSMD',
            todoName: 'test',
            actualTime: 30,
            isCompleted: true,
            redoEstimate: undefined,
            tokenAmount: 30,
            artifactCount: 1,
            entries: [],
            actions: []
        }],
        totalToken: 30,
        totalArtifacts: 1
    };
    const output = journal.formatOutput(parsed);
    assert.ok(output.includes('状态: 已完成'));
    assert.ok(!output.includes('预计还需'));
});

test('formatOutput - 未完成状态显示', () => {
    const parsed = {
        results: [{
            type: 'work',
            taskId: 'PSMD',
            todoName: 'test',
            actualTime: 10,
            isCompleted: false,
            redoEstimate: 20,
            tokenAmount: 10,
            artifactCount: 1,
            entries: [],
            actions: []
        }],
        totalToken: 10,
        totalArtifacts: 1
    };
    const output = journal.formatOutput(parsed);
    assert.ok(output.includes('预计还需: 20 分钟'));
    assert.ok(output.includes('状态: 未完成'));
});

console.log('\n=== 测试结果 ===');
console.log(`通过: ${passed}`);
console.log(`失败: ${failed}`);
console.log(`总计: ${passed + failed}`);



module.exports = { passed, failed };
