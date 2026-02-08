# Kimi 升级建议
YAML/JavaScript 部分改进建议

## 项目概述
本项目包含基于 LinkML 建模的个人效率管理系统（ego），使用 YAML 作为数据格式，Node.js 作为处理工具。以下分析基于非 Go 文件（*.yaml, *.js, *.json, *.md）。

---

## 1. 数据一致性问题

### 问题描述
**entity.yaml** 和 **huangyg.yaml** 中的实体定义不一致：
- entity.yaml 使用 `cognize` 字段指向路径
- huangyg.yaml 使用 `cognize: 1`（数值）
- ego.yaml 的 `cognize: ego\data\congnize` 与 model 定义不符

### 建议改进
```yaml
# huangyg.yaml - 统一为路径形式
cognize: ego/data/cognize/huangyg
protocol: ego/data/protocol/huangyg  
offer: ego/data/offer/huangyg
```

或在 entity.yaml 中明确定义类型：
```yaml
slots:
  cognize:
    range: string  # 路径
  protocol:
    range: string
  offer:
    range: string
```

---

## 2. 代码重构 - DRY 原则

### 2.1 重复代码
**waitinglist.js** 和 **start.js** 中的 `makewaitinglist` 函数逻辑高度重复（约 70% 相同）。

**当前问题**：
- waitinglist.js: 使用 `dayplanobj[planid].timeslice`（正确）
- start.js: 使用 `dayplanobj[planid].supply`（过时）

**建议改进**：
```javascript
// start.js - 删除重复实现，统一引用
const wl = require('./waitinglist.js');

module.exports = {
    makewaitinglist: wl.makewaitinglist,  // 直接引用
    // ... 其他方法
};
```

### 2.2 硬编码路径
**task.js**、**season.js**、**start.js** 中存在多处硬编码：
```javascript
"../data/season/"
"../../draft/"
```

**建议**：
```javascript
// path.js - 统一定义
module.exports = {
    SEASON_PATH: '../data/season/',
    DRAFT_PATH: '../../draft/',
    DAY_PATH: '../data/day/',
    VOUCHER_PATH: '../data/voucher/',
    // 可配置化
    getSeasonPath: (year, season) => `${this.SEASON_PATH}${year}S${season}.yaml`
};
```

### 2.3 日期字符串处理
**util.js** 和 **task.js** 中都有 `datestr` 函数。

**建议**：
- 统一使用 util.js 中的实现
- 使用 dayjs 完全替代原生 Date 操作
- 移除 `datestring` 函数（未使用）

---

## 3. 数据模型完善

### 3.1 LinkML 模型完整性
**task.yaml** 中的依赖定义使用自定义结构：
```yaml
# 当前实现 - 不够灵活
attributes:
  dependencies:
    range: depend
```

**建议改进**：
```yaml
# 使用标准 LinkML 关系
classes:
  task:
    attributes:
      id:
        identifier: true
      name:
        required: true
      parent_id:
        range: task  # 自引用
      status:
        range: TaskStatus
      # 标准依赖关系
      depends_on:
        multivalued: true
        range: task
        slot_uri: RO:0002502  # depends on
```

### 3.2 字段类型定义
多个 YAML 文件中字段缺少类型定义：

**day.yaml** 示例：
```yaml
# 当前 - 无类型
date: '20260208'
amount: 15

# 建议 - 明确类型
date: 
  type: date
  format: YYYYMMDD
begin:
  type: datetime
  format: YYYYMMDDHHmmss
amount:
  type: integer
  minimum: 0
subject:
  type: string
  enum: [PSMD, ego, raw, learn, js]
```

---

## 4. 目录结构优化

### 4.1 分离 schema 和数据
当前 `data/` 目录混合了模型定义和实例数据。

**建议结构**：
```
├── schema/              # LinkML 模型定义
│   ├── entity.yaml
│   ├── task.yaml
│   ├── raw.food.yaml
│   └── recognize.yaml
├── data/                # 实例数据
│   ├── huangyg.yaml
│   ├── ego.yaml
│   ├── day/
│   ├── voucher/
│   └── task.json
├── src/                 # 源代码
│   ├── util.js
│   ├── season.js
│   ├── waitinglist.js
│   ├── start.js
│   └── task/
│       └── task.js
└── config/              # 配置
    └── path.js
```

### 4.2 文件名规范化
**建议**：
- 日期数据：`day/2026/20260208.yaml`（去掉 d. 前缀）
- voucher 数据：`voucher/2026/AER-39.yaml`（用 - 代替 .）
- 统一小写：`raw.food.yaml` → `raw_food.yaml` 或 `raw-food.yaml`

---

## 5. 测试改进

### 5.1 测试覆盖率
现有测试仅覆盖基本功能：
- util.test.js: 4 个测试用例
- waitinglist.test.js: 2 个测试用例，依赖外部文件

