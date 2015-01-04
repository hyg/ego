##COD部署
egonet

###部署
1. 部署者：[黄勇刚](mailto:huangyg@mars22.com)
2. 模型：[ego](ego.com.md)
3. 域名：ego.mars22.com

###资源池
* raw：[通用模型](common.com.md)原生资源池，是时间资源的注入池。
* p1：[ego](ego.com.md)原生资源池，登记：
	1. 不产生任何共同体定义的契约。
	2. 与第零层共同体的契约。
* p2：[ego](ego.com.md)原生资源池，登记：
	1. 产生共同体定义（即设计其数学模型）的行为，该模型要求成员公开接受角色。
	2. 产生共同体定义（即设计其数学模型）的契约，该模型要求成员公开接受角色。
	3. 与第零层以上共同体的契约，该共同体产生的模型要求成员公开接受角色。
* ia：[ego](ego.com.md)原生资源池，登记：
	1. 产生共同体定义（即设计其数学模型）的行为，该模型不要求成员公开接受角色。
	2. 产生共同体定义（即设计其数学模型）的契约，该模型不要求成员公开接受角色。
	3. 与第零层以上共同体的契约，该共同体产生的模型不要求成员公开接受角色。 

> 共同体层次划分
> 
>	1. 产生共同体定义（即设计其数学模型）的行为，比所定义的共同体高一层次。
>	2. 不产生任何共同体定义的行为，构成第零层。
>	3. 共同体的层次等于它所有行为层次的最大值。

###资源价格
<table>
<tr><th>资源池</th><th>资产</th><th>约束条件</th><th>Token</th></tr>
<tr><td rowspan="4">raw</td><td>人民币（元）</td><td></td><td>1</td></tr>
<tr><td>1类时间（分钟）</td><td>每天12小时</td><td>1</td></tr>
<tr><td>2类时间（分钟）</td><td>每天4小时</td><td>4</td></tr>
<tr><td>3类时间（分钟）</td><td>每天8小时</td><td>16</td></tr>

<tr><td rowspan="2">p1</td><td>人民币（元）</td><td></td><td>1</td></tr>
<tr><td>时间（分钟）</td><td></td><td>4</td></tr>

<tr><td rowspan="2">p2</td><td>人民币（元）</td><td></td><td>1</td></tr>
<tr><td>时间（分钟）</td><td></td><td>16</td></tr>

<tr><td rowspan="2">ia</td><td>人民币（元）</td><td></td><td>1</td></tr>
<tr><td>时间（分钟）</td><td></td><td>64</td></tr>

</table>

###交易要约
1. 互联模式部署者要约：
	* 契约所属资源池：p2
	* 卖出
	* 标的物：
	* Token价格：1Token/天
	* 具体说明：按“互联模式”使用本方案的部署者，从raw资源池支付给版权所有人p2资源池。
2. 调度者（allocator）要约（已撤销）：
	* 契约所属资源池：raw
	* 买入
	* 标的物：调度方案
	* Token价格：-4096~8192 Token
	* 具体说明：调度阶段结束后交验：如实施有赤字，-4096Token；如实施无赤字，4096Token；如率先保障关键增长点，8192 Token。
3. 评估者（assessor）要约（已撤销）：
	* 契约所属资源池：p2
	* 买入
	* 标的物：cod评估报告（针对p2资源池登记契约的cod）
	* Token价格：2048 Token
	* 具体说明：指出违反章程的行为，如果确认并实际处罚则成交。
4. 模型改进方案要约（已撤销）：
	* 契约所属资源池：p2
	* 买入
	* 标的物：COM设计
	* Token价格：2048 Token
	* 具体说明：如采用则成交，本开放要约每月最多采购一份。

##部署许可证
ego 个人领域模型

1. 本作品版权归[黄勇刚](mailto:huangyg@mars22.com)所有。
2. 使用本部署方案的部署者，视为同意“互联模式部署者要约”要约。
3. 本作品采用<a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/">知识共享署名 4.0 国际许可协议</a>进行许可。  
<a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/"><img alt="知识共享许可协议" style="border-width:0" src="https://licensebuttons.net/l/by-sa/4.0/88x31.png" /></a>