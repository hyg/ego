const fs = require('fs');
const yaml = require('js-yaml');
const path = require('./path.js');
const util = require('./util.js');
const start = require('./start.js');
const finish = require('./finish.js');

const { Command } = require('commander');
const program = new Command();

const log = s => console.log(s);

program
  .name('ego')
  .description('个人领域的理性部分')
  .version('0.1.1');

  program.command('day')
  .description('以天为单位的自我管理功能')
  .option('-i, --init <int>', '初始化：绑定时间模版，创建日计划、次日规划、手稿及元数据文件。')
  .option('-o, --over', '工作结束，生成日小结、更新次日规划。')
  .option('-p, --plan', '显示次日规划，不更新任何文件。')
  .action((options) => {
    log(options);
    if(options.init){
        log("init:",options.init);
    }else if(options.over){
        log("over:",options.over);
    }else if(options.plan){
        log("plan:",options.plan);
    }
  });

program.parse();
