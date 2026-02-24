#!/bin/bash
# 自动化指令 - 发送消息
# Automation Command - Send Message
#
# 使用方法 / Usage:
#   ./auto-send.sh --app deepseek --message "你好"
#   ./auto-send.sh --conversation-id xxx --message "测试"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未找到 Node.js"
    echo "请先安装 Node.js: https://nodejs.org/"
    exit 1
fi

# 运行自动化指令
npx tsx auto/auto-send-message.spec.ts "$@"
