# the code of huangyg

## 个人领域模型

ego是[通用个人领域模型](common.com.md)、[俱乐部](club.com.md)的分支版本，它最终会以软件形式发布。  

* [通用模型](common.com.md)
* [俱乐部](club.com.md)
* [ego设计方案](ego.com.md)
* [ego部署方案](cod.md)

具体概念可以参考[设计笔记](README.note.md)。

## git库

- raw：无意识的部分
    - log
        - food
        - health
    - data
    - src
        - raw.js
    - view
        - 各级时间段food、health的报表
- ego：有意识的部分
    - log
        - 各级时间段的计划小结metadata
    - data
        - 时间模版的metadata
        - contract的metadata
        - task的metadata
        - 内部账目的metadata
        - 各独立项目的metadata
    - src
        - time.js
        - task.js
    - view
        - 各级计划小结的markdown、html文件
        - contract、task、内部账目的报表
- blog：个人正规发布。可能根据各git托管网站的page格式重整：
    - 和用户名同名
    - 和个人域名同名
- draft：内部手稿，防止硬盘问题备份到私有库。
- x.sample: 练习范例
- com.origin: 共同体模型的雏形
- cod.template: 共同体部署方案的模版
- 独立个人项目，如PSMD
    - log
    - data
        - term、termset、error、knowledge的metadata
    - src
        - term.js
    - view


## 基本概念

- 物体|thing: 与知识图谱的thing定义相同。
- 主体|entity: 具有mate行为的物体(thing)。
    - meta: 认知自我，解释自己的思想和行为，察觉思想和行为中使用的知识（概念、定义、假设等等）。
        - 可实践的知识，可以表现为生效的协议、要约。
    - raw: entuity还没有认知的自身行为的集合。
- common: 具有protocol,spilit,joint三种基础行为的主体(entity)。
    - protocol：附有条件的行为。
        - 要约表示可实践的知识。
    - spilit分立，一个entity分立成为多个entity。
    - joint合并，多个entity合并产生一个entity。
- vat: 支持entity的思想和行为的知识（定义、概念、假设等等）的thing。
- ego: 通过创造vat、在vat中设立主体(entity)来认知的entity。
- 共同体|community：由多个主体joint合并而成的主体。


## 接口

- 门户页：写在个人域名dns，各种软件或纸质的个人简介、签名档。内容根据当时需要统筹规划。
- blog
- raw\view
- ego\view
- ego\contract
    - 要约的浏览、签署
        - gathering
        - PSMD委托
    - 要约的自动组合、对签

版权声明：

1. 本库作品版权归[黄勇刚](mailto:huangyg@mars22.com)所有。
2. 除非作品内特别声明，本库作品采用[署名-非商业性使用-相同方式共享 4.0 国际 (CC BY-NC-SA 4.0)](http://creativecommons.org/licenses/by-nc-sa/4.0/)进行许可。  
