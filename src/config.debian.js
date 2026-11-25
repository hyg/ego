const path = require('path');

// 本文件所在目录（ego/src）
const srcDir = __dirname;
// ego 项目根目录（data 在 ego 下，不在 src 下）
const egoDir = path.join(srcDir, '..');
// 与 ego 同级的仓库根目录（raw、draft、blog、sample 等）
const workDir = path.join(egoDir, '..');

// 返回以路径分隔符结尾的目录，保证可以直接与文件名拼接
function dir(...parts) {
    return path.join(...parts) + path.sep;
}

module.exports = {
    machine: {
        // Windows 10+ 与 Debian 均可使用 ssh；如需指定私钥可用环境变量覆盖
        ssh: process.env.EGO_SSH || 'ssh',
    },

    // ego 自身数据目录（绝对路径，避免依赖当前工作目录）
    datapath: dir(egoDir, 'data'),
    dataseasonpath: dir(egoDir, 'data', 'season'),
    datataskpath: dir(egoDir, 'data', 'task'),
    daymetadatapath: dir(egoDir, 'data', 'day'),
    voucherpath: dir(egoDir, 'data', 'voucher'),

    // 同级仓库（绝对路径，Windows/Debian 通用）
    rawrepopath: dir(workDir, 'raw'),
    draftrepopath: dir(workDir, 'draft'),
    blogrepopath: dir(workDir, 'blog'),

    // git 仓库根目录
    egogitpath: egoDir,
    draftgitpath: path.join(workDir, 'draft'),
    bloggitpath: path.join(workDir, 'blog'),
    samplegitpath: path.join(workDir, 'sample'),

    // 各类文件的命名模板
    templates: {
        health: 'd.{date}.yaml',
        dayMeta: 'd.{date}.yaml',
        season: '{year}S{season}.yaml',
        draft: '{date}.{seq}.md',
        blogTime: 'd.{date}.md',
    },
};
