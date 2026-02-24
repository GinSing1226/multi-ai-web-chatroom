/**
 * Multi AI Web Chatroom CLI 工具（IPC 版本）
 * 通过 IPC 与 Electron 主进程通信
 *
 * 使用方法：
 * 1. 终端1：npm run dev（启动 Electron 应用）
 * 2. 终端2：node scripts/cli-ipc.js [command] [options]
 */

const { app, BrowserWindow } = require('electron');

// 当前文件是被 Node.js 直接调用（通过 electron）还是作为模块加载
// 如果是通过 electron 运行，app 会已经存在
if (app && !app.isReady()) {
  // 等待 app 就绪
  app.on('ready', runCli);
} else if (app && app.isReady()) {
  // app 已经就绪，直接运行
  runCli();
} else {
  // 不是在 Electron 环境中运行
  console.error('❌ 此脚本必须在 Electron 环境中运行');
  console.error('请使用: electron scripts/cli-ipc.js [command]');
  console.error('或者在应用已启动后，通过 IPC 调用');
  process.exit(1);
}

function runCli() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  console.log('🔧 Multi AI Chatroom CLI (IPC Mode)\n');

  switch (command) {
    case 'test':
      runTest(args);
      break;
    case 'send':
      runSend(args);
      break;
    case 'get-output':
      runGetOutput(args);
      break;
    case 'create-conversation':
      runCreateConversation(args);
      break;
    default:
      showHelp();
  }
}

function showHelp() {
  console.log('可用命令：\n');
  console.log('  test [scenario]              - 运行测试');
  console.log('  send <content> [conversationId] - 发送消息');
  console.log('  get-output [conversationId]   - 获取输出');
  console.log('  create-conversation [name]   - 创建会话');
  console.log('\n示例：');
  console.log('  electron scripts/cli-ipc.js test continuous');
  console.log('  electron scripts/cli-ipc.js send "你好"');
}

/**
 * 运行测试
 */
async function runTest(args) {
  const scenario = args[1] || 'all';

  console.log('🧪 运行测试...');
  console.log('场景:', scenario);
  console.log('');

  const windows = BrowserWindow.getAllWindows();
  if (windows.length === 0) {
    console.error('❌ 未找到窗口');
    process.exit(1);
  }

  const mainWindow = windows[0];

  if (scenario === 'all' || scenario === 'continuous') {
    await testContinuousConversation(mainWindow);
  }

  if (scenario === 'all' || scenario === 'reuse') {
    await testTabReuse(mainWindow);
  }

  console.log('\n✅ 所有测试完成\n');
  process.exit(0);
}

/**
 * 测试连续对话
 */
async function testContinuousConversation(window) {
  console.log('📋 测试：连续对话');
  console.log('');

  try {
    // 创建会话
    console.log('步骤1：创建新会话...');
    const conversationId = await window.webContents.executeJavaScript(`
      (async () => {
        const api = window.electronAPI;
        const result = await api.conversations.create({
          conversationName: 'CLI自动化测试-连续对话',
          description: 'CLI test',
          aiApplicationIds: ['doubao']
        });
        return result.conversationId;
      })()
    `);

    console.log('✅ 会话已创建:', conversationId);

    await sleep(3000);

    // 发送第一条消息
    console.log('\n步骤2：发送第一条消息...');
    await window.webContents.executeJavaScript(`
      (async () => {
        const api = window.electronAPI;
        await api.conversations.sendMessage('${conversationId}', {
          content: '你好，请介绍一下你自己'
        });
      })()
    `);

    console.log('⏳ 等待 AI 响应（40秒）...');
    await sleep(40000);

    // 验证第一条消息
    const response1 = await window.webContents.executeJavaScript(`
      (async () => {
        const api = window.electronAPI;
        const conversation = await api.conversations.get('${conversationId}');
        const chat = conversation.chats[conversation.chats.length - 1];
        const doubaoMessage = chat.messages.find(m => m.sender === 'doubao');
        return {
          hasContent: !!doubaoMessage?.content,
          contentLength: doubaoMessage?.content?.length || 0,
          platformConversationId: conversation.aiApplicationBindings[0]?.platformConversationId
        };
      })()
    `);

    if (!response1.hasContent) {
      throw new Error('第一条消息未收到响应');
    }

    console.log('✅ 第一条消息成功');
    console.log('   内容长度:', response1.contentLength);
    console.log('   平台会话ID:', response1.platformConversationId);

    // 发送第二条消息
    console.log('\n步骤3：发送第二条消息...');
    await window.webContents.executeJavaScript(`
      (async () => {
        const api = window.electronAPI;
        await api.conversations.sendMessage('${conversationId}', {
          content: '你现在能做什么？'
        });
      })()
    `);

    console.log('⏳ 等待 AI 响应（40秒）...');
    await sleep(40000);

    // 验证第二条消息
    const response2 = await window.webContents.executeJavaScript(`
      (async () => {
        const api = window.electronAPI;
        const conversation = await api.conversations.get('${conversationId}');
        return {
          hasContent: conversation.chats[conversation.chats.length - 1].messages.some(m => m.sender === 'doubao' && m.content),
          chatCount: conversation.chats.length
        };
      })()
    `);

    if (!response2.hasContent) {
      throw new Error('第二条消息未收到响应');
    }

    if (response2.chatCount !== 2) {
      throw new Error(`聊天数量不正确: ${response2.chatCount}`);
    }

    console.log('✅ 第二条消息成功');
    console.log('   聊天数量:', response2.chatCount);
    console.log('\n✅ 连续对话测试通过！');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    throw error;
  }
}

