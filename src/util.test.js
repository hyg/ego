const test = require('node:test');
const assert = require('assert');
const util = require('./util.js');
const season = require('./season.js');
const day = require('./day.js');

test('make meta file id',(t)=>{
    assert.strictEqual(util.makemetafileid("入门目录202404151600-3"),"4b12ac08");
});

test('get today str',(t)=>{
    assert.strictEqual(util.datestr(),"20240708");
    assert.strictEqual(util.datestring(),"20240708");
});

test('get time from str',(t)=>{
    assert.ok(util.str2time("20240708170026"));
});
