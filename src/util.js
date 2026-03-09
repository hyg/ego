const crypto = require('crypto');
const dayjs = require('dayjs');
const customParseFormat = require("dayjs/plugin/customParseFormat");
dayjs.extend(customParseFormat);

module.exports = {
    dayjs: dayjs,
    datestr: function (diff = 0) {
        let now = dayjs();
        const thedate = now.add(diff, 'day');
        return thedate.format("YYYYMMDD");
    },
    makemetafileid: function (name) {
        let hashid = crypto.createHash("sha256").update(name).digest("hex").slice(0, 8);
        return hashid;
    },
    datestring: function(diff=0){
        let theDate = dayjs().add(diff, 'day');
        return theDate.format("YYYYMMDD");
    },
    str2time: function(date){
        let theDate = dayjs(date, "YYYYMMDDHHmmss");
        return theDate.toDate();
    },
    str2date: function(date){
        let theDate = dayjs(date, 'YYYYMMDD')
        return theDate;
    },
    format: function (date, fmt) {
        if (date instanceof Date) {
            date = dayjs(date.valueOf());
        } else if (!(date instanceof dayjs)) {
            date = dayjs(date);
        }
        let formatMap = {
            'yyyy': 'YYYY',
            'MM': 'MM',
            'dd': 'DD',
            'hh': 'HH',
            'mm': 'mm',
            'ss': 'ss',
            'S': 'SSS'
        };
        let dayjsFmt = fmt;
        for (let key in formatMap) {
            dayjsFmt = dayjsFmt.replace(new RegExp(key, 'g'), formatMap[key]);
        }
        return date.format(dayjsFmt);
    }
}
