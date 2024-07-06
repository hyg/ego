const test = require('node:test');
const assert = require('assert');
const util = require('./util.js');
const season = require('./season.js');
const day = require('./day.js');

test('make meta file id',(t)=>{
    assert.strictEqual(util.makemetafileid("入门目录202404151600-3"),"4b12ac08");
});

test('get today str',(t)=>{
    assert.strictEqual(util.datestr(),"20240706");
});

test('get day metadata file name',(t)=>{
    assert.strictEqual(day.dayfilename(),"../data/day/2024/d.20240706.yaml");
});

test('get season metadata file name',(t)=>{
    assert.strictEqual(season.seasonfilename(),"../data/season/2024S3.yaml");
});

test('get wake time',(t)=>{
    assert.strictEqual(day.getwaketime(),20240706053500);
});