const test = require('node:test');
const assert = require('assert');
const day = require('./day.js');

/* test('get day metadata file name',(t)=>{
    day.debug = true;
    assert.strictEqual(day.dayfilename(),"../data/day/2024/d.20240711.yaml");
}); */

/* test('get wake time',(t)=>{
    day.debug = true;
    assert.strictEqual(day.getwaketime(),20240711063100);
}); */

test('make day object',(t)=>{
    day.debug = true;
    assert.ok(day.makedayobj(1));
    assert.ok(day.makedayobj(2));
});

/* test('make day table',(t)=>{
    day.debug = true;
    assert.ok(day.maketable(day.makedayobj(1)));
}); */

/* test('make day index',(t)=>{
    day.debug = true;
    assert.ok(day.makeindex(day.makedayobj(1),"plan"));
    assert.ok(day.makeindex(day.makedayobj(1),"log"));
}); */