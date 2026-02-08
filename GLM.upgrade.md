# GLM 升级建议

## 核心问题总结

### 1. 数据管理混乱
- **文件数量过多**：data/day/和data/voucher/目录各有数百个YAML文件
- **缺乏数据库**：所有数据以文件形式存储，难以查询和统计分析
- **格式不一致**：日期、时间戳、字段命名不统一

### 2. 代码质量低
- 使用过时的JavaScript语法（var而非let/const）
- 缺少错误处理和日志
- util.js存在语法错误（第26行）

### 3. 模型与实践脱节
- LinkML模型定义完整，但实际数据不遵循模型
- YAML Schema定义存在但未验证

### 4. 前后端分离严重
- HTML模板存在但后端Go代码被忽略
- JavaScript CLI工具与Web服务无集成

---

## 详细改进建议

### 1. 数据库迁移（最高优先级）

#### 问题
当前使用数千个YAML文件存储数据：
```
data/day/
├── 2024/ (365个文件)
├── 2025/ (365+个文件)
└── 2026/ (39个文件)

data/voucher/
├── 2025/ (800+个文件)
└── 2026/ (20+个文件)
```

#### 解决方案
```yaml
# config/database.yaml
database:
  type: sqlite
  path: ./data/ego.db
  
# 或使用PostgreSQL
database:
  type: postgresql
  host: localhost
  port: 5432
  database: ego
  user: ego
  password: ${DB_PASSWORD}
```

**迁移脚本**：
```javascript
// scripts/migrate-to-db.js
const fs = require('fs');
const yaml = require('js-yaml');
const Database = require('better-sqlite3');

const db = new Database('data/ego.db');

// 创建表
db.exec(`
  CREATE TABLE IF NOT EXISTS day_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    plan INTEGER,
    time TEXT,
    UNIQUE(date)
  );
  
  CREATE TABLE IF NOT EXISTS voucher (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    voucher_id TEXT,
    amount REAL,
    type TEXT,
    UNIQUE(date, voucher_id)
  );
  
  CREATE INDEX idx_day_log_date ON day_log(date);
  CREATE INDEX idx_voucher_date ON voucher(date);
`);

// 迁移day数据
const migrateDays = async () => {
  const insert = db.prepare('INSERT INTO day_log (date, plan, time) VALUES (?, ?, ?)');
  const insertMany = db.transaction((days) => {
    for (const day of days) insert.run(day);
  });
  
  const years = fs.readdirSync('data/day');
  const allDays = [];
  
  for (const year of years) {
    const yearPath = `data/day/${year}`;
    const files = fs.readdirSync(yearPath);
    
    for (const file of files) {
      const content = fs.readFileSync(`${yearPath}/${file}`, 'utf8');
      const data = yaml.load(content);
      allDays.push({
        date: data.date,
        plan: data.plan,
        time: JSON.stringify(data.time)
      });
    }
  }
  
  insertMany(allDays);
  console.log(`Migrated ${allDays.length} day records`);
};

// 迁移voucher数据
const migrateVouchers = async () => {
  const insert = db.prepare('INSERT INTO voucher (date, voucher_id, amount, type) VALUES (?, ?, ?, ?)');
  
  const years = fs.readdirSync('data/voucher');
  const allVouchers = [];
  
  for (const year of years) {
    const yearPath = `data/voucher/${year}`;
    const files = fs.readdirSync(yearPath);
    
    for (const file of files) {
      const content = fs.readFileSync(`${yearPath}/${file}`, 'utf8');
      const data = yaml.load(content);
      
      // 提取AER/AVR类型
      const type = file.includes('AER') ? 'AER' : 'AVR';
      
      allVouchers.push({
        date: data.date,
        voucher_id: data.VoucherID,
        amount: data.amount,
        type: type
      });
    }
  }
  
  const insertMany = db.transaction((vouchers) => {
    for (const voucher of vouchers) insert.run(voucher);
  });
  
  insertMany(allVouchers);
  console.log(`Migrated ${allVouchers.length} voucher records`);
};

(async () => {
  await migrateDays();
  await migrateVouchers();
  db.close();
})();
```

