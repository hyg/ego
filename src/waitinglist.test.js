const test = require('node:test');
const assert = require('assert');
const wl = require('./waitinglist.js');
const season = require('./season.js');

test('make waitinglist',(t)=>{
    assert.ok(wl.makewaitinglist(season.loadseasonobj()));
});

test('make waitinglist brief list',(t)=>{
    let waitinglist;
    assert.ok(waitinglist = wl.makewaitinglist(season.loadseasonobj()));
    assert.ok(wl.makebrieflist(waitinglist));
});
