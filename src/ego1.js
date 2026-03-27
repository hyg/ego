const fs = require('fs');
const yaml = require('js-yaml');
const config = require('./config.js');
const util = require('./util.js');
const start = require('./start.js');
const finish = require('./finish.js');
const day = require('./day.js');

const { Command } = require('commander');
const program = new Command();

const log = s => console.log(s);

const debug = true;
start.debug = debug;
finish.debug = debug;

program
  .name('ego')
  .description('个人领域的理性部分')
  .version('0.1.1');

program
  .command('day')
  .description('以天为单位的自我管理功能')
  .option('-i, --init <int>', '初始化：绑定时间模版，创建日计划、次日规划、手稿及元数据文件。')
  .option('-o, --over', '工作结束，生成日小结、更新次日规划。')
  .option('-p, --plan', '显示次日规划，不更新任何文件。')
  .option('-t, --test', '测试新代码')
  .action((options) => {
    log(options);
    if (options.init) {
      let date = util.datestr();
      let tomorrow = util.datestr(1);
      let plan = options.init;
      start.devmakedayplan(date, plan);
      //start.makedaydraft(date, plan);
      //start.makedayplan(date);
      finish.maketomorowinfo(tomorrow);
    } else if (options.over) {
      let date = util.datestr();
      log("date:", date);

      finish.updateseason(date);
      finish.makedaylog(date);

      let tomorrow = util.datestr(1);
      finish.maketomorowinfo(tomorrow);

    } else if (options.plan) {
      let date = util.datestr();
      finish.updateseason(date);
      start.testdayplan();
    } else if (options.test) {


    }
  });

program.parse();