### 2. 统一数据格式

#### 问题
YAML文件格式混乱：
- date字段：有的用"20240501"，有的用"2025-01-02"
- 时间格式：有的用字符串，有的用对象
- 字段命名：驼峰、下划线、连字符混用

#### 解决方案
```yaml
# data/schemas/day.schema.yaml
$schema: "http://json-schema.org/draft-07/schema#"
type: object
required:
  - date
  - plan
  - time
properties:
  date:
    type: string
    pattern: "^\\d{8}$"
    description: "格式：YYYYMMDD"
  plan:
    type: integer
    minimum: 0
    maximum: 3
  time:
    type: array
    items:
      $ref: "#/definitions/time-slice"
definitions:
  time-slice:
    type: object
    required:
      - begin
      - amount
      - type
      - subject
      - name
    properties:
      begin:
        type: string
        pattern: "^\\d{14}$"
      amount:
        type: integer
        minimum: 1
      type:
        type: string
        enum: [work, free, discuss, learn, prepare, sleep, food, check]
      subject:
        type: string
        minLength: 1
      name:
        type: string
        minLength: 1
      output:
        type: string
        format: uri
```

**验证工具**：
```javascript
// scripts/validate-yaml.js
const fs = require('fs');
const yaml = require('js-yaml');
const Ajv = require('ajv');

const ajv = new Ajv();
const daySchema = require('../data/schemas/day.schema.yaml');

const validateDay = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const data = yaml.load(content);
  
  const valid = ajv.validate(daySchema, data);
  
  if (!valid) {
    console.error(`❌ ${filePath}:`);
    ajv.errors.forEach(err => {
      console.error(`   - ${err.instancePath}: ${err.message}`);
    });
    return false;
  }
  
  console.log(`✅ ${filePath}`);
  return true;
};

// 验证所有day文件
const validateAllDays = () => {
  const years = fs.readdirSync('data/day');
  let total = 0, passed = 0, failed = 0;
  
  for (const year of years) {
    const files = fs.readdirSync(`data/day/${year}`);
    for (const file of files) {
      total++;
      if (validateDay(`data/day/${year}/${file}`)) {
        passed++;
      } else {
        failed++;
      }
    }
  }
  
  console.log(`\n总计: ${total}, 通过: ${passed}, 失败: ${failed}`);
};

validateAllDays();
```

### 3. JavaScript代码现代化

#### 问题
- 使用var声明变量
- 回调地狱
- 缺少async/await
- util.js第26行语法错误

#### 解决方案
**重构util.js**：
```javascript
// src/util.js (修复后)
const crypto = require('crypto');
const dayjs = require('dayjs');

const Utils = {
  // 生成日期字符串 YYYYMMDD
  datestr(diff = 0) {
    const date = new Date();
    date.setDate(date.getDate() + diff);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}${month}${day}`;
  },
  
  // 生成元数据文件ID
  makemetafileid(name) {
    const hash = crypto.createHash('sha256')
      .update(name)
      .digest('hex')
      .slice(0, 8);
    return hash;
  },
  
  // 日期字符串格式化
  datestring(diff = 0) {
    const date = dayjs().add(diff, 'day');
    return date.format('YYYYMMDD');
  },
  
  // 字符串转时间对象
  str2time(dateStr) {
    const year = parseInt(dateStr.slice(0, 4));
    const month = parseInt(dateStr.slice(4, 6));
    const day = parseInt(dateStr.slice(6, 8));
    const hour = parseInt(dateStr.slice(8, 10));
    const minute = parseInt(dateStr.slice(10, 12));
    const second = parseInt(dateStr.slice(12, 14));
    
    return new Date(year, month - 1, day, hour, minute, second);
  },
  
  // 字符串转日期对象
  str2date(dateStr) {
    return dayjs(dateStr, 'YYYYMMDD').toDate();
  }
};

