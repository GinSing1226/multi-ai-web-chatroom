/**
 * 获取输出指令
 * Get output command
 *
 * 功能 / Feature:
 * 获取指定会话的 AI 响应内容
 * Get AI response content from specified conversation
 *
 * 使用场景 / Use Cases:
 * - AI Agent 异步获取响应内容 / AI Agent gets response content asynchronously
 * - 读取会话历史 / Read conversation history
 * - 提取特定 AI 的输出 / Extract specific AI's output
 *
 * 前置条件 / Prerequisites:
 * 需要先运行 `npm run dev` 启动应用
 * Requires running `npm run dev` first
 *
 * 使用方法 / Usage:
 * npx tsx tests/e2e/auto-get-output.spec.ts [options]
 *
 * 选项 / Options:
 * --conversation-id <id>  会话ID (必需)
 * --chat-id <id>          对话ID (可选，默认获取最新对话)
 * --app <id>              AI应用ID (可选，默认返回所有AI的输出)
 * --format <type>         输出格式: json | text (默认: json)
 * --help                  显示帮助信息
 *
 * 示例 / Examples:
 * npx tsx tests/e2e/auto-get-output.spec.ts --conversation-id xxx
 * npx tsx tests/e2e/auto-get-output.spec.ts --conversation-id xxx --app deepseek
 * npx tsx tests/e2e/auto-get-output.spec.ts --conversation-id xxx --chat-id yyy --format text
 */

import { chromium } from '@playwright/test';
import { writeFileSync } from 'fs';
import { join } from 'path';

// CDP 连接 URL / CDP connection URL
const CDP_URL = 'http://localhost:9222';

// 获取输出配置 / Get output configuration
interface GetOutputConfig {
  conversationId: string;      // 会话ID (必需) / Conversation ID (required)
  chatId?: string;             // 对话ID (可选) / Chat ID (optional)
  appId?: string;              // AI应用ID (可选) / AI application ID (optional)
  format: 'json' | 'text';     // 输出格式 / Output format
}

/**
 * 解析命令行参数 / Parse command line arguments
 */
function parseArgs(): GetOutputConfig {
  const args = process.argv.slice(2);
  const config: GetOutputConfig = {
    conversationId: '',
    format: 'json'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--help':
      case '-h':
        console.log(`
获取输出指令 / Get Output Command
=================================

功能 / Feature:
  获取指定会话的 AI 响应内容
  Get AI response content from specified conversation

使用方法 / Usage:
  npx tsx tests/e2e/auto-get-output.spec.ts [options]

选项 / Options:
  --conversation-id <id>  会话ID (必需)
                          Conversation ID (required)

  --chat-id <id>          对话ID (可选，默认获取最新对话)
                          Chat ID (optional, default: latest chat)

  --app <id>              AI应用ID (可选，默认返回所有AI的输出)
                          AI application ID (optional, default: all AIs)

  --format <type>         输出格式: json | text (默认: json)
                          Output format: json | text (default: json)

  --help, -h              显示帮助信息
                          Show help message

示例 / Examples:
  # 获取指定会话的最新对话内容 / Get latest chat content from specified conversation
  npx tsx tests/e2e/auto-get-output.spec.ts --conversation-id xxx

  # 获取指定会话中特定AI的输出 / Get specific AI's output from specified conversation
  npx tsx tests/e2e/auto-get-output.spec.ts --conversation-id xxx --app deepseek

  # 获取指定对话的内容 / Get content from specific chat
  npx tsx tests/e2e/auto-get-output.spec.ts --conversation-id xxx --chat-id yyy

  # 以文本格式输出 / Output in text format
  npx tsx tests/e2e/auto-get-output.spec.ts --conversation-id xxx --format text

输出格式说明 / Output Format:
  JSON格式 / JSON format:
    - 包含完整的消息结构 / Includes complete message structure
    - 适合程序处理 / Suitable for programmatic processing

  文本格式 / Text format:
    - 纯文本内容 / Plain text content
    - 适合直接阅读 / Suitable for direct reading
        `);
        process.exit(0);

      case '--conversation-id':
        config.conversationId = args[++i];
        break;

      case '--chat-id':
        config.chatId = args[++i];
        break;

      case '--app':
        config.appId = args[++i];
        break;

      case '--format':
        config.format = args[++i] as 'json' | 'text';
        if (config.format !== 'json' && config.format !== 'text') {
          console.error('❌ 格式只能是 json 或 text / Format must be json or text');
          process.exit(1);
        }
        break;

      default:
        console.error(`未知参数 / Unknown argument: ${arg}`);
        console.error('使用 --help 查看帮助 / Use --help to see help');
        process.exit(1);
    }
  }

  if (!config.conversationId) {
    console.error('❌ 必须指定 --conversation-id / Must specify --conversation-id');
    console.error('使用 --help 查看帮助 / Use --help to see help');
    process.exit(1);
  }

  return config;
}

/**
 * 获取输出 / Get output
 */
