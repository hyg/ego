const fs = require('fs');
const yaml = require('js-yaml');
const path = require('./path.js');
const util = require('./util.1.js');

function log(...s) {
    s[0] = log.caller.name + "> " + s[0];
    console.log(...s);
}

module.exports = {
    debug: true,
    accountdetail: function (account,year) {
        let AssetType = this.loadAssetType();
        let Account = this.loadAccount();
        let AERmap = this.loadAER(year);

        let detail = new Array();
        let total = new Object();
        total.debit = 0;
        total.credit = 0;

        for (let file in AERmap) {
            let AER = AERmap[file];
            for (let id in AER.AccountingEntry.debit) {
                let item = AER.AccountingEntry.debit[id];
                if (account == item.AccountTitle) {
                    let record = new Object();
                    record.date = AER.date;
                    record.VoucherID = AER.VoucherID;
                    record.asset = item.asset;
                    record.debit = item.amount;
                    detail.push(record);

                    total.debit += item.amount;
                }
            } for (let id in AER.AccountingEntry.credit) {
                let item = AER.AccountingEntry.credit[id];
                if (account == item.AccountTitle) {
                    let record = new Object();
                    record.date = AER.date;
                    record.VoucherID = AER.VoucherID;
                    record.asset = item.asset;
                    record.credit = item.amount;
                    detail.push(record);

                    total.credit += item.amount;
                }
            }
        }
        //let keysSorted = Object.keys(detail).sort(function (a, b) { return (a.date-b.date)});
        detail.sort(function (a, b) { return (a.date - b.date) })
        //detail.push(total);

        //log(yaml.dump(detail));
        console.table(detail);

        total.balance = total.credit - total.debit;
        log(yaml.dump(total));
    },
    yearreport: function (year) {

    },
    entry: function (year) {
        let AssetType = this.loadAssetType();
        let Account = this.loadAccount();
        let AERmap = this.loadAER(year);

        for (let file in AERmap) {
            let AER = AERmap[file];
            for (let id in AER.AccountingEntry.debit) {
                let item = AER.AccountingEntry.debit[id];
                if (Account[item.AccountTitle].record == undefined) {
                    Account[item.AccountTitle].record = new Array();
                }
                let record = new Object();
                record.date = AER.date;
                record.voucherID = AER.VoucherID;
                record.asset = item.asset;
                record.type = "debit";
                record.amount = item.amount;
                Account[item.AccountTitle].record.push(record);
                Account = this.updatebalance(Account, item.AccountTitle, record.type, record.asset, record.amount);
                //Account[item.AccountTitle].balance[item.asset] += item.amount;
                //Account[item.AccountTitle].balance[item.asset] = Math.round((Account[item.AccountTitle].balance[item.asset]) * 100) / 100;
            }
            for (let id in AER.AccountingEntry.credit) {
                let item = AER.AccountingEntry.credit[id];
                if (Account[item.AccountTitle].record == undefined) {
                    Account[item.AccountTitle].record = new Array();
                }
                let record = new Object();
                record.date = AER.date;
                record.voucherID = AER.VoucherID;
                record.asset = item.asset;
                record.type = "credit";
                record.amount = item.amount;
                Account[item.AccountTitle].record.push(record);
                Account = this.updatebalance(Account, item.AccountTitle, record.type, record.asset, record.amount);
                //Account[item.AccountTitle].balance[item.asset] -= item.amount;
                //Account[item.AccountTitle].balance[item.asset] = Math.round((Account[item.AccountTitle].balance[item.asset]) * 100) / 100;
            }
            //log(file,Account["总账"].balance["rmb"]);
        }
        //log(yaml.dump(Account));
        console.table(Account, ["id", "debit", "credit", "balance"]);
    },
    loadAER(year) {
        let AERmap = new Object();
        let voucherfolder = path.voucherpath + year;
        fs.readdirSync(voucherfolder).forEach(file => {
            if (file.substr(0, 4) == "AER.") {
                let AER = yaml.load(fs.readFileSync(voucherfolder + "/" + file, 'utf8'));
                AERmap[file] = AER;
            }
        });
        return AERmap;
    },
    loadAssetType() {
        return { "rmb": { id: 1, name: "rmb" } };
    },
    /*
    Account: a object holding all data
    title: account title
    type: debit or credit
    asset: type of asset, eg rmb
    amount: .
    */
    updatebalance: function (Account, title, type, asset, amount) {
        switch (type) {
            case "credit":
                Account[title].credit[asset] += amount;
                Account[title].balance[asset] -= amount;
                break;
            case "debit":
                Account[title].debit[asset] += amount;
                Account[title].balance[asset] += amount;
                break;
            default: log("unknown type.");
        };
        Account[title].credit[asset] = Math.round((Account[title].credit[asset]) * 100) / 100;
        Account[title].debit[asset] = Math.round((Account[title].debit[asset]) * 100) / 100;
        Account[title].balance[asset] = Math.round((Account[title].balance[asset]) * 100) / 100;

        if (Account[title].ftitle != undefined) {
            Account = this.updatebalance(Account, Account[title].ftitle, type, asset, amount);
        }
        return Account;
    },
    loadAccount() {
        account =
        {
            "总账": { id: 0, name: "总账", debit: { "rmb": 0.0 }, credit: { "rmb": 0.0 }, balance: { "rmb": 0.0 } },
            "银行存款": { id: 1, name: "银行存款", ftitle: "总账", debit: { "rmb": 0.0 }, credit: { "rmb": 0.0 }, balance: { "rmb": 0.0 } },
            "现金": { id: 2, name: "现金", ftitle: "总账", debit: { "rmb": 0.0 }, credit: { "rmb": 0.0 }, balance: { "rmb": 0.0 } },
            "微信零钱": { id: 2.1, name: "微信零钱", ftitle: "现金", debit: { "rmb": 0.0 }, credit: { "rmb": 0.0 }, balance: { "rmb": 0.0 } },
            "raw": { id: 10, name: "raw", ftitle: "总账", debit: { "rmb": 0.0 }, credit: { "rmb": 0.0 }, balance: { "rmb": 0.0 } },
            "raw.food": { id: 10.1, name: "raw.food", ftitle: "raw", debit: { "rmb": 0.0 }, credit: { "rmb": 0.0 }, balance: { "rmb": 0.0 } },
            "raw.med": { id: 10.2, name: "raw.med", ftitle: "raw", debit: { "rmb": 0.0 }, credit: { "rmb": 0.0 }, balance: { "rmb": 0.0 } },
            "raw.site": { id: 10.3, name: "raw.site", ftitle: "raw", debit: { "rmb": 0.0 }, credit: { "rmb": 0.0 }, balance: { "rmb": 0.0 } },
            "raw.site.bj1": { id: "10.3.1.", name: "raw.site.bj1", ftitle: "raw.site", debit: { "rmb": 0.0 }, credit: { "rmb": 0.0 }, balance: { "rmb": 0.0 } },
            "raw.site.wz": { id: "10.3.2.", name: "raw.site.wz", ftitle: "raw.site", debit: { "rmb": 0.0 }, credit: { "rmb": 0.0 }, balance: { "rmb": 0.0 } },
            "raw.fun": { id: 10.4, name: "raw.fun", ftitle: "raw", debit: { "rmb": 0.0 }, credit: { "rmb": 0.0 }, balance: { "rmb": 0.0 } },
            "raw.shell": { id: 10.5, name: "raw.shell", ftitle: "raw", debit: { "rmb": 0.0 }, credit: { "rmb": 0.0 }, balance: { "rmb": 0.0 } },
            "raw.supply": { id: 10.6, name: "raw.supply", ftitle: "raw", debit: { "rmb": 0.0 }, credit: { "rmb": 0.0 }, balance: { "rmb": 0.0 } },
            "ego": { id: 20, name: "ego", ftitle: "总账", debit: { "rmb": 0.0 }, credit: { "rmb": 0.0 }, balance: { "rmb": 0.0 } },
            "ego.it": { id: 20.1, name: "ego.it", ftitle: "ego", debit: { "rmb": 0.0 }, credit: { "rmb": 0.0 }, balance: { "rmb": 0.0 } },
            "donation": { id: 30, name: "donation", ftitle: "总账", debit: { "rmb": 0.0 }, credit: { "rmb": 0.0 }, balance: { "rmb": 0.0 } },
            "donation.parent": { id: 30.1, name: "donation.parent", ftitle: "donation", debit: { "rmb": 0.0 }, credit: { "rmb": 0.0 }, balance: { "rmb": 0.0 } },
            "donation.younger": { id: 30.2, name: "donation.younger", ftitle: "donation", debit: { "rmb": 0.0 }, credit: { "rmb": 0.0 }, balance: { "rmb": 0.0 } },
            "donation.else": { id: 30.3, name: "donation.else", ftitle: "donation", debit: { "rmb": 0.0 }, credit: { "rmb": 0.0 }, balance: { "rmb": 0.0 } },
            "PSMD": { id: 100, name: "PSMD", ftitle: "总账", debit: { "rmb": 0.0 }, credit: { "rmb": 0.0 }, balance: { "rmb": 0.0 } },
            "xuemen": { id: 1000, name: "xuemen", ftitle: "总账", debit: { "rmb": 0.0 }, credit: { "rmb": 0.0 }, balance: { "rmb": 0.0 } }
        };
        return account;
    }
}