const fs = require('fs');
const yaml = require('js-yaml');
const config = require('./config.js');
const task = require('./task.js');

function log(...s) {
    s[0] = log.caller.name + "> " + s[0];
    console.log(...s);
}

module.exports = {
    debug: false,
    
    // 锋面类型
    FRONT_EXTERNAL: 'external',  // 对外锋面：有契约、有交付期限
    FRONT_INTERNAL: 'internal',  // 对内锋面：最深层容器task
    
    // 检查task是否为对外锋面
    isExternalFront: function (taskId) {
        const taskData = task.loadTask(taskId);
        if (!taskData) return false;
        
        // 有契约且有截止日期
        return !!(taskData.contract && taskData.contract.deadline);
    },
    
    // 检查task是否为对内锋面
    isInternalFront: function (taskId) {
        const taskData = task.loadTask(taskId);
        if (!taskData) return false;
        
        // 明确标记为对内锋面，或是容器类型
        return taskData.front === 'internal' || taskData.type === 'container';
    },
    
    // 获取task的锋面类型
    getFrontType: function (taskId) {
        const taskData = task.loadTask(taskId);
        if (!taskData) return null;
        
        if (taskData.front) return taskData.front;
        if (this.isExternalFront(taskId)) return this.FRONT_EXTERNAL;
        if (this.isInternalFront(taskId)) return this.FRONT_INTERNAL;
        return null;
    },
    
    // 获取所有对外锋面task（有契约、有截止日期）
    getExternalFrontTasks: function () {
        const allTasks = task.listTasks();
        return allTasks
            .map(id => ({ id, data: task.loadTask(id) }))
            .filter(t => t.data && t.data.contract && t.data.contract.deadline)
            .sort((a, b) => {
                const dateA = a.data.contract.deadline;
                const dateB = b.data.contract.deadline;
                return dateA.localeCompare(dateB);
            });
    },
    
    // 获取所有对内锋面task（容器类型）
    getInternalFrontTasks: function () {
        const allTasks = task.listTasks();
        return allTasks
            .map(id => ({ id, data: task.loadTask(id) }))
            .filter(t => t.data && (t.data.front === 'internal' || t.data.type === 'container'));
    },
    
    // 计算task的优先级分数
    calculatePriority: function (taskId) {
        const taskData = task.loadTask(taskId);
        if (!taskData) return 0;
        
        let score = 0;
        
        // 对外锋面：按截止日期紧迫程度
        if (taskData.contract && taskData.contract.deadline) {
            const deadline = new Date(taskData.contract.deadline);
            const now = new Date();
            const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
            
            if (daysLeft < 0) {
                score += 1000;  // 已过期，最高优先级
            } else if (daysLeft <= 7) {
                score += 500;   // 一周内到期
            } else if (daysLeft <= 30) {
                score += 200;   // 一月内到期
            } else {
                score += 100;   // 有截止日期
            }
        }
        
        // 对内锋面：固定加分
        if (taskData.front === 'internal' || taskData.type === 'container') {
            score += 50;
        }
        
        // 有子任务的task加分（更深层的研究）
        if (taskData.children && taskData.children.length > 0) {
            score += 10;
        }
        
        return score;
    },
    
    // 获取todo的优先级分数
    getTodoPriority: function (taskId, todoName) {
        const taskPriority = this.calculatePriority(taskId);
        const todo = task.getTodo(taskId, todoName);
        
        if (!todo) return taskPriority;
        
        // todo级别的调整
        let todoScore = taskPriority;
        
        // 进行中的todo加分
        if (todo.status === 'in_progress') {
            todoScore += 20;
        }
        
        return todoScore;
    },
    
    // 选择todo时的锋面优先策略
    selectTodoWithFrontPriority: function (availableTodos) {
        // availableTodos: [{task_id, todo_name, ...}]
        
        const scored = availableTodos.map(todo => ({
            ...todo,
            priority: this.getTodoPriority(todo.task_id, todo.todo_name),
            front_type: this.getFrontType(todo.task_id)
        }));
        
        // 按优先级排序
        scored.sort((a, b) => b.priority - a.priority);
        
        return scored;
    },
    
    // 生成锋面报告
    generateFrontReport: function () {
        const external = this.getExternalFrontTasks();
        const internal = this.getInternalFrontTasks();
        
        let report = `# 锋面报告\n\n`;
        
        report += `## 对外锋面（${external.length}个）\n\n`;
        for (const t of external) {
            report += `- ${t.id}: ${t.data.name}\n`;
            report += `  - 截止日期: ${t.data.contract.deadline}\n`;
            report += `  - 优先级分数: ${this.calculatePriority(t.id)}\n`;
        }
        
        report += `\n## 对内锋面（${internal.length}个）\n\n`;
        for (const t of internal) {
            report += `- ${t.id}: ${t.data.name}\n`;
            report += `  - 类型: ${t.data.type || '未指定'}\n`;
            report += `  - 优先级分数: ${this.calculatePriority(t.id)}\n`;
        }
        
        return report;
    }
};
