const yaml = require('js-yaml');
const path = require('./path.js');
const util = require('./util.js');

function log(...s) {
    s[0] = log.caller.name + "> " + s[0];
    console.log(...s);
}

module.exports = {
    debug: true,
    makewaitinglist: function (seasonobj) {
        //log("seasonobj:",seasonobj);
        let waitinglist = new Object();

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
        //log("resttotal:",resttotal);
        //log("rest:\n"+yaml.dump(rest));
        let restSorted = Object.keys(rest).sort(function (a, b) { return rest[b] - rest[a] });
        //log("resetSOrted:\n"+ yaml.dump(restSorted));

        // init the waitinglist
        let dayplanobj = seasonobj.dayplan;
        for (let planid in dayplanobj) {
            for (let amounttype in dayplanobj[planid].timeslice) {
                if (waitinglist[amounttype] == null) {
                    // a new amount type
                    let amounttypelist = new Array();
                    waitinglist[amounttype] = amounttypelist;
                }
            }
        }
        //log("waitinglist:\n",yaml.dump(waitinglist));

        let hasobj = true;
        let k = 0;
        while (hasobj) {
            hasobj = false;
            // search the k th member of todo list of each task
            //console.log("search the %d th member...",k);
            for (let j = 0; j < restSorted.length; j++) {
                //console.log("search the %d th task:%s\n",j,restSorted[j]);
                if (todoobj[restSorted[j]][k] != null) {
                    for (let amounttype in waitinglist) {
                        //console.log("find a item:",yaml.dump(todoobj[restSorted[j]][k]));
                        hasobj = true;
                        if (todoobj[restSorted[j]][k][amounttype] != null) {
                            let todoitem = new Object();
                            todoitem.task = restSorted[j];
                            todoitem.name = todoobj[restSorted[j]][k][amounttype];
                            todoitem.id = k;
                            if (todoobj[restSorted[j]][k]["readme"] != null) {
                                //todoitem.readme = todoobj[restSorted[j]][k]["readme"];
                                todoitem.readme = [...todoobj[restSorted[j]][k]["readme"]];
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
        let waitingliststr = "\n---\nwaiting list:\n\n";
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
        if(this.debug == true){
            log("waitingliststr:\n%s",waitingliststr)
        }

        return waitingliststr;
    }
}