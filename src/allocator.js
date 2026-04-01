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
        JT_BALANCE: 'jt_balance',              // 按JT余额
        ROUND_ROBIN: 'round_robin'             // 交叉进行
    },
    
    // 获取候选todo列表
    getCandidateTodos: function () {
        const allTasks = task.listTasks();
        const candidates = [];
        
        // 获取每个task最近一次获得时间片的时间
        const lastWorkDates = this.getLastWorkDates();
        
        for (const taskId of allTasks) {
            const taskData = task.loadTask(taskId);
            if (!taskData || !taskData.todos) continue;
            
            for (const todo of taskData.todos) {
                if (todo.status === 'pending' || todo.status === 'in_progress') {
                    candidates.push({
                        task_id: taskId,
                        todo_name: todo.name,
                        title: `${taskId}.${todo.name}`,
                        status: todo.status,
                        front_type: front.getFrontType(taskId),
                        deadline: taskData.contract?.deadline,
                        jt_balance: taskData.jt_balance || 0,
                        priority: front.getTodoPriority(taskId, todo.name),
                        last_work_date: lastWorkDates[taskId] || '00000000'  // 被闲置越久越优先
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
            
            // 原则二：按JT余额（余额多的优先，表示有资源可用）
            if (a.jt_balance !== b.jt_balance) {
                return b.jt_balance - a.jt_balance;
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
    selectTodoForTimeSlice: function (timeSliceAmount, templateType, excludeTaskIds = []) {
        const candidates = this.getCandidateTodos();
        
        if (candidates.length === 0) {
            log("no candidate todos available");
            return null;
        }
        
        // 计算JT成本
        const pricing = season.getPricing();
        const jtRate = templateType.toString().startsWith('2') ? pricing.template_2 : pricing.template_1;
        const jtCost = timeSliceAmount * jtRate;
        
        // 过滤出JT余额足够的todo
        let affordable = candidates.filter(c => c.jt_balance >= jtCost);
        
        // 模版一：跳过已选task（相邻时间片不安排同一task）
        if (excludeTaskIds.length > 0) {
            const filtered = affordable.filter(c => !excludeTaskIds.includes(c.task_id));
            if (filtered.length > 0) {
                affordable = filtered;
            }
            // 如果过滤后没有可选的，则允许重复选择
        }
        
        if (affordable.length === 0) {
            log("no affordable todos, jt cost:", jtCost);
            // 返回JT余额最高的todo（可能需要先分配JT）
            const sorted = this.sortTodosByPrinciples(candidates, excludeTaskIds);
            return sorted[0];
        }
        
        // 按原则排序
        const sorted = this.sortTodosByPrinciples(affordable, excludeTaskIds);
        const selected = sorted[0];
        
        log("selected todo:", selected.title, "jt cost:", jtCost);
        return {
            ...selected,
            jt_cost: jtCost,
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
                        jt_cost: selected.jt_cost
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
    
    // 扣除todo的JT余额
    deductJT: function (taskId, todoName, jtAmount) {
        const taskData = task.loadTask(taskId);
        if (!taskData) {
            log("task not found:", taskId);
            return false;
        }
        
        if (!taskData.jt_balance) {
            taskData.jt_balance = 0;
        }
        
        if (taskData.jt_balance < jtAmount) {
            log("insufficient jt balance:", taskId, taskData.jt_balance, jtAmount);
            return false;
        }
        
        taskData.jt_balance -= jtAmount;
        task.saveTask(taskData);
        
        log("deducted jt:", taskId, jtAmount, "remaining:", taskData.jt_balance);
        return true;
    },
    
    // 分配JT给task（ego分配资源给子项目）
    allocateJT: function (taskId, jtAmount) {
        const taskData = task.loadTask(taskId);
        if (!taskData) {
            log("task not found:", taskId);
            return false;
        }
        
        if (!taskData.jt_balance) {
            taskData.jt_balance = 0;
        }
        
        taskData.jt_balance += jtAmount;
        task.saveTask(taskData);
        
        log("allocated jt:", taskId, jtAmount, "new balance:", taskData.jt_balance);
        return true;
    }
};