module.exports = Utils;
```

**重构task.js使用async/await**：
```javascript
// task/task.js (重构后)
const fs = require('fs').promises;
const yaml = require('js-yaml');
const path = require('path');

class TaskManager {
  constructor() {
    this.draftrepopath = '../../draft/';
  }
  
  async loadAllDrafts() {
    const allDrafts = {};
    
    const traverse = async (dir) => {
      const files = await fs.readdir(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isDirectory()) {
          await traverse(filePath);
        } else if (path.extname(file) === '.yaml') {
          const content = await fs.readFile(filePath, 'utf8');
          const draft = yaml.load(content);
          allDrafts[draft.date] = draft;
        }
      }
    };
    
    await traverse(this.draftrepopath);
    return allDrafts;
  }
  
  async makeTaskView() {
    try {
      console.log('Generating task view...');
      
      const allTask = yaml.load(await fs.readFile('alltask.yaml', 'utf8'));
      const taskByName = new Map();
      
      // 建立任务名称索引
      for (const [id, task] of Object.entries(allTask.tasklist)) {
        taskByName.set(task.name, id);
        task.totaltime = 0;
      }
      
      const allDraft = await this.loadAllDrafts();
      
      // 汇总时间
      for (const [date, draft] of Object.entries(allDraft)) {
        for (const slice of draft.time) {
          const taskId = taskByName.get(slice.subject);
          
          if (taskId) {
            const task = allTask.tasklist[taskId];
            
            if (!task.log) task.log = {};
            task.log[slice.begin] = {
              begin: slice.begin,
              amount: slice.amount,
              name: slice.name,
              output: slice.output
            };
            
            if (!task.firstlog || task.firstlog > slice.begin) {
              task.firstlog = slice.begin;
            }
            
            task.totaltime = (task.totaltime || 0) + slice.amount;
          }
        }
      }
      
      // 保存结果
      await fs.writeFile('alltask.yaml', yaml.dump(allTask));
      console.log('✅ alltask.yaml updated');
      
      // 生成Markdown文档
      await this.generateMarkdown(allTask);
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      throw error;
    }
  }
  
  async generateMarkdown(allTask) {
    for (const [id, task] of Object.entries(allTask.tasklist)) {
      let markdown = `# ${task.name}\n\n`;
      markdown += `- id: ${task.id}\n`;
      
      if (task['parent id'] !== 0) {
        markdown += `- 父任务id: ${task['parent id']}\n`;
      }
      
      markdown += `- 开始时间: ${task.start}\n`;
      
      if (task.firstlog) {
        markdown += `- 日志开始时间: ${task.firstlog}\n`;
      }
      
      if (task.totaltime) {
        markdown += `- 总耗时(分钟): ${task.totaltime}\n`;
      }
      
      if (task.log) {
        markdown += `\n## 任务日志:\n`;
        markdown += `|时间|时长(分钟)|名称|输出结果|\n`;
        markdown += `|---|---|---|---|\n`;
        
        const sortedLogs = Object.entries(task.log).sort((a, b) => b[0] - a[0]);
        
        for (const [time, log] of sortedLogs) {
          markdown += `|${time}|${log.amount}|${log.name}|[${log.output}](${log.output})|\n`;
        }
      }
      
      const filename = `task.${task.id}.md`;
      await fs.writeFile(filename, markdown);
      console.log(`✅ ${filename} updated`);
    }
  }
}

// 使用
const manager = new TaskManager();
manager.makeTaskView().catch(console.error);
```

### 4. LinkML模型验证

#### 问题
定义了完整的LinkML模型，但实际数据不遵循模型规范。

#### 解决方案
```bash
# 安装LinkML工具
pip install linkml

# 从YAML生成JSON Schema
linkml generate-json-schema data/entity.yaml --output schemas/entity.schema.json
linkml generate-json-schema data/task.yaml --output schemas/task.schema.json

# 生成Python类型
linkml generate-python data/entity.yaml --output python/models/

