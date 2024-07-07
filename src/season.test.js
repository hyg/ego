const test = require('node:test');
const assert = require('assert');
const season = require('./season.js');

test('get season metadata file name',(t)=>{
    assert.strictEqual(season.seasonfilename(),"../data/season/2024S3.yaml");
});
