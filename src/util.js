const crypto = require('crypto');
const dayjs = require('dayjs');
const simpleGit = require('simple-git');
const { execSync } = require('child_process');
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
    /**
     * 新安装 Windows 环境的 SSH 配置步骤：
     *
     * 1. 启用 ssh-agent 服务（管理员 PowerShell）：
     *    Set-Service ssh-agent -StartupType Automatic
     *    Start-Service ssh-agent
     *
     * 2. 生成或导入 SSH 密钥，添加到 ssh-agent：
     *    ssh-keygen -t ed25519 -C "your@email.com"
     *    ssh-add C:\Users\<用户名>\.ssh\id_ed25519
     *
     * 3. 配置 git 使用 Windows 自带的 OpenSSH（不是 Git 自带的 ssh）：
     *    git config --global core.sshCommand "C:\Windows\System32\OpenSSH\ssh.exe -o StrictHostKeyChecking=accept-new"
     *
     * 4. 将公钥注册到远程平台（gitee / github / bitbucket 等）。
     *
     * 原理：
     * - 命令行 git push：读取 core.sshCommand，由 Windows ssh 连接 ssh-agent 完成认证。
     * - bun over（Node.js）：通过 .env() 传入 GIT_SSH_COMMAND，simple-git 调起的 git 子进程
     *   使用 Windows ssh 连接 ssh-agent，无需交互输入密码短语。
     */
    gitstep: async function (path, msg, remote, branch) {
        let statusSummary = null;
        try {
            statusSummary = await simpleGit(path).status();
        } catch (e) {
            console.error("git status error:", e);
            throw e;
        }
        if (statusSummary.files.length) {
            console.log("file changed:", statusSummary.files);
            try {
                const git = simpleGit(path, { config: ['core.autocrlf=false'] })
                    .env({ ...process.env, GIT_SSH_COMMAND: '"C:\\Windows\\System32\\OpenSSH\\ssh.exe" -o StrictHostKeyChecking=accept-new' });
                await git.add('.');
                await git.commit(msg);
                await git.push(remote, branch);
                console.log('success:', path);
            } catch (err) {
                console.error("git operation failed:", err);
                throw err;
            }
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
