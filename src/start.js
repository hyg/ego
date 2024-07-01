var fs = require('fs');
var yaml = require('js-yaml');
var path = require('./path.js');
var util = require('./util.js');

module.exports = {
    debug: true,
    devmakedayplan: function (date, mode) {
        var year = date.slice(0, 4);
        var month = date.slice(4, 6);
        var day = date.slice(6, 8);
        var seasonpath = "../data/season/2024S3.yaml";
        var seasonobj = yaml.load(fs.readFileSync(seasonpath, 'utf8', { schema: yaml.FAILSAFE_SCHEMA }));
        var waitinglist = this.makewaitinglist();
        //console.log("devmakedayplan()> waitinglist:",yaml.dump(waitinglist));

        var healthpath = path.rawrepopath + "health/d." + date + ".yaml";
        //console.log("devmakedayplan()> healthpath:",healthpath);
        var healthobj = yaml.load(fs.readFileSync(healthpath, 'utf8', { schema: yaml.FAILSAFE_SCHEMA }));
        var waketime = healthobj.wake.time % 1000000;
        console.log("devmakedayplan()> waketime:", waketime);
        var dayplan = "";

        for (var plan in seasonobj.map[mode]) {
            var item = seasonobj.map[mode][plan];
            if ((waketime >= item.start) && (waketime <= item.end)) {
                dayplan = plan;
                break;
            }
        }
        if (dayplan == "") {
            console.log("devmakedayplan()> can't find dayplan");
            return;
        }
        console.log("devmakedayplan()> dayplan:", dayplan);

        var draftmetadata = new Object();
        var drafttimearray = new Array();

        draftmetadata.date = parseInt(date);
        draftmetadata.mode = parseInt(mode);
        draftmetadata.plan = parseInt(dayplan);

        var planstr = `| 时间片 | 时长 | 用途 | 手稿 |
| --- | --- | --- | --- |
`;
        var draftstr = ""; 
        var indexstr = "";
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
            console.log("devmakedayplan()> timeslice:", i, timeslice.type,beginhour, beginminute, amount, endhour, endminute);

            if (timeslice.type == "work") {
                var timeperiod = new Object();
                timeperiod.begin = begintime;
                timeperiod.amount = amount;
                timeperiod.type = "work";
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

                indexstr = indexstr + "- " +beginhour.toString().padStart(2, "0") + ":" + beginminute.toString().padStart(2, "0") + "\t" + timeperiod.subject + ": [" + timeperiod.name + "](../" + path.gitpath + timeperiod.output + ")\n";
                var timestr = "## " + beginhour.toString().padStart(2, "0") + ":" + beginminute.toString().padStart(2, "0") + " ~ " + endhour.toString().padStart(2, "0") + ":" + endminute.toString().padStart(2, "0") + "\n" + timeperiod.subject + ": [" + timeperiod.name + "]\n\n";

                var timeviewfilename = path.draftrepopath + date.slice(0, 4) + "/" + date.slice(4, 6) + "/" + begintime + ".md";
                if (this.debug == false) {
                    fs.writeFileSync(timeviewfilename, timestr);
                }
                console.log("devmakedayplan() > time slice draft file name:%s\n%s",timeviewfilename,timestr);
            }
            planstr = planstr + "| " + beginhour.toString().padStart(2, '0') + ":" + beginminute.toString().padStart(2, '0') + "~" + endhour.toString().padStart(2, '0') + ":" + endminute.toString().padStart(2, '0') + " | " + amount + " | " + timeslice.name + " | " + draftstr + " |\n";


            nextbeiginhour = endhour + parseInt((endminute + 1) / 60);;
            nextbeginminute = (endminute + 1) % 60;
        }
        planstr = planstr + "\n" + seasonobj.dayplan[plan].readme;

        var dayplanstr = "# " + year + "." + month + "." + day + ".\n计划  \n\n根据[ego模型时间接口](https://gitee.com/hyg/blog/blob/master/timeflow.md)，今天绑定模版" + mode + "(" + dayplan + ")。\n\n" + planstr + "\n---\n\n" + indexstr;
        var dayplanfilename = path.blogrepopath + "release/time/d." + date + ".md";

        draftmetadata.time = drafttimearray;
        var draftmetafilename = "../data/draft" + "/" + year + "/" + "d." + date + ".yaml";

        if (this.debug == false) {
            fs.writeFileSync(draftmetafilename, yaml.dump(draftmetadata, { 'lineWidth': -1 }));
            // save new todo
            fs.writeFileSync(seasonpath, yaml.dump(seasonobj, { 'lineWidth': -1 }));
            fs.writeFileSync(dayplanfilename, dayplanstr);
        }
        console.log("devmakedayplan() > draft meta filename:%s\n%s", draftmetafilename, yaml.dump(draftmetadata));
        console.log("devmakedayplan() > seasonobj.todo:\n%s", yaml.dump(seasonobj.todo, { 'lineWidth': -1 }));
        console.log("devmakedayplan() > dayplan file name:%s\n%s", dayplanfilename, dayplanstr);

    },
    makedaydraft: function (date, plan) {
        var year = date.slice(0, 4);
        var month = date.slice(4, 6);
        var season = Math.ceil(parseInt(month) / 3);
        var seasonpath = "../data/season/" + year + "S" + season + ".yaml";
        //console.log("seasonpath:" + seasonpath);
        var seasonobj = yaml.load(fs.readFileSync(seasonpath, 'utf8', { schema: yaml.FAILSAFE_SCHEMA }));
        var time = seasonobj.dayplan[plan].time;
        var waitinglist = this.makewaitinglist();

        var draftmetadata = new Object();
        var drafttimearray = new Array();
        //console.log(typeof(date));
        draftmetadata.date = parseInt(date);
        draftmetadata.plan = parseInt(plan);
        for (var i in time) {
            if (time[i].type == "work") {
                var timeperiod = new Object();
                timeperiod.begin = date + time[i].beginhour.toString().padStart(2, '0') + time[i].beginminute.toString().padStart(2, '0') + "00";
                timeperiod.amount = time[i].amount;
                timeperiod.type = "work";
                timeperiod.subject = waitinglist[time[i].amount.toString()][0].task;
                timeperiod.name = waitinglist[time[i].amount.toString()][0].name;
                if (waitinglist[time[i].amount.toString()][0].readme != null) {
                    timeperiod.readme = waitinglist[time[i].amount.toString()][0].readme;
                }
                //timeperiod.subject = "tbd";
                //timeperiod.name = "tbd";
                timeperiod.output = "draft/" + date.slice(0, 4) + "/" + date.slice(4, 6) + "/" + timeperiod.begin + ".md";
                drafttimearray.push(timeperiod);

                console.log("delete the job from %s:\n%s", waitinglist[time[i].amount.toString()][0].task, waitinglist[time[i].amount.toString()][0].name);
                for (var j in seasonobj.todo[timeperiod.subject]) {
                    //console.log("makedaydraft() > seasonobj.todo[timeperiod.subject][j][timeperiod.amount]: "+seasonobj.todo[timeperiod.subject][j][timeperiod.amount] + " timeperiod.name: "+ timeperiod.name)
                    if (seasonobj.todo[timeperiod.subject][j][timeperiod.amount] == timeperiod.name) {
                        console.log("makedaydraft()> before delete todo item, waitinglist: %d %d\n" + yaml.dump(waitinglist[time[i].amount.toString()][0]), i, j);
                        console.log("makedaydraft()> before delete todo item:\n" + yaml.dump(seasonobj.todo[timeperiod.subject]));
                        if (seasonobj.todo[timeperiod.subject][j].bind != null) {
                            seasonobj.todo[timeperiod.subject].splice(j, 1, ...seasonobj.todo[timeperiod.subject][j].bind);
                        } else {
                            seasonobj.todo[timeperiod.subject].splice(j, 1);
                        }
                        console.log("makedaydraft()> after delete todo item:\n" + yaml.dump(seasonobj.todo[timeperiod.subject]));
                    }
                }
                //seasonobj.todo[timeperiod.subject] = seasonobj.todo[timeperiod.subject].filter((job) => job[time[i].amount.toString()] != timeperiod.name);

                //delete it from waitinglist
                waitinglist[time[i].amount.toString()].shift();
            }
        }
        draftmetadata.time = drafttimearray;

        //var draftmetafilename = path.draftrepopath + year + "/" + month + "/" + "d." + date + ".yaml";
        var draftmetafilename = "../data/draft" + "/" + year + "/" + "d." + date + ".yaml";
        console.log(draftmetafilename);
        console.log(yaml.dump(draftmetadata));
        if (this.debug == false) {
            fs.writeFileSync(draftmetafilename, yaml.dump(draftmetadata, { 'lineWidth': -1 }));
            // save new todo
            fs.writeFileSync(seasonpath, yaml.dump(seasonobj, { 'lineWidth': -1 }));
        }
        console.log("seasonobj.todo:\n%s", yaml.dump(seasonobj.todo, { 'lineWidth': -1 }));
    },
    makedayplan: function (date) {
        var year = date.slice(0, 4);
        var month = date.slice(4, 6);
        var day = date.slice(6, 8);
        var draftmetafilename = "../data/draft" + "/" + year + "/" + "d." + date + ".yaml";
        var draftmetadata;
        try {
            if (fs.existsSync(draftmetafilename)) {
                draftmetadata = yaml.load(fs.readFileSync(draftmetafilename, 'utf8', { schema: yaml.FAILSAFE_SCHEMA }));
            } else {
                console.log("the draft metadata isn't exist:" + draftmetafilename);
                process.exit();
            }
        } catch (e) {
            // failure
            console.log("yaml read error！" + e);
            process.exit();
        }
        var plan = draftmetadata.plan;

        var timeslicename = new Object();
        for (var i in draftmetadata.time) {
            timeslicename[draftmetadata.time[i].begin] = draftmetadata.time[i].name;
        }

        var season = Math.ceil(parseInt(month) / 3);
        var seasonpath = "../data/season/" + year + "S" + season + ".yaml";
        //console.log("seasonpath:" + seasonpath);
        var seasonobj = yaml.load(fs.readFileSync(seasonpath, 'utf8', { schema: yaml.FAILSAFE_SCHEMA }));
        var time = seasonobj.dayplan[plan].time;

        var planstr = `| 时间片 | 时长 | 用途 | 手稿 |
| --- | --- | --- | --- |
`;
        for (var i in seasonobj.dayplan[plan].time) {
            var timeslice = seasonobj.dayplan[plan].time[i];
            var beginhour = timeslice.beginhour;
            var beginminute = timeslice.beginminute;
            var amount = timeslice.amount;
            var endhour = beginhour + parseInt((beginminute + amount - 1) / 60);
            var endminute = (beginminute + amount - 1) % 60;

            var begintime = date + beginhour.toString().padStart(2, '0') + beginminute.toString().padStart(2, '0') + "00";

            var draftstr = "";
            if (timeslicename[begintime] != null) {
                draftstr = draftstr + timeslicename[begintime] + "  ";
            }
            if (timeslice.namelink != null) {
                draftstr = draftstr + "[在线](" + timeslice.namelink + ")";
            }
            if (timeslice.type == "work") {
                var draftfilename = path.draftrepopath + date.slice(0, 4) + "/" + date.slice(4, 6) + "/" + begintime + ".md";
                draftstr = draftstr + " [离线](" + draftfilename + ")";

                var mailtostr = " <a href=\"mailto:huangyg@mars22.com?subject=关于" + year + "." + month + "." + day + ".[" + timeslicename[begintime] + "]任务&body=日期: " + date + "%0D%0A序号: " + i + "%0D%0A手稿:" + draftfilename + "%0D%0A---请勿修改邮件主题及以上内容 从下一行开始写您的想法---%0D%0A\">[想法]</a>";
                draftstr = draftstr + mailtostr;
            }

            planstr = planstr + "| " + beginhour.toString().padStart(2, '0') + ":" + beginminute.toString().padStart(2, '0') + "~" + endhour.toString().padStart(2, '0') + ":" + endminute.toString().padStart(2, '0') + " | " + amount + " | " + timeslice.name + " | " + draftstr + " |\n";
        }
        planstr = planstr + "\n" + seasonobj.dayplan[plan].readme;
        //console.log("planstr:\n"+planstr);

        var dayplan = "# " + year + "." + month + "." + day + ".\n计划  \n\n根据[ego模型时间接口](https://gitee.com/hyg/blog/blob/master/timeflow.md)，今天绑定模版" + plan + "。\n\n" + planstr + "\n---\n\n";

        for (var i in draftmetadata.time) {
            var subject = draftmetadata.time[i].subject;
            var taskname = draftmetadata.time[i].name;
            if (taskname === undefined) {
                taskname = "无名任务";
            }
            var output = draftmetadata.time[i].output;

            var begintime = draftmetadata.time[i].begin;
            var beginhour = parseInt((begintime - parseInt(begintime / 1000000) * 1000000) / 10000);
            var beginminute = parseInt((begintime - parseInt(begintime / 10000) * 10000) / 100);
            var amount = draftmetadata.time[i].amount;
            var endhour = beginhour + parseInt((beginminute + amount) / 60);
            var endminute = (beginminute + amount) % 60;
            //console.log(begintime,beginhour,beginminute,amount,endhour,endminute);
            dayplan = dayplan + "- " + beginhour.toString().padStart(2, "0") + ":" + beginminute.toString().padStart(2, "0") + "\t" + subject + "  [" + taskname + "](../" + path.gitpath + output + ")\n";
            var timestr = "## " + beginhour.toString().padStart(2, "0") + ":" + beginminute.toString().padStart(2, "0") + " ~ " + endhour.toString().padStart(2, "0") + ":" + endminute.toString().padStart(2, "0") + "\n" + taskname + "\n\n";

            var timeviewfilename = path.draftrepopath + date.slice(0, 4) + "/" + date.slice(4, 6) + "/" + begintime + ".md";
            console.log("time slice draft file name:" + timeviewfilename);
            console.log(timestr);
            if (this.debug == false) {
                fs.writeFileSync(timeviewfilename, timestr);
            }
        }

        var dayplanfilename = path.blogrepopath + "release/time/d." + date + ".md";
        console.log("dayplan file name:\n" + dayplanfilename + "\ncontent:\n" + dayplan);
        if (this.debug == false) {
            fs.writeFileSync(dayplanfilename, dayplan);
        }
    },
    makewaitinglist: function () {
        var date = util.datestr();
        var year = date.slice(0, 4);
        var month = date.slice(4, 6);
        var season = Math.ceil(parseInt(month) / 3);
        var seasonpath = "../data/season/" + year + "S" + season + ".yaml";
        //console.log("seasonpath:" + seasonpath);
        var seasonobj = yaml.load(fs.readFileSync(seasonpath, 'utf8', { schema: yaml.FAILSAFE_SCHEMA }));
        var todoobj = seasonobj.todo;
        var timeobj = seasonobj.time;

        var rest = new Object();
        var resttotal = 0;
        for (var task in timeobj.alloc) {
            if (timeobj.sold[task] != null) {
                rest[task] = timeobj.alloc[task] - timeobj.sold[task];
            } else {
                rest[task] = timeobj.alloc[task];
            }
            resttotal = resttotal + rest[task];
        }
        //console.log("resttotal:",resttotal);
        //console.log("rest:\n"+yaml.dump(rest));
        var restSorted = Object.keys(rest).sort(function (a, b) { return rest[b] - rest[a] });
        //console.log("resetSOrted:\n"+ yaml.dump(restSorted));

        // init the waitinglist
        var dayplanobj = seasonobj.dayplan;
        var waitinglist = new Object();
        for (var planid in dayplanobj) {
            for (var amounttype in dayplanobj[planid].supply) {
                if (waitinglist[amounttype] == null) {
                    // a new amount type
                    var amounttypelist = new Array();
                    waitinglist[amounttype] = amounttypelist;
                }
            }
        }
        //console.log("waitinglist:\n",yaml.dump(waitinglist));

        var hasobj = true;
        var k = 0;
        while (hasobj) {
            hasobj = false;
            // search the k th member of todo list of each task
            //console.log("search the %d th member...",k);
            for (var j = 0; j < restSorted.length; j++) {
                //console.log("search the %d th task:%s\n",j,restSorted[j]);
                for (var amounttype in waitinglist) {
                    if (todoobj[restSorted[j]][k] != null) {
                        //console.log("find a item:",yaml.dump(todoobj[restSorted[j]][k]));
                        hasobj = true;
                        if (todoobj[restSorted[j]][k][amounttype] != null) {
                            var atask = new Object();
                            atask.task = restSorted[j];
                            atask.name = todoobj[restSorted[j]][k][amounttype];
                            atask.id = k;
                            if (todoobj[restSorted[j]][k]["readme"] != null) {
                                atask.readme = todoobj[restSorted[j]][k]["readme"];
                            }
                            waitinglist[amounttype].push(atask);
                        }
                    }

                }
            }
            k = k + 1;
        }
        //console.log("waitinglist:\n",yaml.dump(waitinglist));
        return waitinglist;
    },
    testdayplan: function () {
        var date = util.datestr();
        var year = date.slice(0, 4);
        var month = date.slice(4, 6);
        var season = Math.ceil(parseInt(month) / 3);
        var seasonpath = "../data/season/" + year + "S" + season + ".yaml";
        //console.log("seasonpath:" + seasonpath);
        var seasonobj = yaml.load(fs.readFileSync(seasonpath, 'utf8', { schema: yaml.FAILSAFE_SCHEMA }));
        var dayplanobj = seasonobj.dayplan;

        for (var plan in dayplanobj) {
            var waitinglist = this.makewaitinglist();
            var time = seasonobj.dayplan[plan].time;

            var draftmetadata = new Object();
            var drafttimearray = new Array();
            draftmetadata.date = parseInt(date);
            draftmetadata.plan = parseInt(plan);
            for (var i in time) {
                if (time[i].type == "work") {
                    var timeperiod = new Object();
                    timeperiod.begin = date + time[i].beginhour.toString().padStart(2, '0') + time[i].beginminute.toString().padStart(2, '0') + "00";
                    timeperiod.amount = time[i].amount;
                    timeperiod.type = "work";
                    timeperiod.subject = waitinglist[time[i].amount.toString()][0].task;
                    timeperiod.name = waitinglist[time[i].amount.toString()][0].name;
                    if (waitinglist[time[i].amount.toString()][0].readme != null) {
                        timeperiod.readme = waitinglist[time[i].amount.toString()][0].readme;
                    }
                    timeperiod.output = "draft/" + date.slice(0, 4) + "/" + date.slice(4, 6) + "/" + timeperiod.begin + ".md";
                    drafttimearray.push(timeperiod);
                    //console.log("drafttimearray:",yaml.dump(drafttimearray));
                    //deleta it from season.todo

                    //seasonobj.todo[timeperiod.subject] = seasonobj.todo[timeperiod.subject].filter((job) => job[time[i].amount.toString()] != timeperiod.name);
                    //seasonobj.todo[waitinglist[time[i].amount.toString()][0].task].splice(waitinglist[time[i].amount.toString()][0].id, 1);
                    //console.log("delete the job from %s:\n%s", waitinglist[time[i].amount.toString()][0].task, waitinglist[time[i].amount.toString()][0].name)
                    //delete it from waitinglist
                    waitinglist[time[i].amount.toString()].shift();
                }
            }
            draftmetadata.time = drafttimearray;
            console.log("%s draftmetadata:\n%s", plan, yaml.dump(draftmetadata, { 'lineWidth': -1 }));

        }
    }
};