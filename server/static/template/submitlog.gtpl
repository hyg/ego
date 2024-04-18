<!DOCTYPE html>
<html lang="zh-cn">
<head>
  <title>个人领域</title>
  <meta charset="UTF-8"> 
  <link rel="stylesheet" type="text/css" href="/static/css/pure-min.css" />
</head>
<body>
		<!--content begin-->
		<div class="header"  align="center">
			<h1>登记时间</h1>
			<hr>
		</div>
		<div  align="center">
		<br/>请修改下面的json字符串，然后提交。<br/><br/><br/>
		</div>
		<form class="pure-form" id="TimeLog" action="/submitlog" method="post">
			<div class="pure-g" align="center">

			<textarea name="log" class="pure-input-1-2" rows="20" p>
{
"BeginTime":"2015-01-03 22:00:00",
"EndTime":"2015-01-03 23:00:00",
"Minute":60,
"Title":"ttttt",
"Level":2,
"COD":"ego",
"Log":"lllllll"
}
			</textarea>
			<br/>
			<input type="submit" id="next" name ="next" class="pure-button pure-input-1-2" value="提交"></input>				
			</div>
		</form>
		<!--content end-->
</body>
</html>