var fs = require('fs');
var path = require('path');
var yaml = require('js-yaml');

let draftrepopath = "../../draft/";

var alldraft = new Object();

// read the arguments
var arguments = process.argv.splice(2);

var helpstr = `
node task           : today draft to stat
node task view       : draft metadata to task view
node task all        : task metadata to alltask metadata
node task 2024       : draft to year stat
node task 20240416   : draft to day stat
node task 1          : diff date draft to stat
node task 20240101 20240401   : period draft to stat`;

if (arguments.length > 0) {
    if (arguments.length == 1) {
        if (arguments[0] == "view") {
            // node task view       : draft metadata to task view
            maketaskview();
        } else if (arguments[0] == "all") {
            //node task all        : task metadata to alltask metadata
            tasktoalltask();
        } else if (arguments[0].length == 4) {
            // node task 2024       : draft to year stat
            var yearstr = arguments[0];
            var year = parseInt(arguments[0]);
            var nextyear = year + 1;
            var nextyearstr = nextyear.toString();
            startdate = yearstr + "0101";
            nextstartdate = nextyearstr + "0101";
            drafttostat(startdate, nextstartdate);
        } else if (arguments[0].length == 8) {
            // node task 20240416   : draft to task stat
            var theday = arguments[0];
            var nextday = (parseInt(theday) + 1).toString();
            drafttostat(theday, nextday);
            //drafttotask(today);
        } else if ((arguments[0].length != 8) & (!isNaN(arguments[0]))) {
            // node task 1          : diff date draft to task stat
            var diff = parseInt(arguments[0]);
            var theday = datestr(diff);
            var nextday = datestr(diff + 1)
            drafttostat(theday, nextday);
            //drafttotask(theday);
        }
    } else if (arguments.length == 2) {
        // node task 20240101 20240401   : period draft to stat
        var startdate = arguments[0];
        var nextstartdate = arguments[1];
        //drafttostat(startdate, nextstartdate);
        drafttostat(startdate, nextstartdate);
    } else {
        console.log(helpstr);
        process.exit();
    }
} else {
    //node task           : today draft to stat
    var today = datestr();
    var nextday = datestr(1);
    drafttostat(today, nextday);
}

function maketaskview() {
    //console.log("make task view...");
    // load all task metadata
    var alltask = yaml.load(fs.readFileSync("alltask.yaml", 'utf8'));
    // make task name-id index
    var taskbyname = new Object();
    for (var id in alltask.tasklist) {
        taskbyname[alltask.tasklist[id].name] = id;
    }
    //console.log("task name-id index:\n"+yaml.dump(taskbyname));

    //load all draft
    traverseFolder(draftrepopath, loaddraft);
    //console.log(alldraft.valueOf());

    var firstdate = datestr();
    for (var date in alldraft) {
        if (date < firstdate) {
            firstdate = date;
            //console.log("first date changed:"+firstdate);
        }

        for (var slice in alldraft[date].time) {
            var logitem = new Object();

            logitem.begin = alldraft[date].time[slice].begin;
            logitem.amount = alldraft[date].time[slice].amount;
            logitem.name = alldraft[date].time[slice].name;
            logitem.output = alldraft[date].time[slice].output;

            var taskname = alldraft[date].time[slice].subject;
            //console.log(taskname);
            //console.log(alltask.tasklist[taskbyname[taskname]]);
            if (taskbyname[taskname] != null) {
                if (alltask.tasklist[taskbyname[taskname]].log == null) {
                    alltask.tasklist[taskbyname[taskname]].log = new Object();
                }
                alltask.tasklist[taskbyname[taskname]].log[logitem.begin] = logitem;
                if ((alltask.tasklist[taskbyname[taskname]].firstlog == null) | (alltask.tasklist[taskbyname[taskname]].firstlog > logitem.begin)) {
                    alltask.tasklist[taskbyname[taskname]].firstlog = logitem.begin;
                }
                if (alltask.tasklist[taskbyname[taskname]].totaltime == null) {
                    alltask.tasklist[taskbyname[taskname]].totaltime = logitem.amount;
                } else {
                    alltask.tasklist[taskbyname[taskname]].totaltime = alltask.tasklist[taskbyname[taskname]].totaltime + logitem.amount;
                }
            } else {
                console.log("can't find task metadata:\t" + taskname);
            }
        }
        alltask.firstdrat = firstdate;
    }
    //console.log("the final alltask:\n" + yaml.dump(alltask));
    fs.writeFile("alltask.yaml", yaml.dump(alltask), (err) => {
        if (err) throw err;
        console.log('\n\nalltask.yaml文件已被更新。');
    });

    // make task markdown
    for(var id in alltask.tasklist){
        var taskobj = alltask.tasklist[id];
        var taskstr = "# "+taskobj.name +"\n\n";

        taskstr = taskstr + "- id:" + taskobj.id + "\n";
        if(taskobj["parent id"] != 0){
            taskstr = taskstr + "- 父任务id:" + taskobj["parent id"] + "\n";    
        }
        taskstr = taskstr + "- 开始时间:" + taskobj.start + "\n";
        if(taskobj["firstlog"] != null){
            taskstr = taskstr + "- 日志开始时间:" + taskobj["firstlog"] + "\n";    
        }
        if(taskobj["totaltime"] != null){
            taskstr = taskstr + "- 总耗时(分钟):" + taskobj["totaltime"] + "\n";    
        }
        if(taskobj["dependencies"] != null){
            taskstr = taskstr + "- 依赖任务id:\n" ;
            for(var i in taskobj["dependencies"]){
                taskstr = taskstr + "\t" + taskobj["dependencies"][i] + "\n";
            }
        }
        taskstr = taskstr + "- 路径:" + taskobj.path + "\n";
        taskstr = taskstr + "- 简介:\n~~~\n" + taskobj.readme + "\n~~~\n";
        if(taskobj["log"] != null){
            taskstr = taskstr + "## 任务日志:\n|时间|时长(分钟)|名称|输出结果|\n|---|---|---|---|\n" ;

            for(var date in taskobj["log"]){
                var logitem = taskobj["log"][date] ;
                taskstr = taskstr + "|" + logitem["begin"] + "|" + logitem["amount"] + "|" + logitem.name + "|[" + logitem["output"] + "](" + logitem["output"] + ")|\n";
            }
        }
        
        var markdownfilename = "task."+taskobj.id+".md" ;
        console.log("filename:"+markdownfilename+"\n"+taskstr);
        fs.writeFile(markdownfilename,taskstr, (err) => {
            if (err) throw err;
            console.log('\n'+markdownfilename+"文件已被更新。");
        });
    }
}


