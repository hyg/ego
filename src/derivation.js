const fs = require('fs');
const yaml = require('js-yaml');
const config = require('./config.js');
const task = require('./task.js');

function log(...s) {
    s[0] = log.caller.name + "> " + s[0];
    console.log(...s);
}

// 派生接口抽象类
class DerivationStrategy {
    canDerive(taskData) { return false; }
    generateCandidates(taskData) { return []; }
    execute(taskData, selectedCandidates) { return []; }
}

// 假设派生：从任务隐含假设派生出兄弟任务和父任务
class AssumptionDerivation extends DerivationStrategy {
    canDerive(taskData) {
        // 检查任务是否有假设字段或可推断假设
        return taskData && taskData.assumptions;
    }
    
    generateCandidates(taskData) {
        const candidates = [];
        
        if (!taskData.assumptions) return candidates;
        
        for (const assumption of taskData.assumptions) {
            // 生成兄弟任务：不同假设下的备选方案
            candidates.push({
                type: 'sibling',
                name: `${taskData.name}（${assumption.alternative}假设）`,
                assumption: assumption.alternative,
                description: `基于不同假设：${assumption.alternative}`
            });
            
            // 生成父任务：预测并切换假设
            candidates.push({
                type: 'parent',
                name: `预测并选择${assumption.name}方案`,
                assumption: assumption.name,
                description: `根据实际情况选择${assumption.name}或${assumption.alternative}方案`
            });
        }
        
        return candidates;
    }
    
    execute(taskData, selectedCandidates) {
        const newTasks = [];
        
        for (const candidate of selectedCandidates) {
            if (candidate.type === 'sibling') {
                // 创建兄弟task
                newTasks.push({
                    id: `${taskData.id}_alt_${Date.now()}`,
                    name: candidate.name,
                    parent: taskData.parent,
                    siblings: [taskData.id],
                    derivation: {
                        source: taskData.id,
                        type: 'assumption',
                        trigger: candidate.assumption
                    }
                });
            } else if (candidate.type === 'parent') {
                // 创建父task
                newTasks.push({
                    id: `${taskData.id}_parent_${Date.now()}`,
                    name: candidate.name,
                    children: [taskData.id],
                    derivation: {
                        source: taskData.id,
                        type: 'assumption',
                        trigger: 'prediction'
                    }
                });
            }
        }
        
        return newTasks;
    }
}

// 容器派生：任务完成初稿时，派生容器任务
class ContainerDerivation extends DerivationStrategy {
    canDerive(taskData) {
        // 检查任务是否完成初稿
        return taskData && taskData.status === 'draft_completed';
    }
    
    generateCandidates(taskData) {
        return [{
            type: 'container',
            name: `${taskData.name}方法学提炼`,
            description: `提炼${taskData.name}的底层方法学、术语、公理等`
        }, {
            type: 'library',
            name: `${taskData.name}底层库整理`,
            description: `将${taskData.name}的部分代码整理为底层库`
        }];
    }
    
    execute(taskData, selectedCandidates) {
        const newTasks = [];
        
        for (const candidate of selectedCandidates) {
            newTasks.push({
                id: `${taskData.id}_container_${Date.now()}`,
                name: candidate.name,
                type: 'container',
                front: 'internal',  // 对内锋面
                children_of: taskData.id,
                derivation: {
                    source: taskData.id,
                    type: 'container',
                    trigger: 'draft_completed'
                }
            });
        }
        
        return newTasks;
    }
}

module.exports = {
    debug: false,
    
    // 派生策略注册表
    strategies: new Map(),
    
    // 初始化
    init: function () {
        this.strategies.set('assumption', new AssumptionDerivation());
        this.strategies.set('container', new ContainerDerivation());
    },
    
    // 获取派生策略
    getStrategy: function (type) {
        if (this.strategies.size === 0) {
            this.init();
        }
        return this.strategies.get(type);
    },
    
    // 注册新派生策略
    register: function (type, strategy) {
        this.strategies.set(type, strategy);
    },
    
    // 列出所有可用的派生策略
    listStrategies: function () {
        if (this.strategies.size === 0) {
            this.init();
        }
        return Array.from(this.strategies.keys());
    },
    
    // 检查任务是否可派生
    canDerive: function (taskId, derivationType) {
        const taskData = task.loadTask(taskId);
        if (!taskData) return false;
        
        const strategy = this.getStrategy(derivationType);
        if (!strategy) return false;
        
        return strategy.canDerive(taskData);
    },
    
    // 生成候选任务
    generateCandidates: function (taskId, derivationType) {
        const taskData = task.loadTask(taskId);
        if (!taskData) return [];
        
        const strategy = this.getStrategy(derivationType);
        if (!strategy) return [];
        
        return strategy.generateCandidates(taskData);
    },
    
    // 执行派生
    execute: function (taskId, derivationType, selectedCandidates) {
        const taskData = task.loadTask(taskId);
        if (!taskData) return [];
        
        const strategy = this.getStrategy(derivationType);
        if (!strategy) return [];
        
        const newTasks = strategy.execute(taskData, selectedCandidates);
        
        // 保存新任务
        for (const newTask of newTasks) {
            task.saveTask(newTask);
            log("created derived task:", newTask.id);
        }
        
        return newTasks;
    },
    
    // 生成提示词（供人工使用）
    generatePrompt: function (taskId, derivationType) {
        const taskData = task.loadTask(taskId);
        if (!taskData) return "";
        
        const candidates = this.generateCandidates(taskId, derivationType);
        
        let prompt = `# 任务派生提示词\n\n`;
        prompt += `## 原始任务\n`;
        prompt += `- ID: ${taskData.id}\n`;
        prompt += `- 名称: ${taskData.name}\n`;
        prompt += `- 类型: ${taskData.type || '未指定'}\n\n`;
        
        prompt += `## 派生方法: ${derivationType}\n\n`;
        
        if (derivationType === 'assumption') {
            prompt += `请思考以下问题：\n`;
            prompt += `1. 这个任务隐含了哪些假设？\n`;
            prompt += `2. 如果假设不成立，有哪些备选方案？\n`;
            prompt += `3. 是否需要一个预测/决策任务来选择方案？\n\n`;
        } else if (derivationType === 'container') {
            prompt += `请思考以下问题：\n`;
            prompt += `1. 这个任务涉及哪些底层方法学？\n`;
            prompt += `2. 有哪些术语、公理需要提炼？\n`;
            prompt += `3. 有哪些代码可以整理为底层库？\n\n`;
        }
        
        if (candidates.length > 0) {
            prompt += `## 候选派生任务\n\n`;
            for (let i = 0; i < candidates.length; i++) {
                prompt += `${i + 1}. ${candidates[i].name}\n`;
                prompt += `   - 类型: ${candidates[i].type}\n`;
                prompt += `   - 描述: ${candidates[i].description}\n\n`;
            }
        }
        
        return prompt;
    }
};
