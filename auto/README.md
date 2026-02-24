# 自动化指令 / Automation Commands

此文件夹包含面向 AI Agent 的自动化操作指令。

## 快速开始

### 前置要求

1. **安装 Node.js**（如果还没有）
   - 下载：https://nodejs.org/（推荐 LTS 版本）
   - 验证安装：`node --version`

2. **启动应用**
   ```bash
   npm run dev
   ```

3. **确保已登录 AI 平台**
   - DeepSeek、ChatGPT、Gemini 等需要在应用内登录

---

## 使用方式

### 方式一：简化命令（推荐）

#### Windows
```bash
# 发送消息
.\auto\auto-send.bat --app deepseek --message "你好"

# 获取输出
.\auto\auto-get.bat --conversation-id "xxx" --format text

# 完整流程（发送+等待）
.\auto\auto-chat.bat --app deepseek --message "解释量子计算"
```

#### Linux/Mac
```bash
# 发送消息
./auto/auto-send.sh --app deepseek --message "你好"

# 获取输出
./auto/auto-get.sh --conversation-id "xxx" --format text

# 完整流程（发送+等待）
./auto/auto-chat.sh --app deepseek --message "解释量子计算"
```

### 方式二：npm 脚本

```bash
npm run auto:send -- --app deepseek --message "你好"
npm run auto:get -- --conversation-id "xxx" --format text
npm run auto:chat -- --app deepseek --message "解释量子计算"
```

---

## 指令列表

### 发送消息 `auto-send-message.spec.ts`

向会话发送消息，立即返回基本信息。

### 获取输出 `auto-get-output.spec.ts`

获取会话的 AI 响应内容。

### 完整流程 `auto-chat-cdp.spec.ts`

发送消息并等待完整响应。

---

## AI Agent 集成

Claude Code 等工具可以直接使用这些指令：

```bash
cd /path/to/Multi-AI-Web-Chatroom
auto-send --app deepseek --message "你好"
```

## 详细文档

完整 API 文档请参考：[自动操作说明.md](./自动操作说明.md)
