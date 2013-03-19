for(var i = 0; i < 5; i++) { var scriptId = 'u' + i; window[scriptId] = document.getElementById(scriptId); }

$axure.eventManager.pageLoad(
function (e) {

});

u3.style.cursor = 'pointer';
$axure.eventManager.click('u3', function(e) {

if (true) {

	self.location.href='http://weibo.com/huangyg';

}
});

u4.style.cursor = 'pointer';
$axure.eventManager.click('u4', function(e) {

if (true) {

	self.location.href='http://blog.sina.com.cn/mars22';

}
});
gv_vAlignTable['u1'] = 'top';gv_vAlignTable['u2'] = 'top';