# 自动操作 API 文档

本文档说明 Multi AI-Web Chatroom 的自动化操作接口，面向 AI Agent 设计。

## 前置要求

```bash
# 必须先启动应用
npm run dev
```

应用启动后监听 CDP 端口 9222，自动化指令通过此端口连接。

---

## 指令

### 发送消息 `auto:send`

向会话发送消息，立即返回基本信息。

```bash
npm run auto:send -- [参数]
```

**参数**：

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `--app` | string | 否 | `deepseek` | AI 应用 ID：`deepseek` `chatgpt` `gemini` `doubao` `glm` `kimi` `qwen` |
| `--message` | string | 否 | "你好，请介绍一下你自己" | 消息内容 |
| `--conversation-id` | string | 否 | 无 | 会话 ID，不指定则自动创建新会话 |

**行为逻辑**：
- 不指定 `--conversation-id`：创建新会话并发送消息（需无活跃会话）
- 指定 `--conversation-id`：向该历史会话发送消息，延续对话（需无活跃会话）

**限制**：
- ⚠️ **严格限制**：只要有活跃会话存在（AI 正在响应），就无法发送任何消息
- 必须等待当前活跃会话的 AI 响应完成后，才能发送下一条消息
- 活跃会话是指有消息状态为 `sending`、`waiting` 或 `outputting` 的会话

**返回**：
```json
{
  "success": true,
  "conversationId": "会话ID",
  "chatId": "对话ID",
  "conversationName": "会话名称",
  "filePath": "会话文件完整路径",
  "createTime": 1737700800000,
  "updateTime": 1737700800000,
  "aiApplications": ["deepseek"]
}
```

**示例**：
```bash
# 创建新会话并发送消息（无活跃会话时）
npm run auto:send -- --app deepseek --message "你好"

# 向历史会话发送消息，延续对话（无活跃会话时）
npm run auto:send -- --conversation-id abc123 --message "接着刚才的话题继续"
```

**错误**（活跃会话存在）：
```json
{
  "success": false,
  "error": "ACTIVE_SESSION_EXISTS",
  "message": "当前有活跃会话，无法操作",
  "activeConversationId": "当前活跃的会话ID",
  "requestedConversationId": "你指定的会话ID（如果有）"
}
```

**说明**：当 AI 正在响应时，活跃会话文件存在。此时无法发送新消息，需要等待 AI 响应完成。

---

### 获取输出 `auto:get`

获取会话的 AI 响应内容。

```bash
npm run auto:get -- [参数]
```

**参数**：

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `--conversation-id` | string | **是** | - | 会话 ID（从 `auto:send` 返回值获取） |
| `--chat-id` | string | 否 | 最新对话 | 对话 ID |
| `--app` | string | 否 | 全部 AI | 只获取指定 AI 的输出 |
| `--format` | string | 否 | `json` | 输出格式：`json` 或 `text` |

**返回（JSON 格式）**：
```json
{
  "conversationId": "xxx",
  "conversationName": "会话名称",
  "chatId": "yyy",
  "messages": [
    {
      "role": "user",
      "sender": "user",
      "content": "用户消息",
      "status": "success",
      "timestamp": 1737700800000
    },
    {
      "role": "assistant",
      "sender": "deepseek",
      "content": "AI响应内容",
      "status": "success",
      "timestamp": 1737700800000
    }
  ]
}
```

**返回（Text 格式）**：
```
会话 / Conversation: 会话名称 (xxx)
对话 / Chat: yyy
────────────────────────────────────────────────────────────

[1] 用户 / User
────────────────────────────────────────
用户消息
────────────────────────────────────────

[2] deepseek
────────────────────────────────────────
AI响应内容
────────────────────────────────────────
```

**示例**：
```bash
# 获取最新对话
npm run auto:get -- --conversation-id abc123

# 获取特定 AI 输出
npm run auto:get -- --conversation-id abc123 --app deepseek

# 文本格式（适合直接阅读）
npm run auto:get -- --conversation-id abc123 --format text
```

---

