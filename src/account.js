const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const config = require('./config.js');

function log(...s) {
    s[0] = log.caller.name + "> " + s[0];
    console.log(...s);
}

// 获取绝对路径（从src目录出发）
function getAbsolutePath(relativePath) {
    return path.resolve(__dirname, relativePath);
}

module.exports = {
    debug: false,
    
    // 加载账户配置
    loadAccounts: function () {
        const filePath = path.join(getAbsolutePath(config.datapath), "account", "accounts.yaml");
        try {
            if (fs.existsSync(filePath)) {
                return yaml.load(fs.readFileSync(filePath, 'utf8'));
            }
        } catch (e) {
            log("load accounts error:", e);
        }
        // 默认账户结构
        return {
            总账: { id: 0, name: "总账", ftitle: null },
            ego: { id: 20, name: "ego", ftitle: "总账" },
            raw: { id: 10, name: "raw", ftitle: "总账" },
            PSMD: { id: 100, name: "PSMD", ftitle: "ego" },
            infra: { id: 101, name: "infra", ftitle: "ego" },
            xuemen: { id: 102, name: "xuemen", ftitle: "ego" },
            learn: { id: 103, name: "learn", ftitle: "ego" },
            js: { id: 104, name: "js", ftitle: "ego" }
        };
    },
    
    // 加载资源类型配置
    loadResources: function () {
        const filePath = path.join(getAbsolutePath(config.datapath), "account", "resources.yaml");
        try {
            if (fs.existsSync(filePath)) {
                return yaml.load(fs.readFileSync(filePath, 'utf8'));
            }
        } catch (e) {
            log("load resources error:", e);
        }
        // 默认资源类型
        return {
            rmb: { name: "人民币", unit: "元", jt_rate: 60 },
            time: { name: "时间", unit: "分钟", jt_rate: 1 }
        };
    },
    
    // 加载季度定价配置
    loadPricing: function (year, season) {
        const filePath = path.join(getAbsolutePath(config.dataseasonpath), year + "S" + season + ".yaml");
        try {
            if (fs.existsSync(filePath)) {
                const seasonData = yaml.load(fs.readFileSync(filePath, 'utf8'));
                if (seasonData.pricing) {
                    return seasonData.pricing;
                }
            }
        } catch (e) {
            log("load pricing error:", e);
        }
        // 默认定价
        return {
            template_1: 1,
            template_2: 2
        };
    },
    
    // 加载凭证年份目录
    loadAER: function (year) {
        let AERmap = {};
        let voucherfolder = getAbsolutePath(config.voucherpath) + "/" + year;
        if (fs.existsSync(voucherfolder)) {
            fs.readdirSync(voucherfolder).forEach(file => {
                if (file.startsWith("AER.") && file.endsWith(".yaml")) {
                    try {
                        let AER = yaml.load(fs.readFileSync(voucherfolder + "/" + file, 'utf8'));
                        AERmap[file] = AER;
                    } catch (e) {
                        log("load AER error:", file, e);
                    }
                }
            });
        }
        return AERmap;
    },
    
    // 获取账户余额
    getAccountBalance: function (accountTitle, year) {
        const AERmap = this.loadAER(year);
        let balance = {};
        
        for (let file in AERmap) {
            let AER = AERmap[file];
            // 处理借方
            for (let id in AER.AccountingEntry.debit) {
                let item = AER.AccountingEntry.debit[id];
                if (accountTitle == item.AccountTitle) {
                    if (!balance[item.asset]) balance[item.asset] = 0;
                    balance[item.asset] += item.amount;
                }
            }
            // 处理贷方
            for (let id in AER.AccountingEntry.credit) {
                let item = AER.AccountingEntry.credit[id];
                if (accountTitle == item.AccountTitle) {
                    if (!balance[item.asset]) balance[item.asset] = 0;
                    balance[item.asset] -= item.amount;
                }
            }
        }
        
        return balance;
    },
    
    // 更新余额（内部递归）
    updatebalance: function (Account, title, type, asset, amount) {
        if (!Account[title]) {
            log("account not found:", title);
            return Account;
        }
        
        if (!Account[title].debit) Account[title].debit = {};
        if (!Account[title].credit) Account[title].credit = {};
        if (!Account[title].balance) Account[title].balance = {};
        
        switch (type) {
            case "credit":
                Account[title].credit[asset] = (Account[title].credit[asset] || 0) + amount;
                Account[title].balance[asset] = (Account[title].balance[asset] || 0) - amount;
                break;
            case "debit":
                Account[title].debit[asset] = (Account[title].debit[asset] || 0) + amount;
                Account[title].balance[asset] = (Account[title].balance[asset] || 0) + amount;
                break;
            default:
                log("unknown type:", type);
        }
        
        // 递归更新父账户
        if (Account[title].ftitle) {
            Account = this.updatebalance(Account, Account[title].ftitle, type, asset, amount);
        }
        
        return Account;
    },
    
    // 创建凭证
    createVoucher: function (type, entries, comment) {
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        const voucherId = type.toUpperCase().charAt(0) + dateStr + Math.random().toString(36).substr(2, 6);
        
        const voucher = {
            date: dateStr,
            VoucherID: voucherId,
            AccountingEntry: {
                debit: [],
                credit: []
            },
            comment: comment || []
        };
        
        for (const entry of entries) {
            const item = {
                AccountTitle: entry.account,
                asset: entry.asset,
                amount: entry.amount
            };
            
            if (entry.direction === 'debit') {
                voucher.AccountingEntry.debit.push(item);
            } else {
                voucher.AccountingEntry.credit.push(item);
            }
        }
        
        // 保存凭证
        const year = dateStr.substring(0, 4);
        const voucherPath = config.voucherpath + year;
        if (!fs.existsSync(voucherPath)) {
            fs.mkdirSync(voucherPath, { recursive: true });
        }
        
        const filePath = voucherPath + "/AER." + voucherId + ".yaml";
        if (this.debug == false) {
            fs.writeFileSync(filePath, yaml.dump(voucher, { 'lineWidth': -1 }));
            log("create voucher:", filePath);
        }
        
        return voucher;
    },
    
    // ego向raw购买时间（每天早上选定模版时调用）
    buyTimeFromRaw: function (taskId, templateType, amount) {
        const date = new Date();
        const year = date.getFullYear();
        const season = Math.ceil((date.getMonth() + 1) / 3);
        const pricing = this.loadPricing(year, season);
        
        const jtRate = templateType.toString().startsWith('2') ? pricing.template_2 : pricing.template_1;
        const jtAmount = amount * jtRate;
        
        // 复式记账分录：
        // 借：task获得time（资产增加）
        // 贷：raw减少time（资产减少）
        // 借：raw获得jt（资产增加）
        // 贷：task减少jt（资产减少）
        return this.createVoucher(
            "buy_time",
            [
                { account: taskId, asset: "time", amount: amount, direction: "debit" },
                { account: "raw", asset: "time", amount: amount, direction: "credit" },
                { account: "raw", asset: "jt", amount: jtAmount, direction: "debit" },
                { account: taskId, asset: "jt", amount: jtAmount, direction: "credit" }
            ],
            [{ name: "购买时间", task: taskId, template: templateType, time: amount, jt: jtAmount }]
        );
    },
    
    // ego分配JT给子项目
    allocateJT: function (taskId, jtAmount) {
        // 复式记账分录：
        // 借：子项目获得jt（资产增加）
        // 贷：ego减少jt（资产减少）
        return this.createVoucher(
            "allocate_jt",
            [
                { account: taskId, asset: "jt", amount: jtAmount, direction: "debit" },
                { account: "ego", asset: "jt", amount: jtAmount, direction: "credit" }
            ],
            [{ name: "分配JT", task: taskId, jt: jtAmount }]
        );
    },
    
    // task分配时间给todo
    allocateTimeToTodo: function (taskId, todoName, amount, templateType) {
        const year = new Date().getFullYear();
        const season = Math.ceil((new Date().getMonth() + 1) / 3);
        const pricing = this.loadPricing(year, season);
        
        const jtRate = templateType.toString().startsWith('2') ? pricing.template_2 : pricing.template_1;
        const jtAmount = amount * jtRate;
        
        // 创建凭证：task减少时间，todo增加时间
        return this.createVoucher(
            "task_allocate_todo",
            [
                { account: taskId, asset: "time", amount: amount, direction: "credit" },
                { account: taskId + "." + todoName, asset: "time", amount: amount, direction: "debit" }
            ],
            [{ name: "task分配时间给todo", task: taskId, todo: todoName, amount: amount, jt: jtAmount }]
        );
    },
    
    // 账目归并显示（按父子关系）
    getConsolidatedView: function (taskId, year) {
        const accounts = this.loadAccounts();
        const task = accounts[taskId];
        if (!task) return null;
        
        // 获取本级余额
        const balance = this.getAccountBalance(taskId, year);
        
        // 获取子账户并归并
        const children = Object.entries(accounts)
            .filter(([id, acc]) => acc.ftitle === taskId)
            .map(([id]) => id);
        
        const childrenBalance = {};
        for (const childId of children) {
            const childBalance = this.getAccountBalance(childId, year);
            for (const asset in childBalance) {
                childrenBalance[asset] = (childrenBalance[asset] || 0) + childBalance[asset];
            }
        }
        
        return {
            self: balance,
            children: childrenBalance,
            consolidated: {
                ...balance,
                ...Object.fromEntries(
                    Object.entries(childrenBalance).map(([asset, amount]) => [
                        asset,
                        (balance[asset] || 0) + amount
                    ])
                )
            }
        };
    },
    
    // 计算汇率（JT对rmb）
    calculateExchangeRate: function (year) {
        const egoBalance = this.getAccountBalance("ego", year);
        const rmbIncome = Math.abs(egoBalance.rmb || 0);
        const jtCost = Math.abs(egoBalance.jt || 0);
        
        if (jtCost === 0) return 0;
        return rmbIncome / jtCost;
    }
};
