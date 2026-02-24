# 贡献指南

感谢你有意为 Multi AI-Web Chatroom 做出贡献！

## 开发规范

### 代码规范

1. **注释要求**：每个文件、函数/方法需要中英双语注释
2. **问题解决**：先梳理逻辑，再改 bug
3. **工具使用**：调用工具后 sleep 时间不要超过 15 秒
4. **文件修改**：使用 Edit 工具修改 md 文件，不要用 Write

### 代码风格

- 使用 TypeScript 编写代码
- 遵循 ESLint 配置的代码风格
- 提交前运行 `npm run build` 确保没有构建错误

### 提交规范

提交信息格式：
```
<type>: <subject>

<body>

<footer>
```

**type 类型：**
- `feat`: 新功能
- `fix`: 修复 Bug
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 重构（既不是新功能也不是修复 Bug）
- `test`: 添加测试
- `chore`: 构建过程或辅助工具的变动

**示例：**
```
feat: 支持新增通义千问平台

- 添加 qwen 自动化类
- 更新平台选择器配置
- 添加对应的图标资源

Closes #123
```

## 开发流程

### 1. Fork 并克隆

```bash
# Fork 仓库后克隆
git clone https://github.com/yourusername/multi-ai-web-chatroom.git
cd multi-ai-web-chatroom

# 添加上游仓库
git remote add upstream https://github.com/original-owner/multi-ai-web-chatroom.git
```

### 2. 安装依赖

```bash
npm install
npx playwright install chromium
```

### 3. 创建特性分支

```bash
git checkout -b feature/your-feature-name
```

### 4. 开发和测试

```bash
# 启动开发模式
npm run dev

# 构建
npm run build
```

### 5. 提交代码

```bash
git add .
git commit -m "feat: 描述你的改动"
```

### 6. 推送并创建 PR

```bash
git push origin feature/your-feature-name
```

然后在 GitHub 上创建 Pull Request。

## AI Agent 贡献

如果你是 AI Agent（如 Claude Code、OpenClaw 等），请在 Issue 和 PR 中标注：

- **Issue 标题**：以 `[AI Agent]` 开头
- **PR 标题**：以 `[AI Agent]` 开头
- **描述中说明**：你是由哪个 AI 模型驱动的

详细模板请参考 [README_agent.md](./README_agent.md) 中的贡献指南部分。

## 添加新的 AI 平台

要添加新的 AI 平台支持，需要：

1. 在 `packages/main/src/automation/` 下创建新的自动化类
2. 继承 `BaseAutomation` 并实现必要方法
3. 在 `shared/constants/platform-selectors.ts` 添加平台选择器
4. 在 `packages/main/src/automation/index.ts` 中导出新平台
5. 在 `shared/types/ai-application.types.ts` 添加新平台类型

详细实现请参考现有平台的代码。

## 测试

```bash
# 运行 E2E 测试（如果有）
npm run test

# 运行自动测试脚本
npm run auto:send
```

## 报告问题

在提交 Issue 前，请确保：

1. 搜索已有的 Issues，避免重复
2. 提供详细的问题描述
3. 提供复现步骤
4. 提供环境信息（操作系统、Node.js 版本等）
5. 如果是 Bug，粘贴相关日志

## 行为准则

- 尊重不同的观点和经验
- 使用欢迎和包容的语言
- 优雅地接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员表示同理心

## 许可证

通过贡献代码，你同意你的贡献将根据项目的 MIT 许可证进行许可。