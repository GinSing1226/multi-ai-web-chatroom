#!/bin/bash
# 自动化指令 - 获取输出
# Automation Command - Get Output
#
# 使用方法 / Usage:
#   ./auto-get.sh --conversation-id xxx
#   ./auto-get.sh --conversation-id xxx --format text

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未找到 Node.js"
    echo "请先安装 Node.js: https://nodejs.org/"
    exit 1
fi

# 运行自动化指令
npx tsx auto/auto-get-output.spec.ts "$@"
