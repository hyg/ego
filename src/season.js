const fs = require('fs');
const yaml = require('js-yaml');
const config = require('./config.js');
const util = require('./util.js');
//const dayjs = require('dayjs');

function log(...s) {
    s[0] = log.caller.name + "> " + s[0];
    console.log(...s);
}

module.exports = {
    debug: true,
    seasonfilename: function (datestr = "") {
        let theDate;
        if (datestr != "") {
            theDate = util.str2date(datestr);
        } else {
            theDate = util.dayjs();
        }

        let year = theDate.year();
        let month = theDate.month() + 1;
        let season = Math.ceil(month / 3);

        let seasonfilename = config.dataseasonpath + util.parseTemplate(config.templates.season, { year: year, season: season });
        return seasonfilename;
    },
    loadseasonobj: function (datestr = "") {
        //log("datestr:",datestr);
        let seasonfilename = this.seasonfilename(datestr);
        log("seasonfilename:", seasonfilename);
        let seasonobj = yaml.load(fs.readFileSync(seasonfilename, 'utf8', { schema: yaml.FAILSAFE_SCHEMA }));

        return seasonobj;
    },
    dumpseasonobj: function (seasonobj) {
        let seasonfilename = this.seasonfilename();
        if (this.debug == false) {
            fs.writeFileSync(seasonfilename, yaml.dump(seasonobj, { 'lineWidth': -1 }));
        }
        log("seasonobj.time:\n%s", yaml.dump(seasonobj.time, { 'lineWidth': -1 }));
        //log("seasonobj.todo:\n%s", yaml.dump(seasonobj.todo, { 'lineWidth': -1 }));
    },
    updatesold: function (seasonobj) {
        let sold = new Object();
        let firstdateofseason = seasonobj.year + seasonobj.beginmonth.toString().padStart(2, "0") + seasonobj.beginday.toString().padStart(2, "0");
        let lastdateofseason = seasonobj.year + seasonobj.lastmonth.toString().padStart(2, "0") + seasonobj.lastday.toString().padStart(2, "0");

        let daymetadatapath = config.daymetadatapath + seasonobj.year + "/";
        if (fs.existsSync(daymetadatapath)) {
            fs.readdirSync(daymetadatapath).forEach(file => {
                if (file.substring(file.lastIndexOf(".")) == ".yaml") {
                    let date = file.slice(2, 10);
                    //log("date:",date);
                    if ((date >= firstdateofseason) & (date <= lastdateofseason)) {
                        //log("file:",file);
                        let dayobj = yaml.load(fs.readFileSync(daymetadatapath + file, 'utf8', { schema: yaml.FAILSAFE_SCHEMA }));
                        for (let tid in dayobj.time) {
                            if (dayobj.time[tid].subject != null) {
                                if (sold[dayobj.time[tid].subject] != null) {
                                    sold[dayobj.time[tid].subject] = sold[dayobj.time[tid].subject] + dayobj.time[tid].amount;
                                } else {
                                    sold[dayobj.time[tid].subject] = dayobj.time[tid].amount;
                                }
                            }
                        }
                    }
                }
            });
        } else {
            console.log("daymetadata path not exist:", daymetadatapath)
        }
        seasonobj.time.sold = sold;
        if (this.debug == true) {
            log("season.sold:\n%s", sold)
        }

        return seasonobj;
    },
    deletetodoitem(seasonobj, todoitem) {
        log("delete the todo item from %s: [%s]", todoitem.task, todoitem.name);

        //log("before delete todo item:\n" + yaml.dump(seasonobj.todo[todoitem.task]));
        if (seasonobj.todo[todoitem.task][todoitem.id].bind != null) {
            seasonobj.todo[todoitem.task].splice(todoitem.id, 1, ...seasonobj.todo[todoitem.task][todoitem.id].bind);
        } else {
            seasonobj.todo[todoitem.task].splice(todoitem.id, 1);
        }
        //log("after delete todo item:\n" + yaml.dump(seasonobj.todo[todoitem.task]));

        return seasonobj;
    },
    addtodoitem(seasonobj, task, name, amount, readme) {
        log("add the todo item to %s: \n%s\n%d\n%s", task, name,amount,readme ? readme.join("\n") : "");

        log("before add todo item:\n" + yaml.dump(seasonobj.todo[task]));
        let todoarray = seasonobj.todo[task];
        if (this.findtodoitem(todoarray, name)) {
            log("the todo item already there.");
            return seasonobj;
        }

        let item = new Object();
        item[amount] = name;
        if (readme != null) {
            item.readme = readme;
        }

        seasonobj.todo[task].splice(0, 0, item);

        log("after add todo item:\n" + yaml.dump(seasonobj.todo[task]));

        return seasonobj;
    },
    findtodoitem(todoarray, name) {
        let bhas = false;

        for (let i in todoarray) {
            for (let key in todoarray[i]) {
                if (!isNaN(parseInt(key))) {
                    if (name == todoarray[i][key]) {
                        bhas = true;
                        log("found task:", name, i, key);
                        return true;
                    }
                } else if (key == "bind") {
                    if (this.findtodoitem(todoarray[i][key], name)) {
                        bhas = true;
                        log("found task:", name, i, key);
                        return true;
                    }
                }
            }
        }
        return bhas;
    },
    makestattable: function (seasonobj) {
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
| :---: | ---: | ---: | ---: | ---: |
`;
        for (let task in statobj) {
            seasonstatstr = seasonstatstr + "| " + task + " | " + statobj[task].alloc + " | " + statobj[task].sold + " | " + statobj[task].hold + " | " + statobj[task].todo + " |\n";
        }

        if (this.debug == true) {
            log("seasonstatstr:\n%s", seasonstatstr)
        }
        return seasonstatstr;
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
    },
    stat: function (date) {
        let seasonobj = this.loadseasonobj(date);

        let modestat = new Object();
        let planstat = new Object();
        let firstdateofseason = seasonobj.year + seasonobj.beginmonth.toString().padStart(2, "0") + seasonobj.beginday.toString().padStart(2, "0");
        let lastdateofseason = seasonobj.year + seasonobj.lastmonth.toString().padStart(2, "0") + seasonobj.lastday.toString().padStart(2, "0");

        let daymetadatapath = config.daymetadatapath + seasonobj.year + "/";
        if (fs.existsSync(daymetadatapath)) {
            fs.readdirSync(daymetadatapath).forEach(file => {
                if (file.substring(file.lastIndexOf(".")) == ".yaml") {
                    let date = file.slice(2, 10);
                    //log("date:",date);
                    if ((date >= firstdateofseason) & (date <= lastdateofseason)) {
                        //log("file:",file);
                        let dayobj = yaml.load(fs.readFileSync(daymetadatapath + file, 'utf8', { schema: yaml.FAILSAFE_SCHEMA }));

                        if (dayobj.mode == undefined) {
                            log("mode undefined:", dayobj.date);
                        }
                        if (modestat[dayobj.mode] == null) {
                            modestat[dayobj.mode] = 1;
                        } else {
                            modestat[dayobj.mode]++;
                        }

                        if (planstat[dayobj.plan] == null) {
                            planstat[dayobj.plan] = 1;
                        } else {
                            planstat[dayobj.plan]++;
                        }
                    }
                }
            });
        } else {
            console.log("daymetadata path not exist:", daymetadatapath)
        }
        console.table(modestat);
        console.table(planstat);
    },
    plan: function () {
        let seasonobj = this.loadseasonobj("");

        if (seasonobj.time.timeslice == null) {
            let timeslice = new Object();
            let timesum = 0;

            for (let plan in seasonobj.time.plan) {
                //log("plan:",plan);
                for (let slice in seasonobj.dayplan[plan].timeslice) {
                    if (timeslice[slice] == null) {
                        //log("slice:",slice);
                        timeslice[slice] = seasonobj.dayplan[plan].timeslice[slice] * seasonobj.time.plan[plan];
                    } else {
                        //log("slice:",slice);
                        timeslice[slice] += seasonobj.dayplan[plan].timeslice[slice] * seasonobj.time.plan[plan];
                    }
                    timesum += slice * seasonobj.dayplan[plan].timeslice[slice] * seasonobj.time.plan[plan];
                }
            }
            seasonobj.time.timeslice = timeslice;
            seasonobj.time.timesum = timesum;
            console.table(timeslice);
            log("timesum:", timesum);
            this.dumpseasonobj(seasonobj);
        }
    }
}