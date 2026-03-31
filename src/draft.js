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
    
    // 汇编历史手稿（供initdraft使用）
    assembleHistoryDrafts: function (taskId, todoName) {
        const historyDrafts = task.getHistoryDrafts(taskId, todoName);
        if (!historyDrafts || historyDrafts.length === 0) {
            return "";
        }
        
        let content = "## 历史工作记录\n\n";
        
        for (const draftPath of historyDrafts) {
            const fullPath = config.draftrepopath + draftPath;
            if (fs.existsSync(fullPath)) {
                const draftContent = fs.readFileSync(fullPath, 'utf8');
                const fileName = draftPath.split('/').pop();
                content += `### ${fileName}\n\n`;
                content += draftContent + '\n\n---\n\n';
            }
        }
        
        return content;
    },
    
    // 生成draft初始内容（汇编历史手稿）
    generateInitialDraft: function (title, dateStr) {
        const { taskId, todoName } = task.parseTitle(title);
        if (!todoName) {
            log("invalid title format:", title);
            return "";
        }
        
        const historyDrafts = task.getHistoryDrafts(taskId, todoName);
        let initialContent = `# ${todoName}\n\n`;
        
        if (historyDrafts.length > 0) {
            initialContent += `## 历史工作记录\n\n`;
            
            for (const draftPath of historyDrafts) {
                const fullPath = config.draftrepopath + draftPath;
                if (fs.existsSync(fullPath)) {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    const fileName = draftPath.split('/').pop();
                    initialContent += `### ${fileName}\n\n`;
                    initialContent += content + '\n\n---\n\n';
                }
            }
        }
        
        initialContent += `## ${dateStr} 工作记录\n\n`;
        return initialContent;
    },
    
    // 获取todo的所有手稿（按时间顺序）
    getTodoDrafts: function (taskId, todoName) {
        const todo = task.getTodo(taskId, todoName);
        if (!todo || !todo.time_slices) return [];
        
        return todo.time_slices
            .filter(s => s.draft)
            .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
            .map(slice => ({
                date: slice.date,
                amount: slice.amount,
                draft_file: slice.draft,
                content: this.readDraftContent(slice.draft)
            }));
    },
    
    // 获取task的所有手稿（按todo分组）
    getTaskDrafts: function (taskId) {
        const taskData = task.loadTask(taskId);
        if (!taskData || !taskData.todos) return [];
        
        return taskData.todos.map(todo => ({
            todo_name: todo.name,
            drafts: this.getTodoDrafts(taskId, todo.name)
        }));
    },
    
    // 读取draft内容
    readDraftContent: function (draftPath) {
        const fullPath = config.draftrepopath + draftPath;
        try {
            if (fs.existsSync(fullPath)) {
                return fs.readFileSync(fullPath, 'utf8');
            }
        } catch (e) {
            log("read draft error:", draftPath, e);
        }
        return "";
    },
    
    // 按task结构编排（章节 = task，节 = todo，小节 = 时间片手稿）
    organizeByStructure: function (taskId) {
        const taskData = task.loadTask(taskId);
        if (!taskData) return "";
        
        let markdown = `# ${taskData.name || taskId}\n\n`;
        
        if (taskData.todos) {
            for (const todo of taskData.todos) {
                markdown += `## ${todo.name}\n\n`;
                
                if (todo.time_slices) {
                    for (const slice of todo.time_slices) {
                        if (slice.draft) {
                            const content = this.readDraftContent(slice.draft);
                            markdown += `### ${slice.date || '未知日期'} (${slice.amount || 0}min)\n\n`;
                            markdown += content + '\n\n';
                        }
                    }
                }
            }
        }
        
        return markdown;
    },
    
    // 按时间线编排（所有时间片按日期排序）
    organizeByTimeline: function (taskId) {
        const taskData = task.loadTask(taskId);
        if (!taskData) return "";
        
        const allSlices = [];
        
        if (taskData.todos) {
            for (const todo of taskData.todos) {
                if (todo.time_slices) {
                    for (const slice of todo.time_slices) {
                        if (slice.draft) {
                            allSlices.push({
                                ...slice,
                                todo_name: todo.name
                            });
                        }
                    }
                }
            }
        }
        
        // 按日期排序
        allSlices.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        
        let markdown = `# ${taskData.name || taskId} - 时间线\n\n`;
        for (const slice of allSlices) {
            const content = this.readDraftContent(slice.draft);
            markdown += `## ${slice.date || '未知日期'} - ${slice.todo_name}\n\n`;
            markdown += content + '\n\n---\n\n';
        }
        
        return markdown;
    },
    
    // 导出为文件
    exportToFile: function (taskId, format, outputPath) {
        let content;
        
        switch (format) {
            case 'structure':
                content = this.organizeByStructure(taskId);
                break;
            case 'timeline':
                content = this.organizeByTimeline(taskId);
                break;
            default:
                log("unknown format:", format);
                return null;
        }
        
        if (content && outputPath) {
            fs.writeFileSync(outputPath, content);
            log("export to:", outputPath);
            return outputPath;
        }
        
        return content;
    },
    
    // 按锋面优先级获取todo列表
    getPrioritizedTodos: function () {
        const allTasks = task.listTasks();
        const result = {
            external_front: [],  // 对外锋面
            internal_front: [],  // 对内锋面
            normal: []           // 普通task
        };
        
        for (const taskId of allTasks) {
            const taskData = task.loadTask(taskId);
            if (!taskData || !taskData.todos) continue;
            
            const category = taskData.front || 'normal';
            if (!result[category]) result[category] = [];
            
            for (const todo of taskData.todos) {
                if (todo.status === 'pending' || todo.status === 'in_progress') {
                    result[category].push({
                        task_id: taskId,
                        todo_name: todo.name,
                        title: `${taskId}.${todo.name}`,
                        has_contract: task.hasContract(taskId),
                        deadline: taskData.contract?.deadline
                    });
                }
            }
        }
        
        // 对外锋面按截止日期排序
        result.external_front.sort((a, b) => {
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return a.deadline.localeCompare(b.deadline);
        });
        
        return result;
    }
};
