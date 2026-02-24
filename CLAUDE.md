# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Core / 核心规范

1. 用中文回复用户
2. 每个文件、函数/方法做好注释，备注用途等关键信息（中英双语备注）
3. 调用工具后，sleep时间不要超过15s
4. 先梳理逻辑，再改bug
5. 善用工具与技能解决问题
6. 用edit去修改md文件，不要用write

## Project Overview / 项目概述

Multi AI-Web Chatroom 是一个 Electron 桌面应用，使用 Playwright 自动化多个 AI 平台（ChatGPT、DeepSeek、Gemini 等），允许用户发送一条消息并聚合所有平台的响应。

## Architecture / 架构

### Monorepo Structure / 单体仓库结构

```
multi-ai-web-chatroom/
├── packages/
│   ├── main/           # Electron 主进程 / Main process
│   ├── renderer/       # React 渲染进程 / Renderer process
│   └── cli/            # CLI 工具 / CLI tool
├── shared/             # 共享类型和工具 / Shared types & utils
├── data/               # 本地数据存储 / Local data storage
│   ├── conversations/  # 会话文件 / Conversation files
│   └── ACTIVE_SESSION.md  # 活跃会话标记 / Active session marker
├── log/                # 日志文件 / Log files
└── scripts/            # 构建和开发脚本 / Build & dev scripts
```

### Key Components / 核心组件

