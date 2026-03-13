const crypto = require('crypto');
const dayjs = require('dayjs');
const simpleGit = require('simple-git');
const GIT_SSH_COMMAND = 'C:/Progra~1/PuTTY/plink.exe';
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
    },
    gitstep: async function (path, msg, remote, branch) {
        let statusSummary = null;
        try {
            statusSummary = await simpleGit(path).status();
        } catch (e) {
            // handle the error
        }
        if (statusSummary.files.length) {
            console.log("file changed:", statusSummary.files);
            simpleGit(path, { config: ['core.autocrlf=false', 'http.https://github.com.proxy=http://127.0.0.1:9910'] })
                .env('GIT_SSH_COMMAND', GIT_SSH_COMMAND)
                .add('./*')
                .commit(msg)
                .push(remote, branch)
                .then((data) => {
                    console.log('success:', path, "\n", data);
                })
                .catch((err) => {
                    console.log(err);
                });
        } else {
            console.log("non file changed:", path);
        }
    },
    /**
     * 解析模板字符串，替换占位符为实际值
     * @param {string} template - 模板字符串，如 "{year}S{season}.yaml"
     * @param {Object} params - 参数对象，如 { year: "2025", season: "1" }
     * @returns {string} 解析后的字符串
     */
    parseTemplate: function (template, params) {
        return template.replace(/{(\w+)}/g, function(match, key) {
            return params.hasOwnProperty(key) ? params[key] : match;
        });
    }
}
