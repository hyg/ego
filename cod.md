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
<tr><td>1类时间（分钟）</td><td>每天8小时</td><td>1</td></tr>
<tr><td>2类时间（分钟）</td><td>每天6小时</td><td>4</td></tr>
<tr><td>3类时间（分钟）</td><td>每天10小时</td><td>16</td></tr>

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
	* 具体说明：调度阶段结束后交验：
		* 如实施有赤字，-4096Token；
		* 如实施无赤字，4096Token；
		* 如率先保障关键增长点，8192 Token。
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

###数据交换
####文件夹结构
<pre>
.
├── static
|   ├── css
|   ├── image
|   ├── js
|   └── template
├── data  
|   ├── person.yaml
|   ├── watchlist.yaml
|   ├── sharedata
|   |   ├── xxx.person.yaml
|   |   ├── xxx.key.pub
|   |   ├── person.yyy.com.yaml
|   |   ├── person.yyy.cod.yaml
|   |   ├── person.yyy.pool.yaml
|   |   └── ...
|   ├── index.yaml
|   ├── contract
|   |   ├── 1.yaml
|   |   ├── 2.yaml
|   |   └── ...
|   ├── ticket
|   |   ├── 1.yaml
|   |   ├── 1.budget.pool.aaa.yaml
|   |   ├── 2.yaml
|   |   └── ...
|   ├── 20150101010203
|   |   ├── baseline.yaml
|   |   ├── index.yaml
|   |   └── ...
|   ├── YYMMDDhhmmss
|   |   ├── baseline.yaml
|   |   ├── index.yaml
|   |   └── ...
|   └── ...
├── client.v0.1.exe
├── client.v0.2.exe
├── client.v....exe
├── config.yaml
├── pointer.yaml
├── key.pub
├── key.sec
└── README.md
</pre>

* locallog：本地记录，用户不要编辑，由客户端维护。
* publog：公开记录。用户不要编辑，由客户端自动从公网上同步到本地。
* config.yaml：部署参数，用户根据本手册编辑。

####person.yaml
1. 用途：保存一个自然人的信息。使用者的个人信息存放在\person.yaml文件，其他用户的信息存放在\sharedata\xxx.person.yaml，其中xxx是该用户的昵称。
2. 数据项：
	* name：姓名
	* nickname：昵称（部署内唯一）
	* email：电子邮件地址
	* dataurl：公布数据的网络地址
	* statement：自我陈述
	* pubkey：PGP公钥
3. 范例：
<pre>
	name: Huang Yonggang
	nickname: modeler
	email: huangyg@mars22.com
	dataurl: github.com/hyg/data/blob/master
	statement: |+
	  微博：http://weibo.com/huangyg
	  qq：445053
	
	pubkey: |+
	  -----BEGIN PGP PUBLIC KEY BLOCK-----
	  Version: OpenPGP.js v0.9.0
	  Comment: http://openpgpjs.org
	
	  xsBNBFSlVgcBCACQURxJMfdrPbAFa5ZGOs4j43tRmc7KQoM6lKveobO+v+Jg
	  IIYqXtDadXAM1h34CQgwj4o7VFKf+M1SmGbO57cx+M3U1+SgKmW9w8gRwgNE
	  q+m3JPo+HIiOI/X8Gsa9vrbAbs19UvXk4H+CdC02bxwruLPan87fI17wGLEB
	  62mcLG9eNPg4XrmZDDISPvicR88AFmkZMPh9WoVm99jzKl3EWCfPXqdNiLWK
	  kzXZO2jPLXLb2iJRacq2i+QXt5UWB5BEaAHLLVLTu5PNykHumN0xxIoidrxV
	  G+ug8Z269ZmcYdRv2fgY/TYP+/h43RkSI+iqiXeKSL8+WGDqSpee9sPnABEB
	  AAHNMOa1i+ivlei0puWPtyAoaHlnL2pzLnNhbXBsZSkgPHRlc3RAanNzYW1w
	  bGUub3JnPsLAcgQQAQgAJgUCVKVWDwYLCQgHAwIJEE5QeumSjbLwBBUIAgoD
	  FgIBAhsDAh4BAADijgf/e24fcRYoEZlIrej5ZblOszkKV7Y2900NerwrLPFK
	  kfQVHOBSAi9Nls5rOlZ4jDi7rd8/V+NUDDqE966jMha6TpCnHd+j6I4tiJiq
	  I8n51FoctVcpJcadygcoZE18pGF+dl62o7iLJVqsQv6ZnbLTQJngPDjAQGG8
	  KKhJjpY2RYNnR8vBCb4+lH8lhBnXviUUyyFRBjbBdhiPVebvv/LGd60diEmJ
	  +xKC89+Z0bGdElPpVW2WdOkTXL47UoNfZpHzpxhytOmjAykxGFtaqtUmHzvN
	  KogM5YDXuO7ZcWjiiTbKSnLcYyWLBp8VGq+MdDQmIEV7YpE3/mWPHat0wZar
	  X87ATQRUpVYMAQgAogdxHIK2i4MMeV2DASacwP037GCqyLHRcmo1ud5IYkHd
	  WXs1xigEklj2+3AaWjYgHzhN/f5BE2aDFttSonJhQ+ltZrEArungIWppSfN+
	  v6SyzmUsYK8EooF1M/EckvyF3ugub+SGst4MXyGfYhx901oRvKhY61pFWgZP
	  3gs/P1nHbDpUYNDKENflVBV0ha2DSlLxFQdfSh4hh4Jm1icmw85V5gTwppQd
	  CQ//qGZ757Tq4AtZS9givMYnSkXFsSlufKZ8LTVa/RFZ+gGKbcJHMR8XLoOc
	  8n8Vge92GHm63W5mP33A99e+NgyegInLmoi3lIXGO8yORIdwci17Eaqa9QAR
	  AQABwsBfBBgBCAATBQJUpVYQCRBOUHrpko2y8AIbDAAAmiAIAIHhfGiJ9e9L
	  n8z9tD/BFzqk5vll36hCXkLdg2HzftJsxPdW0eT27iDLagJcsrbVpRAag49/
	  47GH9BeHdtqsDNsh7UzQAlfp4t7+Fi00+9GuazHtTnI1bN9zgpGLCCNP6JUR
	  J9Z00c+GhQayTkPwTCf9zCidtbbNJc7GRlfgOMaoNqGoasyZrltqoB6hCM16
	  l0jkh59MIqQ+4FbLQOqr/7SGi6H1wzFa/Q4Q9R2VDg5zlEg163pbsf+ope52
	  3rPxBia7vxpFfXQXGbtR6vZDjI8uqsEMEyflqiuHJxmjtitnYLRqxQRr9fZq
	  WMc+ZlpNrplXO9WkeuhEICGQdZSy/ok=
	  =+yKz
	  -----END PGP PUBLIC KEY BLOCK-----
