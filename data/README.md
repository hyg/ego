# ego data


## season metadata

### 命名

- yyyySn.yaml
  - yyyy: 年份
  - n: 季度

### 模版和范例
2024S2.yaml
```
year: 2024
season: 1
beginmonth: 3
beginday: 1
lastmonth: 6
lastday: 31
timetype:
  - name: work
  - name: free
  - name: discuss
  - name: learn
  - name: prepare
  - name: sleep
  - name: food
  - name: check
dayplan:
  1:
    supply:
      90: 1
      60: 2
      30: 2
    time:
      - beginhour: 04
        beginminute: 0
        amount: 15
        type: free
        name: 休整
   readme: |
      模版一采用静默工作方式。  
      希望讨论的提纲发到 [huangyg@mars22.com](mailto:huangyg@mars22.com)，通常安排在后面某天的早餐（5:15~5:59）或会议时间（6:00~6:45）。
  2:
    supply:
      195: 1
      60: 1
      90: 1
    time:
      - beginhour: 04
        beginminute: 0
        amount: 15
        type: free
        name: 休整
    readme: |
      工作的同时可以在线讨论。
time:
  supply:
    1: 30
    2: 15
    3: 2
    // dayplanid: amount
  alloc:
      PSMD:
        90: 1
        60: 3
        30: 2
      learn:
        90: 4
        60: 4
        30: 1 
      ego:
        90: 4
        60: 4
        30: 1 
      js:
        30: 8
        60: 4
todo:
  PSMD:
    - 30: todo what
```