## 工作流

### 异步获取响应

```bash
# 1. 发送消息（立即返回）
npm run auto:send -- --app deepseek --message "解释量子计算"

# 2. 从返回的 JSON 获取 conversationId，稍后获取完整输出
npm run auto:get -- --conversation-id <返回的conversationId>
```

### 批量发送

```bash
# 注意：需要等待活跃会话完成后才能发送下一条
# 向同一个活跃会话发送多条消息
npm run auto:send -- --app deepseek --message "问题1"
# 等待完成后...
npm run auto:send -- --app deepseek --message "问题2"
# 等待完成后...
npm run auto:send -- --app deepseek --message "问题3"
```

### 直接读取文件

```bash
# 1. 发送消息
npm run auto:send -- --app deepseek --message "你好"

# 2. 从返回的 filePath 直接读取文件
cat <返回的filePath>
```

---

## 错误处理

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `❌ 无法连接到 CDP` | 应用未启动 | 运行 `npm run dev` |
| `❌ electronAPI 未注入` | 应用未完全加载 | 等待 3-5 秒后重试 |
| `❌ 会话不存在` | conversationId 错误 | 检查 ID 是否正确 |
| `ACTIVE_SESSION_EXISTS` | 有活跃会话（AI 正在响应） | 等待当前活跃会话完成后再发送 |

---

## 快速参考

### AI 应用 ID

| ID | 名称 |
|----|------|
| `deepseek` | DeepSeek / 深度求索 |
| `chatgpt` | ChatGPT |
| `gemini` | Google Gemini |
| `doubao` | 豆包 |
| `glm` | 智谱 GLM |
| `kimi` | Kimi |
| `qwen` | 通义千问 |

### 消息状态

| 状态 | 说明 |
|------|------|
| `sending` | 消息发送中 |
| `waiting` | 等待 AI 响应 |
| `outputting` | AI 输出中 |
| `success` | 完成 |
| `sendFailed` | 发送失败 |
| `outputTimeout` | 输出超时 |

---

## 注意事项

1. 确保应用已登录各 AI 平台
2. 所有会话自动持久化保存到 `data/sessions/` 目录
3. 不能同时发送过多消息，避免触发平台速率限制
4. 如果 AI 响应较慢，使用异步方式（`auto:send` + `auto:get`）
5. 活跃会话限制：任何时候只能有一个活跃会话（AI 正在响应的会话）
6. 创建新会话时，会话名称会自动生成（格式：`yyyy/m/d_会话ID前8位`）

---

## 完整示例

### 示例1：创建新会话并发送消息

```bash
# 1. 发送消息（创建新会话）
npm run auto:send -- --app deepseek --message "51+88=？"

# 返回：
# {
#   "success": true,
#   "conversationId": "0ek6oycripwhx12fb7seygiz6zolynqg",
#   "chatId": "au1eacvwhlf00jmzav13ufwrbnw6qjn6",
#   "conversationName": "2026/2/24_0ek6oycr",
#   "filePath": "data/sessions/2026224_0ek6oycr_2026-02-24_0ek6oycr.md",
#   ...
# }

# 2. 获取 AI 响应
npm run auto:get -- --conversation-id "0ek6oycripwhx12fb7seygiz6zolynqg" --format text
```

### 示例2：延续历史会话

```bash
# 向已有的会话发送新消息（延续对话）
npm run auto:send -- --conversation-id "fpvj6eiqb0r8vnlidfoueo06y9bdbwak" --message "接着刚才的话题继续"

# 获取响应
npm run auto:get -- --conversation-id "fpvj6eiqb0r8vnlidfoueo06y9bdbwak" --format text
```

### 示例3：错误处理

```bash
# 第一条消息发送成功
npm run auto:send -- --app deepseek --message "问题1"
# ✅ success: true

# 立即发送第二条（会被拒绝）
npm run auto:send -- --app deepseek --message "问题2"
# ❌ error: "ACTIVE_SESSION_EXISTS"
# 💡 等待 AI 响应完成后再试
```
