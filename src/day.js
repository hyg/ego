var fs = require('fs');
var yaml = require('js-yaml');
var path = require('./path.js');
var util = require('./util.js');

module.exports = {
    debug: true,
    dayfilename: function(diff=0){
        var theDate = new Date();
        theDate.setDate(theDate.getDate() + diff);

        var year = theDate.getFullYear();
        var month = theDate.getMonth() + 1 < 10 ? "0" + (theDate.getMonth() + 1) : theDate.getMonth() + 1;
        var day = theDate.getDate() < 10 ? "0" + theDate.getDate() : theDate.getDate();
        var dateStr = year + "" + month + "" + day;

        var dayfilename = path.datapath +  "day" + "/" + year + "/" + "d." + dateStr + ".yaml";
        return dayfilename;
    },
    getdayobj: function(diff=0){
        var dayfilename = dayfilename(diff);
        var dayobj = yaml.load(fs.readFileSync(dayfilename, 'utf8', { schema: yaml.FAILSAFE_SCHEMA }));

        return dayobj;
    }
}