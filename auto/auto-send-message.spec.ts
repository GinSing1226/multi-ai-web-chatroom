/**
 * 发送消息指令
 * Send message command
 *
 * 功能 / Feature:
 * 向指定会话发送消息，快速返回基本信息（不等待完整响应）
 * Send message to specified conversation, return basic info quickly (no wait for full response)
 *
 * 返回信息 / Returns:
 * - 会话文件路径 / Conversation file path
 * - 会话ID / Conversation ID
 * - 对话ID / Chat ID
 *
 * 使用场景 / Use Cases:
 * - AI Agent 快速发送消息后继续其他任务 / AI Agent sends message quickly and continues
 * - 异步获取响应内容 / Get response content asynchronously
 * - 批量消息发送 / Batch message sending
 *
 * 前置条件 / Prerequisites:
 * 需要先运行 `npm run dev` 启动应用
 * Requires running `npm run dev` first
 *
 * 使用方法 / Usage:
 * npx tsx tests/e2e/auto-send-message.spec.ts [options]
 *
 * 选项 / Options:
 * --app <id>              AI 应用 ID (默认: deepseek)
 * --message <text>        消息内容
 * --conversation-id <id>  指定会话ID (可选，默认使用活跃会话)
 * --new                   强制创建新会话
 * --help                  显示帮助信息
 *
 * 示例 / Examples:
 * npx tsx tests/e2e/auto-send-message.spec.ts
 * npx tsx tests/e2e/auto-send-message.spec.ts --app chatgpt --message "你好"
 * npx tsx tests/e2e/auto-send-message.spec.ts --conversation-id xxx --message "测试"
 */

import { chromium } from '@playwright/test';

// CDP 连接 URL / CDP connection URL
const CDP_URL = 'http://localhost:9222';

// 发送消息配置 / Send message configuration
interface SendMessageConfig {
  app: string;                  // AI 应用 ID / AI application ID
  message: string;              // 消息内容 / Message content
  conversationId?: string;      // 指定会话ID / Specific conversation ID (optional)
}

// 默认配置 / Default configuration
const DEFAULT_CONFIG: SendMessageConfig = {
  app: 'deepseek',
  message: '你好，请介绍一下你自己'
};

/**
 * 解析命令行参数 / Parse command line arguments
 */
