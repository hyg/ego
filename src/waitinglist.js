var yaml = require('js-yaml');
var path = require('./path.js');
var util = require('./util.js');

function log(...s) {
    s[0] = log.caller.name + "> " + s[0];
    console.log(...s);
}

module.exports = {
    debug: true,
    makewaitinglist: function (seasonobj) {
        var waitinglist = new Object();

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
        //var waitinglist = new Object();
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
                if (todoobj[restSorted[j]][k] != null) {
                    for (var amounttype in waitinglist) {
                        //console.log("find a item:",yaml.dump(todoobj[restSorted[j]][k]));
                        hasobj = true;
                        if (todoobj[restSorted[j]][k][amounttype] != null) {
                            var todoitem = new Object();
                            todoitem.task = restSorted[j];
                            todoitem.name = todoobj[restSorted[j]][k][amounttype];
                            todoitem.id = k;
                            if (todoobj[restSorted[j]][k]["readme"] != null) {
                                todoitem.readme = todoobj[restSorted[j]][k]["readme"];
                            }
                            waitinglist[amounttype].push(todoitem);
                        }
                    }
                }
            }
            k = k + 1;
        }
        return waitinglist;
    },
    makebrieflist: function(waitinglist){
        var waitingliststr = "\n---\nwaiting list:\n\n";
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
        if(this.debug == true){
            log("waitingliststr:\n%s",waitingliststr)
        }

        return waitingliststr;
    }
}