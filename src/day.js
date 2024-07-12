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
        log("dump day object file: %s\n%s", dayfilename, daystr);
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
            log("timeslice:", i, timeslice.type, beginhour, beginminute, amount, endhour, endminute);

            var timeperiod = new Object();
            timeperiod.begin = begintime;
            timeperiod.amount = amount;
            timeperiod.type = timeslice.type;
            timeperiod.name = timeslice.name;

            if (timeslice.type == "work") {
                timeperiod.subject = waitinglist[amount.toString()][0].task;
                timeperiod.title = waitinglist[amount.toString()][0].name;
                if (waitinglist[amount.toString()][0].readme != null) {
                    timeperiod.readme = waitinglist[amount.toString()][0].readme;
                }
                timeperiod.output = path.draftrepopath + date.slice(0, 4) + "/" + date.slice(4, 6) + "/" + begintime + ".md";

                seasonobj = season.deletetodoitem(seasonobj,waitinglist[amount.toString()][0]);
                waitinglist = wl.makewaitinglist(seasonobj);
                
                /* log("delete the job from %s: [%s]", waitinglist[amount.toString()][0].task, waitinglist[amount.toString()][0].name);
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
                waitinglist[time[i].amount.toString()].shift(); */

                var timestr = "## " + beginhour.toString().padStart(2, "0") + ":" + beginminute.toString().padStart(2, "0") + " ~ " + endhour.toString().padStart(2, "0") + ":" + endminute.toString().padStart(2, "0") + "\n" + timeperiod.subject + ": [" + timeperiod.name + "]\n\n";
                if (this.debug == false) {
                    fs.writeFileSync(timeperiod.output, timestr);
                }
                log("time slice draft file name:%s\n%s", timeviewfilename, timestr);
            }

            if (timeslice.namelink != null) {
                timeperiod.namelink = timeslice.namelink;
            }
            timearray.push(timeperiod);
            nextbeiginhour = endhour + parseInt((endminute + 1) / 60);;
            nextbeginminute = (endminute + 1) % 60;
        }
        dayobj.time = timearray;

        this.dumpdayobj(dayobj, diff);
        season.debug = this.debug;
        season.dumpseasonobj(seasonobj);
        log("dump seasonobj, todo:\n%s", yaml.dump(seasonobj.todo, { 'lineWidth': -1 }));

        return dayobj;
    },
    maketable: function (dayobj) {
        var tablestr = `| 时间片 | 时长 | 用途 | 手稿 |
| --- | --- | :---: | --- |
`;
        var year = dayobj.date.slice(0, 4);
        var month = dayobj.date.slice(4, 6);
        var day = dayobj.date.slice(6, 8);

        for (var i in dayobj.time) {
            var timeslice = dayobj.time[i];
            var begintime = util.str2time(timeslice.begin);
            var endtime = new Date(begintime) ;
            endtime = new Date(endtime.setMinutes(endtime.getMinutes() + timeslice.amount - 1));

            var draftstr = "";
            if (timeslice.type == "work") {
                var draftfilename = path.draftrepopath + year + "/" + month + "/" + timeslice.begin + ".md";
                draftstr = draftstr + timeslice.subject + ":" + timeslice.title + " ";

                if (timeslice.namelink != null) {
                    draftstr = draftstr + "[在线](" + timeslice.namelink + ")";
                }
                draftstr = draftstr + " [离线](" + draftfilename + ")";
                var mailtostr = " <a href=\"mailto:huangyg@mars22.com?subject=关于" + year + "." + month + "." + day + ".[" +  timeslice.subject + ":" + timeslice.title + "]任务&body=日期: " + dayobj.date + "%0D%0A序号: " + i + "%0D%0A手稿:" + draftfilename + "%0D%0A---请勿修改邮件主题及以上内容 从下一行开始写您的想法---%0D%0A\">[想法]</a>";
                draftstr = draftstr + mailtostr;
            }
            tablestr = tablestr + "| " + begintime.Format("hh:mm") + "~" + endtime.Format("hh:mm") + " | " + timeslice.amount + " | " + timeslice.name + " | " + draftstr + " |\n";
        }

        log("table string:\n%s",tablestr);
        return tablestr;
    },
    makeindex: function (dayobj,type) {
        var indexstr = "";

        for(var i in dayobj.time){
            var timeperiod = dayobj.time[i];
            var begintime = util.str2time(timeperiod.begin);
            var endtime = new Date(begintime) ;
            endtime = new Date(endtime.setMinutes(endtime.getMinutes() + timeperiod.amount - 1));

            var linkstr="";
            if(type == "plan"){
                linkstr = path.gitpath + timeperiod.output ;
            }else if(type == "log"){
                linkstr = "#" + timeperiod.begin ;
            }

            if(timeperiod.type == "work"){
                indexstr = indexstr + "- " +  begintime.Format("hh:mm") + "~" + endtime.Format("hh:mm") +  "\t" + timeperiod.subject + ": [" + timeperiod.title + "](" + linkstr + ")\n";
            }
        }

        log("indexstr:\n%s",indexstr);
        return indexstr ;
    },
    makedayplan: function(dayobj){
        var datestr = util.datestr(diff);
        var date = util.str2time(datestr);

        var dayplanstr = "# " + date.Format("yyyy.MM.dd.") + "\n日计划\n\n" 
        + "根据[ego模型时间接口](https://gitee.com/hyg/blog/blob/master/timeflow.md)，今天绑定模版" + dayobj.mode + "(" + dayobj.plan + ")。\n\n" 
        + this.maketable(dayobj) + "\n---\n\n" + this.makeindex(dayobj,"plan") ;

        var dayplanfilename = path.blogrepopath + "release/time/d." + datestr + ".md";       
        if (this.debug == false) {
            fs.writeFileSync(dayplanfilename, dayplanstr);
        }
        log("make day plan file: %s\n%s", dayplanfilename, dayplanstr);

        return dayplanstr;
    },
    makedaylog: function(dayobj){
        var datestr = util.datestr(diff);
        var date = util.str2time(datestr);

        var dayplanstr = "# " + date.Format("yyyy.MM.dd.") + "\n日小结\n\n" 
        + "<a id=\"top\"></a>\n" + "根据[ego模型时间接口](https://gitee.com/hyg/blog/blob/master/timeflow.md)，今天绑定模版" + dayobj.mode + "(" + dayobj.plan + ")。\n\n" 
        + "<a id=\"index\"></a>" + this.makeindex(dayobj,"log") ;

        var dayplanfilename = path.blogrepopath + "release/time/d." + datestr + ".md";       
        if (this.debug == false) {
            fs.writeFileSync(dayplanfilename, dayplanstr);
        }
        log("make day plan file: %s\n%s", dayplanfilename, dayplanstr);

        return dayplanstr;
    }
}