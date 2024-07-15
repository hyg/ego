const day = require('./day.js');

const { Command } = require('commander');
var program = new Command();

function log(...s) {
    s[0] = log.caller.name + "> " + s[0];
    console.log(...s);
}

const debug = false;
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
        day.makedayobj(mode);
    });

daycommand
    .command("over [date]")
    .description('工作结束，生成日小结、更新次日规划。')
    .action((date) => {
        log("over:", date);
        if (date == undefined) {
            var dayobj = day.loaddayobj();
            day.makedaylog(dayobj);
            day.maketomorrowinfo();
        } else {
            var dayobj = day.loaddayobjbydate(date);
            day.makedaylog(dayobj);
        }
    });

daycommand
    .command("plan")
    .description('显示次日规划，不更新任何文件。')
    .action(() => {
        log("plan");
        day.debug = true;
        day.maketomorrowinfo();
    });

daycommand
    .command("test [data]")
    .description('测试新代码')
    .action((data) => {
        log("test:", data);
    });

program.parse();