<!DOCTYPE html>
<html lang="zh-cn">
<head>
  <title>个人领域</title>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
  <link rel="stylesheet" href="http://yui.yahooapis.com/pure/0.3.0/pure-min.css">
    <style type="text/css">
      body { font-family: Georgia, "Times New Roman", 
             "Microsoft YaHei", "微软雅黑", 
             STXihei, "华文细黑", 
             serif;
        font-weight: normal;
      }
    </style>
</head>
<body>
<div class="header" align="center">
	<h2></h2>
	<hr>
</div>
<div class="pure-g">
	<div class="pure-u-1">
		<table class="pure-table pure-table-bordered" align="center" width="100%">
			<caption>资源表</caption>
			<thead>
				<tr>
					<th>层次</th><th>Token</th><th>时间</th><th>人民币</th>
				</tr>
			</thead>
			<tbody>
			{{range .Levels}}
				<tr>
					<td>{{.Level}}</td><td>{{.Token}}</td><td>{{.Time}}</td><td>{{.RMB}}</td>
				</tr>
			{{end}}
			</tbody>
		</table>
	</div>
</div>
</body>
</html>