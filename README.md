# 多AI对比聊天室

<div align="center">

一款跨平台的多AI聊天室（或称为AI竞技场），基于 AI 平台网页自动化操作，让你一次提问，同时获得多个 AI 平台的结果对比。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)](https://github.com/GinSing1226/multi-ai-web-chatroom)
[![Electron](https://img.shields.io/badge/Electron-40.6.0-47848f)](https://www.electronjs.org/)
[![Node](https://img.shields.io/badge/Node-%3E=24.0.0-green)](https://nodejs.org/)

[English](./README_EN.md) | 简体中文 | [给 Agent 阅读的文档](./README_agent.md)

</div>

---

## 简介

**多AI对比聊天室** 是一款基于 Electron 的桌面应用，通过网页自动化技术，让你同时向多个 AI 平台发送消息并聚合结果。

- 🚀 **一次输入，多方发送** - 同时向 ChatGPT、DeepSeek、Gemini、智谱清言等多个 AI 平台发送消息
- 📊 **横向对比结果** - 在一个界面中查看所有平台的回答，方便对比分析
- 💬 **连续对话** - 支持多轮对话，复用 AI 官方平台的会话历史
- 📁 **文件驱动** - 会话保存为 Markdown 文件，支持编辑、搜索，可被 Obsidian 等知识库关联
- 🔒 **隐私安全** - 所有数据存储在本地，使用你自己的 AI 账号，不上传任何服务器
- 🤖 **智能操作** - 封装了 AI Skill，支持 Claude Code、OpenClaw 等 Agent 自动操作

<img width="1911" height="1000" alt="image" src="https://github.com/user-attachments/assets/17cd2544-9bd0-4eb7-adcf-25571ab3caff" />


## 为什么需要这个工具？

### 传统方式的痛点

当你想针对某个问题对比多个 AI 的回答时，通常有两种方案：

**方案一：手动操作网页端**

| 步骤 | 操作 |
|------|------|
| 1 | 打开多个浏览器标签页 |
| 2 | 逐个复制粘贴相同的问题 |
| 3 | 等待每个平台的响应 |
| 4 | 手动切换标签页对比结果 |
| 5 | 分别保存各平台的对话记录 |
| 6 | 手动整合多个平台的输出 |

**痛点**：操作重复繁琐，无法快速留档整合。

**优点**：使用官方网页，自己的账号，足够安全。

---

**方案二：调用 API 或使用云产品**

通过 Agent 一次性请求多个 AI API，自动获取并总结输出。

**痛点**：
- 门槛高：需要购买额度、配置 Agent，不适合普通用户
- 隐私风险：会话记录经过第三方服务器，需要频繁导出

**优点**：自动化程度高，聚合体验好。

### 我们的解决方案

结合两者优势，提供**本地化 + 自动化**的对比方案：

| 特性 | 说明 |
|------|------|
| ✅ 自动发送 | 一个输入框，一次发送，所有平台同时响应 |
| ✅ 隐私安全 | 本地部署，使用官方网页 + 自己的账号，无服务器中转 |
| ✅ 文件驱动 | 会话保存为 MD 文档，可被知识库快捷关联 |
| ✅ 对比体验 | 一个界面展示所有回答，支持横排/竖排切换 |
| ✅ 快速聚合 | 一个话题聚合所有 AI 输出，支持多轮对话 |
| ✅ 快速总结 | 一键让 AI 自动总结多方观点 |
| ✅ 完全免费 | 使用网页版 AI，无需 API 费用 |

## 支持的 AI 平台

| 平台 | 状态 | 官网 |
|------|------|------|
| ChatGPT | ✅ 支持 | [chatgpt.com](https://chatgpt.com) |
| DeepSeek | ✅ 支持 | [deepseek.com](https://www.deepseek.com) |
| 豆包 | ✅ 支持 | [doubao.com](https://www.doubao.com) |
| Gemini | ✅ 支持 | [gemini.google.com](https://gemini.google.com) |
| 智谱清言 | ✅ 支持 | [chatglm.cn](https://chatglm.cn) |
| Kimi | ✅ 支持 | [moonshot.cn](https://kimi.moonshot.cn) |
| 通义千问 | ✅ 支持 | [qianwen.aliyun.com](https://qianwen.aliyun.com) |

> 💡 **首次使用提示**：应用会自动打开 Chrome 浏览器（官方 Chromium，由 Playwright 自动下载），请在浏览器中登录各 AI 平台账号。登录信息缓存在本地，不会上传到任何外部系统。

## 安装方式

### 方式一：下载安装包（推荐）

访问 [Releases](https://github.com/GinSing1226/multi-ai-web-chatroom/releases) 页面下载：

| 平台 | 文件格式 | 说明 |
|------|----------|------|
| Windows | `Multi AI-Web Chatroom Setup 0.1.0.exe` | NSIS 安装程序 |
| Windows | `win-unpacked/` | 免安装绿色版 |

**安装步骤**：
1. 下载 `Multi AI-Web Chatroom Setup 0.1.0.exe`
2. 双击运行安装程序
3. 选择安装目录（默认：`C:\Users\用户名\AppData\Local\Programs\multi-ai-web-chatroom`）
4. 完成安装后启动应用

> ⚠️ **注意**：macOS 和 Linux 版本需要开发者从源码自行构建，当前仅提供 Windows 预编译版本。

### 方式二：从源码运行

#### 前置要求

- Node.js >= 24.0.0
- npm >= 10.0.0

#### 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/GinSing1226/multi-ai-web-chatroom.git
cd multi-ai-web-chatroom

# 2. 安装项目依赖
npm install

# 3. 安装 Playwright 浏览器
npx playwright install chromium

# 4. 启动应用
npm run dev
```

## 使用指南

### 主流程

#### 1. 首次启动

应用主界面分为：
- **左侧**：会话列表、设置入口、归档入口
- **右侧**：对话区域

#### 2. 创建新会话

1. 点击「新建会话」按钮
2. 选择想要使用的 AI 平台（支持多选）
3. 点击「开始会话」

#### 3. 登录 AI 平台

首次使用某个 AI 平台时需要登录：

1. 应用会自动打开 Chrome 浏览器
2. 在浏览器中登录对应 AI 平台
3. 登录完成后返回应用发送消息（未登录时发送可能失败）
4. 浏览器会缓存登录信息，后续无需重复登录

#### 4. 发送消息

1. 在输入框中输入问题
2. 按 `Enter` 或点击发送按钮
3. 等待各平台响应（通常几秒到几十秒）
4. 响应完成后自动显示在界面上

#### 5. 查看对比结果

- **横排模式**：各平台回答并排显示，点击分页切换
- **竖排模式**：各平台回答上下排列，滚动查看

#### 6. 多轮对话

在会话中继续提问，应用会自动发送到平台对应会话（只要 AI 平台未删除对话，多轮对话阶段不会新建会话）。

#### 7. 总结对话

某次提问获得多个 AI 平台回复后，可点击「总结」按钮。应用会将本轮所有 AI 输出发给默认 AI 平台（可在「设置-智能玩法」中修改），然后提取并展示总结。

### 其它玩法

#### 设置

- **AI 应用**：控制 AI 应用的启用/禁用、名称、超时等待时间
- **智能玩法**：设置系统提示词和默认 AI 平台
- **参数设置**：轮询间隔、重试次数等时间参数
- **外观**：浅色主题 / 深色主题
- **语言**：中文 / 英文

#### 会话管理

- **编辑**：编辑会话的标题和描述
- **导出**：将会话文件复制到自定义路径
- **删除**：删除会话及本地文件

#### 归档

1. 悬浮会话的「...」，点击「归档」，会话进入归档管理
2. 点击左下角「归档」按钮，可查阅、导出、编辑归档的会话

#### 智能操作

应用封装了 AI Skill，支持 Agent 自动操作：

1. 将 `ai-skill/` 目录下的技能文档提供给你的 Agent
2. Agent 学习后可自动操作应用发送消息、获取结果

## 功能特性

### 核心功能

- ✅ 多平台同时发送消息
- ✅ 实时轮询获取 AI 响应
- ✅ Markdown 格式渲染
- ✅ 多轮对话
- ✅ 总结对话
- ✅ 会话文件管理
- ✅ 会话归档功能
- ✅ AI 智能操作

### 智能功能

- 🤖 **自动生成会话标题** - 根据对话内容自动生成标题和描述
- 🤖 **AI 总结** - 自动总结本轮对话各平台的观点
- 🤖 **AI 自动化操作** - 封装 AI Skill，支持自动发消息、获取结果

### 个性化设置

- 🎨 主题切换（浅色/深色）
- 🌍 语言切换（中文/英文）
- ⚙️ 轮询间隔、重试次数等参数可配置
- 📝 自定义总结提示词

## 项目结构

```
multi-ai-web-chatroom/
├── packages/
│   ├── main/          # Electron 主进程
│   └── renderer/      # React 渲染进程
├── shared/            # 共享代码
├── ai-skill/          # AI Skill 技能文档
├── auto/              # 自动化脚本
├── data/              # 本地数据存储
├── docs/              # 项目文档
└── scripts/           # 构建和工具脚本
```

## 技术栈

- **桌面框架**: [Electron](https://www.electronjs.org/)
- **前端框架**: [React](https://react.dev/)
- **自动化**: [Playwright](https://playwright.dev/)
- **样式方案**: [TailwindCSS](https://tailwindcss.com/)
- **状态管理**: [Zustand](https://github.com/pmndrs/zustand)
- **构建工具**: [Vite](https://vitejs.dev/) + electron-vite

## 未来规划

- 🔍 **深度思考、联网搜索开关控制** - 支持为各 AI 平台配置是否启用深度思考、联网搜索等功能
- 📎 **发送附件** - 支持发送图片、文档等附件给 AI 平台
- 🤖 **集成更多 AI 应用** - 添加更多 AI 平台支持

## 常见问题

### Q: 应用是免费的吗？

A: 是的，应用完全免费。通过网页自动化操作你自己的 AI 平台账号在官网网页中对话。

### Q: 我的数据安全吗？

A: 应用使用你本地的浏览器环境登录，所有账号信息存储在你的本地浏览器中。对话数据存储在你的 AI 账号里和本地，不会上传到任何服务器。

### Q: 应用的实现原理是什么？

A: 应用使用 Playwright 网页自动化技术，在后台控制浏览器访问各 AI 平台官网，模拟用户操作发送消息并获取回复。

### Q: 为什么有些平台响应很慢？

A: 响应速度取决于各平台的服务器和网络情况。你可以在「设置-参数设置」中调整轮询间隔。

### Q: 支持添加新的 AI 平台吗？

A: 目前支持的平台是固定的，但代码结构支持扩展。欢迎提交 PR 添加新平台。

### Q: 数据存储在哪里？

A: 所有数据存储在项目目录下的 `data/` 文件夹中：

```
data/
├── sessions/       # 会话文件
├── archived/       # 归档会话
└── browser-profile/  # 浏览器用户数据
```

## 责任声明

1. **本地运行**：本应用全程在本地运行，唯一的网络交互是打开 AI 平台网页发送消息和获取回复。发送内容可在你的 AI 账号中查看。

2. **风控风险**：本应用使用 Playwright 网页自动化技术，存在触发 AI 平台爬虫风控的风险。请充分理解相关风险后再使用本应用。

3. **禁止滥用**：禁止将本应用封装为 API，伪装成 Agent 的大模型供应商。若因滥用触发任何 AI 平台的惩罚，责任自负。

## 贡献指南

欢迎贡献代码、报告 Bug 或提出新功能建议！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交修改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 开源协议

本项目基于 [MIT License](LICENSE) 开源。

## 联系方式

- 提交 [Issue](https://github.com/GinSing1226/multi-ai-web-chatroom/issues)
- 发起 [Discussion](https://github.com/GinSing1226/multi-ai-web-chatroom/discussions)

## 致谢

感谢以下优秀的开源项目：

- [Electron](https://www.electronjs.org/) - 跨平台桌面应用框架
- [Playwright](https://playwright.dev/) - 浏览器自动化工具
- [React](https://react.dev/) - 用户界面库
- [TailwindCSS](https://tailwindcss.com/) - CSS 框架
- [Zustand](https://github.com/pmndrs/zustand) - 状态管理库
- [turndown](https://github.com/mixmark-io/turndown) - HTML 转 Markdown 库
- [react-markdown](https://github.com/remarkjs/react-markdown) - Markdown 渲染组件

---

⭐ 如果这个项目对你有帮助，请给个 Star 支持一下！
