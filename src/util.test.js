const test = require('node:test');
const assert = require('assert');
const util = require('./util.1.js');

test('make meta file id',(t)=>{
    assert.strictEqual(util.makemetafileid("入门目录202404151600-3"),"4b12ac08");
});

test('get today str',(t)=>{
    assert.strictEqual(util.datestr(-1),"20240919");
    assert.strictEqual(util.datestr(0),"20240920");
    assert.strictEqual(util.datestr(1),"20240921");
});

test('get time from str',(t)=>{
    var time;
    assert.ok(time = util.str2time("20240708170026"));
    console.log("time:",time.toString());
});

test('get date from str',(t)=>{
    var date;
    assert.ok(date = util.str2date("20240708"));
    console.log("date:",date.toString());
});