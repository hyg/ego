##部署手册
ego client

###文件夹结构
<pre>
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
└── config.json
</pre>

* locallog：本地记录，用户不要编辑，由客户端维护。
* publog：公开记录。用户不要编辑，由客户端自动从公网上同步到本地。
* config.json：部署参数，用户根据本手册编辑。


###