/**
 * 测试标签页复用
 */
async function testTabReuse(window) {
  console.log('\n📋 测试：标签页复用');
  console.log('');

  try {
    // 创建第一个会话
    console.log('步骤1：创建第一个会话...');
    const id1 = await window.webContents.executeJavaScript(`
      (async () => {
        const api = window.electronAPI;
        const result = await api.conversations.create({
          conversationName: 'CLI自动化测试-标签页1',
          description: 'CLI test',
          aiApplicationIds: ['doubao']
        });
        return result.conversationId;
      })()
    `);

    console.log('✅ 第一个会话已创建:', id1);
    await sleep(3000);

    // 发送消息
    await window.webContents.executeJavaScript(`
      (async () => {
        const api = window.electronAPI;
        await api.conversations.sendMessage('${id1}', {
          content: '第一个会话'
        });
      })()
    `);

    console.log('⏳ 等待 AI 响应（40秒）...');
    await sleep(40000);

    // 获取第一个 ID
    const info1 = await window.webContents.executeJavaScript(`
      (async () => {
        const api = window.electronAPI;
        const conversation = await api.conversations.get('${id1}');
        return conversation.aiApplicationBindings[0]?.platformConversationId;
      })()
    `);

    console.log('✅ 第一个会话ID:', info1);

    // 创建第二个会话
    console.log('\n步骤2：创建第二个会话...');
    const id2 = await window.webContents.executeJavaScript(`
      (async () => {
        const api = window.electronAPI;
        const result = await api.conversations.create({
          conversationName: 'CLI自动化测试-标签页2',
          description: 'CLI test',
          aiApplicationIds: ['doubao']
        });
        return result.conversationId;
      })()
    `);

    console.log('✅ 第二个会话已创建:', id2);
    await sleep(3000);

    // 发送消息
    await window.webContents.executeJavaScript(`
      (async () => {
        const api = window.electronAPI;
        await api.conversations.sendMessage('${id2}', {
          content: '第二个会话'
        });
      })()
    `);

    console.log('⏳ 等待 AI 响应（40秒）...');
    await sleep(40000);

    // 获取第二个 ID
    const info2 = await window.webContents.executeJavaScript(`
      (async () => {
        const api = window.electronAPI;
        const conversation = await api.conversations.get('${id2}');
        return conversation.aiApplicationBindings[0]?.platformConversationId;
      })()
    `);

    console.log('✅ 第二个会话ID:', info2);

    if (info1 === info2) {
      throw new Error('两个会话ID相同（应该不同）');
    }

    console.log('\n✅ 标签页复用测试通过！');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    throw error;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 导出函数供外部调用
module.exports = {
  runCli,
  testContinuousConversation,
  testTabReuse
};
