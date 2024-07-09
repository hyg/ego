var fs = require('fs');
var yaml = require('js-yaml');
var path = require('./path.js');
var util = require('./util.js');

function log(...s) {
    s[0] = log.caller.name + "> " + s[0];
    console.log(...s);
}

module.exports = {
    debug: true,
    seasonfilename: function () {
        var theDate = new Date();

        var year = theDate.getFullYear();
        var month = theDate.getMonth() + 1;
        //var day = theDate.getDate();
        var season = Math.ceil(month / 3);

        var seasonfilename = path.datapath + "season/" + year + "S" + season + ".yaml";
        return seasonfilename;
    },
    loadseasonobj: function () {
        var seasonfilename = this.seasonfilename();
        var seasonobj = yaml.load(fs.readFileSync(seasonfilename, 'utf8', { schema: yaml.FAILSAFE_SCHEMA }));

        return seasonobj;
    },
    dumpseasonobj: function (seasonobj) {
        var seasonfilename = this.seasonfilename();
        if (this.debug == false) {
            fs.writeFileSync(seasonfilename, yaml.dump(seasonobj, { 'lineWidth': -1 }));
        }
        //log("seasonobj.todo:\n%s", yaml.dump(seasonobj.todo, { 'lineWidth': -1 }));
    },
    updatesold: function (seasonobj) {
        var sold = new Object();
        var firstdateofseason = seasonobj.year + seasonobj.beginmonth.toString().padStart(2, "0") + seasonobj.beginday.toString().padStart(2, "0");
        var lastdateofseason = seasonobj.year + seasonobj.lastmonth.toString().padStart(2, "0") + seasonobj.lastday.toString().padStart(2, "0");

        var daymetadatapath = path.daymetadatapath + seasonobj.year + "/";
        if (fs.existsSync(daymetadatapath)) {
            fs.readdirSync(daymetadatapath).forEach(file => {
                if (file.substring(file.lastIndexOf(".")) == ".yaml") {
                    var date = file.slice(2, 10);
                    //log("date:",date);
                    if ((date >= firstdateofseason) & (date <= lastdateofseason)) {
                        //log("file:",file);
                        var dayobj = yaml.load(fs.readFileSync(daymetadatapath + file, 'utf8', { schema: yaml.FAILSAFE_SCHEMA }));
                        for (var tid in dayobj.time) {
                            if (dayobj.time[tid].subject != null){
                                if (sold[dayobj.time[tid].subject] != null) {
                                    sold[dayobj.time[tid].subject] = sold[dayobj.time[tid].subject] + dayobj.time[tid].amount;
                                } else {
                                    sold[dayobj.time[tid].subject] = dayobj.time[tid].amount;
                                }
                            }
                        }
                    }
                }
            });
        } else {
            console.log("daymetadata path not exist:", daymetadatapath)
        }
        seasonobj.time.sold = sold;
        if(this.debug == true){
            log("season.sold:\n%s",sold)
        }

        return seasonobj;
    }
}