const fs = require('fs');
const yaml = require('js-yaml');
const config = require('./config.js');
const util = require('./util.js');
const season = require('./season.js');
const wl = require('./waitinglist.js');

function log(...s) {
    s[0] = log.caller.name + "> " + s[0];
    console.log(...s);
}

module.exports = {
    debug: true,
    getwaketime: function (diff = 0) {
        log("diff:", diff);
        let theDate = new Date();
        theDate.setDate(theDate.getDate() + diff);
        log("theDate:", theDate);

        let year = theDate.getFullYear();
        let month = theDate.getMonth() + 1 < 10 ? "0" + (theDate.getMonth() + 1) : theDate.getMonth() + 1;
        let day = theDate.getDate() < 10 ? "0" + theDate.getDate() : theDate.getDate();
        //let dateStr = year + "" + month + "" + day;
        let dateStr = util.datestr(diff);
        log("dateStr:", dateStr);
        let healthobj;
        let healthpath = config.rawrepopath + "health/" + util.parseTemplate(config.templates.health, { date: dateStr });
        let lastfilename = config.rawrepopath + "health/.last.yaml";
        try {
            if (fs.existsSync(healthpath)) {
                healthobj = yaml.load(fs.readFileSync(healthpath, 'utf8', { schema: yaml.FAILSAFE_SCHEMA }));
            } else if ((diff == 0) && (fs.existsSync(lastfilename))) {
                healthobj = yaml.load(fs.readFileSync(lastfilename, 'utf8', { schema: yaml.FAILSAFE_SCHEMA }));
            } else {
                log("health metadata is not exists.");
            }
        } catch (e) {
            // failure
            log("yaml read error:" + e);
        }


        let waketime = healthobj.wake.time;

        return waketime;
    },
    dayfilename: function (diff = 0) {
        log("diff:", diff);
        let datestr = util.datestr(diff);
        let year = datestr.slice(0, 4);

        let dayfilename = config.daymetadatapath + year + "/" + util.parseTemplate(config.templates.dayMeta, { date: datestr });
        return dayfilename;
    },
    loaddayobj: function (diff = 0) {
        log("diff:", diff);
        let dayfilename = this.dayfilename(diff);
        let dayobj;
        try {
            if (fs.existsSync(dayfilename)) {
                dayobj = yaml.load(fs.readFileSync(dayfilename, 'utf8', { schema: yaml.FAILSAFE_SCHEMA }));
            } else {
                log("day obj is not exists.");
            }
        } catch (e) {
            // failure
            log("yaml read error:" + e);
        }
        return dayobj;
    },
    loaddayobjbydate: function (datestr) {
        let year = datestr.slice(0, 4);
        let dayfilename = config.daymetadatapath + "/" + year + "/" + util.parseTemplate(config.templates.dayMeta, { date: datestr });
        let dayobj = yaml.load(fs.readFileSync(dayfilename, 'utf8', { schema: yaml.FAILSAFE_SCHEMA }));

        return dayobj;
    },
    dumpdayobj: function (dayobj, diff = 0) {
        let dayfilename = this.dayfilename(diff);
        let daystr = yaml.dump(dayobj, { 'lineWidth': -1 });
        if (this.debug == false) {
            fs.writeFileSync(dayfilename, daystr);
            log("dump day object file: %s\n%s", dayfilename, daystr);
        } else {
            log("debug, day object file: %s\n%s", dayfilename, daystr);
        }

    },
    makedayobj: function (mode, diff = 0) {
        season.debug = this.debug;

        let date = util.datestr(diff);
        let waketime = this.getwaketime(diff) % 1000000;
        log("waketime:", waketime);
        let seasonobj = season.loadseasonobj(date);
        let waitinglist = wl.makewaitinglist(seasonobj);

        let dayplan = "";
        for (let plan in seasonobj.map[mode]) {
            let item = seasonobj.map[mode][plan];
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

        let dayobj = new Object();
        let timearray = new Array();
        let draftcnt = 0;

        dayobj.date = date;
        dayobj.mode = mode;
        dayobj.plan = dayplan;

        let time = seasonobj.dayplan[dayplan].time;
        let beginhour, beginminute, amount, endhour, endminute, begintime, nextbeginhour, nextbeginminute;
        nextbeginhour = parseInt(waketime / 10000);
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
                beginhour = nextbeginhour;
                beginminute = nextbeginminute;
                endhour = timeslice.endhour;
                endminute = timeslice.endminute;
                amount = (endhour - beginhour) * 60 + (endminute - beginminute);
            } else {
                beginhour = nextbeginhour;
                beginminute = nextbeginminute;
                amount = timeslice.amount;
                endhour = beginhour + parseInt((beginminute + amount - 1) / 60);
                endminute = (beginminute + amount - 1) % 60;
            }
            begintime = date + beginhour.toString().padStart(2, '0') + beginminute.toString().padStart(2, '0') + "00";
            log("timeslice:", i, timeslice.type, beginhour, beginminute, amount, endhour, endminute);

            let timeperiod = new Object();
            timeperiod.begin = begintime;
            timeperiod.amount = amount;
            timeperiod.type = timeslice.type;
            timeperiod.name = timeslice.name;
            if (timeslice.type == "check") {
                draftcnt++
                timeperiod.output = config.draftrepopath + date.slice(0, 4) + "/" + util.parseTemplate(config.templates.draft, { date: date, seq: draftcnt.toString().padStart(2, '0') });

                let draftstr = this.initdraft(timeperiod);
                //log(draftstr);

                if (this.debug == false) {
                    fs.writeFileSync(timeperiod.output, draftstr);
                    log("save time slice draft file name:%s\n%s", timeperiod.output, draftstr);
                } else {
                    log("debug, time slice draft file name:%s\n%s", timeperiod.output, draftstr);
                }
            }
            if (timeslice.type == "work") {
                timeperiod.subject = waitinglist[amount.toString()][0].task;
                timeperiod.title = waitinglist[amount.toString()][0].name;
                if (waitinglist[amount.toString()][0].readme != null) {
                    //timeperiod.readme = waitinglist[amount.toString()][0].readme;
                    timeperiod.readme = [...waitinglist[amount.toString()][0].readme];
                }
                //timeperiod.output = config.draftrepopath + date.slice(0, 4) + "/" + date.slice(4, 6) + "/" + begintime + ".md";
                draftcnt++;
                timeperiod.output = config.draftrepopath + date.slice(0, 4) + "/" + util.parseTemplate(config.templates.draft, { date: date, seq: draftcnt.toString().padStart(2, '0') });

                seasonobj = season.deletetodoitem(seasonobj, waitinglist[amount.toString()][0]);
                waitinglist = wl.makewaitinglist(seasonobj);

                /* log("delete the job from %s: [%s]", waitinglist[amount.toString()][0].task, waitinglist[amount.toString()][0].name);
                for (let j in seasonobj.todo[timeperiod.subject]) {
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

                //let timestr = "## 计划 " + beginhour.toString().padStart(2, "0") + ":" + beginminute.toString().padStart(2, "0") + " ~ " + endhour.toString().padStart(2, "0") + ":" + endminute.toString().padStart(2, "0") + "\n" + timeperiod.subject + ": [" + timeperiod.title + "]\n\n";
                //let timestr = "## " + timeperiod.subject + ": [" + timeperiod.title + "]\n\n";
                let draftstr = this.initdraft(timeperiod);
                //log(draftstr);

                if (this.debug == false) {
                    fs.writeFileSync(timeperiod.output, draftstr);
                    log("save time slice draft file name:%s\n%s", timeperiod.output, draftstr);
                } else {
                    log("debug, time slice draft file name:%s\n%s", timeperiod.output, draftstr);
                }

            }

            if (timeslice.namelink != null) {
                timeperiod.namelink = timeslice.namelink;
            }
            timearray.push(timeperiod);
            nextbeginhour = endhour + parseInt((endminute + 1) / 60);;
            nextbeginminute = (endminute + 1) % 60;
        }
        dayobj.time = timearray;

        this.dumpdayobj(dayobj, diff);
        season.debug = this.debug;
        season.dumpseasonobj(seasonobj);
        if (this.debug == false) {
            log("dump seasonobj, todo:\n%s", yaml.dump(seasonobj.todo, { 'lineWidth': -1 }));
        } else {
            log("debug, seasonobj.todo:\n%s", yaml.dump(seasonobj.todo, { 'lineWidth': -1 }));
        }


        return dayobj;
    },
    initdraft: function (timeperiod) {
        if (timeperiod.type == 'check') {
            let draftstr = "## check: [零散笔记]\n\n";
            return draftstr;
        }

        let draftstr = "## " + timeperiod.subject + ": [" + timeperiod.title + "]\n\n";
        if (timeperiod.readme != null) {
            //log("timeperiod.readme:",timeperiod.readme);
            //let readme = yaml.load(timeperiod.readme);
            let readme = [...timeperiod.readme];
            log("readme:", readme);
            for (let id in readme) {
                let item = readme[id];
                log("item:", item);
                draftstr += "### " + item + "\n\n";
                if (item.substring(0, 4) == "read") {
                    draftstr += "##" + fs.readFileSync(item.substring(5), 'utf8') + "\n\n";
                }
            }
        }
        return draftstr;
    },
    maketable: function (dayobj) {
        let tablestr = `| 时间片 | 时长 | 用途 | 手稿 |
| --- | --- | :---: | --- |
`;
        let year = dayobj.date.slice(0, 4);
        let month = dayobj.date.slice(4, 6);
        let day = dayobj.date.slice(6, 8);

        for (let i in dayobj.time) {
            let timeslice = dayobj.time[i];
            let begintime = util.str2time(timeslice.begin);
            let endtime = new Date(begintime);
            endtime = new Date(endtime.setMinutes(endtime.getMinutes() + timeslice.amount - 1));

            let draftstr = "";
            if (timeslice.type == "work") {
                let draftfilename = config.draftrepopath + year + "/" + timeslice.begin + ".md";
                draftstr = draftstr + timeslice.subject + ":" + timeslice.title + " ";

                if (timeslice.namelink != null) {
                    draftstr = draftstr + "[在线](" + timeslice.namelink + ")";
                }
                draftstr = draftstr + " [离线](" + draftfilename + ")";
                let mailtostr = " <a href=\"mailto:huangyg@mars22.com?subject=关于" + year + "." + month + "." + day + ".[" + timeslice.subject + ":" + timeslice.title + "]任务&body=日期: " + dayobj.date + "%0D%0A序号: " + i + "%0D%0A手稿:" + draftfilename + "%0D%0A---请勿修改邮件主题及以上内容 从下一行开始写您的想法---%0D%0A\">[想法]</a>";
                draftstr = draftstr + mailtostr;
            }
            tablestr = tablestr + "| " + util.format(begintime, "hh:mm") + "~" + util.format(endtime, "hh:mm") + " | " + timeslice.amount + " | " + timeslice.name + " | " + draftstr + " |\n";
        }

        log("table string:\n%s", tablestr);
        return tablestr;
    },
    makeindex: function (dayobj, type) {
        let indexstr = "";

        for (let i in dayobj.time) {
            let timeperiod = dayobj.time[i];
            let begintime = util.str2time(timeperiod.begin);
            let endtime = new Date(begintime);
            if (timeperiod.amount > 0) {
                endtime = new Date(endtime.setMinutes(endtime.getMinutes() + timeperiod.amount - 1));
            }

            if (timeperiod.output != null) {
                let linkstr = "";
                if (type == "plan") {
                    linkstr = timeperiod.output;
                } else if (type == "log") {
                    linkstr = "#" + timeperiod.begin;
                }

                if (timeperiod.type == "work") {
                    indexstr = indexstr + "- " + util.format(begintime, "hh:mm") + "~" + util.format(endtime, "hh:mm") + "\t" + timeperiod.subject + ": [" + timeperiod.title + "](" + linkstr + ")\n";
                }
                if (timeperiod.type == "check") {
                    indexstr = indexstr + "- " + util.format(begintime, "hh:mm") + "~" + util.format(endtime, "hh:mm") + "\tcheck: [零散笔记](" + linkstr + ")\n";
                }
            }
        }

        log("indexstr:\n%s", indexstr);
        return indexstr;
    },
    makedayplan: function (dayobj) {
        let datestr = dayobj.date;
        let date = util.str2date(datestr);

        let dayplanstr = "# " + date.format("YYYY.MM.DD.") + "\n日计划\n\n"
            //+ "根据[ego模型时间接口](https://gitee.com/hyg/blog/blob/master/timeflow.md)，本月安排常规工作，今天绑定模版" + dayobj.mode + "(" + dayobj.plan + ")。\n\n"
            + "根据[ego模型时间接口](https://gitee.com/hyg/blog/blob/master/timeflow.md)，本月安排休整和总结，今天绑定模版" + dayobj.mode + "(" + dayobj.plan + ")。\n\n"
            + this.maketable(dayobj) + "\n---\n\n" + this.makeindex(dayobj, "plan");

        let dayplanfilename = config.blogrepopath + "release/time/" + util.parseTemplate(config.templates.blogTime, { date: datestr });
        if (this.debug == false) {
            fs.writeFileSync(dayplanfilename, dayplanstr);
        }
        log("make day plan file: %s\n%s", dayplanfilename, dayplanstr);

        util.gitstep(config.bloggitpath, "morning", "all", 'master');
        return dayplanstr;
    },
    // 时间片amount=0的：
    //      - 删除output文件
    //      - 删除output字段
    cleardayobj: function (dayobj) {
        for (let i in dayobj.time) {
            let timeperiod = dayobj.time[i];
            if (timeperiod.amount == 0 && timeperiod.output != null) {
                try {
                    if (fs.existsSync(timeperiod.output)) {
                        fs.unlinkSync(timeperiod.output);
                    } else {
                        log("output file not exists, skip delete:", timeperiod.output);
                    }
                } catch (error) {
                    log("delete output file failed:", timeperiod.output, error.code);
                }

                delete timeperiod.output;
            }
        }

        return dayobj;
    },
    makedaylog: function (dayobj) {
        season.debug = this.debug;
        dayobj = this.cleardayobj(dayobj);

        let datestr = dayobj.date.toString();
        let date = util.str2date(datestr);

        let seasonobj = season.loadseasonobj(datestr);
        seasonobj = season.updatesold(seasonobj);

        for (let i in dayobj.time) {
            let timeperiod = dayobj.time[i];
            let begintime = util.str2time(timeperiod.begin);

            if (datestr == util.datestr()) {
                if (timeperiod.redo == true) {
                    season.addtodoitem(seasonobj, timeperiod.subject, timeperiod.title, timeperiod.amount, timeperiod.readme);
                    if (timeperiod.trueamount != null) {
                        timeperiod.amount = timeperiod.trueamount;
                    }
                } else if (timeperiod.redo != null) {
                    if (timeperiod.readme != null) {
                        if (timeperiod.amount == 0) {
                            season.addtodoitem(seasonobj, timeperiod.subject, timeperiod.title, timeperiod.redo, timeperiod.readme);
                        } else {
                            timeperiod.readme.push("read " + timeperiod.output);
                            //season.addtodoitem(seasonobj, timeperiod.subject, timeperiod.title, timeperiod.redo, timeperiod.readme + "- read " + timeperiod.output + "\n");
                            season.addtodoitem(seasonobj, timeperiod.subject, timeperiod.title, timeperiod.redo, timeperiod.readme);
                        }

                    } else {
                        if (timeperiod.amount == 0) {
                            season.addtodoitem(seasonobj, timeperiod.subject, timeperiod.title, timeperiod.redo, null);
                        } else {
                            timeperiod.readme = new Array("read " + timeperiod.output);
                            season.addtodoitem(seasonobj, timeperiod.subject, timeperiod.title, timeperiod.redo, timeperiod.readme);
                            //season.addtodoitem(seasonobj, timeperiod.subject, timeperiod.title, timeperiod.redo, "- read " + timeperiod.output + "\n");
                        }
                    }

                    if (timeperiod.trueamount != null) {
                        timeperiod.amount = timeperiod.trueamount;
                    }
                }
            } else {
                log("not today, don't redo.");
            }

        }

        season.dumpseasonobj(seasonobj);
        let waitinglist = wl.makewaitinglist(seasonobj);
        log("datestr:", datestr);
        let indexstr = this.makeindex(dayobj, "log");

        let daylogstr = "# " + date.format("YYYY.MM.DD.") + "\n日小结\n\n"
            //+ "<a id=\"top\"></a>\n" + "根据[ego模型时间接口](https://gitee.com/hyg/blog/blob/master/timeflow.md)，本月安排常规工作，今天绑定模版" + dayobj.mode + "(" + dayobj.plan + ")。\n\n"
            + "<a id=\"top\"></a>\n" + "根据[ego模型时间接口](https://gitee.com/hyg/blog/blob/master/timeflow.md)，本月安排休整和总结，今天绑定模版" + dayobj.mode + "(" + dayobj.plan + ")。\n\n"
            + "<a id=\"index\"></a>\n" + indexstr
            + season.makestattable(seasonobj)
            + wl.makebrieflist(waitinglist)
            + this.makeoutputlist(dayobj);

        let daylogfilename = config.blogrepopath + "release/time/" + util.parseTemplate(config.templates.blogTime, { date: datestr });
        if (this.debug == false) {
            fs.writeFileSync(daylogfilename, daylogstr);
            log("save day plan file: %s\n%s", daylogfilename, daylogstr);
        } else {
            log("debug, day plan file: %s\n%s", daylogfilename, daylogstr);
        }

        if (indexstr == "") {
            this.gitop("day over with non draft.");
        } else {
            this.gitop(indexstr);
        }

        return daylogfilename;
    },
    makeoutputlist: function (dayobj) {
        let outputliststr = "";
        for (let t in dayobj.time) {
            let timeperiod = dayobj.time[t];
            if (timeperiod.output != null) {
                let begintime = util.str2time(timeperiod.begin);
                let endtime = new Date(begintime);
                if (timeperiod.amount > 0) {
                    endtime = new Date(endtime.setMinutes(endtime.getMinutes() + timeperiod.amount - 1));
                }

                let taskname = timeperiod.title;
                if (taskname === undefined) {
                    taskname = "无名任务";
                }

                let outputstr = fs.readFileSync(timeperiod.output, 'utf8')
                let mailtostr = "<a href=\"mailto:huangyg@mars22.com?subject=关于" + util.format(begintime, "yyyy.MM.dd.") + "[" + taskname + "]任务&body=日期: " + util.format(begintime, "yyyy.MM.dd.") + "%0D%0A序号: " + t + "%0D%0A手稿:" + timeperiod.output + "%0D%0A---请勿修改邮件主题及以上内容 从下一行开始写您的想法---%0D%0A\">[email]</a>";
                let periodstr = "## " + util.format(begintime, "hh:mm") + " ~ " + util.format(endtime, "hh:mm");
                outputliststr = outputliststr + "\n---\n" + mailtostr + " | [top](#top) | [index](#index)\n<a id=\"" + timeperiod.begin + "\"></a>\n" + periodstr + "\n" + outputstr;
            }

        }
        if (this.debug == true) {
            log("outputliststr:\n%s", outputliststr);
        }
        return outputliststr;
    },
    maketomorrowinfo: function () {
        season.debug = this.debug;

        let datestr = util.datestr(1);
        let date = util.str2date(datestr);
        let seasonobj = season.loadseasonobj();
        //let waitinglist = wl.makewaitinglist(seasonobj);
        
        //let dayinfostr = "# " + date.Format("yyyy.MM.dd.") + "\n\n根据[ego模型时间接口](https://gitee.com/hyg/blog/blob/master/timeflow.md)，安排常规工作，每天早起根据身心状况绑定模版。" + "\n\n---\n";
        let dayinfostr = "# " + date.format("YYYY.MM.DD.") + "\n\n根据[ego模型时间接口](https://gitee.com/hyg/blog/blob/master/timeflow.md)，三月份安排休整和总结，每天早起根据身心状况绑定模版。" + "\n\n---\n";
        for (let plan in seasonobj.dayplan) {
            let waitinglist = wl.makewaitinglist(seasonobj);
            //log("plan:",plan);
            //log("waitinglist:\n%s",waitinglist);
            let time = seasonobj.dayplan[plan].time;
            dayinfostr = dayinfostr + "如果绑定模版" + plan + "可能安排以下任务：\n\n";
            for (let i in time) {
                if (time[i].type == "work") {
                    //log("time[%d]:\n%s",i,time[i]);
                    if (waitinglist[time[i].amount.toString()][0] != null) {
                        dayinfostr = dayinfostr + "- " + time[i].beginhour.toString().padStart(2, '0') + ":" + time[i].beginminute.toString().padStart(2, '0') + "\t" + waitinglist[time[i].amount.toString()][0].name + " -" + waitinglist[time[i].amount.toString()][0].task + "[" + waitinglist[time[i].amount.toString()][0].id + "]\n";
                        waitinglist[time[i].amount.toString()].shift();
                    } else {
                        log("waitinglist is empty. plan:%s time[%d] amount:%d", plan, i, time[i].amount);
                    }

                }
            }
            dayinfostr = dayinfostr + "\n---\n";
        }
        let dayinfofilename = config.blogrepopath + "release/time/" + util.parseTemplate(config.templates.blogTime, { date: datestr });
        let mailtostr = "<a href=\"mailto:huangyg@mars22.com?subject=关于" + date.format("YYYY.MM.DD.") + "任务排序的建议&body=date: " + date.format("YYYY.MM.DD.") + "%0D%0Afile: " + dayinfofilename + "%0D%0A---请勿修改邮件主题及以上内容---%0D%0A\">发送电子邮件</a>";
        dayinfostr = dayinfostr + "对任务排序的建议请点击这个链接" + mailtostr + "，日计划确定后会在本页面发布。";

        if (this.debug == false) {
            fs.writeFileSync(dayinfofilename, dayinfostr);
            log("save tomorrow info:%s\n%s", dayinfofilename, dayinfostr);
        } else {
            log("debug, tomorrow info:%s\n%s", dayinfofilename, dayinfostr);
        }

        return dayinfostr;
    },
    gitop: async function (commitmsg) {
        await util.gitstep(config.bloggitpath, commitmsg, "all", 'master');
        await util.gitstep(config.draftgitpath, commitmsg, "gitee", 'master');
        await util.gitstep(config.egogitpath, commitmsg, "all", 'vat');
        await util.gitstep(config.samplegitpath, commitmsg, "all", 'master');
    }
}