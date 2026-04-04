const day = require('./day.js');
const season = require('./season.js');
const asset = require('./asset.js');
const yaml = require('js-yaml');

const { Command } = require('commander');
const program = new Command();

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
    .option("-d, --diff <diff>", "目标日期相对于今天的天数。", 0)
    .action((mode, opt) => {
        log("init:%s %s", mode, opt);
        let dayobj = day.makedayobj(mode, parseInt(opt.diff));
        day.makedayplan(dayobj);
        day.maketomorrowinfo();
    });

daycommand
    .command("over [date]")
    .description('工作结束，生成日小结、更新次日规划。可以指定日期。')
    .action((date) => {
        log("over:", date);
        if (date == undefined) {
            let dayobj = day.loaddayobj();
            day.makedaylog(dayobj);
            day.maketomorrowinfo();
        } else {
            let dayobj = day.loaddayobjbydate(date);
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
        let dayobj = day.loaddayobj();
        day.makedayplan(dayobj);
        day.maketomorrowinfo();
    });


const seasoncommand = program
    .command('season')
    .description('以天季度为单位的自我管理功能');

seasoncommand
    .command("stat [date]")
    .description('显示季度统计报表。')
    .action((date) => {
        log("stat:", date);
        season.debug = true;
        season.stat(date);
    });

seasoncommand
    .command("plan")
    .description('计算本季度的时间计划，更新metadata文件。')
    .action(() => {
        log("plan");
        //season.debug = false;
        season.plan();
    });

const assetcommand = program
    .command('asset')
    .description('资产管理功能');

assetcommand
    .command("entry [year]")
    .description('分录')
    .action((year) => {
        log("year entry: ",year);
        //season.debug = false;
        asset.entry(year);
    });

assetcommand
    .command("account [account]")
    .description('科目明细')
    .action((account) => {
        log("account detail:",account);
        //season.debug = false;
        asset.accountdetail(account);
    });

assetcommand
    .command("year [year]")
    .description('年度报告')
    .action((year) => {
        log("year report:", year);
        //season.debug = false;
        asset.yearreport(year);
    });

assetcommand
    .command("confirmvoucher [date]")
    .description('确认voucher：从staging移动到archive。可选指定日期范围。')
    .action((date) => {
        log("confirmvoucher:", date);
        const fs = require('fs');
        const path = require('path');
        
        const config = require('./config.js');
        const asset = require('./asset.js');
        
        const years = ['2024', '2025', '2026'];
        
        for (const year of years) {
            const stagingPath = asset.getVoucherPath(year, 'staging');
            if (!fs.existsSync(stagingPath)) continue;
            
            const files = fs.readdirSync(stagingPath).filter(f => f.startsWith('AER.') && f.endsWith('.yaml'));
            
            for (const file of files) {
                let shouldConfirm = true;
                
                if (date) {
                    // date可以是日期（如20260404）或年份（如2026）
                    // 只确认该日期之前的voucher
                    const filePath = path.join(stagingPath, file);
                    const content = fs.readFileSync(filePath, 'utf8');
                    const voucher = yaml.load(content);
                    const voucherDate = voucher.date ? voucher.date.toString().replace(/-/g, '').slice(0, 8) : '';
                    
                    if (date.length === 8) {
                        // 精确日期
                        shouldConfirm = voucherDate <= date;
                    } else if (date.length === 4) {
                        // 年份
                        shouldConfirm = voucherDate.startsWith(date);
                    }
                }
                
                if (shouldConfirm) {
                    asset.confirmVoucher(file, year);
                }
            }
        }
        
        log("confirmvoucher done");
    });

program.parse();
