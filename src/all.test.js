const path = require('path');

// 设置工作目录
process.chdir(path.join(__dirname, '..'));

let totalPassed = 0;
let totalFailed = 0;

function runTest(file) {
    console.log(`\n${'='.repeat(50)}`);
    const result = require(file);
    if (result) {
        totalPassed += result.passed || 0;
        totalFailed += result.failed || 0;
    }
}

// 运行所有测试
runTest('./task.test.js');
runTest('./account.test.js');
runTest('./draft.test.js');
runTest('./front.test.js');
runTest('./allocator.test.js');
runTest('./migrate.test.js');

// 输出汇总结果
console.log(`\n${'='.repeat(50)}`);
console.log('=== 全部测试结果汇总 ===');
console.log(`通过: ${totalPassed}`);
console.log(`失败: ${totalFailed}`);
console.log(`总计: ${totalPassed + totalFailed}`);

process.exit(totalFailed > 0 ? 1 : 0);
