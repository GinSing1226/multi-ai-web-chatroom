---
name: multi-AIweb-chatRoom-prod
description: Multi AI-Web Chatroom standalone app automation. Multi-AI comparison chatroom supports single input to multiple AI applications (web platforms), aggregating responses from all platforms. This skill automates the packaged Electron app (exe/app): (1) Sending messages to AI platforms (DeepSeek, ChatGPT, Gemini, etc.), (2) Asynchronously retrieving AI responses, (3) Managing conversations with active session restrictions. Requires standalone app running with --remote-debugging-port=9222. Ideal for AI agents like Claude Code to automate production app interactions.
---

# Multi AI-Web Chatroom Production Automation

## Quick Start

```bash
# Launch app with CDP enabled (required)
"Multi AI-Web Chatroom.exe" --remote-debugging-port=9222

# Send message
auto-send --app deepseek --message "Hello"

# Get output
auto-get --conversation-id "xxx" --format text
```

## Requirements

- **Standalone app**: Must be launched with `--remote-debugging-port=9222`
- **Node.js**: Required for running automation scripts
- **AI platforms logged in**: Must be logged in within the app

## Launching the App with CDP

### Windows
```batch
"Multi AI-Web Chatroom.exe" --remote-debugging-port=9222
```

### Linux/Mac
```bash
./multi-ai-web-chatroom --remote-debugging-port=9222
```

**Critical**: The `--remote-debugging-port=9222` flag is REQUIRED.

## Commands

### Send Message
```bash
auto-send --app deepseek --message "Your message"
```

### Get Output
```bash
auto-get --conversation-id "xxx" --format text
```

## Active Session Restriction

Only one active session at a time when AI is responding. Wait for completion before sending next message.

## Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| Cannot connect to CDP | App not running or CDP not enabled | Launch with `--remote-debugging-port=9222` |
| electronAPI not injected | App not fully loaded | Wait 3-5 seconds |
| ACTIVE_SESSION_EXISTS | AI responding | Wait for completion |

## Creating Launch Shortcuts

### Windows Batch File (start-app.bat)
```batch
@echo off
start "" "Multi AI-Web Chatroom.exe" --remote-debugging-port=9222
echo App started with CDP on port 9222
```

## Reference

For complete API documentation, see [references/api.md](references/api.md)
