@echo off
chcp 65001 >nul
echo ========================================
echo 配置 SSH Agent 服务
echo ========================================

REM ========================================
REM 第 1 步：启用 Windows ssh-agent 服务
REM ========================================
echo.
echo [步骤 1] 启用 ssh-agent 服务...

sc query ssh-agent | find "RUNNING" >nul
if %errorlevel% equ 0 (
    echo ssh-agent 服务已在运行
) else (
    echo 启动 ssh-agent 服务...
    sc config ssh-agent start=auto >nul
    net start ssh-agent
    if %errorlevel% equ 0 (
        echo ssh-agent 服务已启动
    ) else (
        echo 错误：启动 ssh-agent 服务失败，请以管理员身份运行此脚本
        goto :error
    )
)

REM ========================================
REM 第 2 步：添加密钥到 ssh-agent
REM ========================================
echo.
echo [步骤 2] 添加密钥到 ssh-agent...

REM 设置密钥文件路径（请根据实际情况修改）
set "PPK_FILE=C:\Users\hyg\.ssh\id_rsa.ppk"
set "OPENSSH_KEY=C:\Users\hyg\.ssh\id_rsa"

REM 检查是否有 OpenSSH 格式的密钥
if exist "%OPENSSH_KEY%" (
    echo 找到 OpenSSH 格式密钥：%OPENSSH_KEY%
    ssh-add "%OPENSSH_KEY%"
    if %errorlevel% equ 0 (
        echo 密钥已成功添加到 ssh-agent
    ) else (
        echo 错误：添加密钥失败
        goto :error
    )
) else if exist "%PPK_FILE%" (
    echo 找到 PuTTY 格式密钥：%PPK_FILE%
    echo 尝试使用 ssh-add 加载 PPK 文件...
    ssh-add "%PPK_FILE%"
    if %errorlevel% equ 0 (
        echo 密钥已成功添加到 ssh-agent
    ) else (
        echo.
        echo 提示：您的 ssh-add 不支持直接加载 PPK 文件
        echo 请使用 PuTTYgen 导出 OpenSSH 格式密钥：
        echo   1. 打开 PuTTYgen
        echo   2. 加载您的 .ppk 文件
        echo   3. 菜单 Conversions -^> Export OpenSSH key
        echo   4. 保存为 %OPENSSH_KEY%
        echo   5. 重新运行此脚本
        goto :error
    )
) else (
    echo 错误：未找到密钥文件
    echo 请检查以下路径是否存在：
    echo   - %OPENSSH_KEY%
    echo   - %PPK_FILE%
    goto :error
)

REM ========================================
REM 验证配置
REM ========================================
echo.
echo [验证] 检查 ssh-agent 配置...
ssh-add -l
if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo 配置完成！
    echo ========================================
) else (
    echo.
    echo 警告：无法列出 ssh-agent 中的密钥
)

goto :end

:error
echo.
echo ========================================
echo 配置过程中出现错误
echo ========================================
exit /b 1

:end
echo.
echo 按任意键退出...
pause >nul
