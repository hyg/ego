var fs = require('fs');
var yaml = require('js-yaml');
var path = require('./path.js');

module.exports = {
    makedaylog: function (date) {
        var year = date.slice(0, 4);
        var month = date.slice(4, 6);
        var day = date.slice(6, 8);

        //var draftmetafilename = path.draftrepopath + year + "/" + month + "/" + "d." + date + ".yaml";
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
        var daylog = "# " + year + "." + month + "." + day + ".\n日小结  \n\n<a id=\"top\"></a>\n";

        var plan = draftmetadata.plan;
        if (plan != null) {
            var season = Math.ceil(parseInt(month) / 3);
            var seasonpath = "../data/season/" + year + "S" + season + ".yaml";
            console.log("seasonpath:" + seasonpath);
            var planobj = yaml.load(fs.readFileSync(seasonpath, 'utf8'));
            var time = planobj.dayplan[plan].time;
            //var planobj = yaml.load(fs.readFileSync("plan.yaml", 'utf8'));
            //var planstr = planobj.dayplan[plan].planstr;

            var timeslicename = new Object();
            for (var i in draftmetadata.time) {
                timeslicename[draftmetadata.time[i].begin] = draftmetadata.time[i].name;
            }

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
                if ((timeslicename[begintime] != null) & (timeslice.type == "work")) {
                    draftstr = draftstr + "[" + timeslicename[begintime] + "](#" + begintime + ")";
                }

                planstr = planstr + "| " + beginhour.toString().padStart(2, '0') + ":" + beginminute.toString().padStart(2, '0') + "~" + endhour.toString().padStart(2, '0') + ":" + endminute.toString().padStart(2, '0') + " | " + amount + " | " + timeslice.name + " | " + draftstr + " |\n";
            }

            planstr = planstr + "\n" + planobj.dayplan[plan].readme;

            daylog = daylog + "根据[ego模型时间接口](https://gitee.com/hyg/blog/blob/master/timeflow.md)，今天绑定模版" + plan + "。\n\n" + planstr;
        } else {
            daylog = daylog + "当天未绑定时间模版"
        }

        var indexstr = "\n---\n\n<a id=\"index\"></a>\n";
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

        var daylog = daylog + indexstr + "\n" + logstr;
        //console.log(daylog);

        var daylogfilename = path.blogrepopath + "release/time/d." + date + ".md";
        console.log("daylog file name:\n" + daylogfilename + "\ncontent:\n" + daylog);
        fs.writeFileSync(daylogfilename, daylog);
    }
}