# 验证数据
linkml validate --schema data/entity.yaml --target data/ego.yaml
```

**自动化验证脚本**：
```python
# scripts/validate-models.py
import yaml
from linkml_runtime.linkml_model.meta import SchemaDefinition
from linkml_runtime.utils.compile_python import compile_python

def validate_yaml_against_model(yaml_file, model_file):
    """验证YAML文件是否符合LinkML模型"""
    
    # 加载模型
    with open(model_file, 'r', encoding='utf-8') as f:
        model_data = yaml.safe_load(f)
    
    # 加载数据
    with open(yaml_file, 'r', encoding='utf-8') as f:
        data = yaml.safe_load(f)
    
    # 验证（简化示例）
    schema = SchemaDefinition(**model_data)
    
    # 检查必需字段
    for class_name, class_def in schema.classes.items():
        for slot_name, slot_def in class_def.slots.items():
            if slot_def.required and slot_name not in data:
                print(f"❌ Missing required field: {class_name}.{slot_name}")
                return False
    
    print(f"✅ {yaml_file} valid")
    return True

if __name__ == '__main__':
    import sys
    
    files_to_validate = [
        ('data/ego.yaml', 'data/entity.yaml'),
        ('data/task.yaml', 'data/task.yaml'),
        ('data/raw.food.yaml', 'data/raw.food.yaml'),
    ]
    
    all_valid = True
    for yaml_file, model_file in files_to_validate:
        if not validate_yaml_against_model(yaml_file, model_file):
            all_valid = False
    
    sys.exit(0 if all_valid else 1)
```

### 5. 前后端集成

#### 问题
HTML模板存在但Go后端被忽略，JavaScript CLI工具与Web服务无集成。

#### 解决方案
**统一API层**（使用Node.js + Express）：
```javascript
// api/server.js
const express = require('express');
const yaml = require('js-yaml');
const fs = require('fs').promises;
const app = express();

app.use(express.json());
app.use(express.static('web'));

// 日志API
app.get('/api/logs', async (req, res) => {
  const { startDate, endDate, type } = req.query;
  
  // 从数据库查询
  const logs = await db.queryLogs(startDate, endDate, type);
  res.json(logs);
});

app.post('/api/logs', async (req, res) => {
  const log = req.body;
  
  // 验证
  const valid = validateLog(log);
  if (!valid) {
    return res.status(400).json({ error: 'Invalid log data' });
  }
  
  // 保存到数据库
  await db.insertLog(log);
  res.status(201).json(log);
});

// 任务API
app.get('/api/tasks', async (req, res) => {
  const tasks = yaml.load(await fs.readFile('data/task.json', 'utf8'));
  res.json(tasks);
});

// 统计API
app.get('/api/stats/season', async (req, res) => {
  const { year, season } = req.query;
  const stats = await calculateSeasonStats(year, season);
  res.json(stats);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
```

**现代化前端**：
```html
<!-- web/index.html -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ego - 个人领域模型</title>
  <link rel="stylesheet" href="/static/css/app.css">
</head>
<body>
  <div id="app"></div>
  
  <script type="module">
    import { createApp } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
    import App from './js/app.js';
    
    createApp(App).mount('#app');
  </script>
</body>
</html>
```

```javascript
// web/js/app.js
export default {
  data() {
    return {
      currentDate: new Date(),
      logs: [],
      stats: {}
    }
  },
  async created() {
    await this.loadLogs();
    await this.loadStats();
  },
  methods: {
    async loadLogs() {
      const response = await fetch('/api/logs');
      this.logs = await response.json();
    },
    async loadStats() {
      const response = await fetch('/api/stats/season');
      this.stats = await response.json();
    },
    async submitLog(logData) {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
      });
      await this.loadLogs();
    }
  }
};
```

### 6. 添加测试和CI/CD

#### 测试框架
```javascript
// tests/util.test.js
const { expect } = require('chai');
const Utils = require('../src/util');

