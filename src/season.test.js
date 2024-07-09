const test = require('node:test');
const assert = require('assert');
const season = require('./season.js');

test('get season metadata file name',(t)=>{
    assert.strictEqual(season.seasonfilename(),"../data/season/2024S3.yaml");
});


test('update season sold time',(t)=>{
    var seasonobj;
    assert.ok(seasonobj = season.loadseasonobj());
    assert.ok(season.updatesold(seasonobj));
});