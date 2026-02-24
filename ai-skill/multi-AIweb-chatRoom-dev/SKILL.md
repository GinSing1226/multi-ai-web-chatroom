---
name: multi-AIweb-chatRoom-dev
description: Multi AI-Web Chatroom development automation. Multi-AI comparison chatroom supports single input to multiple AI applications (web platforms), aggregating responses from all platforms. This skill automates the product during development: (1) Sending messages to AI platforms (DeepSeek, ChatGPT, Gemini, etc.), (2) Asynchronously retrieving AI responses, (3) Managing conversations with active session restrictions. Requires app running with npm run dev on localhost:9222 (CDP port). Ideal for AI agents like Claude Code.
---

# Multi AI-Web Chatroom Development Automation

## Quick Start

```bash
# Send message
auto-send --app deepseek --message "Hello"

# Get output
auto-get --conversation-id "xxx" --format text

# Complete flow (send + wait)
auto-chat --app deepseek --message "Explain quantum computing"
```

## Requirements

- **App running**: `npm run dev` must be active
- **CDP port**: 9222 (automatically enabled in dev mode)
- **Node.js**: Required for tsx execution
- **AI platforms**: Must be logged in within the app

## Core Commands

### Send Message

Send message to conversation, returns basic info immediately.

```bash
auto-send --app deepseek --message "Your message"
```

**Parameters**:
- `--app`: AI application ID (deepseek, chatgpt, gemini, doubao, glm, kimi, qwen)
- `--message`: Message content
- `--conversation-id`: Optional, specify existing conversation to continue

**Returns**:
```json
{
  "success": true,
  "conversationId": "xxx",
  "chatId": "yyy",
  "conversationName": "Name",
  "filePath": "data/sessions/...",
  "aiApplications": ["deepseek"]
}
```

### Get Output

Retrieve AI response content.

```bash
auto-get --conversation-id "xxx" --format text
```

**Parameters**:
- `--conversation-id`: Required, conversation ID
- `--format`: Output format (json/text)
- `--app`: Optional, filter by specific AI
- `--chat-id`: Optional, specific chat ID

## Active Session Restriction

**Critical**: Only one active session at a time (when AI is responding).

If active session exists, sending returns error:
```json
{
  "success": false,
  "error": "ACTIVE_SESSION_EXISTS",
  "activeConversationId": "xxx"
}
```

**Solution**: Wait for AI response to complete before sending next message.

## Workflow Examples

### Create New Conversation

```bash
auto-send --app deepseek --message "What is 123 + 456?"
```

### Continue Existing Conversation

```bash
auto-send --conversation-id "fpvj6eiqb0r8vnlidfoueo06y9bdbwak" --message "Continue explaining"
auto-get --conversation-id "fpvj6eiqb0r8vnlidfoueo06y9bdbwak" --format text
```

### Batch Pattern

```bash
# Send first message
auto-send --app deepseek --message "Question 1"
# Wait for completion...
# Send second message
auto-send --conversation-id "xxx" --message "Question 2"
```

## Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| Cannot connect to CDP | App not running | Run `npm run dev` |
| electronAPI not injected | App loading | Wait 3-5 seconds |
| ACTIVE_SESSION_EXISTS | AI responding | Wait for completion |
| Conversation not found | Invalid ID | Check conversationId |

## Implementation Details

Scripts use Playwright CDP connection:
- CDP URL: `http://localhost:9222`
- Connection: `chromium.connectOverCDP(wsUrl)`
- Scripts location: `auto/*.spec.ts`

## Reference

For complete API documentation, see [references/api.md](references/api.md)