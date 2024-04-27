var fs = require('fs');
var yaml = require('js-yaml');
var path = require('./path.js');

module.exports = {
    makedaydraft: function (date, plan) {
        var year = date.slice(0, 4);
        var month = date.slice(4, 6);
        var season = Math.ceil(parseInt(month) / 3);
        var seasonpath = "../data/season/" + year + "S" + season + ".yaml";
        console.log("seasonpath:" + seasonpath);
        var planobj = yaml.load(fs.readFileSync(seasonpath, 'utf8'));
        var time = planobj.dayplan[plan].time;

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
                timeperiod.subject = "tbd";
                timeperiod.name = "tbd";
                timeperiod.output = "draft/" + date.slice(0, 4) + "/" + date.slice(4, 6) + "/" + timeperiod.begin + ".md";
                drafttimearray.push(timeperiod);
            }
        }
        draftmetadata.time = drafttimearray;

        //var draftmetafilename = path.draftrepopath + year + "/" + month + "/" + "d." + date + ".yaml";
        var draftmetafilename = "../data/draft" + "/" + year + "/" + "d." + date + ".yaml";
        console.log(draftmetafilename);
        console.log(yaml.dump(draftmetadata));
        fs.writeFileSync(draftmetafilename, yaml.dump(draftmetadata));
    },
    makedayplan: function (date) {
        var year = date.slice(0, 4);
        var month = date.slice(4, 6);
        var day = date.slice(6, 8);
        var draftmetafilename = "../data/draft" + "/" + year + "/" + "d." + date + ".yaml";
        var draftmetadata;
        try {
            if (fs.existsSync(draftmetafilename)) {
                draftmetadata = yaml.load(fs.readFileSync(draftmetafilename, 'utf8'));
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
        console.log("seasonpath:" + seasonpath);
        var planobj = yaml.load(fs.readFileSync(seasonpath, 'utf8'));
        var time = planobj.dayplan[plan].time;

        //var planobj = yaml.load(fs.readFileSync("plan.yaml", 'utf8'));
        //var planstr = planobj.dayplan[plan].planstr;

        var planstr = `| 时间片 | 时长 | 用途 | 手稿 |  
| --- | --- | --- | --- |  
`;
        for (var i in planobj.dayplan[plan].time) {
            var timeslice = planobj.dayplan[plan].time[i];
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
                draftstr = draftstr + "[在线同步](" + timeslice.namelink + ")";
            }
            if (timeslice.type == "work") {

                var draftfilename = path.draftrepopath + date.slice(0, 4) + "/" + date.slice(4, 6) + "/" + begintime + ".md";
                draftstr = draftstr + " [离线归档](" + draftfilename + ")";
            }

            planstr = planstr + "| " + beginhour.toString().padStart(2, '0') + ":" + beginminute.toString().padStart(2, '0') + "~" + endhour.toString().padStart(2, '0') + ":" + endminute.toString().padStart(2, '0') + " | " + amount + " | " + timeslice.name + " | " + draftstr + " |  \n";
        }
        planstr = planstr + "\n" + planobj.dayplan[plan].readme;
        //console.log("planstr:\n"+planstr);

        var dayplan = "# " + year + "." + month + "." + day + ".\n计划  \n\n根据[ego模型时间接口](https://gitee.com/hyg/blog/blob/master/timeflow.md)，今天绑定模版" + plan + "。\n\n" + planstr + "\n---\n\n";

        for (var i in draftmetadata.time) {
            var subject = draftmetadata.time[i].subject;
            var taskname = draftmetadata.time[i].name;
            if (taskname === undefined) {
                taskname = "无名任务";
            }
            var output = draftmetadata.time[i].output;

            dayplan = dayplan + "- task:" + subject + "  [" + taskname + "](../" + path.gitpath + output + ")\n";

            var begintime = draftmetadata.time[i].begin;
            var beginhour = parseInt((begintime - parseInt(begintime / 1000000) * 1000000) / 10000);
            var beginminute = parseInt((begintime - parseInt(begintime / 10000) * 10000) / 100);
            var amount = draftmetadata.time[i].amount;
            var endhour = beginhour + parseInt((beginminute + amount) / 60);
            var endminute = (beginminute + amount) % 60;
            //console.log(begintime,beginhour,beginminute,amount,endhour,endminute);
            var timestr = "## " + beginhour.toString().padStart(2, "0") + ":" + beginminute.toString().padStart(2, "0") + " ~ " + endhour.toString().padStart(2, "0") + ":" + endminute.toString().padStart(2, "0") + "\n\n" + taskname + "\n\n";

            var timeviewfilename = path.draftrepopath + date.slice(0, 4) + "/" + date.slice(4, 6) + "/" + begintime + ".md";
            console.log("time slice draft file name:" + timeviewfilename);
            console.log(timestr);
            fs.writeFileSync(timeviewfilename, timestr);
        }

        var dayplanfilename = path.blogrepopath + "release/time/d." + date + ".md";
        console.log("dayplan file name:\n" + dayplanfilename + "\ncontent:\n" + dayplan);
        fs.writeFileSync(dayplanfilename, dayplan);
    }
};