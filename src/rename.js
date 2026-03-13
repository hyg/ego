const fs = require('fs');
const path = require('path');
const srcDir = __dirname;
fs.renameSync(path.join(srcDir, 'path.js'), path.join(srcDir, 'config.js'));
console.log('Renamed path.js to config.js');
