const fs = require('fs');
const yaml = require('js-yaml');
const config = require('./config.js');
const util = require('./util.js');

function log(s) {
    console.log(log.caller.name + ">", s);
}

module.exports = {
    debug: true,
    devmakedayplan: function (date, mode) {
        let year = date.slice(0, 4);
        let month = date.slice(4, 6);
        let day = date.slice(6, 8);
        let seasonpath = "../data/season/2024S3.yaml";
        let seasonobj = yaml.load(fs.readFileSync(seasonpath, 'utf8', { schema: yaml.FAILSAFE_SCHEMA }));
        let waitinglist = this.makewaitinglist();
        //console.log("devmakedayplan()> waitinglist:",yaml.dump(waitinglist));

        let healthpath = config.rawrepopath + "health/" + util.parseTemplate(config.templates.health, { date: date });
        //console.log("devmakedayplan()> healthpath:",healthpath);
        let healthobj = yaml.load(fs.readFileSync(healthpath, 'utf8', { schema: yaml.FAILSAFE_SCHEMA }));
        let waketime = healthobj.wake.time % 1000000;
        console.log("devmakedayplan()> waketime:", waketime);
        let dayplan = "";

        for (let plan in seasonobj.map[mode]) {
            let item = seasonobj.map[mode][plan];
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

        let draftmetadata = new Object();
        let drafttimearray = new Array();

        draftmetadata.date = parseInt(date);
        draftmetadata.mode = parseInt(mode);
        draftmetadata.plan = parseInt(dayplan);

        let planstr = `| 时间片 | 时长 | 用途 | 手稿 |
| --- | --- | --- | --- |
`;
        let draftstr = "";
        let indexstr = "";
        let time = seasonobj.dayplan[dayplan].time;
        let beginhour, beginminute, amount, endhour, endminute, begintime, nextbeiginhour, nextbeginminute;
        nextbeiginhour = parseInt(waketime / 10000);
        nextbeginminute = parseInt((waketime % 10000) / 100);
        for (let i in time) {
            let timeslice = time[i];

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
            console.log("devmakedayplan()> timeslice:", i, timeslice.type, beginhour, beginminute, amount, endhour, endminute);

            if (timeslice.type == "work") {
                let timeperiod = new Object();
                timeperiod.begin = begintime;
                timeperiod.amount = amount;
                timeperiod.type = "work";
                timeperiod.subject = waitinglist[amount.toString()][0].task;
                timeperiod.name = waitinglist[amount.toString()][0].name;
                if (waitinglist[amount.toString()][0].readme != null) {
                    timeperiod.readme = waitinglist[amount.toString()][0].readme;
                }
                timeperiod.output = "draft/" + date.slice(0, 4) + "/" + timeperiod.begin + ".md";
                drafttimearray.push(timeperiod);
                console.log("devmakedayplan() > delete the job from %s:\n%s", waitinglist[amount.toString()][0].task, waitinglist[amount.toString()][0].name);
                for (let j in seasonobj.todo[timeperiod.subject]) {
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

                let draftfilename = config.draftrepopath + date.slice(0, 4) + "/" + timeperiod.begin + ".md";
                draftstr = timeperiod.subject + ":" + timeperiod.name;
                if (timeslice.namelink != null) {
                    draftstr = draftstr + "  [在线](" + timeslice.namelink + ")";
                }
                draftstr = draftstr + " [离线](" + draftfilename + ")";
                let mailtostr = " <a href=\"mailto:huangyg@mars22.com?subject=关于" + year + "." + month + "." + day + ".[" + timeperiod.name + "]任务&body=日期: " + date + "%0D%0A序号: " + i + "%0D%0A手稿:" + draftfilename + "%0D%0A---请勿修改邮件主题及以上内容 从下一行开始写您的想法---%0D%0A\">[想法]</a>";
                draftstr = draftstr + mailtostr;

                indexstr = indexstr + "- " + beginhour.toString().padStart(2, "0") + ":" + beginminute.toString().padStart(2, "0") + "\t" + timeperiod.subject + ": [" + timeperiod.name + "](../" + config.gitpath + timeperiod.output + ")\n";
                let timestr = "## " + beginhour.toString().padStart(2, "0") + ":" + beginminute.toString().padStart(2, "0") + " ~ " + endhour.toString().padStart(2, "0") + ":" + endminute.toString().padStart(2, "0") + "\n" + timeperiod.subject + ": [" + timeperiod.name + "]\n\n";

                let timeviewfilename = config.draftrepopath + date.slice(0, 4) + "/" + timeperiod.begin + ".md";
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

        let dayplanstr = "# " + year + "." + month + "." + day + ".\n计划  \n\n根据[ego模型时间接口](https://gitee.com/hyg/blog/blob/master/timeflow.md)，今天绑定模版" + mode + "(" + dayplan + ")。\n\n" + planstr + "\n---\n\n" + indexstr;
        let dayplanfilename = config.blogrepopath + "release/time/" + util.parseTemplate(config.templates.blogTime, { date: date });

        draftmetadata.time = drafttimearray;
        let draftmetafilename = "../data/draft" + "/" + year + "/" + util.parseTemplate(config.templates.draftMeta, { date: date });

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
        let year = date.slice(0, 4);
        let month = date.slice(4, 6);
        let season = Math.ceil(parseInt(month) / 3);
        let seasonpath = config.dataseasonpath + util.parseTemplate(config.templates.season, { year: year, season: season });
        //console.log("seasonpath:" + seasonpath);
        let seasonobj = yaml.load(fs.readFileSync(seasonpath, 'utf8', { schema: yaml.FAILSAFE_SCHEMA }));
        let time = seasonobj.dayplan[plan].time;
        let waitinglist = this.makewaitinglist();

        let draftmetadata = new Object();
        let drafttimearray = new Array();
        //console.log(typeof(date));
        draftmetadata.date = parseInt(date);
        //draftmetadata.plan = parseInt(plan);
        draftmetadata.plan = plan;
        for (let i in time) {
            if (time[i].type == "work") {
                let timeperiod = new Object();
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
                timeperiod.output = "draft/" + date.slice(0, 4) + "/" + timeperiod.begin + ".md";
                drafttimearray.push(timeperiod);

                console.log("delete the job from %s:\n%s", waitinglist[time[i].amount.toString()][0].task, waitinglist[time[i].amount.toString()][0].name);
                for (let j in seasonobj.todo[timeperiod.subject]) {
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

        //let draftmetafilename = config.draftrepopath + year + "/" + month + "/" + "d." + date + ".yaml";
        let draftmetafilename = "../data/draft" + "/" + year + "/" + util.parseTemplate(config.templates.draftMeta, { date: date });
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
        let year = date.slice(0, 4);
        let month = date.slice(4, 6);
        let day = date.slice(6, 8);
        let draftmetafilename = "../data/draft" + "/" + year + "/" + util.parseTemplate(config.templates.draftMeta, { date: date });
        let draftmetadata;
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
        let plan = draftmetadata.plan;

        let timeslicename = new Object();
        for (let i in draftmetadata.time) {
            timeslicename[draftmetadata.time[i].begin] = draftmetadata.time[i].name;
        }

        let season = Math.ceil(parseInt(month) / 3);
        let seasonpath = config.dataseasonpath + util.parseTemplate(config.templates.season, { year: year, season: season });
        //console.log("seasonpath:" + seasonpath);
        let seasonobj = yaml.load(fs.readFileSync(seasonpath, 'utf8', { schema: yaml.FAILSAFE_SCHEMA }));
        let time = seasonobj.dayplan[plan].time;

        let planstr = `| 时间片 | 时长 | 用途 | 手稿 |
| --- | --- | --- | --- |
`;
        for (let i in seasonobj.dayplan[plan].time) {
            let timeslice = seasonobj.dayplan[plan].time[i];
            let beginhour = timeslice.beginhour;
            let beginminute = timeslice.beginminute;
            let amount = timeslice.amount;
            let endhour = beginhour + parseInt((beginminute + amount - 1) / 60);
            let endminute = (beginminute + amount - 1) % 60;

            let begintime = date + beginhour.toString().padStart(2, '0') + beginminute.toString().padStart(2, '0') + "00";

            let draftstr = "";
            if (timeslicename[begintime] != null) {
                draftstr = draftstr + timeslicename[begintime] + "  ";
            }
            if (timeslice.namelink != null) {
                draftstr = draftstr + "[在线](" + timeslice.namelink + ")";
            }
            if (timeslice.type == "work") {
                let draftfilename = config.draftrepopath + date.slice(0, 4) + "/" + begintime + ".md";
                draftstr = draftstr + " [离线](" + draftfilename + ")";

                let mailtostr = " <a href=\"mailto:huangyg@mars22.com?subject=关于" + year + "." + month + "." + day + ".[" + timeslicename[begintime] + "]任务&body=日期: " + date + "%0D%0A序号: " + i + "%0D%0A手稿:" + draftfilename + "%0D%0A---请勿修改邮件主题及以上内容 从下一行开始写您的想法---%0D%0A\">[想法]</a>";
                draftstr = draftstr + mailtostr;
            }

            planstr = planstr + "| " + beginhour.toString().padStart(2, '0') + ":" + beginminute.toString().padStart(2, '0') + "~" + endhour.toString().padStart(2, '0') + ":" + endminute.toString().padStart(2, '0') + " | " + amount + " | " + timeslice.name + " | " + draftstr + " |\n";
        }
        planstr = planstr + "\n" + seasonobj.dayplan[plan].readme;
        //console.log("planstr:\n"+planstr);

        let dayplan = "# " + year + "." + month + "." + day + ".\n计划  \n\n根据[ego模型时间接口](https://gitee.com/hyg/blog/blob/master/timeflow.md)，今天绑定模版" + plan + "。\n\n" + planstr + "\n---\n\n";

        for (let i in draftmetadata.time) {
            let subject = draftmetadata.time[i].subject;
            let taskname = draftmetadata.time[i].name;
            if (taskname === undefined) {
                taskname = "无名任务";
            }
            let output = draftmetadata.time[i].output;

            let begintime = draftmetadata.time[i].begin;
            let beginhour = parseInt((begintime - parseInt(begintime / 1000000) * 1000000) / 10000);
            let beginminute = parseInt((begintime - parseInt(begintime / 10000) * 10000) / 100);
            let amount = draftmetadata.time[i].amount;
            let endhour = beginhour + parseInt((beginminute + amount) / 60);
            let endminute = (beginminute + amount) % 60;
            //console.log(begintime,beginhour,beginminute,amount,endhour,endminute);
            dayplan = dayplan + "- " + beginhour.toString().padStart(2, "0") + ":" + beginminute.toString().padStart(2, "0") + "\t" + subject + "  [" + taskname + "](../" + config.gitpath + output + ")\n";
            let timestr = "## " + beginhour.toString().padStart(2, "0") + ":" + beginminute.toString().padStart(2, "0") + " ~ " + endhour.toString().padStart(2, "0") + ":" + endminute.toString().padStart(2, "0") + "\n" + taskname + "\n\n";

            let timeviewfilename = config.draftrepopath + date.slice(0, 4) + "/" + begintime + ".md";
            console.log("time slice draft file name:" + timeviewfilename);
            console.log(timestr);
            if (this.debug == false) {
                fs.writeFileSync(timeviewfilename, timestr);
            }
        }

        let dayplanfilename = config.blogrepopath + "release/time/" + util.parseTemplate(config.templates.blogTime, { date: date });
        console.log("dayplan file name:\n" + dayplanfilename + "\ncontent:\n" + dayplan);
        if (this.debug == false) {
            fs.writeFileSync(dayplanfilename, dayplan);
        }
    },
    makewaitinglist: function () {
        let date = util.datestr();
        let year = date.slice(0, 4);
        let month = date.slice(4, 6);
        let season = Math.ceil(parseInt(month) / 3);
        let seasonpath = config.dataseasonpath + util.parseTemplate(config.templates.season, { year: year, season: season });
        //console.log("seasonpath:" + seasonpath);
        let seasonobj = yaml.load(fs.readFileSync(seasonpath, 'utf8', { schema: yaml.FAILSAFE_SCHEMA }));
        let todoobj = seasonobj.todo;
        let timeobj = seasonobj.time;

        let rest = new Object();
        let resttotal = 0;
        for (let task in timeobj.alloc) {
            if (timeobj.sold[task] != null) {
                rest[task] = timeobj.alloc[task] - timeobj.sold[task];
            } else {
                rest[task] = timeobj.alloc[task];
            }
            resttotal = resttotal + rest[task];
        }
        //console.log("resttotal:",resttotal);
        //console.log("rest:\n"+yaml.dump(rest));
        let restSorted = Object.keys(rest).sort(function (a, b) { return rest[b] - rest[a] });
        //console.log("resetSOrted:\n"+ yaml.dump(restSorted));

        // init the waitinglist
        let dayplanobj = seasonobj.dayplan;
        let waitinglist = new Object();
        for (let planid in dayplanobj) {
            for (let amounttype in dayplanobj[planid].supply) {
                if (waitinglist[amounttype] == null) {
                    // a new amount type
                    let amounttypelist = new Array();
                    waitinglist[amounttype] = amounttypelist;
                }
            }
        }
        //console.log("waitinglist:\n",yaml.dump(waitinglist));

        let hasobj = true;
        let k = 0;
        while (hasobj) {
            hasobj = false;
            // search the k th member of todo list of each task
            //console.log("search the %d th member...",k);
            for (let j = 0; j < restSorted.length; j++) {
                //console.log("search the %d th task:%s\n",j,restSorted[j]);
                for (let amounttype in waitinglist) {
                    if (todoobj[restSorted[j]][k] != null) {
                        //console.log("find a item:",yaml.dump(todoobj[restSorted[j]][k]));
                        hasobj = true;
                        if (todoobj[restSorted[j]][k][amounttype] != null) {
                            let atask = new Object();
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
        let date = util.datestr();
        let year = date.slice(0, 4);
        let month = date.slice(4, 6);
        let season = Math.ceil(parseInt(month) / 3);
        let seasonpath = config.dataseasonpath + util.parseTemplate(config.templates.season, { year: year, season: season });
        //console.log("seasonpath:" + seasonpath);
        let seasonobj = yaml.load(fs.readFileSync(seasonpath, 'utf8', { schema: yaml.FAILSAFE_SCHEMA }));
        let dayplanobj = seasonobj.dayplan;

        for (let plan in dayplanobj) {
            let waitinglist = this.makewaitinglist();
            let time = seasonobj.dayplan[plan].time;

            let draftmetadata = new Object();
            let drafttimearray = new Array();
            draftmetadata.date = parseInt(date);
            draftmetadata.plan = parseInt(plan);
            for (let i in time) {
                if (time[i].type == "work") {
                    let timeperiod = new Object();
                    timeperiod.begin = date + time[i].beginhour.toString().padStart(2, '0') + time[i].beginminute.toString().padStart(2, '0') + "00";
                    timeperiod.amount = time[i].amount;
                    timeperiod.type = "work";
                    timeperiod.subject = waitinglist[time[i].amount.toString()][0].task;
                    timeperiod.name = waitinglist[time[i].amount.toString()][0].name;
                    if (waitinglist[time[i].amount.toString()][0].readme != null) {
                        timeperiod.readme = waitinglist[time[i].amount.toString()][0].readme;
                    }
                    timeperiod.output = "draft/" + date.slice(0, 4) + "/" + timeperiod.begin + ".md";
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