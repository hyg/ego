var fs = require('fs');
var yaml = require('js-yaml');
var path = require('./path.js');
var util = require('./util.js');

function log(...s) {
    s[0] = log.caller.name + "> " + s[0];
    console.log( ...s);
}

module.exports = {
    debug: true,
    seasonfilename: function(){
        var theDate = new Date();

        var year = theDate.getFullYear();
        var month = theDate.getMonth()+1;
        //var day = theDate.getDate();
        var season = Math.ceil(month / 3);

        var seasonfilename = path.datapath + "season/" + year + "S" + season + ".yaml";
        return seasonfilename;
    },
    loadseasonobj: function(){
        var seasonfilename = this.seasonfilename();
        var seasonobj = yaml.load(fs.readFileSync(seasonfilename, 'utf8', { schema: yaml.FAILSAFE_SCHEMA }));

        return seasonobj;
    },
    dumpseasonobj: function(seasonobj){
        var seasonfilename = this.seasonfilename();
        if (this.debug == false) {
            fs.writeFileSync(seasonfilename, yaml.dump(seasonobj, { 'lineWidth': -1 }));
        }
        //log("seasonobj.todo:\n%s", yaml.dump(seasonobj.todo, { 'lineWidth': -1 }));
    }
}