</pre>

####index.yaml
1. 用途：公开数据的索引文件，每次增添数据都修改index。
2. 数据项：
	* period：管理周期的列表
		* begintime：一个管理周期的开始时间，精确到秒。
		* totalbalance：管理周期开始时以Token结算的资产总额。
	* contractmax：契约的最大编号。
	* contract：当前有效的契约。
	* ticketmax：工单的最大编号。
	* ticket：当前有效的工单。
3. 范例
<pre>
	period:
	- begintime: "201501010000"
	  totalbalance: 0
	- begintime: "201501200000"
	  totalbalance: 0
	contractmax: 6
	contract:
	- 1
	- 2
	- 3
	- 4
	- 5
	- 6
	ticketmax: 1
	ticket:
	- 1
</pre>

####com.yaml
1. 用途：记录一个共同体模型的信息，保存在\sharedata\person.yyy.com.yaml，其中person是建模者的昵称，yyy是模型昵称。
2. 数据项：
	* name：模型名称
	* nickname：模型昵称
	* creatortype：建模者类型，1-自然人，2-利益共同体。
	* creatorname：建模者名称
3. 范例
<pre>
	name: "通用 个人领域模型"
	nickname: common
	puburl: github.com/hyg/ego/blob/master/common.com.md
	creatortype: 1
	creatorname: Huang Yonggang
</pre>

####cod.yaml
1. 用途：记录一个共同体部署的信息，保存在\sharedata\person.yyy.cod.yaml，其中person是部署者的昵称，yyy是部署昵称。
2. 数据项：
	* name：部署名称
	* nickname：部署昵称
	* model
		* 具体数据项同com.yaml定义。
	* puburl：部署方案网址
	* apiurl：api网址
	* deployertype：部署者类型，1-自然人，2-利益共同体。
	* deployername：部署者名称
3. 范例
<pre>
	name: "ego 个人管理工具"
	nickname: ego
	model:
	  name: "ego 个人领域模型"
	  nickname: ego
	  puburl: github.com/hyg/ego/blob/master/ego.com.md
	  creatortype: 1
	  creatorname: Huang Yonggang
	puburl: github.com/hyg/ego/blob/master/cod.md
	apiurl: ego.mars22.com/api
	deployertype: 1
	deployername: Huang Yonggang
</pre>

