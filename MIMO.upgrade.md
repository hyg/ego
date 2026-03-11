# MIMO 升级建议

## 1. 基于代码阅读的独立分析

### 1.1 数据管理问题

**观察**：
- `data/day/` 按年份分文件夹，每个日期一个 YAML 文件（如 `d.20260312.yaml`）
- `data/voucher/` 按年份分文件夹，每个凭证一个 YAML 文件（如 `AER.1.yaml`）
- `data/season/` 每个季度一个 YAML 文件

**问题**：
- 文件数量庞大（数千个），查询需要遍历文件系统
- 统计分析需要加载所有文件，性能低下
- 缺乏数据库支持，难以进行复杂查询

### 1.2 代码质量问题

**观察**：
1. **文件引用错误**：
   - `src/day.js` 第 4 行：`const util = require('./util.1.js');`
   - 实际文件为 `util.js`，应修正为 `require('./util.js')`

2. **硬编码路径**：
   - `src/start.js` 第 16 行：`let seasonpath = "../data/season/2024S3.yaml";`
   - 应使用 `path.js` 中定义的路径

3. **代码重复**：
   - `src/start.js` 和 `src/waitinglist.js` 都有 `makewaitinglist` 函数
   - 逻辑相似但有细微差异（`start.js` 使用 `supply`，`waitinglist.js` 使用 `timeslice`）

4. **错误处理不足**：
   - YAML 加载缺少 try-catch
   - 文件操作缺少异常处理

### 1.3 机制设计问题

**观察**：
- 当前调度逻辑：基于季度待办事项按时间片长度匹配
- 资源分配：静态分配（`season.time.alloc`）
- 任务关系：简单的父子关系（`parent id`）

**与项目目标的差距**：
项目目标提到：
1. "可以有多种父任务、子任务关系的定义"
2. "每种父子任务关系定义，也要规定把资源沿着父子关系的分配"
3. "子任务把20%资源分配给父任务"

当前代码：
- 只有一种父子关系定义（`parent id`）
- 没有资源流动机制
- 没有 Vat 定价机制

### 1.4 模型一致性问题

**观察**：
- `entity.yaml` 定义 `cognize` 为路径属性
- `huangyg.yaml` 使用数值（`cognize: 1`）
- 日期格式不统一（`YYYYMMDD` vs ISO 8601）

## 2. 具体代码问题清单

### 2.1 立即修复的问题

| 文件 | 问题 | 修复建议 |
|------|------|----------|
| `src/day.js` 第 4 行 | 文件引用错误 | `const util = require('./util.js');` |
| `src/start.js` 第 16 行 | 硬编码路径 | 使用 `path.js` 中定义的路径 |
| `src/start.js` 第 319-389 行 | 与 `waitinglist.js` 重复 | 合并函数，`start.js` 引用 `waitinglist.js` |
| 所有 YAML 加载 | 缺少错误处理 | 添加 try-catch 和文件存在性检查 |

### 2.2 代码现代化建议

虽然未发现 `var` 关键字，但可以进一步现代化：
- 统一使用 `const` 声明不可变变量
- 使用箭头函数简化回调
- 使用模板字符串替代字符串拼接

## 3. 新版本设计方案

### 3.1 核心设计原则

1. **多层任务关系**：支持多种关系定义（Vat、依赖、协作等）
2. **动态资源分配**：支持资源在任务间流动，实现 Vat 定价
3. **数据存储优化**：从文件系统迁移到数据库，保留 YAML 作为配置
4. **代码重构**：消除重复，统一路径管理，改善错误处理

### 3.2 数据库设计扩展

基于代码阅读，扩展原有设计：

```sql
-- day 表（从 data/day/ 迁移）
CREATE TABLE day (
    date TEXT PRIMARY KEY,
    mode INTEGER,
    plan INTEGER,
    time TEXT  -- JSON 格式存储时间片数组
);

-- voucher 表（从 data/voucher/ 迁移）
CREATE TABLE voucher (
    id TEXT PRIMARY KEY,
    date TEXT,
    type TEXT,  -- AER/AVR
    amount REAL,
    voucher_id TEXT
);

-- season 表（从 data/season/ 迁移）
CREATE TABLE season (
    id TEXT PRIMARY KEY,
    year INTEGER,
    season INTEGER,
    time TEXT,  -- JSON 格式存储时间分配
    dayplan TEXT,  -- JSON 格式存储日计划模板
    todo TEXT  -- JSON 格式存储待办事项
);

-- 任务关系表（支持多种关系类型）
CREATE TABLE task_relations (
    id TEXT PRIMARY KEY,
    parent_id TEXT NOT NULL,
    child_id TEXT NOT NULL,
    relation_type TEXT NOT NULL,  -- 'vat', 'dependency', 'collaboration'
    percentage REAL,  -- 资源分配比例
    FOREIGN KEY (parent_id) REFERENCES tasks(id),
    FOREIGN KEY (child_id) REFERENCES tasks(id)
);
```

