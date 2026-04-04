const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const config = require('./config.js');
const util = require('./util.js');

function log(...s) {
    s[0] = log.caller.name + "> " + s[0];
    console.log(...s);
}

// 获取绝对路径
function getAbsolutePath(relativePath) {
    return path.resolve(__dirname, relativePath);
}

module.exports = {
    debug: false,
    
    // ========== 账户管理 ==========
    
    // 加载账户配置
    loadAccount: function () {
        const filePath = path.join(getAbsolutePath(config.datapath), "account", "accounts.yaml");
        try {
            if (fs.existsSync(filePath)) {
                const accounts = yaml.load(fs.readFileSync(filePath, 'utf8'));
                for (let title in accounts) {
                    if (!accounts[title].debit) accounts[title].debit = {};
                    if (!accounts[title].credit) accounts[title].credit = {};
                    if (!accounts[title].balance) accounts[title].balance = {};
                }
                return accounts;
            }
        } catch (e) {
            log("load accounts error:", e);
        }
        return {
            "总账": { id: 0, name: "总账", ftitle: null, debit: {}, credit: {}, balance: {} },
            "ego": { id: 20, name: "ego", ftitle: "总账", debit: {}, credit: {}, balance: {} },
            "raw": { id: 10, name: "raw", ftitle: "总账", debit: {}, credit: {}, balance: {} }
        };
    },
    
    // 加载资产类型配置
    loadAssetType: function () {
        const filePath = path.join(getAbsolutePath(config.datapath), "account", "resources.yaml");
        try {
            if (fs.existsSync(filePath)) {
                return yaml.load(fs.readFileSync(filePath, 'utf8'));
            }
        } catch (e) {
            log("load resources error:", e);
        }
        return {
            rmb: { name: "人民币", unit: "元", token_rate: 60 },
            time: { name: "时间", unit: "分钟", token_rate: 1 },
            token: { name: "Token", unit: "token", token_rate: 1 }
        };
    },
    
    // 获取voucher目录路径
    getVoucherPath: function(year, subdir = '') {
        const base = getAbsolutePath(config.voucherpath);
        if (subdir) {
            return path.join(base, subdir, year.toString());
        }
        return path.join(base, year.toString());
    },
    
    // ========== 凭证管理 ==========
    
    // 加载凭证（合并staging和archive）
    loadAER: function (year) {
        let AERmap = {};
        
        // 加载staging目录
        const stagingPath = this.getVoucherPath(year, 'staging');
        if (fs.existsSync(stagingPath)) {
            fs.readdirSync(stagingPath).forEach(file => {
                if (file.startsWith("AER.") && file.endsWith(".yaml")) {
                    try {
                        let AER = yaml.load(fs.readFileSync(path.join(stagingPath, file), 'utf8'));
                        AERmap[file] = AER;
                    } catch (e) {
                        log("load AER error:", file, e);
                    }
                }
            });
        }
        
        // 加载archive目录
        const archivePath = this.getVoucherPath(year, 'archive');
        if (fs.existsSync(archivePath)) {
            fs.readdirSync(archivePath).forEach(file => {
                if (file.startsWith("AER.") && file.endsWith(".yaml")) {
                    try {
                        let AER = yaml.load(fs.readFileSync(path.join(archivePath, file), 'utf8'));
                        // archive中相同文件名的覆盖staging（如果staging有则忽略）
                        if (!AERmap[file]) {
                            AERmap[file] = AER;
                        }
                    } catch (e) {
                        log("load AER error:", file, e);
                    }
                }
            });
        }
        
        return AERmap;
    },
    
    // 确认voucher（从staging移动到archive）
    confirmVoucher: function(filename, year) {
        const stagingPath = this.getVoucherPath(year, 'staging');
        const archivePath = this.getVoucherPath(year, 'archive');
        const stagingFile = path.join(stagingPath, filename);
        const archiveFile = path.join(archivePath, filename);
        
        if (!fs.existsSync(stagingFile)) {
            log("staging voucher not found:", filename);
            return false;
        }
        
        // 确保archive目录存在
        if (!fs.existsSync(archivePath)) {
            fs.mkdirSync(archivePath, { recursive: true });
        }
        
        // 移动到archive
        fs.renameSync(stagingFile, archiveFile);
        log("confirmed voucher:", filename, "-> archive");
        return true;
    },
    
    // 创建凭证（写入staging目录）
    createVoucher: function (type, entries, comment, externalVoucherId = null) {
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        const year = dateStr.substring(0, 4);
        
        const existingAERs = this.loadAER(year);
        const existingIds = Object.keys(existingAERs)
            .map(f => parseInt(f.replace('AER.', '').replace('.yaml', '')))
            .filter(n => !isNaN(n));
        const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
        const aerId = nextId.toString();
        
        const voucher = {
            date: dateStr,
            VoucherID: externalVoucherId || "",
            AccountingEntry: { debit: [], credit: [] },
            comment: comment || [],
            sourceDate: ""  // 结算日期，用于幂等检查
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
        
        // 写入staging目录
        const stagingPath = this.getVoucherPath(year, 'staging');
        if (!fs.existsSync(stagingPath)) {
            fs.mkdirSync(stagingPath, { recursive: true });
        }
        
        const filePath = stagingPath + "/AER." + aerId + ".yaml";
        if (this.debug == false) {
            fs.writeFileSync(filePath, yaml.dump(voucher, { 'lineWidth': -1 }));
            log("create voucher:", filePath);
        }
        
        return voucher;
    },
    
    // ========== 余额计算 ==========
    
    // 更新余额
    updatebalance: function (Account, title, type, asset, amount) {
        if (!Account[title]) {
            Account[title] = { id: title, name: title, ftitle: null, debit: {}, credit: {}, balance: {} };
        }
        
        if (!Account[title].debit[asset]) Account[title].debit[asset] = 0;
        if (!Account[title].credit[asset]) Account[title].credit[asset] = 0;
        if (!Account[title].balance[asset]) Account[title].balance[asset] = 0;
        
        switch (type) {
            case "credit":
                Account[title].credit[asset] += amount;
                Account[title].balance[asset] -= amount;
                break;
            case "debit":
                Account[title].debit[asset] += amount;
                Account[title].balance[asset] += amount;
                break;
        }
        
        Account[title].credit[asset] = Math.round(Account[title].credit[asset] * 100) / 100;
        Account[title].debit[asset] = Math.round(Account[title].debit[asset] * 100) / 100;
        Account[title].balance[asset] = Math.round(Account[title].balance[asset] * 100) / 100;
        
        if (Account[title].ftitle) {
            Account = this.updatebalance(Account, Account[title].ftitle, type, asset, amount);
        }
        
        return Account;
    },
    
    // 获取账户余额
    getAccountBalance: function (accountTitle, year) {
        let Account = this.loadAccount();
        let AERmap = this.loadAER(year);
        
        for (let file in AERmap) {
            let AER = AERmap[file];
            for (let id in AER.AccountingEntry.debit) {
                let item = AER.AccountingEntry.debit[id];
                if (accountTitle === item.AccountTitle) {
                    Account = this.updatebalance(Account, item.AccountTitle, "debit", item.asset, item.amount);
                }
            }
            for (let id in AER.AccountingEntry.credit) {
                let item = AER.AccountingEntry.credit[id];
                if (accountTitle === item.AccountTitle) {
                    Account = this.updatebalance(Account, item.AccountTitle, "credit", item.asset, item.amount);
                }
            }
        }
        
        return Account[accountTitle] ? Account[accountTitle].balance : {};
    },
    
    // 账目归并显示（按父子关系）
    getConsolidatedView: function (accountId, year) {
        let Account = this.loadAccount();
        let AERmap = this.loadAER(year);
        
        for (let file in AERmap) {
            let AER = AERmap[file];
            for (let id in AER.AccountingEntry.debit) {
                let item = AER.AccountingEntry.debit[id];
                Account = this.updatebalance(Account, item.AccountTitle, "debit", item.asset, item.amount);
            }
            for (let id in AER.AccountingEntry.credit) {
                let item = AER.AccountingEntry.credit[id];
                Account = this.updatebalance(Account, item.AccountTitle, "credit", item.asset, item.amount);
            }
        }
        
        let selfBalance = Account[accountId] ? Account[accountId].balance : {};
        let childrenBalance = {};
        
        for (let title in Account) {
            if (Account[title].ftitle === accountId) {
                for (let asset in Account[title].balance) {
                    childrenBalance[asset] = (childrenBalance[asset] || 0) + Account[title].balance[asset];
                }
            }
        }
        
        return {
            self: selfBalance,
            children: childrenBalance,
            consolidated: {
                ...selfBalance,
                ...Object.fromEntries(
                    Object.entries(childrenBalance).map(([asset, amount]) => [asset, (selfBalance[asset] || 0) + amount])
                )
            }
        };
    },
    
    // ========== 显示 ==========
    
    // 显示账目（每种资源一个表格）
    entry: function (year) {
        let Account = this.loadAccount();
        let AERmap = this.loadAER(year);
        
        // 计算所有账户的余额
        for (let file in AERmap) {
            let AER = AERmap[file];
            for (let id in AER.AccountingEntry.debit) {
                let item = AER.AccountingEntry.debit[id];
                Account = this.updatebalance(Account, item.AccountTitle, "debit", item.asset, item.amount);
            }
            for (let id in AER.AccountingEntry.credit) {
                let item = AER.AccountingEntry.credit[id];
                Account = this.updatebalance(Account, item.AccountTitle, "credit", item.asset, item.amount);
            }
        }
        
        // 收集所有资源类型
        let assetTypes = new Set();
        for (let title in Account) {
            for (let asset in Account[title].debit) assetTypes.add(asset);
            for (let asset in Account[title].credit) assetTypes.add(asset);
            for (let asset in Account[title].balance) assetTypes.add(asset);
        }
        
        // 为每种资源显示一个表格
        for (let asset of assetTypes) {
            console.log(`\n=== ${asset} ===`);
            let output = {};
            for (let title in Account) {
                let debit = Account[title].debit[asset] || 0;
                let credit = Account[title].credit[asset] || 0;
                let balance = Account[title].balance[asset] || 0;
                
                // 跳过全为0的账户
                if (debit === 0 && credit === 0 && balance === 0) continue;
                
                output[title] = {
                    id: Account[title].id,
                    debit: debit,
                    credit: credit,
                    balance: balance
                };
            }
            
            if (Object.keys(output).length > 0) {
                console.table(output, ["id", "debit", "credit", "balance"]);
            }
        }
        
        // 显示汇总
        console.log('\n=== 汇总 ===');
        let summary = {};
        for (let title in Account) {
            let hasData = false;
            for (let asset in Account[title].balance) {
                if (Account[title].balance[asset] !== 0) {
                    hasData = true;
                    break;
                }
            }
            if (hasData) {
                // 展开显示每种资源的余额
                let balanceStr = '';
                for (let asset in Account[title].balance) {
                    if (Account[title].balance[asset] !== 0) {
                        if (balanceStr) balanceStr += ', ';
                        balanceStr += `${asset}: ${Account[title].balance[asset]}`;
                    }
                }
                summary[title] = {
                    id: Account[title].id,
                    balance: balanceStr
                };
            }
        }
        console.table(summary, ["id", "balance"]);
    },
    
    // ========== 业务操作 ==========
    
    // ego向raw购买时间
    buyTimeFromRaw: function (taskId, templateType, amount) {
        const date = new Date();
        const year = date.getFullYear();
        const season = Math.ceil((date.getMonth() + 1) / 3);
        const pricing = this.loadPricing(year, season);
        
        const tokenRate = templateType.toString().startsWith('2') ? pricing.template_2 : pricing.template_1;
        const tokenAmount = amount * tokenRate;
        
        return this.createVoucher("buy_time", [
            { account: taskId, asset: "time", amount: amount, direction: "debit" },
            { account: "raw", asset: "time", amount: amount, direction: "credit" },
            { account: "raw", asset: "token", amount: tokenAmount, direction: "debit" },
            { account: taskId, asset: "token", amount: tokenAmount, direction: "credit" }
        ], [{ name: "购买时间", task: taskId, template: templateType, time: amount, token: tokenAmount }]);
    },
    
    // ego分配token给子项目
    allocateToken: function (taskId, tokenAmount) {
        return this.createVoucher("allocate_token", [
            { account: taskId, asset: "token", amount: tokenAmount, direction: "debit" },
            { account: "ego", asset: "token", amount: tokenAmount, direction: "credit" }
        ], [{ name: "分配token", task: taskId, token: tokenAmount }]);
    },
    
    // task分配时间给todo
    allocateTimeToTodo: function (taskId, todoName, amount, templateType) {
        const year = new Date().getFullYear();
        const season = Math.ceil((new Date().getMonth() + 1) / 3);
        const pricing = this.loadPricing(year, season);
        
        const tokenRate = templateType.toString().startsWith('2') ? pricing.template_2 : pricing.template_1;
        const tokenAmount = amount * tokenRate;
        
        return this.createVoucher("task_allocate_todo", [
            { account: taskId, asset: "time", amount: amount, direction: "credit" },
            { account: taskId + "." + todoName, asset: "time", amount: amount, direction: "debit" }
        ], [{ name: "分配时间", task: taskId, todo: todoName, amount: amount, token: tokenAmount }]);
    },
    
    // 加载季度定价配置
    loadPricing: function (year, season) {
        const filePath = path.join(getAbsolutePath(config.dataseasonpath), year + "S" + season + ".yaml");
        try {
            if (fs.existsSync(filePath)) {
                const seasonData = yaml.load(fs.readFileSync(filePath, 'utf8'));
                if (seasonData.pricing) return seasonData.pricing;
            }
        } catch (e) {
            log("load pricing error:", e);
        }
        return { template_1: 1, template_2: 2 };
    },
    
    // 计算汇率
    calculateExchangeRate: function (year) {
        const egoBalance = this.getAccountBalance("ego", year);
        const rmbIncome = Math.abs(egoBalance.rmb || 0);
        const tokenCost = Math.abs(egoBalance.token || 0);
        return tokenCost === 0 ? 0 : rmbIncome / tokenCost;
    }
};
