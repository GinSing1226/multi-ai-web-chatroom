/**
 * 通过 CDP 连接的自动化脚本
 * Automation script via CDP connection
 *
 * 功能 / Feature:
 * 通过 CDP 连接到已运行的 Electron 应用，自动化执行会话创建和消息发送操作
 * Connects to running Electron app via CDP, automates conversation creation and message sending
 *
 * 使用场景 / Use Cases:
 * - AI Agent 自动化操作应用 / AI Agent automating app operations
 * - 自动化任务执行 / Automated task execution
 * - 批量消息发送 / Batch message sending
 * - 自动化对话操作 / Automated conversation operation
 *
 * 前置条件 / Prerequisites:
 * 需要先运行 `npm run dev` 启动应用
 * Requires running `npm run dev` first
 *
 * 使用方法 / Usage:
 * npx tsx tests/e2e/auto-chat-cdp.spec.ts [options]
 *
 * 选项 / Options:
 * --app <id>          AI 应用 ID (默认: deepseek)
 *                      AI application ID (default: deepseek)
 * --message <text>    消息内容 (默认: "你好，请介绍一下你自己")
 *                      Message content (default: "你好，请介绍一下你自己")
 * --timeout <ms>      最大等待时间，毫秒 (默认: 60000)
 *                      Max wait time in milliseconds (default: 60000)
 * --new               强制创建新会话
 *                      Force create new conversation
 * --help              显示帮助信息
 *                      Show help message
 *
 * 示例 / Examples:
 * npx tsx tests/e2e/auto-chat-cdp.spec.ts
 * npx tsx tests/e2e/auto-chat-cdp.spec.ts --app chatgpt
 * npx tsx tests/e2e/auto-chat-cdp.spec.ts --app gemini --message "什么是量子计算？"
 * npx tsx tests/e2e/auto-chat-cdp.spec.ts --timeout 120000
 */

import { chromium } from '@playwright/test';

// CDP 连接 URL / CDP connection URL
const CDP_URL = 'http://localhost:9222';

// 操作超时时间（5分钟，因为需要等待 AI 响应）
// Operation timeout (5 minutes, as AI responses take time)
const OPERATION_TIMEOUT = 5 * 60 * 1000;

// 消息响应等待配置（默认值，可被命令行参数覆盖）
// Message response wait configuration (default, can be overridden by CLI args)
let MAX_WAIT_TIME = 60000; // 最多等待 60 秒 / Max wait 60 seconds
const POLL_INTERVAL = 1000; // 每秒检查一次 / Check every second

// 自动化配置 / Automation configuration
interface AutomationConfig {
  app: string;           // AI 应用 ID / AI application ID
  message: string;       // 消息内容 / Message content
  timeout: number;       // 超时时间 / Timeout
  forceNew: boolean;     // 是否强制创建新会话 / Whether to force create new conversation
}

// 默认配置 / Default configuration
const DEFAULT_CONFIG: AutomationConfig = {
  app: 'deepseek',
  message: '你好，请介绍一下你自己',
  timeout: 60000,
  forceNew: false
};

/**
 * 解析命令行参数 / Parse command line arguments
 */
function parseArgs(): AutomationConfig {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--help':
      case '-h':
        console.log(`
CDP 自动化操作脚本 / CDP Automation Script
============================================

功能 / Feature:
  通过 CDP 连接到已运行的 Electron 应用，自动化执行会话创建和消息发送
  Connect to running Electron app via CDP, automate conversation creation and message sending

使用方法 / Usage:
  npx tsx tests/e2e/auto-chat-cdp.spec.ts [options]

选项 / Options:
  --app <id>          AI 应用 ID (默认: ${DEFAULT_CONFIG.app})
                      AI application ID (default: ${DEFAULT_CONFIG.app})
                      支持的值 / Supported values: deepseek, chatgpt, gemini, doubao, glm, kimi, qwen

  --message <text>    消息内容 (默认: "${DEFAULT_CONFIG.message}")
                      Message content (default: "${DEFAULT_CONFIG.message}")

  --timeout <ms>      最大等待时间，毫秒 (默认: ${DEFAULT_CONFIG.timeout})
                      Max wait time in milliseconds (default: ${DEFAULT_CONFIG.timeout})

  --new               强制创建新会话
                      Force create new conversation

  --help, -h          显示帮助信息
                      Show help message

示例 / Examples:
  npx tsx tests/e2e/auto-chat-cdp.spec.ts
  npx tsx tests/e2e/auto-chat-cdp.spec.ts --app chatgpt
  npx tsx tests/e2e/auto-chat-cdp.spec.ts --app gemini --message "什么是量子计算？"
  npx tsx tests/e2e/auto-chat-cdp.spec.ts --app doubao --message "解释一下相对论" --timeout 120000
  npx tsx tests/e2e/auto-chat-cdp.spec.ts --new
        `);
        process.exit(0);

      case '--app':
        config.app = args[++i];
        break;

      case '--message':
        config.message = args[++i];
        break;

      case '--timeout':
        config.timeout = parseInt(args[++i], 10);
        break;

      case '--new':
        config.forceNew = true;
        break;

      default:
        console.error(`未知参数 / Unknown argument: ${arg}`);
        console.error('使用 --help 查看帮助 / Use --help to see help');
        process.exit(1);
    }
  }

  return config;
}

