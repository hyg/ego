const fs = require('fs');
const yaml = require('js-yaml');
const config = require('./config.js');
const start = require('./start.js');

module.exports = {
    debug: false,
    maketomorrowinfo: function (date) {
        let year = date.slice(0, 4);
        let month = date.slice(4, 6);
        let day = date.slice(6, 8);
        let season = Math.ceil(parseInt(month) / 3);
        let seasonpath = config.dataseasonpath + util.parseTemplate(config.templates.season, { year: year, season: season });
        let seasonobj = yaml.load(fs.readFileSync(seasonpath, 'utf8', { schema: yaml.FAILSAFE_SCHEMA }));

        let dayinfostr = "# " + year + "." + month + "." + day + ".\n\n根据[ego模型时间接口](https://gitee.com/hyg/blog/blob/master/timeflow.md)，每天早起根据身心状况绑定模版。" + "\n\n---\n";
        for (let plan in seasonobj.dayplan) {
            let waitinglist = start.makewaitinglist();
            let time = seasonobj.dayplan[plan].time;
            dayinfostr = dayinfostr + "如果绑定模版" + plan + "可能安排以下任务：\n\n";
            for (let i in time) {
                if (time[i].type == "work") {
                    dayinfostr = dayinfostr + "- " + time[i].beginhour.toString().padStart(2, '0') + ":" + time[i].beginminute.toString().padStart(2, '0') + "\t" + waitinglist[time[i].amount.toString()][0].name + " -" + waitinglist[time[i].amount.toString()][0].task + "[" + waitinglist[time[i].amount.toString()][0].id + "]\n";
                    waitinglist[time[i].amount.toString()].shift();
                }
            }
            dayinfostr = dayinfostr + "\n---\n";
        }
        let dayinfofilename = config.blogrepopath + "release/time/" + util.parseTemplate(config.templates.blogTime, { date: date });
        let mailtostr = "<a href=\"mailto:huangyg@mars22.com?subject=关于" + year + "." + month + "." + day + ".任务排序的建议&body=date: " + date +"%0D%0Afile: " + dayinfofilename + "%0D%0A---请勿修改邮件主题及以上内容---%0D%0A\">发送电子邮件</a>" ;
        dayinfostr = dayinfostr + "对任务排序的建议请点击这个链接" + mailtostr + "，日计划确定后会在本页面发布。";
        
        console.log("dayinfo file name:\n" + dayinfofilename + "\ncontent:\n" + dayinfostr);
        if (this.debug == false) {
            fs.writeFileSync(dayinfofilename, dayinfostr);
        }
    },
    makedaylog: function (date) {
        let year = date.slice(0, 4);
        let month = date.slice(4, 6);
        let day = date.slice(6, 8);
        let season = Math.ceil(parseInt(month) / 3);
        let seasonpath = config.dataseasonpath + util.parseTemplate(config.templates.season, { year: year, season: season });
        //console.log("seasonpath:" + seasonpath);
        let seasonobj = yaml.load(fs.readFileSync(seasonpath, 'utf8', { schema: yaml.FAILSAFE_SCHEMA }));

        //let draftmetafilename = config.draftrepopath + year + "/" + month + "/" + "d." + date + ".yaml";
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
        let daylog = "# " + year + "." + month + "." + day + ".\n日小结  \n\n<a id=\"top\"></a>\n";

        let plan = draftmetadata.plan;
        if (plan != null) {
            daylog = daylog + "根据[ego模型时间接口](https://gitee.com/hyg/blog/blob/master/timeflow.md)，今天绑定模版" + plan + "。\n\n";
        } else {
            daylog = daylog + "当天未绑定时间模版"
        }

        let indexstr = "<a id=\"index\"></a>\n";
        let logstr = "";
        for (let t in draftmetadata.time) {
            let timelog = draftmetadata.time[t];
            //console.log(typeof(timelog.begin));
            let hour = timelog.begin.toString().slice(8, 10);
            let minute = timelog.begin.toString().slice(10, 12);
            let taskname = timelog.name;
            //console.log(taskname);
            if (taskname === undefined) {
                taskname = "无名任务";
            }

            indexstr = indexstr + "- " + hour + ":" + minute + "\t[" + taskname + "](#" + timelog.begin + ")  \n";

            let outputfilename = config.gitpath + timelog.output;
            let outputstr = fs.readFileSync(outputfilename, 'utf8')
            let mailtostr = "<a href=\"mailto:huangyg@mars22.com?subject=关于" + year + "." + month + "." + day + ".[" + taskname + "]任务&body=日期: " + date +"%0D%0A序号: " + t + "%0D%0A手稿:" + outputfilename + "%0D%0A---请勿修改邮件主题及以上内容 从下一行开始写您的想法---%0D%0A\">[email]</a>" ;
            logstr = logstr + "\n---\n\n" + mailtostr + " | [top](#top) | [index](#index)\n<a id=\"" + timelog.begin + "\"></a>\n" + outputstr;
        }

        // season time stat

        let statobj = new Object();
        statobj.total = { alloc: 0, sold: 0, hold: 0, todo: 0 };
        for (let task in seasonobj.time.alloc) {
            statobj[task] = new Object();
            statobj[task].alloc = parseInt(seasonobj.time.alloc[task]);
            if (seasonobj.time.sold[task] != null) {
                statobj[task].sold = parseInt(seasonobj.time.sold[task]);
            } else {
                statobj[task].sold = 0;
            }
            statobj[task].hold = statobj[task].alloc - statobj[task].sold;

            statobj.total.alloc = statobj.total.alloc + statobj[task].alloc;
            statobj.total.sold = statobj.total.sold + statobj[task].sold;
            statobj[task].todo = 0;
        }
        for (let task in seasonobj.time.sold) {
            if (statobj[task] == null) {
                statobj[task] = new Object();
                statobj[task].alloc = 0;
                statobj[task].sold = parseInt(seasonobj.time.sold[task]);
                statobj[task].hold = statobj[task].alloc - statobj[task].sold;

                statobj.total.alloc = statobj.total.alloc + statobj[task].alloc;
                statobj.total.sold = statobj.total.sold + statobj[task].sold;
                statobj[task].todo = 0;
            }
        }
        statobj.total.hold = statobj.total.alloc - statobj.total.sold;
        for (let task in seasonobj.todo) {
            statobj[task].todo = this.todosum(seasonobj.todo[task]);
            statobj.total.todo = statobj.total.todo + statobj[task].todo;
        }

        let seasonstatstr = `\n---\nseason stat:\n\n| task | alloc | sold | hold | todo |
| --- | --- | --- | --- | --- |
`;
        for (let task in statobj) {
            seasonstatstr = seasonstatstr + "| " + task + " | " + statobj[task].alloc + " | " + statobj[task].sold + " | " + statobj[task].hold + " | " + statobj[task].todo + " |\n";
        }

        // waitinglist
        let waitinglist = start.makewaitinglist();
        let waitingliststr = "\n---\n\nwaiting list:\n\n";
        for (let amounttype in waitinglist) {
            waitingliststr = waitingliststr + "\n- " + amounttype + "分钟时间片：\n";
            for (let i = 0; i < 4; i++) {
                if (waitinglist[amounttype][i] != null) {
                    let todoobj = waitinglist[amounttype][i];
                    let place = parseInt(todoobj.id) + 1;
                    waitingliststr = waitingliststr + "  - " + todoobj.task + "的第" + place + "号事项：" + todoobj.name + "\n";
                }
            }

        }



        daylog = daylog + indexstr + seasonstatstr + waitingliststr + logstr;
        //console.log(daylog);

        let daylogfilename = config.blogrepopath + "release/time/" + util.parseTemplate(config.templates.blogTime, { date: date });
        console.log("daylog file name:\n" + daylogfilename + "\ncontent:\n" + daylog);
        if (this.debug == false) {
            fs.writeFileSync(daylogfilename, daylog);
        }
    },
    updateseason: function (date) {
        let year = date.slice(0, 4);
        let month = date.slice(4, 6);
        let day = date.slice(6, 8);
        let season = Math.ceil(parseInt(month) / 3);
        let seasonpath = config.dataseasonpath + util.parseTemplate(config.templates.season, { year: year, season: season });
        //console.log("seasonpath:" + seasonpath);
        let seasonobj = yaml.load(fs.readFileSync(seasonpath, 'utf8', { schema: yaml.FAILSAFE_SCHEMA }));

        let firstdateofseason = seasonobj.year + seasonobj.beginmonth.toString().padStart(2, "0") + seasonobj.beginday.toString().padStart(2, "0");
        let lastdateofseason = seasonobj.year + seasonobj.lastmonth.toString().padStart(2, "0") + seasonobj.lastday.toString().padStart(2, "0");
        //console.log("season day:",firstdateofseason,lastdateofseason)
        let sold = new Object();
        // old path 
        for (let m = parseInt(seasonobj.beginmonth); m <= parseInt(seasonobj.lastmonth); m++) {
            let draftmetapath = config.draftrepopath + seasonobj.year + "/" + m.toString().padStart(2, "0") + "/";
            //let draftmetafilename = "../data/draft" + "/" + year + "/" ;
            if (fs.existsSync(draftmetapath)) {
                //console.log("draftmetadata path exist:" + draftmetapath);
                fs.readdirSync(draftmetapath).forEach(file => {
                    if (file.substring(file.lastIndexOf(".")) == ".yaml") {
                        let date = file.slice(2, 10);
                        //console.log("date:",date);
                        if ((date >= firstdateofseason) & (date <= lastdateofseason)) {
                            //console.log("file:",file);
                            let draftmetaobj = yaml.load(fs.readFileSync(draftmetapath + file, 'utf8', { schema: yaml.FAILSAFE_SCHEMA }));
                            for (let tid in draftmetaobj.time) {
                                if (sold[draftmetaobj.time[tid].subject] != null) {
                                    sold[draftmetaobj.time[tid].subject] = sold[draftmetaobj.time[tid].subject] + draftmetaobj.time[tid].amount;
                                } else {
                                    sold[draftmetaobj.time[tid].subject] = draftmetaobj.time[tid].amount;
                                };
                            }
                        }
                    }
                });
            } else {
                console.log("draftmetadata path not exist:", draftmetapath)
            }
        }

        // new path
        let draftmetapath = "../data/draft/" + seasonobj.year + "/";
        if (fs.existsSync(draftmetapath)) {
            fs.readdirSync(draftmetapath).forEach(file => {
                if (file.substring(file.lastIndexOf(".")) == ".yaml") {
                    let date = file.slice(2, 10);
                    //console.log("date:",date);
                    if ((date >= firstdateofseason) & (date <= lastdateofseason)) {
                        //console.log("file:",file);
                        let draftmetaobj = yaml.load(fs.readFileSync(draftmetapath + file, 'utf8', { schema: yaml.FAILSAFE_SCHEMA }));
                        for (let tid in draftmetaobj.time) {
                            if (sold[draftmetaobj.time[tid].subject] != null) {
                                sold[draftmetaobj.time[tid].subject] = sold[draftmetaobj.time[tid].subject] + draftmetaobj.time[tid].amount;
                            } else {
                                sold[draftmetaobj.time[tid].subject] = draftmetaobj.time[tid].amount;
                            };
                        }
                    }
                }
            });
        } else {
            console.log("draftmetadata path not exist:", draftmetapath)
        }
        //console.log("sold stat:\n" + yaml.dump(sold));
        seasonobj.time.sold = sold;

        if (this.debug == false) {
            fs.writeFileSync(seasonpath, yaml.dump(seasonobj, { 'lineWidth': -1 }));
        }
        console.log(seasonpath + "文件中的time.sold字段已更新:\n" + yaml.dump(sold));
    },
    todosum: function (todoarray) {
        let sum = 0;

        for (let i in todoarray) {
            for (let key in todoarray[i]) {
                if (!isNaN(parseInt(key))) {
                    sum = sum + parseInt(key);
                } else if (key == "bind") {
                    sum = sum + this.todosum(todoarray[i][key]);
                }
            }
        }

        return sum;
    }
}