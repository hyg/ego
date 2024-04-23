# task util

task.js
~~~
node task           : today draft to stat
node task all        : task metadata to alltask metadata
node task 2024       : draft to year stat
node task 20240416   : draft to day stat
node task 1          : diff date draft to stat
node task 20240101 20240401   : period draft to stat
~~~

task metadata
~~~
name: 
id: 
parent id: 0
start: 2015-01-01T00:00:00.000Z
dependencies:
    - id: 
path:
    - name:
      path:
readme: |
step:
  - time:
    name:
    status:
    readme: |
log: |
~~~
- path: 独立项目的子任务metadata文件，基于当前metadata文件所在位置的相对路径。

alltask metadata
~~~
time:
tasklist:
tasktree:
~~~
- tasklist是并列的，包括从draft中提取的日志、时间统计。
- tasktree是树形结构。

season metadata
~~~
year:
season:
dayplan:
time:
  in:
    1: 40
    2: 10
    3: 2
    // dayplanid: amount
  agreement:
    - name: contract1.deploy
      deadline: 2024-06-13 18:00:00
      budget:
        90: 2
        60: 8
        30: 4
    - name: contract2.modeling
      deadline: 2024-05-16 12:00:00
      budget:
        90: 3
        60: 2
        30: 2
    alloc:
      taskid1:
        90: 1
        60: 3
        30: 2
      taskid2:
        90: 4
        60: 4
        30: 1 
~~~