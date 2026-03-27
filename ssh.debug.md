# SSH 调试记录 - 从 PuTTY 迁移到 OpenSSH

**日期**: 2026-03-27  
**问题**: 将 git SSH 配置从 PuTTY/plink+pageant 迁移到 OpenSSH+ssh-agent 后，`bun over` 命令执行 git push 失败

---

## 问题现象

执行 `bun over` 时，git 推送失败，错误信息：

```
git@gitee.com: Permission denied (publickey).
fatal: Could not read from remote repository.
```

---

## 环境信息

- **操作系统**: Windows 10/11 x64
- **Node.js**: v25.2.1
- **Git**: Git for Windows (包含 OpenSSH)
- **SSH 密钥**: `C:/Users/hyg/.ssh/id_ed25519` (带密码短语)
- **ssh-agent**: Windows 服务，运行中

---

## 调试过程

### 1. 初始尝试 - 设置 GIT_SSH_COMMAND 环境变量

**修改**: `util.js`

```javascript
process.env.GIT_SSH_COMMAND = 'ssh -o StrictHostKeyChecking=accept-new';
```

**结果**: ❌ 失败 - 仍然提示权限被拒绝

### 2. 使用 simple-git 的 .env() 方法

根据 simple-git 文档，使用 `.env()` 方法传递环境变量：

```javascript
const git = simpleGit(path, { config: ['core.autocrlf=false'] })
    .env({ ...process.env, GIT_SSH_COMMAND });
```

**结果**: ❌ 失败 - 仍然提示权限被拒绝

### 3. 检查 git 配置

发现 `.git/config` 中有 PuTTY 遗留配置：

```ini
[remote "gitee"]
    url = git@gitee.com:hyg/ego.git
    puttykeyfile = D:\\huangyg\\Keys\\hyg.rsa.8192b.privatekey.ppk
```

**修复**: 删除所有 `puttykeyfile` 配置项

**结果**: ❌ 失败 - 仍然提示权限被拒绝

### 4. 设置 SSH 配置文件

创建 `C:\Users\hyg\.ssh\config`：

```
Host gitee.com
    HostName gitee.com
    User git
    IdentityFile C:/Users/hyg/.ssh/id_ed25519
    IdentitiesOnly yes
    StrictHostKeyChecking accept-new
    AddKeysToAgent yes
    ForwardAgent yes
```

**结果**: ❌ 失败 - 仍然提示权限被拒绝

### 5. 设置 git 全局 SSH 配置

```bash
git config --global core.sshCommand "ssh -o StrictHostKeyChecking=accept-new"
```

**结果**: ❌ 失败 - 仍然提示权限被拒绝

### 6. 命令行测试

直接命令行执行 git push 可以工作（需要输入密码短语）：

```bash
cd /d D:\huangyg\git\ego
git push gitee master --dry-run
# 提示输入密码短语后成功
```

**结论**: SSH 配置正确，问题是 simple-git spawn 的子进程无法从控制台读取密码短语

### 7. 子进程测试

测试发现，使用 `cmd.exe /c` 和 `stdio: 'inherit'` 可以让子进程继承控制台输入：

```javascript
const { execSync } = require('child_process');
execSync('cmd.exe /c git push gitee master --dry-run', {
    cwd: '../../ego',
    encoding: 'utf8',
    stdio: 'inherit'
});
// 可以正常提示输入密码短语并完成推送
```

**结论**: 问题根源是 simple-git 使用 `child_process.spawn()` 时没有继承控制台的标准输入，导致 ssh 无法提示用户输入密码短语

---

## 问题根源

Windows 上 OpenSSH 的 ssh-agent 服务虽然运行着并缓存了密钥，但当密钥有密码短语时，ssh 需要提示用户输入密码。simple-git 使用 `child_process.spawn()` 启动 git 子进程时，默认没有继承控制台的标准输入（stdio 不是 'inherit'），导致：

1. ssh 进程无法显示密码提示
2. ssh 无法从用户接收密码输入
3. ssh-agent 无法提供解锁的密钥
4. 最终导致 "Permission denied (publickey)" 错误

---

## 已完成的修复

1. ✅ 删除 `.git/config` 中的 `puttykeyfile` 配置
2. ✅ 创建 `~/.ssh/config` 配置 SSH 连接参数
3. ✅ 设置 git 全局 `core.sshCommand` 配置
4. ✅ 修改 `util.js` 使用 `.env()` 方法传递环境变量
5. ⏳ 待完成：修改 `gitstep` 函数使用 `execSync` 处理 push

---

## 验证步骤

1. 确保 ssh-agent 服务运行：
   ```powershell
   Get-Service ssh-agent
   ```

2. 添加 SSH 密钥到 ssh-agent：
   ```bash
   ssh-add C:/Users/hyg/.ssh/id_ed25519
   ```

3. 验证密钥已加载：
   ```bash
   ssh-add -l
   ```

4. 测试 SSH 连接：
   ```bash
   ssh -T git@gitee.com
   ```

5. 运行 `bun over` 测试完整流程

---

## 参考资料

- [simple-git 文档 - Environment Variables](https://www.npmjs.com/package/simple-git#environment-variables)
- [Windows OpenSSH 文档](https://docs.microsoft.com/en-us/windows-server/administration/openssh/openssh_overview)
- [Git for Windows SSH 配置](https://github.com/git-for-windows/git/wiki/SSH-key-examples)

---

**更新时间**: 2026-03-27