async function getOutput(config: GetOutputConfig) {
  console.log('\n🔗 开始获取输出 / Starting to get output');
  console.log('='.repeat(60));

  // 步骤1：检查 CDP 是否可用 / Step 1: Check if CDP is available
  console.log('\n📡 步骤1：检查 CDP 连接 / Step 1: Checking CDP connection');

  try {
    const response = await fetch(CDP_URL + '/json/version');
    if (!response.ok) {
      throw new Error(`CDP endpoint returned ${response.status}`);
    }
    console.log('✅ CDP 可用 / CDP is available');
  } catch (error) {
    console.error('❌ 无法连接到 CDP / Cannot connect to CDP');
    console.error('   请确保已运行 `npm run dev`');
    throw error;
  }

  // 步骤2：通过 CDP 连接到 Electron / Step 2: Connect to Electron via CDP
  console.log('\n🔗 步骤2：连接到 Electron / Step 2: Connecting to Electron');

  const wsResponse = await fetch(CDP_URL + '/json/version');
  const wsInfo = await wsResponse.json();
  const wsUrl = wsInfo.webSocketDebuggerUrl;

  const browser = await chromium.connectOverCDP(wsUrl);
  console.log('✅ 已连接到 Electron / Connected to Electron');

  const context = browser.contexts()[0];
  const pages = context.pages();

  let electronPage = pages.find(page => {
    const url = page.url();
    return url.includes('localhost:5173') || url.includes('index.html');
  });

  if (!electronPage) {
    electronPage = pages[0];
  }

  console.log('✅ 找到页面 / Found page:', electronPage.url());

  // 步骤3：检查 electronAPI / Step 3: Check electronAPI
  console.log('\n🔍 步骤3：检查 electronAPI / Step 3: Checking electronAPI');

  await electronPage.waitForTimeout(2000);

  const hasElectronAPI = await electronPage.evaluate(() => {
    return typeof (window as any).electronAPI !== 'undefined';
  });

  if (!hasElectronAPI) {
    console.error('❌ electronAPI 未注入 / electronAPI not injected');
    await browser.close();
    throw new Error('electronAPI 未注入 / electronAPI not injected');
  }

  console.log('✅ electronAPI 已注入 / electronAPI is injected');

  // ========== 步骤4：获取会话数据 ==========
  // ========== Step 4: Get conversation data ==========
  console.log('\n📝 步骤4：获取会话数据 / Step 4: Getting conversation data');

  const conversationData = await electronPage.evaluate(async (config) => {
    const api = window.electronAPI;
    const conversation = await api.conversations.get(config.conversationId);

    if (!conversation) {
      return null;
    }

    // 确定要获取的 Chat / Determine which chat to get
    let targetChat;
    if (config.chatId) {
      // 指定对话ID / Specific chat ID
      targetChat = conversation.chats.find((c: any) => c.chatId === config.chatId);
    } else {
      // 最新对话 / Latest chat
      targetChat = conversation.chats[conversation.chats.length - 1];
    }

    if (!targetChat) {
      return {
        conversationId: conversation.conversationId,
        conversationName: conversation.conversationName,
        chatId: config.chatId,
        messages: []
      };
    }

    // 过滤消息 / Filter messages
    let messages = targetChat.messages;

    if (config.appId) {
      // 只获取指定AI的消息 / Only get messages from specified AI
      messages = messages.filter((m: any) => m.sender === config.appId);
    }

    return {
      conversationId: conversation.conversationId,
      conversationName: conversation.conversationName,
      chatId: targetChat.chatId,
      messages: messages.map((m: any) => ({
        role: m.role,
        sender: m.sender,
        content: m.content,
        status: m.status,
        timestamp: m.timestamp
      }))
    };
  }, config);

  if (!conversationData) {
    console.error('❌ 会话不存在 / Conversation not found');
    await browser.close();
    throw new Error('会话不存在 / Conversation not found');
  }

  // 关闭连接 / Close connection
  await browser.close();

  // ========== 输出结果 / Output results ==========
  console.log('\n✅ 操作完成 / Operation completed');
  console.log('='.repeat(60));

  if (config.format === 'json') {
    // JSON 格式输出 / JSON format output
    console.log('\n📊 输出内容 / Output:\n');
    console.log(JSON.stringify(conversationData, null, 2));
  } else {
    // 文本格式输出 / Text format output
    console.log('\n📄 输出内容 / Output:\n');
    console.log(`会话 / Conversation: ${conversationData.conversationName} (${conversationData.conversationId})`);
    console.log(`对话 / Chat: ${conversationData.chatId}\n`);
    console.log('─'.repeat(60));

    if (conversationData.messages.length === 0) {
      console.log('暂无消息 / No messages yet');
    } else {
      conversationData.messages.forEach((msg: any, index: number) => {
        console.log(`\n[${index + 1}] ${msg.role === 'user' ? '用户 / User' : msg.sender}`);
        console.log('─'.repeat(40));
        console.log(msg.content || '(暂无内容 / No content yet)');
        console.log('─'.repeat(40));
      });
    }
  }

  return conversationData;
}

// 运行命令 / Run command
if (require.main === module) {
  const config = parseArgs();
  console.log('\n📋 配置 / Configuration:');
  console.log('   会话ID / Conversation ID:', config.conversationId);
  console.log('   对话ID / Chat ID:', config.chatId || '(最新 / Latest)');
  console.log('   AI应用 / AI App:', config.appId || '(全部 / All)');
  console.log('   格式 / Format:', config.format);
  console.log('='.repeat(60));

  getOutput(config)
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 操作失败 / Operation failed:', error.message);
      process.exit(1);
    });
}

export { getOutput, GetOutputConfig };
