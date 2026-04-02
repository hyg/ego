const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// 配置
const config = {
    seasonPath: path.join(__dirname, '../data/season/'),
    taskPath: path.join(__dirname, '../data/task/'),
    draftPath: '../../draft/'
};

// 日志
function log(...s) {
    console.log('[migrate]', ...s);
}

// 从season文件名提取年份和季度
function parseSeasonFilename(filename) {
    const match = filename.match(/^(\d{4})S(\d)\.yaml$/);
    if (match) {
        return { year: parseInt(match[1]), season: parseInt(match[2]) };
    }
    return null;
}

// 判断是否为新格式季度（2026S2及以后）
function isNewFormat(year, season) {
    return year > 2026 || (year === 2026 && season >= 2);
}

// 加载season文件
function loadSeason(year, season) {
    const filename = `${year}S${season}.yaml`;
    const filepath = path.join(config.seasonPath, filename);
    
    if (!fs.existsSync(filepath)) {
        log('season file not found:', filepath);
        return null;
    }
    
    try {
        return yaml.load(fs.readFileSync(filepath, 'utf8'));
    } catch (e) {
        log('load season error:', e);
        return null;
    }
}

// 保存task文件（使用name作为文件名）
function saveTask(task) {
    const filepath = path.join(config.taskPath, `${task.name}.yaml`);
    const content = yaml.dump(task, { lineWidth: -1 });
    
    try {
        fs.writeFileSync(filepath, content);
        log('saved task:', filepath);
        return true;
    } catch (e) {
        log('save task error:', e);
        return false;
    }
}

// 加载task文件（如果存在）
function loadTask(taskId) {
    const filepath = path.join(config.taskPath, `${taskId}.yaml`);
    
    if (!fs.existsSync(filepath)) {
        return null;
    }
    
    try {
        return yaml.load(fs.readFileSync(filepath, 'utf8'));
    } catch (e) {
        log('load task error:', e);
        return null;
    }
}

// 从season.todo迁移数据到task.yaml
function migrateTodoToTask(seasonData, year, season) {
    if (!seasonData.todo) {
        log('no todo data in season');
        return;
    }
    
    const migratedTasks = [];
    
    for (const [taskId, todos] of Object.entries(seasonData.todo)) {
        // 尝试加载现有的task
        let task = loadTask(taskId);
        
        if (!task) {
            // 创建新task
            task = {
                id: taskId,
                name: taskId,
                type: 'contract',
                parent: 'ego',
                git_repo: `../../${taskId}`,
                jt_balance: 0,
                todos: []
            };
        }
        
        // 确保todos数组存在
        if (!task.todos) {
            task.todos = [];
        }
        
        // 迁移每个todo
        for (const todoItem of todos) {
            // todoItem格式: { '195': '任务名', readme: [...] }
            for (const [amount, todoName] of Object.entries(todoItem)) {
                if (amount === 'readme' || amount === 'bind') continue;
                
                // 检查todo是否已存在
                const existingTodo = task.todos.find(t => t.name === todoName);
                if (existingTodo) {
                    log('todo already exists:', taskId, todoName);
                    continue;
                }
                
                // 创建新todo
                const newTodo = {
                    name: todoName,
                    status: 'pending',
                    time_slices: [],
                    history_drafts: []
                };
                
                // 迁移readme中的draft路径
                if (todoItem.readme) {
                    for (const item of todoItem.readme) {
                        if (typeof item === 'string' && item.startsWith('read ')) {
                            const draftPath = item.substring(5);
                            newTodo.history_drafts.push(draftPath);
                        }
                    }
                }
                
                task.todos.push(newTodo);
                log('migrated todo:', taskId, todoName);
            }
        }
        
        // 保存task
        if (saveTask(task)) {
            migratedTasks.push(taskId);
        }
    }
    
    return migratedTasks;
}

// 主迁移函数
function migrate(year, season) {
    log(`migrating ${year}S${season}...`);
    
    // 检查是否为新格式
    if (isNewFormat(year, season)) {
        log('already new format, skip');
        return;
    }
    
    // 加载season数据
    const seasonData = loadSeason(year, season);
    if (!seasonData) {
        log('failed to load season data');
        return;
    }
    
    // 迁移todo到task
    const migratedTasks = migrateTodoToTask(seasonData, year, season);
    
    log('migration completed, tasks:', migratedTasks);
    return migratedTasks;
}

// 批量迁移所有旧格式季度
function migrateAll() {
    log('migrating all legacy seasons...');
    
    const files = fs.readdirSync(config.seasonPath);
    const allMigratedTasks = new Set();
    
    for (const file of files) {
        const parsed = parseSeasonFilename(file);
        if (parsed && !isNewFormat(parsed.year, parsed.season)) {
            const tasks = migrate(parsed.year, parsed.season);
            if (tasks) {
                tasks.forEach(t => allMigratedTasks.add(t));
            }
        }
    }
    
    log('all migrations completed, unique tasks:', Array.from(allMigratedTasks));
}

// 命令行接口
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage:');
        console.log('  node migrate.js <year> <season>  - Migrate specific season');
        console.log('  node migrate.js --all             - Migrate all legacy seasons');
        process.exit(1);
    }
    
    if (args[0] === '--all') {
        migrateAll();
    } else if (args.length === 2) {
        const year = parseInt(args[0]);
        const season = parseInt(args[1]);
        
        if (isNaN(year) || isNaN(season)) {
            console.error('Invalid year or season');
            process.exit(1);
        }
        
        migrate(year, season);
    } else {
        console.error('Invalid arguments');
        process.exit(1);
    }
}

module.exports = {
    migrate,
    migrateAll,
    loadTask,
    saveTask
};
