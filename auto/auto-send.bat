@echo off
REM 自动化指令 - 发送消息
REM Automation Command - Send Message

REM 使用方法 / Usage:
REM   auto-send --app deepseek --message "你好"
REM   auto-send --conversation-id xxx --message "测试"

REM 检查是否安装了 Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 错误：未找到 Node.js
    echo 请先安装 Node.js: https://nodejs.org/
    exit /b 1
)

REM 运行自动化指令
npx tsx auto/auto-send-message.spec.ts %*