**建议新增测试**：
```javascript
// season.test.js
const test = require('node:test');
const assert = require('assert');
const season = require('./season.js');

test('load season object with invalid date', (t) => {
    const result = season.loadseasonobj('invalid');
    assert.strictEqual(result, null);  // 应返回 null 而非抛出异常
});

test('update sold time calculation', (t) => {
    const mockSeason = {
        year: 2026,
        beginmonth: 1,
        beginday: 1,
        lastmonth: 3,
        lastday: 31,
        time: { alloc: { PSMD: 100 } }
    };
    const result = season.updatesold(mockSeason);
    assert.ok(result.time.sold);
});
```

### 5.2 测试数据分离
**当前问题**：测试使用了实际生产数据。

**建议**：
```
test/
├── fixtures/
│   ├── season/
│   │   └── 2026S1.yaml
│   └── day/
│       └── 20260101.yaml
├── util.test.js
├── season.test.js
└── waitinglist.test.js
```

---

## 6. 错误处理增强

### 6.1 文件操作异常
**season.js** 示例：
```javascript
// 当前 - 可能崩溃
loadseasonobj: function (datestr = "") {
    var seasonfilename = this.seasonfilename(datestr);
    var seasonobj = yaml.load(fs.readFileSync(seasonfilename, 'utf8'));
    return seasonobj;
}

// 改进
loadseasonobj: function (datestr = "") {
    try {
        var seasonfilename = this.seasonfilename(datestr);
        if (!fs.existsSync(seasonfilename)) {
            console.error(`Season file not found: ${seasonfilename}`);
            return null;
        }
        var content = fs.readFileSync(seasonfilename, 'utf8');
        return yaml.load(content, { schema: yaml.FAILSAFE_SCHEMA });
    } catch (error) {
        console.error(`Failed to load season: ${error.message}`);
        return null;
    }
}
```

### 6.2 YAML 解析错误
**task.js** 多处 `yaml.load()` 缺少错误处理。

---

## 7. 性能优化

### 7.1 文件遍历优化
**task.js** 中的 `traverseFolder` 遍历整个目录：
```javascript
// 当前 - 全量遍历
traverseFolder(draftrepopath, loaddraft);

// 改进 - 添加日期过滤
traverseFolder(draftrepopath, loaddraft, {
    startDate: '20260101',
    endDate: '20260331'
});
```

### 7.2 缓存机制
- season 数据在多次调用中重复读取
- 建议添加内存缓存或文件修改时间检查

---

## 8. 安全性

### 8.1 路径拼接
```javascript
// 当前 - 存在路径遍历风险
var draftfilename = path.draftrepopath + year + "/" + month + "/" + begintime + ".md";

// 改进 - 使用 path.join 并验证
const path = require('path');
var draftfilename = path.join(path.draftrepopath, year, month, `${begintime}.md`);

// 验证路径在安全目录内
if (!draftfilename.startsWith(path.draftrepopath)) {
    throw new Error('Invalid path');
}
```

### 8.2 输入验证
- 日期格式验证
- amount 数值范围验证
- 字符串长度限制

---

## 9. 依赖管理

### 9.1 package.json 缺失
项目使用了以下 npm 包但未声明：
- js-yaml
- dayjs

**建议创建 package.json**：
```json
{
  "name": "ego",
  "version": "1.0.0",
  "description": "Personal efficiency management system",
  "main": "src/start.js",
  "scripts": {
    "test": "node --test",
    "task": "node src/task/task.js"
  },
  "dependencies": {
    "js-yaml": "^4.1.0",
    "dayjs": "^1.11.10"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## 10. 文档完善

### 10.1 README 更新
**data/README.md** 中的 season metadata 格式与实际数据不一致：
- 示例中使用 `dayplan[1].supply`
- 实际数据使用 `dayplan[1].timeslice`

### 10.2 代码注释
- 复杂的 waitinglist 生成算法缺少详细注释
- LinkML 模型字段缺少描述

---

## 优先级排序（YAML/JS 部分）

| 优先级 | 项目 | 影响 | 工作量 |
|--------|------|------|--------|
| P0 | 创建 package.json | 基础依赖管理 | 小 |
| P0 | 统一数据模型 | 避免数据不一致 | 中 |
| P1 | 错误处理改进 | 系统稳定性 | 中 |
| P1 | 移除重复代码 | 维护成本 | 小 |
| P1 | 硬编码路径提取 | 可配置性 | 小 |
| P2 | 目录结构调整 | 代码组织 | 中 |
| P2 | 测试完善 | 质量保证 | 中 |
| P3 | 性能优化 | 扩展性 | 大 |
| P3 | 安全加固 | 安全性 | 中 |

---

*分析日期: 2026-02-08*
*分析范围: 除 *.go 和 *.upgrade.md 外的所有文件*
