const test = require('node:test');
const assert = require('assert');
const util = require('./util.1.js');
const dayjs = require('dayjs');

test('make meta file id',(t)=>{
    assert.strictEqual(util.makemetafileid("入门目录202404151600-3"),"4b12ac08");
});

test('get today str',(t)=>{
    const result = util.datestr(0);
    assert.match(result, /^\d{8}$/);
});

test('get date str with diff',(t)=>{
    const today = util.datestr(0);
    const tomorrow = util.datestr(1);
    assert.notStrictEqual(today, tomorrow);
    assert.strictEqual(tomorrow.length, 8);
});

test('get time from str',(t)=>{
    let time;
    assert.ok(time = util.str2time("20240708170026"));
    assert.ok(time instanceof Date);
    console.log("time:",time.toString());
});

test('get date from str returns dayjs',(t)=>{
    let date;
    assert.ok(date = util.str2date("20240708"));
    assert.ok(dayjs.isDayjs(date));
    console.log("date:",date.format("YYYY-MM-DD"));
});

test('format date with Date object', (t) => {
    const date = new Date(2024, 6, 8, 17, 30, 45);
    assert.strictEqual(util.format(date, "yyyy.MM.dd."), "2024.07.08.");
    assert.strictEqual(util.format(date, "hh:mm"), "17:30");
});

test('format date with dayjs object', (t) => {
    const date = dayjs("20240708173045");
    assert.strictEqual(util.format(date, "yyyy-MM-dd"), "2024-07-08");
    assert.strictEqual(util.format(date, "hh:mm:ss"), "17:30:45");
});

test('format date with string', (t) => {
    assert.strictEqual(util.format("20240708", "yyyy-MM-dd"), "2024-07-08");
});

test('format date milliseconds', (t) => {
    const date = new Date(2024, 6, 8, 17, 30, 45, 123);
    assert.strictEqual(util.format(date, "S"), "123");
});

test('util exports dayjs', (t) => {
    assert.strictEqual(util.dayjs, dayjs);
});