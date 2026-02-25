# 给 Agent 阅读的文档

> 本文档专为 AI Agent（如 Claude Code、OpenClaw 等）设计，帮助你快速了解项目、部署本地环境并进行开发贡献。

---

## 目录

1. [项目概述](#1-项目概述)
2. [安装与启动](#2-安装与启动)
3. [核心概念](#3-核心概念)
4. [主流程说明](#4-主流程说明)
5. [核心代码路径](#5-核心代码路径)
6. [IPC 接口](#6-ipc-接口)
7. [项目资源](#7-项目资源)
8. [贡献指南](#8-贡献指南)

---

## 1. 项目概述

**多AI对比聊天室** 是一个 Electron 桌面应用，使用 Playwright 网页自动化技术，让用户一次提问，同时获得多个 AI 平台的结果对比。

### 核心特性

- **文件驱动**：所有会话以 Markdown 文件形式存储在 `data/sessions/` 目录
- **IPC 通信**：通过 `window.electronAPI` 与主进程通信
- **异步操作**：发送消息是异步的，Agent 可以轮询会话文件获取结果
- **活跃会话管理**：同时只允许一个会话处于活跃状态，确保轮询不混乱

### 支持的 AI 平台

| ID | 名称 | 官网 |
|----|------|------|
| `chatgpt` | ChatGPT | [chatgpt.com](https://chatgpt.com) |
| `deepseek` | DeepSeek | [deepseek.com](https://www.deepseek.com) |
| `doubao` | 豆包 | [doubao.com](https://www.doubao.com) |
| `gemini` | Gemini | [gemini.google.com](https://gemini.google.com) |
| `glm` | 智谱清言 | [chatglm.cn](https://chatglm.cn) |
| `kimi` | Kimi | [moonshot.cn](https://kimi.moonshot.cn) |
| `qwen` | 通义千问 | [qianwen.aliyun.com](https://qianwen.aliyun.com) |

---

## 2. 安装与启动

### 环境要求

- Node.js >= 24.0.0
- npm >= 10.0.0
- Windows 10+ / macOS 10.15+ / Ubuntu 20.04+

### 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/GinSing1226/multi-ai-web-chatroom.git
cd multi-ai-web-chatroom

# 2. 安装依赖
npm install

# 3. 安装 Playwright 浏览器
npx playwright install chromium

# 4. 启动开发模式
npm run dev
```

### 常见启动问题

#### 问题 1：ELECTRON_RUN_AS_NODE 环境变量

**症状**：Electron 窗口无法正常加载，`window.electronAPI` 为 `undefined`

**原因**：`ELECTRON_RUN_AS_NODE=1` 会导致 Electron 以 Node.js 模式运行

**解决方案**：
```bash
# Windows PowerShell
$env:ELECTRON_RUN_AS_NODE=$null
npm run dev

# Windows CMD
set ELECTRON_RUN_AS_NODE=
npm run dev

# Linux/macOS
unset ELECTRON_RUN_AS_NODE
npm run dev
```

项目已在 `packages/main/src/index.ts` 中自动清理该环境变量，通常无需手动处理。

#### 问题 2：端口被占用

**症状**：启动失败，提示端口已被使用

**解决方案**：关闭其他 Electron 实例或修改端口配置

---

## 3. 核心概念

### 会话 (Conversation)

会话是对话的容器，包含：
- `conversationId`: 32位唯一标识符
- `conversationName`: 会话标题
- `description`: 会话描述
- `createTime`: 创建时间戳
- `updateTime`: 更新时间戳
- `aiApplicationBindings`: AI 应用绑定列表（包含 `platformConversationId`）

### 聊天 (Chat)

一个会话包含多轮对话（聊天），每轮聊天包含：
- 一条用户消息
- 多条 AI 消息（每个绑定的 AI 应用一条）
- 可选的总结消息

### 消息 (Message)

消息类型：
- `user`: 用户发送的消息
- `assistant`: AI 的回复
- `summary`: AI 总结

消息状态：
- `sending`: 正在发送
- `waiting`: 等待 AI 响应
- `success`: 成功获取回复
- `sendFailed`: 发送失败
- `outputTimeout`: 输出超时
- `outputFailed`: 输出失败

### 活跃会话 (Active Session)

**核心概念**：系统同时只允许一个会话处于活跃状态，确保不同 AI 应用、不同会话之间不串扰。

活跃会话有三种类型：
- `normal`: 用户正常发送消息的会话
- `title`: 第一轮对话完成后，自动生成标题的内部会话
- `summary`: 用户点击总结按钮触发的内部会话

当存在活跃会话时，以下行为受限：
- 在其他会话发送消息
- 新建会话
- 生成总结

活跃会话信息存储在 `data/ACTIVE_SESSION.md` 文件中。

---

## 4. 主流程说明

### 发送消息流程

详细流程请参考 [会话流程方案.md](./docs/会话流程方案.md)，简要流程如下：

```
1. 用户发送消息
   ↓
2. 创建用户消息，保存会话文件，立即返回
   ↓
3. 异步发送到 AI 平台
   - 判断是首次对话还是历史会话
   - 首次：导航到新会话页面
   - 历史：导航到 platformConversationId 对应的会话
   ↓
4. 添加轮询任务
   ↓
5. 轮询检查生成状态（每 2 秒）
   - isGenerating() 返回 true：继续等待
   - isGenerating() 返回 false：提取内容
   ↓
6. 提取 AI 响应内容
   - 创建 AI 消息对象
   - 保存会话文件
   ↓
7. 通知前端更新（MESSAGE_UPDATED 事件）
   ↓
8. 所有 AI 完成后移除活跃会话
```

### 活跃会话流程


1. **发送消息时**：写入活跃会话文件，类型为 `normal`
2. **第一轮对话完成**：启动生成标题任务，类型为 `title`
3. **用户点击总结**：启动总结任务，类型为 `summary`
4. **任务完成**：移除活跃会话文件，允许用户继续其他操作

### 内部任务流程

总结和标题生成使用 `InternalTaskType` 枚举区分：
- 临时会话ID格式：`internal_{type}_{timestamp}`
- 复用 AI 应用标签页（不创建新标签页）
- 轮询完成后更新目标会话的元数据或消息内容

---

## 5. 核心代码路径

### 主进程 (packages/main/src/)

| 文件路径 | 用途 | 关键内容 |
|---------|------|---------|
| `index.ts` | Electron 主进程入口 | 注册 IPC 处理器，清理环境变量 (第 23-40 行) |
| `services/conversation.service.ts` | 会话业务逻辑 | 发送消息、生成总结、标题生成 |
| `services/polling.service.ts` | 轮询服务 | 定时检查 AI 输出完成状态 |
| `services/browser.service.ts` | Playwright 浏览器管理 | 浏览器实例、页面管理、用户数据目录 (第 42-44 行) |
| `services/storage.service.ts` | 会话文件存储 | Markdown 文件读写，目录初始化 (第 32-47 行) |
| `services/active-session.service.ts` | 活跃会话状态管理 | 确保同时只有一个活跃会话 |
| `services/settings.service.ts` | 应用设置管理 | 配置读写、默认设置 |
| `automation/base.ts` | 平台自动化基类 | 定义自动化接口规范 |
| `automation/*.ts` | 各平台自动化实现 | chatgpt.ts, deepseek.ts, gemini.ts 等 |
| `ipc/conversations.handler.ts` | 会话 IPC 处理器 | 处理前端会话相关请求 |
| `ipc/settings.handler.ts` | 设置 IPC 处理器 | 处理前端设置相关请求 |

### 渲染进程 (packages/renderer/src/)

| 文件路径 | 用途 | 关键内容 |
|---------|------|---------|
| `App.tsx` | 主应用组件 | 路由配置 |
| `pages/ChatRoom/index.tsx` | 聊天室页面 | 消息展示、输入处理 |
| `pages/SessionList/index.tsx` | 会话列表页 | 会话列表、搜索 |
| `stores/conversation.store.ts` | 会话状态管理 | Zustand store |
| `components/common/MessageList.tsx` | 消息列表组件 | 消息渲染 |
| `components/common/MessageInput.tsx` | 消息输入组件 | 输入处理、发送 |

### 共享代码 (shared/)

| 文件路径 | 用途 | 关键内容 |
|---------|------|---------|
| `types/conversation.types.ts` | 会话类型定义 | Conversation, Chat, Message 接口 |
| `types/ai-application.types.ts` | AI 应用类型定义 | AiApplication 接口 |
| `types/settings.types.ts` | 设置类型定义 | AppSettings 接口 |
| `types/ipc.types.ts` | IPC 接口类型定义 | ElectronAPI 接口 (第 15-66 行) |
| `types/message.types.ts` | 消息类型定义 | MessageStatus 枚举 |
| `utils/conversation.util.ts` | 会话工具函数 | areAllAiOutputsComplete 等 (第 116-132 行) |
| `utils/file.util.ts` | 文件工具函数 | 文件读写、路径处理 |
| `constants/platform-selectors.ts` | 平台选择器常量 | 各平台的 DOM 选择器配置 |



---

## 6. IPC 接口

### 会话管理

```javascript
// 获取会话列表
const conversations = await window.electronAPI.conversations.list();

// 创建新会话
const conversation = await window.electronAPI.conversations.create(
  reservedConversationId,  // 可以为 null
  aiApplicationIds         // AI 应用 ID 数组
);

// 预分配会话（两阶段创建）
const result = await window.electronAPI.conversations.beginCreate();

// 取消预分配
await window.electronAPI.conversations.cancelCreate(conversationId);

// 获取会话详情
const conversation = await window.electronAPI.conversations.get(conversationId);

// 删除会话
await window.electronAPI.conversations.delete(conversationId);

// 发送消息
const updated = await window.electronAPI.conversations.sendMessage(
  conversationId,
  content
);

// 生成总结
await window.electronAPI.conversations.generateSummary(conversationId, chatId);

// 更新会话元数据
await window.electronAPI.conversations.updateMetadata(conversationId, {
  conversationName: "新标题",
  description: "新描述"
});

// 获取活跃会话
const activeSession = await window.electronAPI.conversations.getActiveSession();
// 返回: { conversationId, timestamp, type } | null
```

### 事件监听

```javascript
// 监听消息更新
const callback = (event, data) => {
  console.log('消息更新:', data.conversationId, data.chatId);
};

window.electronAPI.conversations.onMessageUpdated(callback);

// 移除监听器
window.electronAPI.conversations.removeMessageUpdatedListener(callback);
```

### AI 应用管理

```javascript
// 列出所有 AI 应用
const apps = await window.electronAPI.aiApplications.list();

// 更新 AI 应用
await window.electronAPI.aiApplications.update(id, {
  name: "新名称",
  timeout: 60000
});

// 检查 AI 应用状态
const status = await window.electronAPI.aiApplications.checkStatus(id);
```

### 设置管理

```javascript
// 获取设置
const settings = await window.electronAPI.settings.get();

// 更新设置
await window.electronAPI.settings.update({
  pollingInterval: 3000,
  theme: 'dark'
});
```

---

## 7. 项目资源

### 文档资源

| 文档 | 说明 |
|------|------|
| [README.md](./README.md) | 用户指南（中文） |
| [README_EN.md](./README_EN.md) | 用户指南（英文） |

### 技能文档 (ai-skill/)

该目录包含 AI Skill 技能文档，供 Agent 学习以实现自动化操作。具体内容请查看该目录下的文档。

### 自动化脚本 (auto/)

包含 Playwright 自动化脚本和相关配置。

---

## 8. 贡献指南

### Issue 提交

当你发现 Bug 或有功能建议时，请提交 Issue。

**作为 AI Agent，提交 Issue 时请：**
1. 在标题开头标注 `[AI Agent]`
2. 在正文说明你是由哪个 AI 模型驱动的（如 Claude Code、OpenClaw）
3. 详细描述问题或建议
4. 如果是 Bug，提供复现步骤和日志

**Issue 模板：**

```markdown
### AI Agent 信息
- 模型: Claude Code / OpenClaw / 其他
- 任务: 问题报告 / 功能建议

### 问题描述
[详细描述问题或建议]

### 复现步骤（如果是 Bug）
1. 步骤一
2. 步骤二
3. ...

### 预期行为
[描述预期应该发生什么]

### 实际行为
[描述实际发生了什么]

### 环境信息
- 操作系统:
- Node.js 版本:
- 应用版本:

### 日志
[粘贴相关日志]
```

### Pull Request 提交

当你有代码贡献时，请提交 Pull Request。

**作为 AI Agent，提交 PR 时请：**
1. 在标题开头标注 `[AI Agent]`
2. 在 PR 描述中说明你是由哪个 AI 模型驱动的
3. 详细说明修改内容和原因
4. 关联相关的 Issue（如果有）

**PR 模板：**

```markdown
### AI Agent 信息
- 模型: Claude Code / OpenClaw / 其他
- 任务类型: Bug 修复 / 功能开发 / 文档更新 / 重构

### 修改说明
[详细描述修改内容]

### 修改原因
[说明为什么做这些修改]

### 相关 Issue
Closes #[issue number]

### 测试
- [ ] 已测试修改的功能
- [ ] 已更新相关文档
- [ ] 已添加必要的注释

### 检查清单
- [ ] 代码符合项目规范（见 CLAUDE.md）
- [ ] 已添加中英双语注释
- [ ] 已测试多个平台（如适用）
```

### 开发规范

1. **代码注释**：每个文件、函数/方法需要中英双语注释
2. **工具使用**：调用工具后 sleep 时间不要超过 15 秒
3. **问题解决**：先梳理逻辑，再改 bug
4. **文件修改**：使用 Edit 工具修改 md 文件，不要用 Write

---

## 附录

### 会话文件格式

会话以 Markdown 文件形式存储，命名规则：`{标题}_yyyyMMdd_{会话id前8位}.md`

```yaml
---
conversationName: 会话标题
description: 会话描述
conversationId: abc123...
createTime: 1234567890
updateTime: 1234567890
aiApplicationBindings:
  - aiApplicationId: deepseek
    platformConversationId: 平台会话ID
---

<conversation>
  <chat id="chatId1">
    <message role="user" sender="user" id="msgId1" timestamp="1234567890">
      <content><![CDATA[用户消息内容]]></content>
    </message>
    <message role="assistant" sender="deepseek" id="msgId2" timestamp="1234567891" status="success">
      <content><![CDATA[AI 回复内容]]></content>
    </message>
  </chat>
</conversation>
```

### 数据存储位置

```
data/
├── sessions/              # 活跃会话文件
├── archived/              # 归档会话文件
├── conversations/
│   └── internal/          # 内部任务临时文件
├── browser-profile/       # 浏览器用户数据
└── ACTIVE_SESSION.md      # 活跃会话标记
```

---

## 相关链接

- [项目 GitHub](https://github.com/GinSing1226/multi-ai-web-chatroom)
- [Issues](https://github.com/GinSing1226/multi-ai-web-chatroom/issues)
- [Discussions](https://github.com/GinSing1226/multi-ai-web-chatroom/discussions)