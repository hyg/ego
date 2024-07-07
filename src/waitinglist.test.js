const test = require('node:test');
const assert = require('assert');
const waitinglist = require('./waitinglist.js');
const season = require('./season.js');

test('make waitinglist',(t)=>{
    assert.ok(waitinglist.makewaitinglist(season.loadseasonobj()));
});
