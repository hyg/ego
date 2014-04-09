#API接口

##com
1. com
	1. GET /0.1/com

2. cod
	1. GET /0.1/cod
	2. PUT /0.1/register/[cod url]

##cod
1. cod/com
	1. GET /0.1/cod 
	2. GET /0.1/com
	3. GET /0.1/com/[com ID]

2. asset
	1. GET /0.1/asset
	2. GET /0.1/asset/[ego ID]
	3. PUT /0.1/asset/[asset type]/[task ID]/[asset content]
	4. PUT /0.1/asset/transfer/[asset type]/[amount]/[cod or ego]/[ID]
	
3. role
	1. GET /0.1/role
	2. GET /0.1/role/[ego ID]
	3. PUT /0.1/role/[add or delete]/[role ID]
 
4. member
	1. GET /0.1/member
	2. GET /0.1/member/[ego ID]
	3. PUT /0.1/member/register/[ego url]
	4. PUT /0.1/member/remove/[ego ID]

5. task
	1. GET /0.1/task
	2. GET /0.1/task/[task ID]
	3. GET /0.1/task/member/[ego ID]

##ego
1. ego
	1. GET /0.1/ego
	2. PUT /0.1/ego/edit/[ego info] 
	3. PUT /0.1/ego/register/[ego url]

2. cod/com
	1. GET /0.1/cod
	2. GET /0.1/com
	3. PUT /0.1/register/[cod url]
	
3. asset
	1. GET /0.1/asset
	2. GET /0.1/asset/[all or level n]/[all or asset type]
	3. GET /0.1/asset/log/[all or level n]/[all or asset type]/[begin time]/[end time] 
	4. PUT /0.1/asset/[asset type]/[task ID]/[asset content]
	5. PUT /0.1/asset/transfer/[out / in]/[asset type]/[amount]/[cod or ego]/[ID] 

4. task
	1. GET /0.1/task
	2. GET /0.1/task/level/[level n]
	3. GET /0.1/task/cod/[cod ID]
	4. GET /0.1/task/[all or level n]/[all or cod ID]/[begin time]/[end time] 
	5. PUT /0.1/task/[task info]

##字典
1. cod = COmunity Deployment
2. com = COmunity Model

##问题
1. 怎么确定自然人的身份？一个人参与各个cod成为member，然后去他人的ego那里查看账目，ego怎么确认这个人的权限？
>	用ego ID，而不使用自然人的ID。任何关系都是基于ego的，一个人可以部署多个ego。 
2. 