### 3.3 Vat 机制详细设计

基于项目目标和代码现状：

1. **关系类型定义**：
   - `vat`：容器关系，子任务向父任务贡献资源
   - `dependency`：依赖关系，任务执行顺序约束
   - `collaboration`：协作关系，资源共享

2. **资源流动计算**：
   ```javascript
   // 伪代码示例
   function calculateEffectiveAlloc(taskId, baseAlloc, relations) {
     let effectiveAlloc = baseAlloc;
     
     // 计算子任务贡献给父任务的资源
     relations.forEach(relation => {
       if (relation.parent_id === taskId && relation.relation_type === 'vat') {
         effectiveAlloc += relation.child_alloc * relation.percentage;
       }
       if (relation.child_id === taskId && relation.relation_type === 'vat') {
         effectiveAlloc -= baseAlloc * relation.percentage;
       }
     });
     
     return effectiveAlloc;
   }
   ```

3. **调度逻辑优化**：
   - 在生成等待列表时，考虑 Vat 关系
   - 确保基础学科任务优先获得资源

### 3.4 代码结构重构

```
ego/
├── src/
│   ├── utils/
│   │   ├── date.js          # 日期处理
│   │   ├── path.js          # 路径管理（修复硬编码）
│   │   ├── yaml.js          # YAML 操作封装
│   │   └── db.js            # 数据库操作
│   ├── services/
│   │   ├── taskService.js   # 任务管理
│   │   ├── seasonService.js # 季度管理
│   │   ├── vatService.js    # Vat 定价机制
│   │   └── dayService.js    # 日计划管理
│   ├── models/
│   │   ├── task.js          # 任务模型
│   │   ├── relation.js      # 关系模型
│   │   └── resource.js      # 资源模型
│   ├── waitinglist.js       # 重构：消除重复
│   ├── season.js            # 保留核心逻辑
│   └── start.js             # 简化：仅保留入口
├── data/
│   ├── config.yaml          # 配置文件
│   └── huangyg.yaml         # 用户数据
├── schema/
│   ├── entity.yaml          # LinkML 模型
│   └── task.yaml            # 任务模型
├── tests/
│   ├── fixtures/            # 测试数据
│   └── unit/                # 单元测试
└── package.json
```

## 4. 实施计划

### 4.1 第 1 周：基础修复（立即执行）

1. **修复文件引用错误**：
   - `src/day.js` 第 4 行：修正 `util.1.js` → `util.js`

2. **消除硬编码路径**：
   - `src/start.js` 第 16 行：使用 `path.js` 中定义的路径
   - 检查并修复其他硬编码路径

3. **合并重复代码**：
   - 将 `start.js` 的 `makewaitinglist` 函数移除，引用 `waitinglist.js`
   - 统一使用 `timeslice` 字段

4. **添加错误处理**：
   - 为所有 YAML 加载添加 try-catch
   - 添加文件存在性检查

### 4.2 第 2-3 周：数据存储优化

1. **设计数据库 Schema**：
   - 创建 `day`、`voucher`、`season` 表
   - 设计任务关系表

2. **编写数据迁移脚本**：
   - YAML → SQLite 迁移工具
   - 数据验证和一致性检查

3. **实现数据同步机制**：
   - SQLite → YAML 镜像导出
   - Git 钩子自动同步

### 4.3 第 4-6 周：Vat 机制实现

1. **设计关系模型**：
   - 定义关系类型（vat、dependency、collaboration）
   - 实现关系管理 CRUD

2. **实现资源流动计算**：
   - Vat 定价算法
   - 资源分配验证

3. **重构调度逻辑**：
   - 集成 Vat 机制到等待列表生成
   - 确保基础学科优先级

### 4.4 第 7-8 周：测试和优化

1. **编写测试用例**：
   - 单元测试（Vat 计算、关系管理）
   - 集成测试（完整调度流程）

2. **性能优化**：
   - 数据库索引优化
   - 缓存机制

3. **文档更新**：
   - API 文档
   - 用户手册

## 5. 总结

基于独立代码阅读，我发现当前系统存在以下核心问题：

1. **数据管理**：文件系统存储效率低下
2. **代码质量**：文件引用错误、硬编码路径、代码重复
3. **机制设计**：缺乏 Vat 定价和动态资源分配

新设计方案通过引入数据库、实现 Vat 机制、重构代码结构，能够更好地支持项目目标：多层任务关系、动态资源分配、基础学科资源保障。

实施计划分阶段进行，从基础修复开始，逐步实现数据迁移和机制重构，确保平稳过渡和持续改进。
