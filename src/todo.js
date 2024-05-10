var fs = require('fs');
var yaml = require('js-yaml');

var todoobj = yaml.load(fs.readFileSync("todo.yaml"));
todoobj.PSMD.splice(2,1,...todoobj.PSMD[2].bind);
console.log(yaml.dump(todoobj.PSMD));