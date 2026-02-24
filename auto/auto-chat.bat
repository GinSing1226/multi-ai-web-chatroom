@echo off
REM 自动化指令 - 完整流程
REM Automation Command - Complete Flow

REM 使用方法 / Usage:
REM   auto-chat --app deepseek --message "你好"

REM 检查是否安装了 Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 错误：未找到 Node.js
    echo 请先安装 Node.js: https://nodejs.org/
    exit /b 1
)

REM 运行自动化指令
npx tsx auto/auto-chat-cdp.spec.ts %*