function loaddraft(itemPath) {
    var draft = new Object();

    if (path.extname(itemPath) == ".yaml") {
        //console.log("read draft metadata:"+itemPath);
        draft = yaml.load(fs.readFileSync(itemPath, 'utf8'));
        alldraft[draft.date] = draft;
    }
}

function tasktoalltask() {
    var alltask = new Object()
    //var task;

    const date = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    //const dateString = date.toLocaleDateString('zh-CN', options);
    const dateString = date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
    //const dateString = moment(date).format('YYYY-MM-DD HH:mm:ss');// 输出类似 "2023-03-13 11:30:45" 的字符串
    alltask["time"] = dateString;

    var tasklist = new Object();
    loadtask(".",tasklist);
    // make the task structure
    var tasktree = new Object();
    
    for(var id in tasklist){
        if(tasklist[id]["parent id"] == 0){
            tasktree[id] = yaml.load(yaml.dump(tasklist[id])) ;
            tasktree[id].level = 1 ;
        }
    }
    var level = 0 ;    
    var findsub = true;
    while(findsub){
        findsub = false;
        level = level+1;
        for(var treeid in tasktree){
            if(tasktree[treeid].level == level){
                console.log("search the subtask of:"+tasktree[treeid].name+"\t"+treeid)
                for(var listid in tasklist){
                    if(tasklist[listid]["parent id"] == treeid){
                        console.log("find a subtask:"+tasklist[listid].name+"\t"+listid);
                        if(tasktree[treeid].subtask == null){
                            tasktree[treeid].subtask = new Object();
                        }
                        tasktree[treeid].subtask[listid] = yaml.load(yaml.dump(tasklist[listid])) ;
                        tasktree[treeid].subtask[listid].level = level+1 ;
                        findsub = true;
                    }
                }
            }
        }
    }

    alltask.tasklist = tasklist;
    alltask.tasktree = tasktree;

    //console.log(yaml.dump(alltask));
    
    fs.writeFile("alltask.yaml", yaml.dump(alltask), (err) => {
        if (err) throw err;
        console.log('alltask.yaml文件已被保存。');
    });
    
}

// load all task metadata files in a folder, append in a object.
// if any task has its own path field, search it.
function loadtask(path,obj){
    //console.log("enter loadtask, path:"+path);

    if (fs.existsSync(path)){
        fs.readdirSync(path).forEach(file => {
            if ((file.substring(file.lastIndexOf(".")) == ".yaml")&(file.substr(0, 5) == "task.")) {
                //console.log("loading:"+file);
                task = yaml.load(fs.readFileSync(path+"\\"+file, 'utf8'));
                //console.log("load "+task.name);
                obj[task.id] = task;
    
                if(task.path != null){
                    for(var item in task.path){
                        var nextname = task.path[item].name;
                        var nextpath = path+"\\"+task.path[item].path;
                        //console.log("find a new path. name: "+ nextname + "\tpath:" + nextpath) ;
                        loadtask(nextpath,obj);
                    }
                    
                }
            }
        });
    }else{
        console.log("this path is not exist:"+ path);
    }
    
}