/**
 * 执行完整的自动化流程
 * Execute complete automation flow
 */
async function executeAutomation(config: AutomationConfig) {
  console.log('\n🔗 开始自动化操作 / Starting automation');
  console.log('='.repeat(60));

  // 步骤1：检查 CDP 是否可用 / Step 1: Check if CDP is available
  console.log('\n📡 步骤1：检查 CDP 连接 / Step 1: Checking CDP connection');

  try {
    const response = await fetch(CDP_URL + '/json/version');
    if (!response.ok) {
      throw new Error(`CDP endpoint returned ${response.status}`);
    }
    const versionInfo = await response.json();
    console.log('✅ CDP 可用 / CDP is available');
    console.log('   Browser:', versionInfo.Browser);
    console.log('   Protocol Version:', versionInfo['Protocol-Version']);
  } catch (error) {
    console.error('❌ 无法连接到 CDP / Cannot connect to CDP');
    console.error('   请确保已运行 `npm run dev`');
    console.error('   Please ensure `npm run dev` is running');
    throw error;
  }

  // 步骤2：通过 CDP 连接到 Electron / Step 2: Connect to Electron via CDP
  console.log('\n🔗 步骤2：连接到 Electron / Step 2: Connecting to Electron');

  // 获取 WebSocket URL / Get WebSocket URL
  const wsResponse = await fetch(CDP_URL + '/json/version');
  const wsInfo = await wsResponse.json();
  const wsUrl = wsInfo.webSocketDebuggerUrl;

  console.log('📡 WebSocket URL:', wsUrl);

  const browser = await chromium.connectOverCDP(wsUrl);
  console.log('✅ 已连接到 Electron / Connected to Electron');

  const context = browser.contexts()[0];
  const pages = context.pages();

  // 查找 Electron 的 renderer 页面 / Find Electron's renderer page
  let electronPage = pages.find(page => {
    const url = page.url();
    return url.includes('localhost:5173') || url.includes('index.html');
  });

  if (!electronPage) {
    // 如果没找到，使用第一个页面 / If not found, use first page
    electronPage = pages[0];
  }

  console.log('✅ 找到页面 / Found page:', electronPage.url());

  // 步骤3：检查 electronAPI / Step 3: Check electronAPI
  console.log('\n🔍 步骤3：检查 electronAPI / Step 3: Checking electronAPI');

  await electronPage.waitForTimeout(3000);

  const hasElectronAPI = await electronPage.evaluate(() => {
    return typeof (window as any).electronAPI !== 'undefined';
  });

  if (!hasElectronAPI) {
    console.error('❌ electronAPI 未注入 / electronAPI not injected');
    console.error('   请检查应用是否正确启动');
    console.error('   Please check if application is running correctly');
    await browser.close();
    throw new Error('electronAPI 未注入 / electronAPI not injected');
  }

  console.log('✅ electronAPI 已注入 / electronAPI is injected');

  // ========== 步骤4：获取或创建会话 ==========
  // ========== Step 4: Get or create conversation ==========
  console.log('\n📝 步骤4：获取或创建会话 / Step 4: Getting or creating conversation');
  console.log(`   AI 应用 / AI App: ${config.app}`);
  console.log(`   强制新建 / Force New: ${config.forceNew}`);

  const conversationInfo = await electronPage.evaluate(async (appConfig) => {
    const api = window.electronAPI;

    // 🔥 如果强制创建新会话，跳过活跃会话检查
    // If force creating new conversation, skip active session check
    if (!appConfig.forceNew) {
      // 先检查是否有活跃会话 / First check if there's an active session
      const activeSession = await api.conversations.getActiveSession();

      if (activeSession) {
        console.log('✅ 发现有活跃会话 / Found active session:', activeSession.conversationId);
        console.log('   使用现有会话 / Using existing conversation');
        return { conversationId: activeSession.conversationId, isNew: false };
      }
    }

    // 如果没有活跃会话，或强制创建，则创建新的 / If no active session or force create, create new one
    console.log('ℹ️ 创建新会话 / Creating new conversation');
    const newConversation = await api.conversations.create([appConfig.app]);

    console.log('✅ 新会话已创建 / New conversation created:', newConversation.conversationId);
    return { conversationId: newConversation.conversationId, isNew: true };
  }, config);

  const conversationId = conversationInfo.conversationId;
  const isNewConversation = conversationInfo.isNew;

  console.log('使用的会话ID / Conversation ID in use:', conversationId);
  console.log('是否新建会话 / Is new conversation:', isNewConversation);

  // 如果是新会话，导航到新会话页面 / If new conversation, navigate to it
  if (isNewConversation) {
    await electronPage.waitForTimeout(2000);
    console.log('🔄 导航到新会话 / Navigating to new conversation');
    const newUrl = `http://localhost:5173/conversation/${conversationId}`;
    await electronPage.goto(newUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
    console.log('✅ 已导航到 / Navigated to:', newUrl);

    // 等待页面加载完成 / Wait for page to load
    await electronPage.waitForTimeout(3000);
    console.log('✅ 新会话页面已加载 / New conversation page loaded');
  } else {
    // 如果使用现有会话，确保页面在正确的会话上 / If using existing, ensure page is on correct conversation
    const currentUrl = electronPage.url();
    console.log('当前页面 URL / Current page URL:', currentUrl);

    const urlParts = currentUrl.split('/conversation/');
    if (urlParts.length < 2 || !urlParts[1].startsWith(conversationId)) {
      console.log('🔄 导航到现有会话 / Navigating to existing conversation');
      const targetUrl = `http://localhost:5173/conversation/${conversationId}`;
      try {
        await electronPage.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await electronPage.waitForTimeout(3000);
        console.log('✅ 已导航到现有会话 / Navigated to existing conversation');
      } catch (error) {
        console.warn('⚠️ 导航到现有会话失败，可能已在正确页面 / Failed to navigate, may already be on correct page');
      }
    } else {
      console.log('✅ 已在正确的会话页面上 / Already on correct conversation page');
      await electronPage.waitForTimeout(1000);
    }
  }

  // ========== 步骤5：发送消息 ==========
  // ========== Step 5: Send message ==========
  console.log('\n💬 步骤5：发送消息 / Step 5: Sending message');
  console.log(`   消息内容 / Message: ${config.message}`);

  // 🔥 监听消息更新事件，等待 AI 响应完成
  // Listen for message update events to wait for AI response completion
  let messageUpdateReceived = false;
  let lastContent = '';

  // 🔥 设置监听器来捕获消息更新事件
  // Setup listener to capture message update events
  await electronPage.evaluate((conversationId) => {
    const api = window.electronAPI;

    console.log('🔧 正在设置消息监听器 / Setting up message listener');
    console.log('   conversationId:', conversationId);
    console.log('   api.conversations:', api.conversations);
    console.log('   api.conversations.onMessageUpdated:', typeof api.conversations.onMessageUpdated);

    // 清除旧数据 / Clear old data
    window.lastMessageContent = '';
    window.lastMessageStatus = '';

    // 注册消息更新监听器 / Register message update listener
    window.messageUpdateHandler = function(_event, data) {
      console.log('📨 收到消息更新事件 / Message update event received:', data);
      console.log('   data.conversationId:', data.conversationId);
      console.log('   目标 conversationId:', conversationId);
      console.log('   data.content:', data.content ? data.content.substring(0, 50) : 'undefined');

      if (data.conversationId === conversationId && data.content) {
        // 存储最新内容 / Store latest content
        window.lastMessageContent = data.content;
        window.lastMessageStatus = data.status;
        console.log('✅ 内容已更新 / Content updated:', data.content.substring(0, 50) + '...');
      }
    };

    api.conversations.onMessageUpdated(window.messageUpdateHandler);
    console.log('✅ 消息监听器已注册 / Message listener registered');
  }, conversationId);

  await electronPage.evaluate(async (data) => {
    const api = window.electronAPI;

    // 发送消息 / Send message
    const result = await api.conversations.sendMessage(data.conversationId, data.message);

    console.log('消息发送结果 / Message send result:', result);
  }, { conversationId, message: config.message });

  // 🔥 轮询等待消息内容（使用配置的超时时间）
  // Poll for message content (using configured timeout)
  console.log(`⏳ 等待 AI 响应（最多${config.timeout / 1000}秒）/ Waiting for AI response (max ${config.timeout / 1000}s)...`);

  const startTime = Date.now();
  let responseReceived = false;

  while (Date.now() - startTime < config.timeout) {
    const checkResult = await electronPage.evaluate((id) => {
      const content = (window as any).lastMessageContent || '';
      const status = (window as any).lastMessageStatus || '';
      return { content, status, hasContent: content.length > 0 };
    }, conversationId);

    if (checkResult.hasContent) {
      lastContent = checkResult.content;
      responseReceived = true;
      console.log(`✅ 收到响应 / Response received (${checkResult.content.length} 字符)`);
      console.log('   状态 / Status:', checkResult.status);
      break;
    }

    await electronPage.waitForTimeout(POLL_INTERVAL);
  }

  if (!responseReceived) {
    console.warn('⚠️ 未在规定时间内收到响应 / No response received within timeout');
  }

  // 清理监听器 / Cleanup listener
  await electronPage.evaluate(() => {
    const api = (window as any).electronAPI;
    const handler = (window as any).messageUpdateHandler;
    if (api && handler) {
      api.conversations.removeMessageUpdatedListener(handler);
    }
    (window as any).messageUpdateHandler = null;
  });

  // 检查消息是否成功 / Check if message was successful
  const response1 = await electronPage.evaluate(async (data) => {
    const api = window.electronAPI;
    const conversation = await api.conversations.get(data.conversationId);

    const chat = conversation.chats[conversation.chats.length - 1];
    const aiMessage = chat.messages.find((m: any) => m.sender === data.app);

    return {
      hasContent: !!aiMessage?.content,
      contentLength: aiMessage?.content?.length || 0,
      status: aiMessage?.status,
      platformConversationId: conversation.aiApplicationBindings[0]?.platformConversationId
    };
  }, { conversationId, app: config.app });

  console.log('消息响应 / Message response:', response1);

  if (!response1.hasContent) {
    console.error('❌ 未收到响应 / No response received');
    await browser.close();
    throw new Error('未收到响应 / No response received');
  }

  if (response1.contentLength === 0) {
    console.error('❌ 响应内容为空 / Response content is empty');
    await browser.close();
    throw new Error('响应内容为空 / Response content is empty');
  }

  console.log('✅ 消息响应成功 / Message response successful');

  // 显示响应内容预览 / Show response preview
  const preview = await electronPage.evaluate(async (data) => {
    const api = window.electronAPI;
    const conversation = await api.conversations.get(data.conversationId);
    const chat = conversation.chats[conversation.chats.length - 1];
    const aiMessage = chat.messages.find((m: any) => m.sender === data.app);
    return aiMessage?.content?.substring(0, 100) + '...' || '';
  }, { conversationId, app: config.app });

  console.log(`\n📄 响应内容预览 / Response preview:\n${preview}\n`);

  // 关闭连接 / Close connection
  await browser.close();
  console.log('\n✅ 操作完成 / Operation completed');
}

// 运行自动化脚本 / Run automation
if (require.main === module) {
  const config = parseArgs();
  console.log('\n📋 自动化配置 / Automation Configuration:');
  console.log('   AI 应用 / AI App:', config.app);
  console.log('   消息 / Message:', config.message);
  console.log('   超时 / Timeout:', config.timeout, 'ms');
  console.log('   强制新建 / Force New:', config.forceNew);
  console.log('='.repeat(60));

  executeAutomation(config)
    .then(() => {
      console.log('\n✅ 操作成功 / Operation successful');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 操作失败 / Operation failed:', error.message);
      process.exit(1);
    });
}

export { executeAutomation, AutomationConfig };
