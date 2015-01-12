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
├── locallog  
|   ├── v0.1
|   |   ├── .json
|   |   ├── .json
|   |   └── ...
|   ├── v0.2
|   └── ... 
├── publog  
|   ├── v0.1
|   ├── v0.2
|   └── ...
├── client.v0.1.exe
├── client.v0.2.exe
├── client.v....exe
├── empty.s3db
├── local.v0.1.s3db
├── local.v0.2.s3db
├── local.v....s3db
├── pub.v0.1.s3db
├── pub.v0.2.s3db
├── pub.v....s3db
├── README.md
└── config.json
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
