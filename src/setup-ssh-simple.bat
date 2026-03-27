@echo off
chcp 65001 >nul
REM ========================================
REM 启用 ssh-agent 并添加密钥
REM 用法：右键 - 以管理员身份运行
REM ========================================

REM 第 1 步：启动 ssh-agent 服务
echo 启动 ssh-agent 服务...
sc config ssh-agent start=auto >nul 2>&1
net start ssh-agent >nul 2>&1
if %errorlevel% equ 0 (
    echo ssh-agent 已启动
) else (
    echo ssh-agent 可能已在运行
)

REM 第 2 步：添加密钥（请根据实际情况修改路径）
echo.
echo 添加密钥...

REM 选项 A：OpenSSH 格式密钥
if exist "C:\Users\hyg\.ssh\id_rsa" (
    ssh-add "C:\Users\hyg\.ssh\id_rsa"
    goto :verify
)

REM 选项 B：PPK 格式密钥（新版 Windows 支持）
if exist "D:\huangyg\Keys\hyg.ed25519.opensshkey" (
    ssh-add "D:\huangyg\Keys\hyg.ed25519.opensshkey"
    goto :verify
)

echo 未找到密钥文件，请检查路径
goto :end

:verify
echo.
echo 已加载的密钥:
ssh-add -l

:end
echo.
echo 完成
pause