####pool.yaml
1. 用途：记录一个资源池的信息，保存在\sharedata\person.yyy.pool.yaml，其中person是资源池种类创建者的昵称，yyy是资源池种类的名称。
2. 数据项：
	* name：资源池种类的名称
	* define：资源池种类的定义
	* creatortype：资源池种类创建者类型，1-自然人，2-利益共同体。
	* creatorname：资源池种类创建者名称
3. 范例
<pre>
	name: p2
	define: 登记：1. 产生共同体定义（即设计其数学模型）的行为，该模型要求成员公开接受角色。2. 产生共同体定义（即设计其数学模型）的契约，该模型要求成员公开接受角色。3.
	  与第零层以上共同体的契约，该共同体产生的模型要求成员公开接受角色。
	creatortype: 1
	creatorname: Huang Yonggang
</pre>

####contract.yaml
1. 用途：记录一份契约的信息，保存在\sharedata\contact\n.yaml，其中n是契约编号。
2. 数据项：
	* contractid：契约编号
	* title：契约标题
	* poolname：契约所属资源库名称
	* otherpartytype：对方类型，1-自然人，2-利益共同体。
	* otherpartyname：对方名称
	* content：契约内容
	* signtime：签署时间
	* validtime：生效时间
	* invalidtime：失效时间
	* status：契约状态，1-要约，2-生效，3-失效。
3. 范例
<pre>
	contractid: 2
	title: ego modeling
	poolname: p2
	otherpartytype: 2
	otherpartyname: ego
	content: "ego建模者"
	signtime: 2006-11-12 23:25:00
	validtime: 2006-11-12 23:25:00
	invalidtime: ""
	status: 2
</pre>

####ticket.yaml
1. 用途：记录一个工单的信息，保存在\sharedata\n.ticket.yaml，其中n是工单编号。
2. 数据项：
	* ticketid：工单编号
	* contractid：工单所属契约编号
	* target：工单完成时提交的标的物
	* content：工单内容
	* createtime：创建时间
	* deadline：完成期限
	* status：当前状态：1-已创建，2-已完成。
3. 范例
<pre>
	ticketid: 1
	contractid: 4
	target: 基本管理制度
	content: "启动S2状态"
	createtime: 2015-01-01 00:00:00
	deadline: 2015-01-15 00:00:00
	status: 2
</pre>

####ticket.budget.pool.aaa.yaml
1. 用途：记录一个工单的预算，每个资源池的每种资产产生一个记录。保存在\sharedata\n.ticket.pool.aaa.yaml，其中n是工单编号，pool是资源池种类名称，aaa是资产种类名称。
2. 数据项：
	* ticketid：工单编号
	* poolname：资源池种类名称
	* assettype：资产种类名称
	* amount：资产数额
	* tokenamount：折算为Token的数额
3. 范例
<pre>
	ticketid: 1
	poolname: p2
	assettype: Time1
	amount: 960
	tokenamount: 15360
</pre>

####periodindex.yaml
1. 用途：记录一个管理周期的简要信息，保存在\sharedata\YYMMDDhhmmss\index.yaml，其中YYMMDDhhmmss是管理周期开始时间。
2. 数据项：
	* incomemax：收入笔数
	* paymax：支付笔数
	* exchangemax：交易笔数
3. 范例
<pre>
	incomemax: 3
	paymax: 7
	exchangemax: 2
</pre>

####baseline.yaml
1. 用途：记录一个管理周期的起始基准，保存在\sharedata\YYMMDDhhmmss\baseline.yaml，其中YYMMDDhhmmss是管理周期开始时间。
2. 数据项：
	* version：软件版本
	* pool：资源池
		* pooltypename：资源池种类名称
		* price：资源池下各项资源的Token价格
3. 范例
<pre>
	version: "1.0"
	pool:
	- pooltypename: raw
	  price:
	    RMB: 1
	    Time1: 1
	    Time2: 4
	    Time3: 16
	- pooltypename: p1
	  price:
	    RMB: 1
	    Time1: 4
	    Time2: 4
	    Time3: 4
	- pooltypename: p1
	  price:
	    RMB: 1
	    Time1: 16
	    Time2: 16
	    Time3: 16
	- pooltypename: p1
	  price:
	    RMB: 1
	    Time1: 64
	    Time2: 64
	    Time3: 64
</pre>

####.yaml
1. 用途：
2. 数据项：
3. 范例
<pre>
</pre>

##部署许可证
ego 个人领域模型

1. 本作品版权归[黄勇刚](mailto:huangyg@mars22.com)所有。
2. 使用本部署方案的部署者，视为同意“互联模式部署者要约”要约。
3. 本作品采用<a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/">知识共享署名 4.0 国际许可协议</a>进行许可。  
<a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/"><img alt="知识共享许可协议" style="border-width:0" src="https://licensebuttons.net/l/by-sa/4.0/88x31.png" /></a>