function drafttostat(startdate, nextstartdate) {
    console.log("draft to stat:" + startdate + "~" + nextstartdate);

    var startyear = startdate.slice(0, 4);
    var startmonth = startdate.slice(4, 6);
    var nextstartyear = nextstartdate.slice(0, 4);
    var nextstartmonth = nextstartdate.slice(4, 6);

    var alltask = yaml.load(fs.readFileSync("alltask.yaml", 'utf8'));
    // make task name-id index
    var taskbyname = new Object();
    for (var id in alltask.tasklist) {
        taskbyname[alltask.tasklist[id].name] = id;
    }
    //console.log("task name-id index:\n"+yaml.dump(taskbyname));

    //load all draft
    //console.log("before traverseFolder:\n"+yaml.dump(alldraft));
    traverseFolder(draftrepopath, loaddraft);
    //console.log("after traverseFolder:\n"+yaml.dump(alldraft));

    var subjecttime = new Object();

    for (date in alldraft) {
        //console.log("read date draft:"+date);
        if ((date >= startdate) & (date < nextstartdate)) {
            var draft = alldraft[date];
            //console.log(yaml.dump(draft));
            for (i in draft.time) {
                var slice = draft.time[i];
                //console.log(yaml.dump(slice));
                if (subjecttime[slice.subject] == null) {
                    subjecttime[slice.subject] = slice.amount;
                } else {
                    subjecttime[slice.subject] = subjecttime[slice.subject] + slice.amount;
                }

            }
        }
    }

    //console.log(Object.values(taskbyname));

    for (name in subjecttime) {
        console.log(name + " spent " + subjecttime[name] + " minutes.");
    }

}

function drafttotask(date) {
    var year = date.slice(0, 4);
    var month = date.slice(4, 6);
    var draftmetadatafilename = year + "/" + month + "/d." + date + ".yaml";
    var draftmetadata = yaml.load(fs.readFileSync(draftrepopath + draftmetadatafilename, 'utf8'));

    var alltask = yaml.load(fs.readFileSync("alltask.yaml", 'utf8'));
    var taskbyname = new Object();
    for (taskid in alltask.task) {
        //console.log("task id:"+taskid);
        taskbyname[alltask.tasklist[taskid].name] = taskid;
    }
    //console.log(taskbyname.valueOf());

    for (t in draftmetadata.time) {
        var timelog = draftmetadata.time[t];
        //console.log(typeof(timelog.begin));
        console.log("timelog.subject:" + timelog.subject);
        if (taskbyname[timelog.subject] != undefined) {
            // the subject is a task
            var taskmetadatafilename = "test." + "task." + timelog.subject + ".yaml";
            //console.log("\nloading file\n"+taskmetadatafilename+"\n"+fs.readFileSync(taskmetadatafilename, 'utf8'));
            var taskmetadata = yaml.load(fs.readFileSync(taskmetadatafilename, 'utf8'));
            var tasklog = taskmetadata.log;
            if (tasklog == null) {
                tasklog = new Object();
            }
            tasklog[timelog.begin] = new Object();
            tasklog[timelog.begin].name = timelog.name;
            tasklog[timelog.begin].output = timelog.output;
            var logSorted = Object.keys(tasklog).sort(function (a, b) { return b - a });

            var newlog = new Object();
            for (var time in logSorted) {
                newlog[logSorted[time]] = tasklog[logSorted[time]];
            }
            console.log(yaml.dump(newlog));
            taskmetadata.log = newlog;
            console.log(yaml.dump(taskmetadata));

            fs.writeFile(taskmetadatafilename, yaml.dump(taskmetadata), (err) => {
                if (err) throw err;
                console.log(taskmetadatafilename + '文件已被更新。');
            });

        } else {
            console.log("a subject isn't task:" + timelog.subject);
        }
    }
}

// utils
function datestr(diff = 0) {
    var theDate = new Date();
    //theDate.setDate(theDate.getDate() - 1);
    theDate.setDate(theDate.getDate() + diff);

    var year = theDate.getFullYear();
    var month = theDate.getMonth() + 1 < 10 ? "0" + (theDate.getMonth() + 1) : theDate.getMonth() + 1;
    var day = theDate.getDate() < 10 ? "0" + theDate.getDate() : theDate.getDate();
    var dateStr = year + "" + month + "" + day;

    //console.log("datestr retrun:"+dateStr);
    return dateStr;
}

function traverseFolder(folderPath, callback) {
    const items = fs.readdirSync(folderPath);
    items.forEach(item => {
        const itemPath = path.join(folderPath, item);
        const stats = fs.statSync(itemPath);
        if (stats.isDirectory()) {
            traverseFolder(itemPath, callback);
        } else if (stats.isFile()) {
            callback(itemPath);
        }
    });
}