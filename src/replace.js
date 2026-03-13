const fs = require('fs');
const path = require('path');

const files = [
    'asset.js',
    'day.js',
    'season.js',
    'finish.js',
    'start.js',
    'waitinglist.js',
    'ego1.js'
];

files.forEach(file => {
    const filePath = path.join(__dirname, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace 'path.' with 'config.' but not 'path.join' or Node.js path module usage
    // Only replace when it's accessing config properties like path.gitpath, path.blogrepopath, etc.
    content = content.replace(/\bpath\.(gitpath|rawrepopath|draftrepopath|blogrepopath|xuemenrepopath|xuemenrecordrepopath|datapath|viewpath|daymetadatapath|voucherpath|bloggitpath|draftgitpath|egogitpath|samplegitpath|dataseasonpath)\b/g, 'config.$1');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
});

console.log('Done!');
