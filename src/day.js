var fs = require('fs');
var yaml = require('js-yaml');
var path = require('./path.js');
var util = require('./util.js');
var season = require('./season.js');

function log(s) {
    console.log(log.caller.name + ">", s);
}

module.exports = {
    debug: true,
    getwaketime: function(diff=0){        
        var theDate = new Date();
        theDate.setDate(theDate.getDate() + diff);

        var year = theDate.getFullYear();
        var month = theDate.getMonth() + 1 < 10 ? "0" + (theDate.getMonth() + 1) : theDate.getMonth() + 1;
        var day = theDate.getDate() < 10 ? "0" + theDate.getDate() : theDate.getDate();
        var dateStr = year + "" + month + "" + day;

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
        var dayfilename = dayfilename(diff);
        var daystr = yaml.dump(dayobj, { 'lineWidth': -1 });
        if (this.debug == false) {
            fs.writeFileSync(dayfilename, daystr);
        }
        log("day object file name:%s\n%s", dayfilename, daystr);
    },
    makedayobj:function(mode,diff=0){
        var waketime = getwaketime(diff) % 1000000;
        log("waketime:", waketime);
        var seasonobj = season.getseasonobj();
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

        dayobj.date = parseInt(date);
        dayobj.mode = parseInt(mode);
        dayobj.plan = parseInt(dayplan);

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
                drafttimearray.push(timeperiod);
                console.log("devmakedayplan() > delete the job from %s:\n%s", waitinglist[amount.toString()][0].task, waitinglist[amount.toString()][0].name);
                for (var j in seasonobj.todo[timeperiod.subject]) {
                    //console.log("devmakedayplan() > seasonobj.todo[timeperiod.subject][j][timeperiod.amount]: "+seasonobj.todo[timeperiod.subject][j][timeperiod.amount] + " timeperiod.name: "+ timeperiod.name)
                    if (seasonobj.todo[timeperiod.subject][j][timeperiod.amount] == timeperiod.name) {
                        console.log("devmakedayplan()> before delete todo item, waitinglist: %d %d\n" + yaml.dump(waitinglist[amount.toString()][0]), i, j);
                        console.log("devmakedayplan()> before delete todo item:\n" + yaml.dump(seasonobj.todo[timeperiod.subject]));
                        if (seasonobj.todo[timeperiod.subject][j].bind != null) {
                            seasonobj.todo[timeperiod.subject].splice(j, 1, ...seasonobj.todo[timeperiod.subject][j].bind);
                        } else {
                            seasonobj.todo[timeperiod.subject].splice(j, 1);
                        }
                        console.log("devmakedayplan()> after delete todo item:\n" + yaml.dump(seasonobj.todo[timeperiod.subject]));
                    }
                }
                //delete it from waitinglist
                waitinglist[time[i].amount.toString()].shift();

                var draftfilename = path.draftrepopath + date.slice(0, 4) + "/" + date.slice(4, 6) + "/" + begintime + ".md";
                draftstr = timeperiod.subject + ":" + timeperiod.name;
                if (timeslice.namelink != null) {
                    draftstr = draftstr + "  [在线](" + timeslice.namelink + ")";
                }
                draftstr = draftstr + " [离线](" + draftfilename + ")";
                var mailtostr = " <a href=\"mailto:huangyg@mars22.com?subject=关于" + year + "." + month + "." + day + ".[" + timeperiod.name + "]任务&body=日期: " + date + "%0D%0A序号: " + i + "%0D%0A手稿:" + draftfilename + "%0D%0A---请勿修改邮件主题及以上内容 从下一行开始写您的想法---%0D%0A\">[想法]</a>";
                draftstr = draftstr + mailtostr;

                indexstr = indexstr + "- " + beginhour.toString().padStart(2, "0") + ":" + beginminute.toString().padStart(2, "0") + "\t" + timeperiod.subject + ": [" + timeperiod.name + "](../" + path.gitpath + timeperiod.output + ")\n";
                var timestr = "## " + beginhour.toString().padStart(2, "0") + ":" + beginminute.toString().padStart(2, "0") + " ~ " + endhour.toString().padStart(2, "0") + ":" + endminute.toString().padStart(2, "0") + "\n" + timeperiod.subject + ": [" + timeperiod.name + "]\n\n";

                var timeviewfilename = path.draftrepopath + date.slice(0, 4) + "/" + date.slice(4, 6) + "/" + begintime + ".md";
                if (this.debug == false) {
                    fs.writeFileSync(timeviewfilename, timestr);
                }
                console.log("devmakedayplan() > time slice draft file name:%s\n%s", timeviewfilename, timestr);
            } else {
                draftstr = "";
            }
            planstr = planstr + "| " + beginhour.toString().padStart(2, '0') + ":" + beginminute.toString().padStart(2, '0') + "~" + endhour.toString().padStart(2, '0') + ":" + endminute.toString().padStart(2, '0') + " | " + amount + " | " + timeslice.name + " | " + draftstr + " |\n";


            nextbeiginhour = endhour + parseInt((endminute + 1) / 60);;
            nextbeginminute = (endminute + 1) % 60;
        }
        planstr = planstr + "\n" + seasonobj.dayplan[plan].readme;

        var dayplanstr = "# " + year + "." + month + "." + day + ".\n计划  \n\n根据[ego模型时间接口](https://gitee.com/hyg/blog/blob/master/timeflow.md)，今天绑定模版" + mode + "(" + dayplan + ")。\n\n" + planstr + "\n---\n\n" + indexstr;
        var dayplanfilename = path.blogrepopath + "release/time/d." + date + ".md";

        dayobj.time = drafttimearray;
        var draftmetafilename = "../data/draft" + "/" + year + "/" + "d." + date + ".yaml";

        if (this.debug == false) {
            fs.writeFileSync(draftmetafilename, yaml.dump(dayobj, { 'lineWidth': -1 }));
            // save new todo
            fs.writeFileSync(seasonpath, yaml.dump(seasonobj, { 'lineWidth': -1 }));
            fs.writeFileSync(dayplanfilename, dayplanstr);
        }
        console.log("devmakedayplan() > draft meta filename:%s\n%s", draftmetafilename, yaml.dump(dayobj));
        console.log("devmakedayplan() > seasonobj.todo:\n%s", yaml.dump(seasonobj.todo, { 'lineWidth': -1 }));
        console.log("devmakedayplan() > dayplan file name:%s\n%s", dayplanfilename, dayplanstr);
    }
}