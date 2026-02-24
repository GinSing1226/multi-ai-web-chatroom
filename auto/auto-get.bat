@echo off
REM 自动化指令 - 获取输出
REM Automation Command - Get Output

REM 使用方法 / Usage:
REM   auto-get --conversation-id xxx
REM   auto-get --conversation-id xxx --format text

REM 检查是否安装了 Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 错误：未找到 Node.js
    echo 请先安装 Node.js: https://nodejs.org/
    exit /b 1
)

REM 运行自动化指令
npx tsx auto/auto-get-output.spec.ts %*
