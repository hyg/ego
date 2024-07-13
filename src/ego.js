const fs = require('fs');
const yaml = require('js-yaml');
const path = require('./path.js');
const util = require('./util.js');
const start = require('./start.js');
const finish = require('./finish.js');
const day = require('./day.js');

const { Command } = require('commander');
var program = new Command();

function log(...s) {
    s[0] = log.caller.name + "> " + s[0];
    console.log(...s);
}

const debug = true;
day.debug = debug;

program
    .name('ego')
    .description('个人领域的理性部分')
    .version('0.1.2');

const daycommand = program
    .command('day')
    .description('以天为单位的自我管理功能');

daycommand
    .command("init <mode>")
    .description('初始化：绑定时间模版，创建日计划、次日规划、手稿及元数据文件。')
    .action((mode) => {
        log("init:", mode);
    });

daycommand
    .command("over <diff>")
    .description('工作结束，生成日小结、更新次日规划。')
    .action((diff) => {
        log("over:", diff);
    });

daycommand
    .command("plan")
    .description('显示次日规划，不更新任何文件。')
    .action(() => {
        log("plan");
    });


daycommand
    .command("test [data]")
    .description('测试新代码')
    .action((data) => {
        log("test:", data);
    });

program.parse();