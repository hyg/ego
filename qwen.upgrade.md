ego项目理解与技术方案
一、项目概述
ego是一个个人自我管理系统，以天为单位进行时间规划、任务分配和资产管理。
- raw：entity的非理性/先天部分（后勤、生活）
- ego：entity的理性/后天部分（任务执行、token发行）
- task：不可发行token的工作单元，可向ego借款
- artifact：任务产出，高价值artifact是token的锚定物
二、当前架构
ego/src/          # 代码（day.js, journal.js, asset.js, task.js...）
ego/data/day/     # 日计划数据
ego/data/season/  # 季度配置
ego/data/task/    # task元数据
ego/data/voucher/ # 凭证（staging临时区 + archive归档区）
ego/data/account/ # 账户配置
三、Token发行机制
3.1 核心概念
Entity
token发行主体
3.2 政策掩码体系
政策 = ego对当前各类artifact价值的量化估值。根据对外合作承诺授予不同时长的政策参与权。
周期
1天
2-64天
规则：时长越短优先级越高，紧急政策覆盖长期政策。
3.3 政策内容示例
- 向下锋面任务：报销200%
- 向上锋面任务：报销70%
- 横向派生兄弟任务：前三个时间片50%、30%、10%
3.4 汇率形成与破产
- 深层task以自有token报价，浅层task购买深层artifact
- 清偿顺序：ego借款 > 外部债务 > 剩余token分配
四、待实现方案
1. artifact统一索引 - manifest声明 + git hook同步
2. 派生任务自动生成 - draft→code→agentskill
3. Entity ID生成 - raw/ego各持私钥片段
4. 做市商机制 - ego垄断对外交易接口
五、已完成改进
改进项
幂等over
voucher临时区
debug集中管理
log统一到util.js
旧格式兼容
time_slices去重
season todo迁移
---