var fs = require('fs');
var yaml = require('js-yaml');
var path = require('./path.js');
var util = require('./util.js');
var season = require('./season.js');
var wl = require('./waitinglist.js');

function log(...s) {
    s[0] = log.caller.name + "> " + s[0];
    console.log(...s);
}

module.exports = {
    debug: true,
    getwaketime: function (diff = 0) {
        var theDate = new Date();
        theDate.setDate(theDate.getDate() + diff);

        var year = theDate.getFullYear();
        var month = theDate.getMonth() + 1 < 10 ? "0" + (theDate.getMonth() + 1) : theDate.getMonth() + 1;
        var day = theDate.getDate() < 10 ? "0" + theDate.getDate() : theDate.getDate();
        //var dateStr = year + "" + month + "" + day;
        var dateStr = util.datestr(diff);

        var healthpath = path.rawrepopath + "health/d." + dateStr + ".yaml";
        var healthobj = yaml.load(fs.readFileSync(healthpath, 'utf8', { schema: yaml.FAILSAFE_SCHEMA }));
        var waketime = healthobj.wake.time;

        return waketime;
    },
    dayfilename: function (diff = 0) {
        var theDate = new Date();
        theDate.setDate(theDate.getDate() + diff);

        var year = theDate.getFullYear();
        var month = theDate.getMonth() + 1 < 10 ? "0" + (theDate.getMonth() + 1) : theDate.getMonth() + 1;
        var day = theDate.getDate() < 10 ? "0" + theDate.getDate() : theDate.getDate();
        var dateStr = year + "" + month + "" + day;

        var dayfilename = path.datapath + "day" + "/" + year + "/" + "d." + dateStr + ".yaml";
        return dayfilename;
    },
    loaddayobj: function (diff = 0) {
        var dayfilename = dayfilename(diff);
        var dayobj = yaml.load(fs.readFileSync(dayfilename, 'utf8', { schema: yaml.FAILSAFE_SCHEMA }));

        return dayobj;
    },
    dumpdayobj: function (dayobj, diff = 0) {
        var dayfilename = this.dayfilename(diff);
        var daystr = yaml.dump(dayobj, { 'lineWidth': -1 });
        if (this.debug == false) {
            fs.writeFileSync(dayfilename, daystr);
        }
        log("dump day object file", dayfilename, "\n", daystr);
    },
    makedayobj: function (mode, diff = 0) {
        var date = util.datestr(diff);
        var waketime = this.getwaketime(diff) % 1000000;
        log("waketime:", waketime);
        var seasonobj = season.loadseasonobj();
        var waitinglist = wl.makewaitinglist(seasonobj);

        var dayplan = "";
        for (var plan in seasonobj.map[mode]) {
            var item = seasonobj.map[mode][plan];
            if ((waketime >= item.start) && (waketime <= item.end)) {
                dayplan = plan;
                break;
            }
        }
        if (dayplan == "") {
            log("can't find dayplan");
            return;
        }
        log("dayplan:", dayplan);

        var dayobj = new Object();
        var timearray = new Array();

        dayobj.date = date;
        dayobj.mode = mode;
        dayobj.plan = dayplan;

        var time = seasonobj.dayplan[dayplan].time;
        var beginhour, beginminute, amount, endhour, endminute, begintime, nextbeiginhour, nextbeginminute;
        nextbeiginhour = parseInt(waketime / 10000);
        nextbeginminute = parseInt((waketime % 10000) / 100);

        for (var i in time) {
            var timeslice = time[i];

            if (timeslice.beginhour != null) {
                beginhour = timeslice.beginhour;
                beginminute = timeslice.beginminute;
                amount = timeslice.amount;
                endhour = beginhour + parseInt((beginminute + amount - 1) / 60);
                endminute = (beginminute + amount - 1) % 60;
            } else if (timeslice.endhour != null) {
                beginhour = nextbeiginhour;
                beginminute = nextbeginminute;
                endhour = timeslice.endhour;
                endminute = timeslice.endminute;
                amount = (endhour - beginhour) * 60 + (endminute - beginminute);
            } else {
                beginhour = nextbeiginhour;
                beginminute = nextbeginminute;
                amount = timeslice.amount;
                endhour = beginhour + parseInt((beginminute + amount - 1) / 60);
                endminute = (beginminute + amount - 1) % 60;
            }
            begintime = date + beginhour.toString().padStart(2, '0') + beginminute.toString().padStart(2, '0') + "00";
            console.log("timeslice:", i, timeslice.type, beginhour, beginminute, amount, endhour, endminute);

            var timeperiod = new Object();
            timeperiod.begin = begintime;
            timeperiod.amount = amount;
            timeperiod.type = timeslice.type;
            timeperiod.name = timeslice.name;

            if (timeslice.type == "work") {
                timeperiod.subject = waitinglist[amount.toString()][0].task;
                timeperiod.name = waitinglist[amount.toString()][0].name;
                if (waitinglist[amount.toString()][0].readme != null) {
                    timeperiod.readme = waitinglist[amount.toString()][0].readme;
                }
                timeperiod.output = "draft/" + date.slice(0, 4) + "/" + date.slice(4, 6) + "/" + timeperiod.begin + ".md";
                //timearray.push(timeperiod);
                log("delete the job from", waitinglist[amount.toString()][0].task, ":\n", waitinglist[amount.toString()][0].name);
                for (var j in seasonobj.todo[timeperiod.subject]) {
                    //log("seasonobj.todo[timeperiod.subject][j][timeperiod.amount]: "+seasonobj.todo[timeperiod.subject][j][timeperiod.amount] + " timeperiod.name: "+ timeperiod.name)
                    if (seasonobj.todo[timeperiod.subject][j][timeperiod.amount] == timeperiod.name) {
                        log("before delete todo item, waitinglist: " + i + " " + j + "\n" + yaml.dump(waitinglist[amount.toString()][0]));
                        log("before delete todo item:\n" + yaml.dump(seasonobj.todo[timeperiod.subject]));
                        if (seasonobj.todo[timeperiod.subject][j].bind != null) {
                            seasonobj.todo[timeperiod.subject].splice(j, 1, ...seasonobj.todo[timeperiod.subject][j].bind);
                        } else {
                            seasonobj.todo[timeperiod.subject].splice(j, 1);
                        }
                        log("after delete todo item:\n" + yaml.dump(seasonobj.todo[timeperiod.subject]));
                    }
                }
                //delete it from waitinglist
                waitinglist[time[i].amount.toString()].shift();

                var timestr = "## " + beginhour.toString().padStart(2, "0") + ":" + beginminute.toString().padStart(2, "0") + " ~ " + endhour.toString().padStart(2, "0") + ":" + endminute.toString().padStart(2, "0") + "\n" + timeperiod.subject + ": [" + timeperiod.name + "]\n\n";
                var timeviewfilename = path.draftrepopath + date.slice(0, 4) + "/" + date.slice(4, 6) + "/" + begintime + ".md";
                if (this.debug == false) {
                    fs.writeFileSync(timeviewfilename, timestr);
                }
                log("time slice draft file name", timeviewfilename, "\n", timestr);
            }
            
            if(timeslice.name != null){
                timeperiod.namelink = timeslice.namelink;
            }
            timearray.push(timeperiod);
            nextbeiginhour = endhour + parseInt((endminute + 1) / 60);;
            nextbeginminute = (endminute + 1) % 60;
        }
        dayobj.time = timearray;

        this.dumpdayobj(dayobj, diff);
        season.dumpseasonobj(seasonobj);
        log("dump seasonobj, todo:\n", yaml.dump(seasonobj.todo, { 'lineWidth': -1 }));

        return dayobj;
    },
    maketable: function(dayobj){
        
    }
}