describe('Utils', () => {
  describe('datestr', () => {
    it('should return today\'s date in YYYYMMDD format', () => {
      const today = Utils.datestr();
      expect(today).to.match(/^\d{8}$/);
    });
    
    it('should return tomorrow\'s date when diff is 1', () => {
      const today = Utils.datestr(0);
      const tomorrow = Utils.datestr(1);
      expect(tomorrow).to.be.above(today);
    });
  });
  
  describe('makemetafileid', () => {
    it('should generate consistent hash for same name', () => {
      const id1 = Utils.makemetafileid('test');
      const id2 = Utils.makemetafileid('test');
      expect(id1).to.equal(id2);
    });
    
    it('should generate different hash for different names', () => {
      const id1 = Utils.makemetafileid('test1');
      const id2 = Utils.makemetafileid('test2');
      expect(id1).to.not.equal(id2);
    });
  });
});
```

**CI/CD配置**：
```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [16.x, 18.x, 20.x]
    
    steps:
      - uses: actions/checkout@v3
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run tests
        run: npm test
      
      - name: Validate YAML
        run: node scripts/validate-yaml.js
  
  validate-models:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      
      - name: Install LinkML
        run: pip install linkml
      
      - name: Validate models
        run: python scripts/validate-models.py
```

### 7. 文档完善

#### 创建完整的README
```markdown
# ego - 个人领域模型

## 简介

ego是基于通用个人领域模型的个人管理工具，提供时间管理、任务跟踪、资产管理等功能。

## 快速开始

### 安装

```bash
# 克隆项目
git clone https://github.com/hyg/ego.git
cd ego

# 安装依赖
npm install

# 初始化数据库
npm run migrate
```

### 运行

```bash
# 启动API服务
npm start

# 运行CLI工具
node ego.js day init 1
node ego.js day over
node task view
```

## 项目结构

```
ego/
├── api/              # API服务
├── web/              # 前端界面
├── src/              # CLI工具
├── data/             # 数据文件
├── scripts/          # 工具脚本
└── tests/            # 测试文件
```

## 开发

```bash
# 运行开发服务器
npm run dev

# 运行测试
npm test

# 代码检查
npm run lint

# 生成文档
npm run docs
```

## License

CC BY-NC-SA 4.0
```

## 8. 配置文件标准化

```yaml
# config/production.yaml
app:
  name: ego
  version: 1.0.0

database:
  type: postgresql
  host: ${DB_HOST}
  port: 5432
  name: ${DB_NAME}
  user: ${DB_USER}
  password: ${DB_PASSWORD}
  pool:
    min: 2
    max: 10

server:
  port: 3000
  host: 0.0.0.0
  cors:
    origin: "*"

logging:
  level: info
  format: json
  file: ./logs/app.log

paths:
  data: ./data
  uploads: ./uploads
  templates: ./templates

models:
  schemaDir: ./data/schemas
  validation: true
```

## 实施优先级

### 立即执行（本周）
1. ✅ 修复util.js语法错误
2. ✅ 建立数据库schema
3. ✅ 编写数据迁移脚本
4. ✅ 添加YAML验证工具

### 短期目标（本月）
1. 🔄 迁移所有数据到数据库
2. 🔄 重构task.js使用async/await
3. 🔄 建立统一API层
4. 🔄 添加基础测试

### 中期目标（季度）
1. 📅 完善前端界面
2. 📅 实现LinkML验证
3. 📅 建立CI/CD流程
4. 📅 完善文档

### 长期目标（年度）
1. 📊 性能优化
2. 📊 多用户支持
3. 📊 移动端支持
4. 📊 数据分析功能
```

## 总结

本项目核心问题是**数据管理混乱**和**代码质量低**。建议：

1. **优先级1**：建立数据库，迁移数据
2. **优先级2**：统一数据格式，添加验证
3. **优先级3**：重构JavaScript代码
4. **优先级4**：前后端集成

通过以上改进，项目将从一个个人工具转变为可维护、可扩展的生产级应用。
