# Multi AI Chatroom

<div align="center">

A cross-platform multi-AI chatroom (AI Arena) based on web automation, allowing you to ask questions once and get comparative results from multiple AI platforms simultaneously.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)](https://github.com/yourusername/multi-ai-web-chatroom)
[![Electron](https://img.shields.io/badge/Electron-40.6.0-47848f)](https://www.electronjs.org/)
[![Node](https://img.shields.io/badge/Node-%3E=24.0.0-green)](https://nodejs.org/)

English | [简体中文](./README.md) | [Documentation for Agents](./README_agent.md)

</div>

---

## Introduction

**Multi AI Chatroom** is a desktop application based on Electron that uses web automation technology to send messages to multiple AI platforms simultaneously and aggregate results.

- 🚀 **One Input, Multiple Platforms** - Send messages to ChatGPT, DeepSeek, Gemini, GLM, and more simultaneously
- 📊 **Comparative Results** - View all platform responses in one interface for easy comparison
- 💬 **Continuous Conversations** - Support multi-turn dialogue using official AI platform session history
- 📁 **File-Driven** - Conversations saved as Markdown files, editable and searchable, integrable with Obsidian and other knowledge bases
- 🔒 **Privacy First** - All data stored locally, uses your own AI accounts, no server uploads
- 🤖 **Smart Operations** - Embedded AI Skills for automated operations by Claude Code, OpenClaw, and other Agents

<img width="1911" height="1000" alt="image" src="https://github.com/user-attachments/assets/1592a527-ea3d-467d-9511-3d2e95fd2fc3" />


## Why This Tool?

### Pain Points of Traditional Methods

When comparing responses from multiple AIs, you typically have two options:

**Option 1: Manual Web Operation**

| Step | Action |
|------|--------|
| 1 | Open multiple browser tabs |
| 2 | Copy and paste questions to each platform |
| 3 | Wait for each platform's response |
| 4 | Manually switch tabs to compare results |
| 5 | Save conversation records separately |
| 6 | Manually consolidate outputs from multiple platforms |

**Pain Points**: Repetitive operations, difficult to archive and integrate.

**Advantage**: Uses official websites, your accounts, secure enough.

---

**Option 2: API Calls or Cloud Products**

Use an Agent to request multiple AI APIs at once and automatically get summarized outputs.

**Pain Points**:
- High barrier: Requires purchasing credits, configuring agents, not suitable for average users
- Privacy risk: Conversation records pass through third-party servers, frequent exports needed

**Advantage**: High automation, good aggregation experience.

### Our Solution

Combining both advantages, providing a **localized + automated** comparison solution:

| Feature | Description |
|---------|-------------|
| ✅ Auto Send | One input box, one send, all platforms respond simultaneously |
| ✅ Privacy First | Local deployment, uses official websites + your accounts, no server relay |
| ✅ File Driven | Conversations saved as MD documents, easily linked to knowledge bases |
| ✅ Comparison Experience | One interface shows all responses, supports horizontal/vertical layout |
| ✅ Quick Aggregation | One topic aggregates all AI outputs, supports multi-turn dialogue |
| ✅ Quick Summary | One-click AI summary of multiple viewpoints |
| ✅ Completely Free | Uses web-based AI, no API fees |

## Supported AI Platforms

| Platform | Status | Official Site |
|----------|--------|---------------|
| ChatGPT | ✅ Supported | [chatgpt.com](https://chatgpt.com) |
| DeepSeek | ✅ Supported | [deepseek.com](https://www.deepseek.com) |
| Doubao | ✅ Supported | [doubao.com](https://www.doubao.com) |
| Gemini | ✅ Supported | [gemini.google.com](https://gemini.google.com) |
| GLM | ✅ Supported | [chatglm.cn](https://chatglm.cn) |
| Kimi | ✅ Supported | [moonshot.cn](https://kimi.moonshot.cn) |
| Qwen | ✅ Supported | [qianwen.aliyun.com](https://qianwen.aliyun.com) |

> 💡 **First-time Tip**: The app will automatically open a Chrome browser (official Chromium, auto-downloaded by Playwright). Please log in to each AI platform in the browser. Login information is cached locally and will not be uploaded to any external system.

## Installation

### Option 1: Download Installer (Recommended)

Visit [Releases](https://github.com/yourusername/multi-ai-web-chatroom/releases) to download:

| Platform | File Format | Notes |
|----------|-------------|-------|
| Windows | `Multi AI-Web Chatroom Setup 0.1.0.exe` | NSIS installer |
| Windows | `win-unpacked/` | Portable version (no installation) |

**Installation Steps**:
1. Download `Multi AI-Web Chatroom Setup 0.1.0.exe`
2. Double-click to run the installer
3. Choose installation directory (default: `C:\Users\Username\AppData\Local\Programs\multi-ai-web-chatroom`)
4. Launch the app after installation completes

> ⚠️ **Note**: macOS and Linux versions need to be built from source by developers. Currently, only Windows pre-built version is available.

### Option 2: Run from Source

#### Prerequisites

- Node.js >= 24.0.0
- npm >= 10.0.0

#### Installation Steps

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/multi-ai-web-chatroom.git
cd multi-ai-web-chatroom

# 2. Install dependencies
npm install

# 3. Install Playwright browser
npx playwright install chromium

# 4. Start the application
npm run dev
```

## Usage Guide

### Main Workflow

#### 1. First Launch

The main interface is divided into:
- **Left**: Session list, settings, archive
- **Right**: Conversation area

#### 2. Create New Session

1. Click the "New Session" button
2. Select AI platforms you want to use (multiple selection supported)
3. Click "Start Session"

#### 3. Login to AI Platforms

First-time use of an AI platform requires login:

1. The app will automatically open a Chrome browser
2. Log in to the corresponding AI platform in the browser
3. Return to the app to send messages after login (sending may fail if not logged in)
4. The browser caches login information, no need to log in again later

#### 4. Send Message

1. Enter your question in the input box
2. Press `Enter` or click the send button
3. Wait for platform responses (usually a few to tens of seconds)
4. Responses automatically display when complete

#### 5. View Comparative Results

- **Horizontal Mode**: Platform responses displayed side by side, switch via pagination
- **Vertical Mode**: Platform responses arranged vertically, scroll to view

#### 6. Multi-Turn Conversation

Continue asking questions in the session, the app will automatically send to the platform's corresponding session (won't create new session as long as the platform hasn't deleted the conversation).

#### 7. Summary Conversation

After receiving responses from multiple AI platforms, click the "Summary" button. The app will send all AI outputs from this round to the default AI platform (configurable in "Settings - Smart Features"), then extract and display the summary.

### Other Features

#### Settings

- **AI Applications**: Control enable/disable, name, timeout for AI applications
- **Smart Features**: Set system prompts and default AI platform
- **Parameter Settings**: Polling interval, retry count, etc.
- **Appearance**: Light theme / Dark theme
- **Language**: Chinese / English

#### Session Management

- **Edit**: Edit session title and description
- **Export**: Copy session file to custom path
- **Delete**: Delete session and local files

#### Archive

1. Hover over a session's "..." and click "Archive", session enters archive management
2. Click the "Archive" button in bottom left to view, export, edit archived sessions

#### Smart Operations

The app has embedded AI Skills for Agent automation:

1. Provide skill documents from `ai-skill/` directory to your Agent
2. After learning, the Agent can automatically operate the app to send messages and get results

## Features

### Core Features

- ✅ Send messages to multiple platforms simultaneously
- ✅ Real-time polling for AI responses
- ✅ Markdown rendering
- ✅ Multi-turn conversations
- ✅ Conversation summarization
- ✅ Session file management
- ✅ Session archiving
- ✅ AI smart operations

### Smart Features

- 🤖 **Auto Generate Session Title** - Generate title and description based on conversation content
- 🤖 **AI Summary** - Automatically summarize viewpoints from all platforms in current round
- 🤖 **AI Automation** - Embedded AI Skills for automatic message sending and result retrieval

### Personalization

- 🎨 Theme switching (Light/Dark)
- 🌍 Language switching (Chinese/English)
- ⚙️ Configurable polling interval, retry count, etc.
- 📝 Custom summary prompts

## Project Structure

```
multi-ai-web-chatroom/
├── packages/
│   ├── main/          # Electron main process
│   └── renderer/      # React renderer process
├── shared/            # Shared code
├── ai-skill/          # AI Skill documentation
├── auto/              # Automation scripts
├── data/              # Local data storage
├── docs/              # Project documentation
└── scripts/           # Build and utility scripts
```

## Tech Stack

- **Desktop Framework**: [Electron](https://www.electronjs.org/)
- **Frontend Framework**: [React](https://react.dev/)
- **Automation**: [Playwright](https://playwright.dev/)
- **Styling**: [TailwindCSS](https://tailwindcss.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Build Tools**: [Vite](https://vitejs.dev/) + electron-vite

## FAQ

### Q: Is the app free?

A: Yes, the app is completely free. It uses web automation to operate your own AI platform accounts on official websites.

### Q: Is my data secure?

A: The app uses your local browser environment for login. All account information is stored in your local browser. Conversation data is stored in your AI account and locally, never uploaded to any server.

### Q: How does the app work?

A: The app uses Playwright web automation technology to control a browser in the background, accessing AI platform official websites, simulating user actions to send messages and retrieve responses.

### Q: Why are some platforms slow to respond?

A: Response speed depends on each platform's server and network conditions. You can adjust the polling interval in "Settings - Parameter Settings".

### Q: Can I add new AI platforms?

A: Currently supported platforms are fixed, but the code structure supports extension. PRs are welcome to add new platforms.

### Q: Where is data stored?

A: All data is stored in the `data/` folder in the project directory:

```
data/
├── sessions/       # Session files
├── archived/       # Archived sessions
└── browser-profile/  # Browser user data
```

## Disclaimer

1. **Local Execution**: This app runs entirely locally. The only network interaction is opening AI platform websites to send messages and retrieve responses. Sent content can be viewed in your AI accounts.

2. **Risk Control**: This app uses Playwright web automation technology, which may trigger anti-crawling measures on AI platforms. Please fully understand the risks before using.

3. **Prohibited Abuse**: It is prohibited to wrap this app as an API, masquerading as an LLM provider for agents. If abuse triggers penalties from any AI platform, you assume full responsibility.

## Contributing

Contributions, bug reports, and feature suggestions are welcome!

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is open source under the [MIT License](LICENSE).

## Contact

- Submit [Issue](https://github.com/yourusername/multi-ai-web-chatroom/issues)
- Start [Discussion](https://github.com/yourusername/multi-ai-web-chatroom/discussions)

## Acknowledgments

Thanks to these excellent open source projects:

- [Electron](https://www.electronjs.org/) - Cross-platform desktop application framework
- [Playwright](https://playwright.dev/) - Browser automation tool
- [React](https://react.dev/) - User interface library
- [TailwindCSS](https://tailwindcss.com/) - CSS framework
- [Zustand](https://github.com/pmndrs/zustand) - State management library

---

⭐ If this project helps you, please give it a Star!
