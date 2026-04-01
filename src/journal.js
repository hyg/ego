const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const config = require('./config.js');
const account = require('./account.js');
const task = require('./task.js');
const season = require('./season.js');

function log(...s) {
    s[0] = log.caller.name + "> " + s[0];
    console.log(...s);
}

/**
 * 分录规则系统
 * 
 * 规则：
 * - discuss: 不计入JT消耗（raw不对外销售）
 * - check: 由ego购买时间，归档artifact
 * - work: 由task购买时间，消耗时间产生artifact
 * - 有redo字段: 未完成，写回task元数据
 */

module.exports = {
    debug: false,
    
    // 解析单个时间片，返回分录和操作
    parseTimeSlice: function (timeSlice, datestr, plan) {
        const result = {
            type: timeSlice.type,
            entries: [],
            actions: [],
            jtAmount: 0,
            artifactCount: 0
        };
        
        // discuss: 不计入JT消耗
        if (timeSlice.type === 'discuss') {
            result.description = '不计入JT消耗（raw不对外销售）';
            return result;
        }
        
        // check: 由ego购买时间，归档artifact
        if (timeSlice.type === 'check') {
            return this.parseCheckSlice(timeSlice, datestr, plan);
        }
        
        // work: 由task购买时间
        if (timeSlice.type === 'work') {
            return this.parseWorkSlice(timeSlice, datestr, plan);
        }
        
        return result;
    },
    
    // 解析check时间片
    parseCheckSlice: function (timeSlice, datestr, plan) {
        const actualTime = timeSlice.amount;
        const pricing = season.getPricing(datestr);
        const templateType = plan ? plan.charAt(0) : 1;
        const jtRate = templateType === '2' ? pricing.template_2 : pricing.template_1;
        const jtAmount = actualTime * jtRate;
        
        const result = {
            type: 'check',
            entries: [],
            actions: [],
            jtAmount: jtAmount,
            artifactCount: 1,
            description: 'ego购买时间，归档artifact'
        };
        
        if (actualTime > 0 && !this.debug) {
            // [购买时间]
            result.entries.push(
                { account: 'ego', asset: 'time', amount: actualTime, direction: 'debit' },
                { account: 'raw', asset: 'time', amount: actualTime, direction: 'credit' },
                { account: 'raw', asset: 'jt', amount: jtAmount, direction: 'debit' },
                { account: 'ego', asset: 'jt', amount: jtAmount, direction: 'credit' }
            );
            
            // [消耗时间→artifact]
            result.entries.push(
                { account: 'ego.artifact', asset: 'artifact', amount: 1, direction: 'debit' },
                { account: 'ego', asset: 'time', amount: actualTime, direction: 'credit' }
            );
            
            result.artifactFile = timeSlice.output;
        }
        
        return result;
    },
    
    // 解析work时间片
    parseWorkSlice: function (timeSlice, datestr, plan) {
        const taskId = timeSlice.task || timeSlice.subject;
        const todoName = timeSlice.todo || timeSlice.title;
        
        if (!taskId) {
            return {
                type: 'work',
                entries: [],
                actions: [],
                jtAmount: 0,
                artifactCount: 0,
                description: '无特定task，跳过'
            };
        }
        
        // 处理redo字段
        let actualTime = timeSlice.amount;
        const redoEstimate = timeSlice.redo;
        
        if (timeSlice.trueamount != null) {
            actualTime = timeSlice.trueamount;
        }
        
        const isCompleted = !redoEstimate;
        const pricing = season.getPricing(datestr);
        const templateType = plan ? plan.charAt(0) : 1;
        const jtRate = templateType === '2' ? pricing.template_2 : pricing.template_1;
        const jtAmount = actualTime * jtRate;
        
        const result = {
            type: 'work',
            taskId: taskId,
            todoName: todoName,
            entries: [],
            actions: [],
            jtAmount: jtAmount,
            artifactCount: actualTime > 0 ? 1 : 0,
            isCompleted: isCompleted,
            actualTime: actualTime,
            redoEstimate: redoEstimate
        };
        
        if (actualTime > 0 && !this.debug) {
            // [购买时间]
            result.entries.push(
                { account: taskId, asset: 'time', amount: actualTime, direction: 'debit' },
                { account: 'raw', asset: 'time', amount: actualTime, direction: 'credit' },
                { account: 'raw', asset: 'jt', amount: jtAmount, direction: 'debit' },
                { account: taskId, asset: 'jt', amount: jtAmount, direction: 'credit' }
            );
            
            // [消耗时间→artifact]
            result.entries.push(
                { account: taskId + '.artifact', asset: 'artifact', amount: 1, direction: 'debit' },
                { account: taskId, asset: 'time', amount: actualTime, direction: 'credit' }
            );
            
            result.artifactFile = timeSlice.output;
        }
        
        // 未完成：写回task元数据
        if (!isCompleted) {
            result.actions.push({
                type: 'writeback_todo',
                task_id: taskId,
                todo_name: todoName,
                amount: redoEstimate,
                draft: timeSlice.output
            });
        }
        
        return result;
    },
    
    // 解析整个dayobj，返回所有分录和操作
    parseDayObj: function (dayobj) {
        const results = [];
        let totalJT = 0;
        let totalArtifacts = 0;
        
        for (const timeSlice of dayobj.time) {
            const result = this.parseTimeSlice(timeSlice, dayobj.date, dayobj.plan);
            results.push(result);
            totalJT += result.jtAmount;
            totalArtifacts += result.artifactCount;
        }
        
        return {
            results: results,
            totalJT: totalJT,
            totalArtifacts: totalArtifacts
        };
    },
    
    // 执行结算（生成凭证并写入）
    settleDayObj: function (dayobj) {
        const parsed = this.parseDayObj(dayobj);
        const vouchers = [];
        
        for (const result of parsed.results) {
            if (result.entries.length > 0) {
                // 生成凭证
                const voucher = account.createVoucher(
                    'over_settle',
                    result.entries,
                    [{ 
                        type: result.type,
                        task: result.taskId,
                        todo: result.todoName,
                        time: result.actualTime,
                        jt: result.jtAmount,
                        artifact: result.artifactFile
                    }]
                );
                vouchers.push(voucher);
            }
            
            // 执行操作（如写回todo）
            for (const action of result.actions) {
                if (action.type === 'writeback_todo') {
                    this.writebackTodo(action);
                }
            }
            
            // 更新task的JT余额
            if (result.taskId && result.jtAmount > 0) {
                const taskData = task.loadTask(result.taskId);
                if (taskData) {
                    if (!taskData.jt_balance) taskData.jt_balance = 0;
                    taskData.jt_balance -= result.jtAmount;
                    task.saveTask(taskData);
                    log("updated task jt_balance:", result.taskId, taskData.jt_balance);
                }
            }
        }
        
        return {
            vouchers: vouchers,
            totalJT: parsed.totalJT,
            totalArtifacts: parsed.totalArtifacts,
            writebackTodos: parsed.results.flatMap(r => r.actions)
        };
    },
    
    // 写回todo到task元数据
    writebackTodo: function (action) {
        const taskData = task.loadTask(action.task_id);
        if (!taskData) {
            log("task not found:", action.task_id);
            return;
        }
        
        if (!taskData.todos) {
            taskData.todos = [];
        }
        
        // 查找现有todo
        let todo = taskData.todos.find(t => t.name === action.todo_name);
        
        if (todo) {
            // 更新现有todo
            todo.status = 'pending';
            todo.amount = action.amount;
        } else {
            // 创建新todo
            taskData.todos.push({
                name: action.todo_name,
                status: 'pending',
                amount: action.amount,
                time_slices: [],
                history_drafts: action.draft ? [action.draft] : []
            });
        }
        
        task.saveTask(taskData);
        log("writeback todo:", action.task_id, action.todo_name, "amount:", action.amount);
    },
    
    // 格式化输出（用于显示）
    formatOutput: function (parsed) {
        let output = '';
        
        for (const result of parsed.results) {
            output += `--- 时间片 ---\n`;
            output += `类型: ${result.type}\n`;
            
            if (result.type === 'discuss') {
                output += `说明: ${result.description}\n\n`;
                continue;
            }
            
            if (result.type === 'check') {
                output += `JT成本: ${result.jtAmount} JT (ego购买，归档artifact)\n`;
                output += `产出: ${result.artifactCount}个artifact\n`;
                if (result.entries.length > 0) {
                    output += `\n分录:\n`;
                    output += `  [购买时间]\n`;
                    output += `  借: ego (time) +${result.entries[0].amount}分钟\n`;
                    output += `  贷: raw (time) -${result.entries[1].amount}分钟\n`;
                    output += `  借: raw (jt) +${result.entries[2].amount}JT\n`;
                    output += `  贷: ego (jt) -${result.entries[3].amount}JT\n`;
                    output += `  [消耗时间→artifact]\n`;
                    output += `  借: ego.artifact +1 (归档成本: ${result.jtAmount}JT)\n`;
                    output += `  贷: ego (time) -${result.entries[5].amount}分钟\n`;
                    if (result.artifactFile) {
                        output += `  artifact文件: ${result.artifactFile}\n`;
                    }
                }
                output += `\n`;
                continue;
            }
            
            if (result.type === 'work') {
                output += `任务: ${result.taskId}: ${result.todoName}\n`;
                output += `实际工作: ${result.actualTime} 分钟\n`;
                if (result.redoEstimate) {
                    output += `预计还需: ${result.redoEstimate} 分钟\n`;
                    output += `状态: 未完成\n`;
                } else {
                    output += `状态: 已完成\n`;
                }
                output += `JT消耗: ${result.jtAmount} JT\n`;
                output += `产出: ${result.artifactCount}个artifact\n`;
                
                if (result.entries.length > 0) {
                    output += `\n分录:\n`;
                    output += `  [购买时间]\n`;
                    output += `  借: ${result.taskId} (time) +${result.entries[0].amount}分钟\n`;
                    output += `  贷: raw (time) -${result.entries[1].amount}分钟\n`;
                    output += `  借: raw (jt) +${result.entries[2].amount}JT\n`;
                    output += `  贷: ${result.taskId} (jt) -${result.entries[3].amount}JT\n`;
                    output += `  [消耗时间→artifact]\n`;
                    output += `  借: ${result.taskId}.artifact +1 (成本: ${result.jtAmount}JT)\n`;
                    output += `  贷: ${result.taskId} (time) -${result.entries[5].amount}分钟\n`;
                    if (result.artifactFile) {
                        output += `  artifact文件: ${result.artifactFile}\n`;
                    }
                }
                
                if (result.actions.length > 0) {
                    output += `操作: 写回task元数据，todo回到pending（预计${result.redoEstimate}分钟）\n`;
                }
                output += `\n`;
            }
        }
        
        output += `=== 汇总 ===\n`;
        output += `今日消耗JT总计: ${parsed.totalJT} JT\n`;
        output += `今日产出artifact: ${parsed.totalArtifacts} 个\n`;
        
        const writebacks = parsed.results.flatMap(r => r.actions);
        if (writebacks.length > 0) {
            output += `\n=== 需要写回task元数据的todo ===\n`;
            for (const action of writebacks) {
                output += `  - ${action.task_id}: ${action.todo_name}\n`;
                output += `    预计时间: ${action.amount}分钟\n`;
                if (action.draft) {
                    output += `    draft: ${action.draft}\n`;
                }
            }
        }
        
        return output;
    }
};
