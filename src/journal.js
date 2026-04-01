const yaml = require('js-yaml');
const config = require('./config.js');
const account = require('./account.js');
const task = require('./task.js');

function log(...s) {
    s[0] = log.caller.name + "> " + s[0];
    console.log(...s);
}

/**
 * 分录规则系统
 * 
 * 设计目标：
 * 1. 分录规则可配置、可扩展
 * 2. 支持模版化语法
 * 3. 在over时触发实际记账
 */

module.exports = {
    debug: false,
    
    // 分录规则模版
    rules: {
        // ego向task分配JT（购买债权）
        ego_allocate_jt: {
            name: "ego分配JT给task",
            debit: [
                { account: "{task_id}", asset: "jt", amount: "{jt_amount}" }
            ],
            credit: [
                { account: "ego", asset: "jt", amount: "{jt_amount}" }
            ],
            comment: "ego向{task_id}分配JT，购买债权"
        },
        
        // task向raw购买时间
        task_buy_time: {
            name: "task向raw购买时间",
            debit: [
                { account: "{task_id}", asset: "time", amount: "{time_amount}" },
                { account: "raw", asset: "jt", amount: "{jt_amount}" }
            ],
            credit: [
                { account: "raw", asset: "time", amount: "{time_amount}" },
                { account: "{task_id}", asset: "jt", amount: "{jt_amount}" }
            ],
            comment: "{task_id}向raw购买{time_amount}分钟时间"
        },
        
        // task消耗时间（产生artifact）
        task_consume_time: {
            name: "task消耗时间",
            debit: [
                { account: "{task_id}.artifact", asset: "artifact", amount: "1", jt_amount: "{jt_amount}" }
            ],
            credit: [
                { account: "{task_id}", asset: "time", amount: "{time_amount}" }
            ],
            comment: "{task_id}消耗{time_amount}分钟时间，产生artifact"
        },
        
        // over时结算实际使用时间
        over_settle: {
            name: "over结算",
            debit: [
                { account: "{task_id}", asset: "time", amount: "{actual_time}" }
            ],
            credit: [
                { account: "ego.pending", asset: "time", amount: "{planned_time}" },
                { account: "ego", asset: "jt", amount: "{jt_diff}" }
            ],
            comment: "over结算：计划{planned_time}分钟，实际{actual_time}分钟"
        }
    },
    
    // 解析规则模版
    parseRule: function (ruleName, variables) {
        const rule = this.rules[ruleName];
        if (!rule) {
            log("rule not found:", ruleName);
            return null;
        }
        
        // 替换变量
        const replaceVars = (str) => {
            return str.replace(/\{(\w+)\}/g, (match, varName) => {
                return variables[varName] !== undefined ? variables[varName] : match;
            });
        };
        
        const entries = [];
        
        // 处理debit
        for (const debit of rule.debit) {
            entries.push({
                account: replaceVars(debit.account),
                asset: debit.asset,
                amount: parseFloat(replaceVars(debit.amount)),
                direction: 'debit'
            });
        }
        
        // 处理credit
        for (const credit of rule.credit) {
            entries.push({
                account: replaceVars(credit.account),
                asset: credit.asset,
                amount: parseFloat(replaceVars(credit.amount)),
                direction: 'credit'
            });
        }
        
        return {
            entries,
            comment: replaceVars(rule.comment)
        };
    },
    
    // over时结算单个时间片
    settleTimeSlice: function (timeSlice, datestr) {
        const taskId = timeSlice.task || timeSlice.subject;
        const todoName = timeSlice.todo || timeSlice.title;
        
        if (!taskId) {
            log("no task specified, skip settle");
            return null;
        }
        
        // 获取实际使用时间
        let actualTime = timeSlice.amount;
        if (timeSlice.redo != null && timeSlice.redo !== true) {
            // redo字段表示实际使用时间
            actualTime = timeSlice.amount === 0 ? timeSlice.redo : timeSlice.amount;
        }
        if (timeSlice.trueamount != null) {
            actualTime = timeSlice.trueamount;
        }
        
        // 获取模版类型和JT价格
        const season = require('./season.js');
        const pricing = season.getPricing(datestr);
        const templateType = timeSlice.template || 1;
        const jtRate = templateType.toString().startsWith('2') ? pricing.template_2 : pricing.template_1;
        const jtAmount = actualTime * jtRate;
        
        log("settle time slice:", taskId, todoName, "actual:", actualTime, "jt:", jtAmount);
        
        // 使用分录规则生成凭证
        const parsed = this.parseRule('task_buy_time', {
            task_id: taskId,
            time_amount: actualTime,
            jt_amount: jtAmount
        });
        
        if (parsed && !this.debug) {
            // 生成凭证
            const voucher = account.createVoucher(
                'over_settle',
                parsed.entries,
                [{ name: parsed.comment, task: taskId, todo: todoName, time: actualTime, jt: jtAmount }]
            );
            
            // 更新task的JT余额
            const taskData = task.loadTask(taskId);
            if (taskData) {
                if (!taskData.jt_balance) taskData.jt_balance = 0;
                taskData.jt_balance -= jtAmount;
                task.saveTask(taskData);
                log("updated task jt_balance:", taskId, taskData.jt_balance);
            }
            
            return voucher;
        }
        
        return parsed;
    },
    
    // over时结算所有时间片
    settleAllTimeSlices: function (dayobj) {
        const vouchers = [];
        
        for (const timeSlice of dayobj.time) {
            if (timeSlice.type === 'work' || timeSlice.type === 'discuss' || timeSlice.type === 'check') {
                const voucher = this.settleTimeSlice(timeSlice, dayobj.date);
                if (voucher) {
                    vouchers.push(voucher);
                }
            }
        }
        
        log("settled", vouchers.length, "time slices");
        return vouchers;
    },
    
    // 加载自定义分录规则
    loadCustomRules: function () {
        // TODO: 从配置文件加载自定义规则
        // 支持用户定义的分录规则
    }
};
