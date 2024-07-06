var yaml = require('js-yaml');
var path = require('./path.js');
var util = require('./util.js');

function log(s) {
    console.log(log.caller.name + ">", s);
}

module.exports = {
    debug: true,
    makewaitinglist: function(seasonobj,dayobj,mode){
        var waitinglist = new Object();
        

        return waitinglist;
    }
}