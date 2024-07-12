const test = require('node:test');
const assert = require('assert');
const season = require('./season.js');

test('get season metadata file name',(t)=>{
    assert.strictEqual(season.seasonfilename(),"../data/season/2024S3.yaml");
});

test('update season sold time',(t)=>{
    season.debug = true;

    var seasonobj;
    assert.ok(seasonobj = season.loadseasonobj());
    assert.ok(season.updatesold(seasonobj));
});

test('delete todo item',(t)=>{
    season.debug = true;
    
    var seasonobj ;
    assert.ok(seasonobj = season.loadseasonobj());
    
    seasonobj.todo = {
        'PSMD': [
            {
                '195': 'PSMD.195',
                'bind': [
                    {
                        '60': 'PSMD.195.60',
                        'bind': [
                            {'30': 'PSMD.195.60.30'},
                            {'90': 'PSMD.195.60.90'}
                        ]
                    },
                    {
                        '90': 'PSMD.195.90'
                    }
                ],
                'readme': 'PSMD.195.readme'
            },
            {
                '90': 'PSMD.90',
                readme: "PSMD.90.readme"
            }
        ],
        'ego': [
            {
                '195': 'ego.195',
                'readme': 'ego.195.readme'
            },
            {
                '30': 'ego.30'
            }
        ]
    };

    var todoitem = {
        'task': 'PSMD',
        'name': 'PSMD.195',
        'id': 0,
        'readme': 'PSMD.195.readnme'
    };

    assert.ok(season.deletetodoitem(seasonobj,todoitem));

    todoitem = {
        'task': 'ego',
        'name': 'ego.30',
        'id': 1
    };

    assert.ok(season.deletetodoitem(seasonobj,todoitem));
});