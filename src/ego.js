var fs = require('fs');
var yaml = require('js-yaml');
var path = require('./path.js');
var util = require('./util.js');
var start = require('./start.js');
var finish = require('./finish.js');

const helpstr = `
node ego day plan: show the day plan in each tempplate
node ego day 1: generate day draft metadata by template 1
node ego day init: generate day plan and draft files by draft metadata 
node ego day over: generate day overall view
`;

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
            finish.makedaylog(date);
            finish.updateseason(date);
        } else if (arguments[1] == "plan") {
            // node ego day plan: show the day plan in each tempplate
            var date = util.datestr();
            start.testdayplan();
        }else {
            //node ego day 1: generate day draft metadata by template 1
            var date = util.datestr();
            var plan = arguments[1];
            start.makedaydraft(date, plan);
            start.makedayplan(date);
        }
    } else {
        console.log(helpstr);
        process.exit();
    }
} else {

}

