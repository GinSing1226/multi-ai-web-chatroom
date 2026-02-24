#!/bin/bash
# 自动化指令 - 完整流程
# Automation Command - Complete Flow
#
# 使用方法 / Usage:
#   ./auto-chat.sh --app deepseek --message "你好"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未找到 Node.js"
    echo "请先安装 Node.js: https://nodejs.org/"
    exit 1
fi

# 运行自动化指令
npx tsx auto/auto-chat-cdp.spec.ts "$@"
