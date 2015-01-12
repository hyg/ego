##部署手册
ego client

###文件夹结构
<pre>
.
├── static
|   ├── css
|   ├── image
|   ├── js
|   └── template
├── data  
|   ├── person.json
|   ├── watchlist.json
|   ├── sharedata
|   |   ├── xxx.person.json
|   |   ├── xxx.key.pub
|   |   ├── person.yyy.com.json
|   |   ├── person.yyy.cod.json
|   |   ├── person.yyy.pool.json
|   |   └── ...
|   ├── index.json
|   ├── contract
|   |   ├── 1.json
|   |   ├── 2.json
|   |   └── ...
|   ├── ticket
|   |   ├── 1.json
|   |   ├── 1.budget.json
|   |   ├── 2.json
|   |   └── ...
|   ├── 20150101010203
|   |   ├── baseline.json
|   |   ├── index.json
|   |   └── ...
|   ├── YYMMDDhhmmss
|   |   ├── baseline.json
|   |   ├── index.json
|   |   └── ...
|   └── ...
├── client.v0.1.exe
├── client.v0.2.exe
├── client.v....exe
├── config.json
├── key.pub
├── key.sec
└── README.md
</pre>

* locallog：本地记录，用户不要编辑，由客户端维护。
* publog：公开记录。用户不要编辑，由客户端自动从公网上同步到本地。
* config.json：部署参数，用户根据本手册编辑。


###部署
1. 初次部署：
	1. 在非系统盘创建工作文件夹。
	2. 把部署文件解压缩到工作文件夹。
	3. 编辑部署参数：config.json文件。
	4. 运行版本号最高的client.[version].exe，文件名中的version是版本号。
2. 升级部署：
	1. 把部署文件解压缩到工作文件夹。
	2. 运行版本号最高的client.[version].exe，文件名中的version是版本号。

###配置参数
1. 资源池
2. 资源价格表
3. 