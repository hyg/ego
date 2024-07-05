var fs = require('fs');
var yaml = require('js-yaml');
var path = require('./path.js');
var util = require('./util.js');

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
    getseasonobj: function(){
        var seasonfilename = seasonfilename();
        var seasonobj = yaml.load(fs.readFileSync(seasonfilename, 'utf8', { schema: yaml.FAILSAFE_SCHEMA }));

        return seasonobj;
    }
}