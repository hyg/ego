const test = require('node:test');
const assert = require('assert');
const day = require('./day.js');

test('get day metadata file name',(t)=>{
    day.debug = true;
    assert.strictEqual(day.dayfilename(),"../data/day/2024/d.20240709.yaml");
});

test('get wake time',(t)=>{
    day.debug = true;
    assert.strictEqual(day.getwaketime(),20240709064200);
});

test('make day object',(t)=>{
    day.debug = true;
    assert.ok(day.makedayobj(1));
    assert.ok(day.makedayobj(2));
});

test('make day table',(t)=>{
    day.debug = true;
    assert.ok(day.maketable(day.makedayobj(1)));
});