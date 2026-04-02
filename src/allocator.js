const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const config = require('./config.js');
const task = require('./task.js');
const front = require('./front.js');
const season = require('./season.js');

function log(...s) {
    s[0] = log.caller.name + "> " + s[0];
    console.log(...s);
}

module.exports = {
    debug: false,
    
    // 分配原则
    PRINCIPLES: {
        DEADLINE_FIRST: 'deadline_first',      // 有完成期限优先
        TOKEN_BALANCE: 'token_balance',        // 按token余额
        ROUND_ROBIN: 'round_robin'             // 交叉进行
    },
    
    // 获取候选todo列表（按时间长度分组）
    getCandidateTodos: function (amount = null) {
        const allTasks = task.listTasks();
        const candidates = [];
        
        // 获取每个task最近一次获得时间片的时间
        const lastWorkDates = this.getLastWorkDates();
        
        for (const taskId of allTasks) {
            const taskData = task.loadTask(taskId);
            if (!taskData || !taskData.todos) continue;
            
            for (const todo of taskData.todos) {
                if (todo.status === 'pending' || todo.status === 'in_progress') {
                    // 如果指定了amount，只返回匹配的todo
                    if (amount !== null && todo.amount !== amount) continue;
                    
                    candidates.push({
                        task_id: taskId,
                        todo_name: todo.name,
                        title: `${taskId}.${todo.name}`,
                        amount: todo.amount || 60,  // 预估时间
                        status: todo.status,
                        front_type: front.getFrontType(taskId),
                        deadline: taskData.contract?.deadline,
                        token_balance: taskData.token_balance || 0,
                        priority: front.getTodoPriority(taskId, todo.name),
                        last_work_date: lastWorkDates[taskId] || '00000000'
                    });
                }
            }
        }
        
        return candidates;
    },
    
    // 获取每个task最近一次获得工作时间片的日期
    getLastWorkDates: function () {
        const lastWorkDates = {};
        const today = new Date();
        
        // 查询最近30天的day元数据
        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
            const year = dateStr.substring(0, 4);
            const dayFilePath = path.join(__dirname, '..', 'data', 'day', year, `d.${dateStr}.yaml`);
            
            if (fs.existsSync(dayFilePath)) {
                try {
                    const dayData = yaml.load(fs.readFileSync(dayFilePath, 'utf8'));
                    if (dayData.time) {
                        for (const t of dayData.time) {
                            if ((t.type === 'work' || t.type === 'discuss' || t.type === 'check') && t.task) {
                                if (!lastWorkDates[t.task] || dateStr > lastWorkDates[t.task]) {
                                    lastWorkDates[t.task] = dateStr;
                                }
                            }
                        }
                    }
                } catch (e) {
                    // ignore
                }
            }
        }
        
        return lastWorkDates;
    },
    
    // 按原则排序todo
    sortTodosByPrinciples: function (candidates, excludeTaskIds = []) {
        return candidates.sort((a, b) => {
            // 原则一：有完成期限优先
            if (a.deadline && !b.deadline) return -1;
            if (!a.deadline && b.deadline) return 1;
            if (a.deadline && b.deadline) {
                const deadlineCompare = a.deadline.localeCompare(b.deadline);
                if (deadlineCompare !== 0) return deadlineCompare;
            }
            
            // 原则二：按token余额（余额多的优先，表示有资源可用）
            if (a.token_balance !== b.token_balance) {
                return b.token_balance - a.token_balance;
            }
            
            // 原则三：被闲置越久越优先（last_work_date越小越优先）
            if (a.last_work_date !== b.last_work_date) {
                return a.last_work_date.localeCompare(b.last_work_date);
            }
            
            // 最后按优先级分数
            return b.priority - a.priority;
        });
    },
    
    // 选择todo绑定时间片
    // timeSliceAmount: 时间片长度（30、60、90、195）
    // templateType: 模版类型（1或2）
    // excludeTaskIds: 需要排除的task列表（模版一相邻work时间片不安排同一task）
    selectTodoForTimeSlice: function (timeSliceAmount, templateType, excludeTaskIds = []) {
        // 只获取匹配时间长度的todo
        const candidates = this.getCandidateTodos(timeSliceAmount);
        
        if (candidates.length === 0) {
            log("no candidate todos for amount:", timeSliceAmount);
            // 如果没有精确匹配的，放宽条件（amount相近的也可以）
            const allCandidates = this.getCandidateTodos();
            const similarCandidates = allCandidates.filter(c => {
                // 允许预估时间大于等于时间片长度的todo
                return c.amount >= timeSliceAmount;
            });
            if (similarCandidates.length > 0) {
                return this.selectFromCandidates(similarCandidates, timeSliceAmount, templateType, excludeTaskIds);
            }
            return null;
        }
        
        return this.selectFromCandidates(candidates, timeSliceAmount, templateType, excludeTaskIds);
    },
    
    // 从候选列表中选择todo
    selectFromCandidates: function (candidates, timeSliceAmount, templateType, excludeTaskIds = []) {
        // 计算token成本
        const pricing = season.getPricing();
        const tokenRate = templateType.toString().startsWith('2') ? pricing.template_2 : pricing.template_1;
        const tokenCost = timeSliceAmount * tokenRate;
        
        // 过滤出token余额足够的todo
        let affordable = candidates.filter(c => c.token_balance >= tokenCost);
        
        // 模版一：跳过已选task（相邻work时间片不安排同一task）
        if (excludeTaskIds.length > 0) {
            const filtered = affordable.filter(c => !excludeTaskIds.includes(c.task_id));
            if (filtered.length > 0) {
                affordable = filtered;
            }
            // 如果过滤后没有可选的，则允许重复选择
        }
        
        if (affordable.length === 0) {
            log("no affordable todos, token cost:", tokenCost);
            // 返回token余额最高的todo（可能需要先分配token）
            const sorted = this.sortTodosByPrinciples(candidates, excludeTaskIds);
            return sorted[0] ? { ...sorted[0], token_cost: tokenCost, template: templateType } : null;
        }
        
        // 按原则排序
        const sorted = this.sortTodosByPrinciples(affordable, excludeTaskIds);
        const selected = sorted[0];
        
        log("selected todo:", selected.title, "amount:", selected.amount, "token cost:", tokenCost);
        return {
            ...selected,
            token_cost: tokenCost,
            template: templateType
        };
    },
    
    // 获取最近使用过的task（用于交叉原则）
    getRecentTaskIds: function (days = 7) {
        const recentTaskIds = [];
        const today = new Date();
        
        for (let i = 1; i <= days; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
            const dayFilePath = config.daymetadatapath + dateStr.substring(0, 4) + "/d." + dateStr + ".yaml";
            
            if (fs.existsSync(dayFilePath)) {
                try {
                    const dayData = yaml.load(fs.readFileSync(dayFilePath, 'utf8'));
                    if (dayData.time) {
                        for (const t of dayData.time) {
                            if (t.task && !recentTaskIds.includes(t.task)) {
                                recentTaskIds.push(t.task);
                            }
                        }
                    }
                } catch (e) {
                    log("read day file error:", dayFilePath, e);
                }
            }
        }
        
        return recentTaskIds;
    },
    
    // 为一天的多个时间片选择todo
    selectTodosForDay: function (timeSlices) {
        const recentTaskIds = this.getRecentTaskIds();
        const selections = [];
        const usedTaskIds = [...recentTaskIds];
        
        for (const slice of timeSlices) {
            if (slice.type === 'work' || slice.type === 'discuss' || slice.type === 'check') {
                const selected = this.selectTodoForTimeSlice(
                    slice.amount,
                    slice.template || 1,
                    usedTaskIds
                );
                
                if (selected) {
                    selections.push({
                        ...slice,
                        task: selected.task_id,
                        todo: selected.todo_name,
                        token_cost: selected.token_cost
                    });
                    
                    // 更新已使用task列表（用于交叉原则）
                    if (!usedTaskIds.includes(selected.task_id)) {
                        usedTaskIds.push(selected.task_id);
                    }
                } else {
                    selections.push(slice);
                }
            } else {
                selections.push(slice);
            }
        }
        
        return selections;
    },
    
    // 扣除todo的token余额
    deductToken: function (taskId, todoName, tokenAmount) {
        const taskData = task.loadTask(taskId);
        if (!taskData) {
            log("task not found:", taskId);
            return false;
        }
        
        if (!taskData.token_balance) {
            taskData.token_balance = 0;
        }
        
        if (taskData.token_balance < tokenAmount) {
            log("insufficient token balance:", taskId, taskData.token_balance, tokenAmount);
            return false;
        }
        
        taskData.token_balance -= tokenAmount;
        task.saveTask(taskData);
        
        log("deducted token:", taskId, tokenAmount, "remaining:", taskData.token_balance);
        return true;
    },
    
    // 分配token给task（ego分配资源给子项目）
    allocateToken: function (taskId, tokenAmount) {
        const taskData = task.loadTask(taskId);
        if (!taskData) {
            log("task not found:", taskId);
            return false;
        }
        
        if (!taskData.token_balance) {
            taskData.token_balance = 0;
        }
        
        taskData.token_balance += tokenAmount;
        task.saveTask(taskData);
        
        log("allocated token:", taskId, tokenAmount, "new balance:", taskData.token_balance);
        return true;
    }
};
