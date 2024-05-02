set message="- task:PSMD  [error,knowledge metadata的placeholder升级](../../../draft/2024/05/20240502074500.md)\n- task:PSMD  [term metadata -> term html](../../../draft/2024/05/20240502093000.md)\n- task:ego  [把waitinglist前几名和次日可能的模版绑定结果写入日小结。](../../../draft/2024/05/20240502140000.md)\n- task:js  [测试](../../../draft/2024/05/20240502143000.md)\n- task:learn  [把git开发流程编写成批处理文件](../../../draft/2024/05/20240502160000.md)"
cd ..\..\ego
git add .
git commit -m %message%
git push github
git push coding
git push gitee
cd ..\PSMD
git add .
git commit -m %message%
git push github
git push codeberg
git push gitee
cd ..\blog
git add .
git commit -m %message%
git push github
git push codeberg
git push gitee
cd ..\draft
git add .
git commit -m %message%
git push github
git push codeberg
git push gitee