function parseArgs(): SendMessageConfig {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--help':
      case '-h':
        console.log(`
发送消息指令 / Send Message Command
====================================

功能 / Feature:
  向指定会话发送消息，快速返回基本信息
  Send message to specified conversation, return basic info quickly

返回信息 / Returns:
  - 会话文件路径 / Conversation file path
  - 会话ID / Conversation ID
  - 对话ID / Chat ID

限制 / Restrictions:
  ⚠️ 严格限制：只要有活跃会话存在，就无法发送消息
  ⚠️ Strict restriction: Cannot send message if any active session exists
  - 等待活跃会话完成后才能发送新消息 / Wait for active session to complete before sending new message
  - 活跃会话是指 AI 正在响应的会话 / Active session means AI is responding

使用方法 / Usage:
  npx tsx tests/e2e/auto-send-message.spec.ts [options]

选项 / Options:
  --app <id>              AI 应用 ID (默认: ${DEFAULT_CONFIG.app})
                          AI application ID (default: ${DEFAULT_CONFIG.app})
                          支持的值 / Supported values: deepseek, chatgpt, gemini, doubao, glm, kimi, qwen

  --message <text>        消息内容 (默认: "${DEFAULT_CONFIG.message}")
                          Message content (default: "${DEFAULT_CONFIG.message}")

  --conversation-id <id>  指定会话ID (可选，不指定则自动创建新会话)
                          Specific conversation ID (optional, auto-create if not specified)

  --help, -h              显示帮助信息
                          Show help message

示例 / Examples:
  # 创建新会话并发送消息（无活跃会话时）/ Create new and send (when no active session)
  npx tsx tests/e2e/auto-send-message.spec.ts --app deepseek --message "你好"

  # 向历史会话发送消息（延续对话，无活跃会话时）/ Send to existing conversation (continue chat, when no active session)
  npx tsx tests/e2e/auto-send-message.spec.ts --conversation-id abc123 --message "你好"

错误处理 / Error Handling:
  如果有活跃会话存在，将返回错误：
  If active session exists, operation will fail:

  {
    "success": false,
    "error": "ACTIVE_SESSION_EXISTS",
    "message": "当前有活跃会话，无法操作",
    "activeConversationId": "xxx",
    "requestedConversationId": "yyy"
  }
        `);
        process.exit(0);

      case '--app':
        config.app = args[++i];
        break;

      case '--message':
        config.message = args[++i];
        break;

      case '--conversation-id':
        config.conversationId = args[++i];
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
 * 发送消息 / Send message
 */
async function sendMessage(config: SendMessageConfig) {
  console.log('\n🔗 开始发送消息 / Starting to send message');
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

  // ========== 步骤4：检查活跃会话并确定目标会话 ==========
  // ========== Step 4: Check active session and determine target conversation ==========
  console.log('\n📝 步骤4：检查活跃会话 / Step 4: Checking active session');

  // 获取当前活跃会话 / Get current active session
  const activeSession = await electronPage.evaluate(async () => {
    const api = window.electronAPI;
    return await api.conversations.getActiveSession();
  });

  let targetConversationId: string;

  // ⚠️ 严格限制：只要活跃会话存在，就禁止发送消息
  // ⚠️ Strict restriction: Block message sending if any active session exists
  if (activeSession) {
    console.error('❌ 操作失败 / Operation failed');
    console.error(`   当前有活跃会话 / Current active session: ${activeSession.conversationId}`);
    if (config.conversationId) {
      console.error(`   指定的会话 / Specified conversation: ${config.conversationId}`);
    }
    console.error('   请等待活跃会话完成后再试 / Please wait for active session to complete');

    await browser.close();

    const error = {
      success: false,
      error: 'ACTIVE_SESSION_EXISTS',
      message: '当前有活跃会话，无法操作 / Active session exists, cannot operate',
      activeConversationId: activeSession.conversationId,
      requestedConversationId: config.conversationId || null
    };
    console.log('\n' + JSON.stringify(error, null, 2));
    throw new Error(JSON.stringify(error));
  }

  // 没有活跃会话，确定目标会话 / No active session, determine target conversation
  if (config.conversationId) {
    // 指定了会话ID，使用该会话 / Specified conversation ID, use that conversation
    console.log('✅ 使用指定会话 / Using specified conversation:', config.conversationId);
    targetConversationId = config.conversationId;
  } else {
    // 没有指定会话，创建新会话 / No conversation specified, create new conversation
    console.log('ℹ️ 无活跃会话，创建新会话 / No active session, creating new conversation');
    console.log('   AI App ID:', config.app);

    const newConversation = await electronPage.evaluate(async (appId) => {
      console.log('[Evaluate] appId:', appId, typeof appId);
      const api = window.electronAPI;
      // 注意：create 需要两个参数：reservedConversationId（null）和 aiApplicationIds（数组）
      // Note: create needs two params: reservedConversationId (null) and aiApplicationIds (array)
      const conv = await api.conversations.create(null, [appId]);
      return conv.conversationId;
    }, config.app);

    targetConversationId = newConversation;
    console.log('✅ 新会话已创建 / New conversation created:', targetConversationId);
  }

  // ========== 步骤5：发送消息 ==========
  // ========== Step 5: Send message ==========
  console.log('\n💬 步骤5：发送消息 / Step 5: Sending message');
  console.log(`   会话ID / Conversation ID: ${targetConversationId}`);
  console.log(`   消息内容 / Message: ${config.message}`);

  const result = await electronPage.evaluate(async (data) => {
    const api = window.electronAPI;
    const result = await api.conversations.sendMessage(data.conversationId, data.message);
    return result;
  }, { conversationId: targetConversationId, message: config.message });

  console.log('✅ 消息已发送 / Message sent');

  // ========== 步骤6：获取会话信息 ==========
  // ========== Step 6: Get conversation info ==========
  console.log('\n📋 步骤6：获取会话信息 / Step 6: Getting conversation info');

  const conversationInfo = await electronPage.evaluate(async (convId) => {
    const api = window.electronAPI;
    const conversation = await api.conversations.get(convId);

    // 获取最后一个 Chat / Get last chat
    const lastChat = conversation.chats[conversation.chats.length - 1];

    return {
      conversationId: conversation.conversationId,
      conversationName: conversation.conversationName,
      chatId: lastChat?.chatId,
      createTime: conversation.createTime,
      updateTime: conversation.updateTime,
      aiApplicationBindings: conversation.aiApplicationBindings
    };
  }, targetConversationId);

  // 构造会话文件路径 / Construct conversation file path
  // 文件命名规则: 会话名称_yyyy-mm-dd_会话ID前8位.md
  // File naming rule: conversationName_yyyy-mm-dd_first8charsOfId.md
  const date = new Date(conversationInfo.createTime);
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const shortId = conversationInfo.conversationId.substring(0, 8);

  // 导入 sanitizeFilename 函数来清理文件名
  const sanitizeName = (name: string) => {
    return name
      .replace(/[<>:"/\\|?*]/g, '') // 移除不安全字符
      .replace(/\s+/g, '_')          // 空格替换为下划线
      .substring(0, 50);             // 限制长度
  };

  const cleanName = sanitizeName(conversationInfo.conversationName);
  const fileName = `${cleanName}_${dateStr}_${shortId}.md`;
  const filePath = `data/sessions/${fileName}`;

  // 关闭连接 / Close connection
  await browser.close();

  // ========== 输出结果 / Output results ==========
  console.log('\n✅ 操作完成 / Operation completed');
  console.log('='.repeat(60));
  console.log('\n📊 返回信息 / Return Info:\n');

  const output = {
    success: true,
    conversationId: conversationInfo.conversationId,
    chatId: conversationInfo.chatId,
    conversationName: conversationInfo.conversationName,
    filePath: filePath,
    createTime: conversationInfo.createTime,
    updateTime: conversationInfo.updateTime,
    aiApplications: conversationInfo.aiApplicationBindings.map((b: any) => b.aiApplicationId)
  };

  // JSON 格式输出（方便 AI Agent 解析）/ JSON output (easy for AI Agent to parse)
  console.log(JSON.stringify(output, null, 2));

  return output;
}

// 运行命令 / Run command
if (require.main === module) {
  const config = parseArgs();
  console.log('\n📋 配置 / Configuration:');
  console.log('   AI 应用 / AI App:', config.app);
  console.log('   消息 / Message:', config.message);
  console.log('   指定会话 / Specified Conversation:', config.conversationId || '(未指定 / Not specified)');
  console.log('   强制新建 / Force New:', config.forceNew);
  console.log('='.repeat(60));

  sendMessage(config)
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 操作失败 / Operation failed:', error.message);
      process.exit(1);
    });
}

export { sendMessage, SendMessageConfig };
