var fs = require('fs');
var yaml = require('js-yaml');
var path = require('./path.js');
var util = require('./util.1.js');

function log(...s) {
    s[0] = log.caller.name + "> " + s[0];
    console.log(...s);
}


module.exports = {
    debug: true,
    entry: function(){
        var AssetType = this.loadAssetType();
        var Account = this.loadAccount();
        var AERmap = this.loadAER(2025);

        for(var file in AERmap){
            var AER = AERmap[file];
            for(var id in AER.AccountingEntry.debit){
                var item = AER.AccountingEntry.debit[id];
                if(Account[item.AccountTitle].record == undefined){
                    Account[item.AccountTitle].record = new Array();
                }
                var record = new Object();
                record.date = AER.date;
                record.voucherID = AER.VoucherID;
                record.asset = item.asset;
                record.type = "debit";
                record.amount = item.amount;
                Account[item.AccountTitle].record.push(record);
                Account[item.AccountTitle].balance[item.asset] += item.amount ;
                Account[item.AccountTitle].balance[item.asset] = Math.round((Account[item.AccountTitle].balance[item.asset]) * 100) / 100 ;
            }for(var id in AER.AccountingEntry.credit){
                var item = AER.AccountingEntry.credit[id];
                if(Account[item.AccountTitle].record == undefined){
                    Account[item.AccountTitle].record = new Array();
                }
                var record = new Object();
                record.date = AER.date;
                record.voucherID = AER.VoucherID;
                record.asset = item.asset;
                record.type = "credit";
                record.amount = item.amount;
                Account[item.AccountTitle].record.push(record);
                Account[item.AccountTitle].balance[item.asset] -= item.amount ;
                Account[item.AccountTitle].balance[item.asset] = Math.round((Account[item.AccountTitle].balance[item.asset]) * 100) / 100 ;
            }
        }
        log(yaml.dump(Account));
        console.table(Account);
    },
    loadAER(year){
        var AERmap = new Object();
        var voucherfolder = path.voucherpath + year ;
        fs.readdirSync(voucherfolder).forEach(file => {
            if (file.substr(0, 4) == "AER.") {
                var AER = yaml.load(fs.readFileSync(voucherfolder + "/" + file, 'utf8'));
                AERmap[file] = AER;
            }
        });
        return AERmap;
    },
    loadAssetType(){
        return {"rmb": {id: 1,name: "rmb"}};
    },
    loadAccount(){
        account = 
        {
            "银行存款": {id: 1, name: "银行存款",balance: {"rmb": 0.0}},
            "现金.微信零钱": {id: 2.1, name: "现金.微信零钱",balance: {"rmb": 0.0}},
            "raw": {id: 10,name: "raw",balance: {"rmb": 0.0}},
                "raw.food": {id: 10.1,name: "raw.food",balance: {"rmb": 0.0}},
                "raw.med": {id: 10.2,name: "raw.med",balance: {"rmb": 0.0}},
                "raw.site": {id: 10.3,name: "raw.site",balance: {"rmb": 0.0}},
                "raw.site.bj1": {id: "10.3.1.",name: "raw.site.bj1",balance: {"rmb": 0.0}},
                "raw.site.wz": {id: "10.3.2.",name: "raw.site.wz",balance: {"rmb": 0.0}},
                "raw.fun": {id: 10.4,name: "raw.med",balance: {"rmb": 0.0}},
                "donation": {id: 20,name: "donation",balance: {"rmb": 0.0}},
                "donation.parent": {id: 20.1,name: "donation.parent",balance: {"rmb": 0.0}},
                "donation.younger": {id: 20.2,name: "donation.younger",balance: {"rmb": 0.0}},
                "donation.parent": {id: 20.1,name: "donation.parent",balance: {"rmb": 0.0}},
                "PSMD": {id: 100,name: "PSMD",balance: {"rmb": 0.0}},
                "xuemen": {id: 1000,name: "xuemen",balance: {"rmb": 0.0}}
            };
        return account;
    }
}