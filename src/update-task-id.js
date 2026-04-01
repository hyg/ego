const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const yaml = require('js-yaml');

const taskPath = path.join(__dirname, '../data/task/');

// 生成name的哈希ID（前8位）
function generateId(name) {
    return crypto.createHash('md5').update(name).digest('hex').substring(0, 8);
}

// 更新task文件的id
function updateTaskId(filename) {
    const filepath = path.join(taskPath, filename);
    
    try {
        const content = fs.readFileSync(filepath, 'utf8');
        const task = yaml.load(content);
        
        if (task && task.name) {
            const oldId = task.id;
            const newId = generateId(task.name);
            
            if (oldId !== newId) {
                console.log(`${filename}: ${oldId} -> ${newId} (name: ${task.name})`);
                task.id = newId;
                
                // 保存文件
                fs.writeFileSync(filepath, yaml.dump(task, { lineWidth: -1 }));
                return { oldId, newId, name: task.name };
            } else {
                console.log(`${filename}: id unchanged (${oldId})`);
            }
        }
    } catch (e) {
        console.error(`Error processing ${filename}:`, e.message);
    }
    
    return null;
}

// 处理所有task文件
console.log('=== 更新task ID ===\n');

const files = fs.readdirSync(taskPath).filter(f => f.endsWith('.yaml'));
const updates = [];

for (const file of files) {
    const result = updateTaskId(file);
    if (result) {
        updates.push(result);
    }
}

console.log(`\n=== 更新完成: ${updates.length}个文件 ===`);

// 显示所有task的id映射
console.log('\n=== 当前task ID映射 ===');
for (const file of files) {
    const filepath = path.join(taskPath, file);
    try {
        const content = fs.readFileSync(filepath, 'utf8');
        const task = yaml.load(content);
        if (task && task.id && task.name) {
            console.log(`  ${task.id}: ${task.name}`);
        }
    } catch (e) {
        // ignore
    }
}
