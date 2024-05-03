const fs = require('fs');
const yaml = require('js-yaml');
const path = require('./path.js');
const start = require('./start.js');

module.exports = {
    makedaylog: function (date) {
        var year = date.slice(0, 4);
        var month = date.slice(4, 6);
        var day = date.slice(6, 8);
        var season = Math.ceil(parseInt(month) / 3);
        var seasonpath = "../data/season/" + year + "S" + season + ".yaml";
        console.log("seasonpath:" + seasonpath);
        var seasonobj = yaml.load(fs.readFileSync(seasonpath, 'utf8', { schema: yaml.FAILSAFE_SCHEMA }));

        //var draftmetafilename = path.draftrepopath + year + "/" + month + "/" + "d." + date + ".yaml";
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
        var daylog = "# " + year + "." + month + "." + day + ".\n日小结  \n\n<a id=\"top\"></a>\n";

        var plan = draftmetadata.plan;
        if (plan != null) {
            daylog = daylog + "根据[ego模型时间接口](https://gitee.com/hyg/blog/blob/master/timeflow.md)，今天绑定模版" + plan + "。\n\n";
        } else {
            daylog = daylog + "当天未绑定时间模版"
        }

        var indexstr = "\n\n<a id=\"index\"></a>\n";
        var logstr = "";
        for (t in draftmetadata.time) {
            var timelog = draftmetadata.time[t];
            //console.log(typeof(timelog.begin));
            var hour = timelog.begin.toString().slice(8, 10);
            var minute = timelog.begin.toString().slice(10, 12);
            var taskname = timelog.name;
            //console.log(taskname);
            if (taskname === undefined) {
                taskname = "无名任务";
            }

            indexstr = indexstr + "- " + hour + ":" + minute + "\t[" + taskname + "](#" + timelog.begin + ")  \n";

            var outputfilename = path.gitpath + timelog.output;
            var outputstr = fs.readFileSync(outputfilename, 'utf8')
            logstr = logstr + "\n---\n\n[top](#top) | [index](#index)\n<a id=\"" + timelog.begin + "\"></a>\n" + outputstr;
        }

        // season time stat

        var statobj = new Object();
        statobj.total = {alloc:0,sold:0,hold:0};
        for (var task in seasonobj.time.alloc) {
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
        }
        for (var task in seasonobj.time.sold) {
            if (statobj[task] == null) {
                statobj[task] = new Object();
                statobj[task].alloc = 0;
                statobj[task].sold = parseInt(seasonobj.time.sold[task]);
                statobj[task].hold = statobj[task].alloc - statobj[task].sold;

                statobj.total.alloc = statobj.total.alloc + statobj[task].alloc;
                statobj.total.sold = statobj.total.sold + statobj[task].sold;
            }
        }
        statobj.total.hold = statobj.total.alloc - statobj.total.sold;

        var seasonstatstr = `\n---\nseason stat:\n\n| task | alloc | sold | hold |
| --- | --- | --- | --- |
`;
        for (var task in statobj) {
            seasonstatstr = seasonstatstr + "| " + task + " | " + statobj[task].alloc + " | " + statobj[task].sold + " | " + statobj[task].hold + " |\n";
        }

        // waitinglist
        var waitinglist = start.makewaitinglist();
        var waitingliststr = "\n---\n\nwaiting list:\n\n";
        for (var amounttype in waitinglist) {
            waitingliststr = waitingliststr + "\n- " + amounttype + "分钟时间片：\n";
            for (var i = 0; i < 4; i++) {
                if (waitinglist[amounttype][i] != null) {
                    var todoobj = waitinglist[amounttype][i];
                    var place = parseInt(todoobj.id) + 1;
                    waitingliststr = waitingliststr + "  - " + todoobj.task + "的第" + place + "号事项：" + todoobj.name + "\n";
                }
            }

        }



        var daylog = daylog + indexstr + seasonstatstr + waitingliststr + logstr;
        //console.log(daylog);

        var daylogfilename = path.blogrepopath + "release/time/d." + date + ".md";
        console.log("daylog file name:\n" + daylogfilename + "\ncontent:\n" + daylog);
        fs.writeFileSync(daylogfilename, daylog);
    },
    updateseason: function (date) {
        var year = date.slice(0, 4);
        var month = date.slice(4, 6);
        var day = date.slice(6, 8);
        var season = Math.ceil(parseInt(month) / 3);
        var seasonpath = "../data/season/" + year + "S" + season + ".yaml";
        //console.log("seasonpath:" + seasonpath);
        var seasonobj = yaml.load(fs.readFileSync(seasonpath, 'utf8', { schema: yaml.FAILSAFE_SCHEMA }));

        var firstdateofseason = seasonobj.year + seasonobj.beginmonth.toString().padStart(2, "0") + seasonobj.beginday.toString().padStart(2, "0");
        var lastdateofseason = seasonobj.year + seasonobj.lastmonth.toString().padStart(2, "0") + seasonobj.lastday.toString().padStart(2, "0");
        //console.log("season day:",firstdateofseason,lastdateofseason)
        var sold = new Object();
        for (var m = parseInt(seasonobj.beginmonth); m <= parseInt(seasonobj.lastmonth); m++) {
            var draftmetapath = path.draftrepopath + seasonobj.year + "/" + m.toString().padStart(2, "0") + "/";
            //var draftmetafilename = "../data/draft" + "/" + year + "/" ;
            //console.log("draftmetapath:" + draftmetapath);

            if (fs.existsSync(draftmetapath)) {
                fs.readdirSync(draftmetapath).forEach(file => {
                    //console.log("file:",file);
                    if (file.substring(file.lastIndexOf(".")) == ".yaml") {
                        var date = file.slice(2, 10);
                        //console.log("date:",date);
                        if ((date >= firstdateofseason) & (date <= lastdateofseason)) {
                            var draftmetaobj = yaml.load(fs.readFileSync(draftmetapath + file, 'utf8', { schema: yaml.FAILSAFE_SCHEMA }));
                            for (var tid in draftmetaobj.time) {
                                if (sold[draftmetaobj.time[tid].subject] != null) {
                                    sold[draftmetaobj.time[tid].subject] = sold[draftmetaobj.time[tid].subject] + draftmetaobj.time[tid].amount;
                                } else {
                                    sold[draftmetaobj.time[tid].subject] = draftmetaobj.time[tid].amount;
                                };
                            }
                        }
                    }
                });
            }
        }
        //console.log("sold stat:\n" + yaml.dump(sold));
        seasonobj.time.sold = sold;

        fs.writeFileSync(seasonpath, yaml.dump(seasonobj));
        console.log(seasonpath + "文件中的time.sold字段已更新:\n" + yaml.dump(sold));
    }
}