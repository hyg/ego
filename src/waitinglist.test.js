const test = require('node:test');
const assert = require('assert');
const wl = require('./waitinglist.js');
const season = require('./season.js');
const config = require('./config.js');

const originalDebug = config.machine.debug;
config.machine.debug = true;

test('make waitinglist',(t)=>{
    assert.ok(wl.makewaitinglist(season.loadseasonobj()));
});

test('make waitinglist brief list',(t)=>{
    let waitinglist;
    assert.ok(waitinglist = wl.makewaitinglist(season.loadseasonobj()));
    assert.ok(wl.makebrieflist(waitinglist));
});

config.machine.debug = originalDebug;