#### Main Process (packages/main/src/)
- **index.ts** - Electron 主进程入口，注册 IPC 处理器
- **services/**
  - **conversation.service.ts** - 会话业务逻辑（发送消息、生成总结、标题生成）
  - **polling.service.ts** - 轮询 AI 平台输出
  - **browser.service.ts** - Playwright 浏览器和页面管理
  - **storage.service.ts** - 会话文件存储（Markdown 格式）
  - **active-session.service.ts** - 活跃会话状态管理（同时只允许一个会话活跃）
  - **settings.service.ts** - 应用设置管理
- **automation/** - 各 AI 平台的自动化脚本（base.ts + chatgpt.ts/deepseek.ts/gemini.ts 等）
- **ipc/** - IPC 通信处理器

#### Renderer Process (packages/renderer/src/)
- **App.tsx** - 主应用组件，路由配置
- **pages/**
  - **SessionList/** - 会话列表页（左侧边栏）
  - **ChatRoom/** - 聊天室页（右侧主区域）
- **components/** - UI 组件（MessageList、MessageInput、AiApplicationSelector 等）
- **stores/** - Zustand 状态管理
- **i18n/** - 国际化（中文/英文）

#### Shared (shared/)
- **types/** - TypeScript 类型定义
- **utils/** - 共享工具函数
- **constants/** - 平台选择器常量

### Data Flow / 数据流

1. **发送消息流程**：
   - 用户输入 → renderer 调用 `electronAPI.conversations.sendMessage()`
   - main 进程创建 Chat 和用户消息
   - 为每个 AI 应用创建初始消息（status: 'sending'）
   - 异步调用 `sendToAiPlatformsAsync()` 在后台发送
   - 通过 Playwright 自动化访问各 AI 平台网页
   - 添加到轮询服务 `pollingService.addTask()`
   - 轮询服务定时检查 AI 输出完成状态
   - 完成后更新消息内容，通过 IPC 事件通知前端

2. **内部任务流程**（总结、标题生成）：
   - 创建临时会话文件（保存在 `data/conversations/internal/`）
   - 复用 AI 应用标签页（不创建新标签页）
   - 使用临时 conversationId 占用活跃会话状态
   - 轮询完成后更新目标会话的元数据或消息内容

3. **活跃会话管理**：
   - 同一时间只允许一个会话处于活跃状态
   - 用户发送第一条消息时设置活跃会话
   - 所有 AI 完成响应后自动清除活跃会话
   - 内部任务（总结、标题生成）也会占用活跃会话

### Conversation File Format / 会话文件格式

会话以 Markdown 文件形式存储在 `data/conversations/`，命名规则：`{标题}_yyyyMMdd_{会话id前8位}.md`

文件结构：
```yaml
---
conversationName: 会话标题
description: 会话描述
conversationId: 32位小写字母和数字
createTime: 创建时间戳
updateTime: 更新时间戳
aiApplicationBindings:
  - aiApplicationId: deepseek
    platformConversationId: AI平台的会话ID
---

<conversation>
  <chat id="chatId">
    <message role="user|assistant|summary" sender="aiApplicationId" id="messageId" timestamp="时间戳">
      <content><![CDATA[消息内容]]></content>
    </message>
  </chat>
</conversation>
```

## Development / 开发

### Common Commands / 常用命令

```bash
# 安装依赖 / Install dependencies
npm install

# 安装 Playwright 浏览器 / Install Playwright browser
npx playwright install chromium

# 启动开发模式 / Start dev mode
npm run dev

# 构建 / Build
npm run build

# CLI 工具 / CLI tool
npm run cli                # 启动 CLI
npm run cli:start          # 启动应用并等待
npm run cli:send           # 发送消息
npm run cli:get-output     # 获取输出
npm run cli:search         # 搜索会话
npm run logs               # 查看日志
```

### Environment Requirements / 环境要求

- Node.js >= 24.0.0
- npm >= 10.0.0
- Windows 10+, macOS 10.15+, Ubuntu 20.04+

### Configuration / 配置

- **electron.vite.config.ts** - Electron + Vite 构建配置
- **tailwind.config.cjs** - TailwindCSS 样式配置
- **postcss.config.cjs** - PostCSS 配置
- **playwright.config.ts** - Playwright E2E 测试配置

### Important Notes / 重要说明

1. **活跃会话限制**：系统同时只允许一个会话处于活跃状态，确保不同 AI 应用、不同会话之间不串扰
2. **消息状态流转**：sending → waiting → success/failed/sendFailed/outputTimeout
3. **平台会话ID**：每个 AI 应用绑定会保存其平台的会话ID，用于后续直接访问历史会话
4. **内部任务**：总结和标题生成使用 `InternalTaskType` 枚举区分，临时会话ID格式为 `internal_{type}_{timestamp}`

## Common Issues / 常见问题

### ⚠️ Electron 启动问题：ELECTRON_RUN_AS_NODE 环境变量

**症状**：Electron 窗口无法正常加载，`window.electronAPI` 为 `undefined`，preload 脚本未执行

**原因**：`ELECTRON_RUN_AS_NODE=1` 环境变量会导致 Electron 以 Node.js 模式运行

**解决方案**：

1. **项目已自动处理**：在 `packages/main/src/index.ts` 中已添加环境变量清理代码
2. **手动清理**（如果仍有问题）：

   ```bash
   # Linux/macOS
   unset ELECTRON_RUN_AS_NODE
   npm run dev

   # Windows PowerShell
   $env:ELECTRON_RUN_AS_NODE=$null
   npm run dev

   # Windows CMD
   set ELECTRON_RUN_AS_NODE=
   npm run dev
   ```

### 轮询服务 / Polling Service

轮询服务负责定时检查 AI 平台是否完成输出：
- 默认轮询间隔：2秒（可在设置中配置 1-10000秒）
- 失败重试次数：3次（可配置 0-10次）
- 判断完成优先级：停止按钮消失 + 发送按钮显示 → 消息容器出现新内容 + 10秒内无变化

### AI 应用自动化 / AI Application Automation

每个 AI 应用都有对应的自动化类，继承自 `BaseAutomation`：
- `navigateToNewSession()` - 导航到新会话
- `navigateToSession(id)` - 导航到指定历史会话
- `sendMessage(content)` - 发送消息
- `isGenerating()` - 检查是否正在生成
- `extractResponse()` - 提取 AI 响应内容
- `getCurrentConversationId()` - 获取当前页面会话ID

平台选择器定义在 `shared/constants/platform-selectors.ts`
