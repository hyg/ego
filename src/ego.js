const fs = require('fs');
const yaml = require('js-yaml');
const path = require('./path.js');
const util = require('./util.js');
const start = require('./start.js');
const finish = require('./finish.js');

const helpstr = `
node ego day plan: show the day plan in each tempplate
node ego day 1: generate day draft metadata by template 1
node ego day init: generate day plan and draft files by draft metadata 
node ego day over: generate day overall view
node ego dev *: develop mode in the same param
`;

const debug = false;
start.debug = debug;
finish.debug = debug;

// read the arguments
var arguments = process.argv.splice(2);
if (arguments.length > 0) {
    if ((arguments.length == 2) & (arguments[0] == "day")) {
        if (arguments[1] == "init") {
            //node ego day init: generate day plan and draft files by draft metadata 
            var date = util.datestr();
            start.makedayplan(date);
        } else if (arguments[1] == "over") {
            //node ego day over: generate day overall view
            var date = util.datestr();
            var tomorrow = util.datestr(1);
            finish.updateseason(date);
            finish.makedaylog(date);
            finish.maketomorowinfo(tomorrow);
        } else if (arguments[1] == "plan") {
            // node ego day plan: show the day plan in each tempplate
            var date = util.datestr();
            finish.updateseason(date);
            start.testdayplan();
        }else {
            //node ego day 1: generate day draft metadata by template 1
            var date = util.datestr();
            var tomorrow = util.datestr(1);
            var plan = arguments[1];
            start.makedaydraft(date, plan);
            start.makedayplan(date);
            finish.maketomorowinfo(tomorrow);
        }
    }else if ((arguments.length == 2) & (arguments[0] == "dev")) {
        //node ego dev 1: generate day draft metadata by template 1
        var date = util.datestr();
        var tomorrow = util.datestr(1);
        var mode = arguments[1];
        start.devmakedayplan(date, mode);
        //finish.devmaketomorowinfo(tomorrow);
    }else {
        console.log(helpstr);
        process.exit();
    }
} else {

}

