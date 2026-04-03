const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const yaml = require('js-yaml');
const config = require('./config.js');

function log(...s) {
    s[0] = log.caller.name + "> " + s[0];
    console.log(...s);
}

// 获取绝对路径（从src目录出发）
function getAbsolutePath(relativePath) {
    return path.resolve(__dirname, relativePath);
}

// 生成name的哈希ID（前8位）
function generateId(name) {
    return crypto.createHash('md5').update(name).digest('hex').substring(0, 8);
}

module.exports = {
    debug: false,
    
    // 获取task文件路径
    taskFilePath: function (taskId) {
        return getAbsolutePath(config.datataskpath) + "/" + taskId + ".yaml";
    },
    
    // 加载task
    loadTask: function (taskId) {
        const filePath = this.taskFilePath(taskId);
        try {
            if (fs.existsSync(filePath)) {
                return yaml.load(fs.readFileSync(filePath, 'utf8'));
            } else {
                log("task not exists:", taskId);
                return null;
            }
        } catch (e) {
            log("load task error:", e);
            return null;
        }
    },
    
    // 保存task（使用name作为文件名）
    saveTask: function (task) {
        const filePath = this.taskFilePath(task.name);
        const taskStr = yaml.dump(task, { 'lineWidth': -1 });
        if (this.debug == false) {
            fs.writeFileSync(filePath, taskStr);
            log("save task:", filePath);
        } else {
            log("debug, save task:", filePath);
        }
    },
    
    // 获取所有task列表
    listTasks: function () {
        const taskDir = getAbsolutePath(config.datataskpath);
        if (!fs.existsSync(taskDir)) {
            return [];
        }
        return fs.readdirSync(taskDir)
            .filter(file => file.endsWith('.yaml'))
            .map(file => file.replace('.yaml', ''));
    },
    
    // 通过task.todo格式解析
    parseTitle: function (title) {
        const dotIndex = title.indexOf('.');
        if (dotIndex === -1) {
            return { taskId: title, todoName: null };
        }
        return {
            taskId: title.substring(0, dotIndex),
            todoName: title.substring(dotIndex + 1)
        };
    },
    
    // 获取todo
    getTodo: function (taskId, todoName) {
        const task = this.loadTask(taskId);
        if (!task || !task.todos) return null;
        return task.todos.find(t => t.name === todoName);
    },
    
    // 通过title获取todo（day元数据用）
    getTodoByTitle: function (title) {
        const { taskId, todoName } = this.parseTitle(title);
        if (!todoName) return null;
        return this.getTodo(taskId, todoName);
    },
    
    // 获取todo的历史手稿列表
    getHistoryDrafts: function (taskId, todoName) {
        const todo = this.getTodo(taskId, todoName);
        if (!todo) return [];
        
        const drafts = [];
        
        // 优先使用顶层的 history_drafts 字段（新版本）
        if (todo.history_drafts && todo.history_drafts.length > 0) {
            drafts.push(...todo.history_drafts);
        }
        
        // 兼容旧格式：从 time_slices 获取
        if (todo.time_slices) {
            const timeSliceDrafts = todo.time_slices
                .filter(s => s.draft)
                .map(s => s.draft);
            for (const draft of timeSliceDrafts) {
                if (!drafts.includes(draft)) {
                    drafts.push(draft);
                }
            }
        }
        
        return drafts;
    },
    
    // 添加time_slice到todo
    addTimeSlice: function (taskId, todoName, slice) {
        const task = this.loadTask(taskId);
        if (!task) return false;
        
        const todo = task.todos.find(t => t.name === todoName);
        if (!todo) return false;
        
        if (!todo.time_slices) {
            todo.time_slices = [];
        }
        todo.time_slices.push(slice);
        
        this.saveTask(task);
        return true;
    },
    
    // 计算todo的JT成本
    calculateJTCost: function (taskId, todoName) {
        const todo = this.getTodo(taskId, todoName);
        if (!todo || !todo.time_slices) return 0;
        
        return todo.time_slices.reduce((sum, slice) => {
            return sum + (slice.jt_cost || 0);
        }, 0);
    },
    
    // 获取锋面task列表
    getFrontTasks: function (frontType = null) {
        const tasks = this.listTasks();
        const frontTasks = [];
        
        for (const taskId of tasks) {
            const task = this.loadTask(taskId);
            if (task && task.front) {
                if (frontType === null || task.front === frontType) {
                    frontTasks.push(task);
                }
            }
        }
        
        return frontTasks;
    },
    
    // 检查task是否有对外契约
    hasContract: function (taskId) {
        const task = this.loadTask(taskId);
        return task && task.contract && task.contract.deadline;
    },
    
    // 获取有交付期限的task（对外锋面）
    getContractTasks: function () {
        const tasks = this.listTasks();
        return tasks
            .map(id => this.loadTask(id))
            .filter(task => task && task.contract && task.contract.deadline);
    },
    
    // 生成name的哈希ID（前8位）
    generateId: generateId
};
