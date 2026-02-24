/**
 * 测试命令
 * Test Command
 *
 * 通过 IPC 与 Electron 应用通信执行测试
 * Execute tests by communicating with Electron app via IPC
 */

import chalk from 'chalk';
import ora from 'ora';
import { setTimeout as sleep } from 'timers/promises';

export interface TestOptions {
  scenario?: string;
  timeout?: string;
}

/**
 * 测试用例定义 / Test case definition
 */
interface TestCase {
  name: string;
  description: string;
  execute: () => Promise<TestResult>;
}

interface TestResult {
  success: boolean;
  message: string;
  details?: Record<string, any>;
}

/**
 * 导出测试命令函数 / Export test command function
 */
export async function testCommand(options: TestOptions) {
  console.log(chalk.blue.bold('\n🧪 Multi AI Web Chatroom 自动化测试\n'));

  const timeout = parseInt(options.timeout || '120000', 10);
  const scenario = options.scenario || 'all';

  // 检查 Electron 应用是否运行
  const spinner = ora('检查 Electron 应用状态...').start();

  try {
    // 动态导入 electron 模块（只在运行时可用）
    const { app, BrowserWindow } = await import('electron');

    if (!app.isReady()) {
      spinner.fail('Electron 应用未运行');
      console.log(chalk.yellow('\n请先启动应用：npm run dev\n'));
      process.exit(1);
    }

    spinner.succeed('Electron 应用已运行');

    // 获取主窗口
    const windows = BrowserWindow.getAllWindows();
    if (windows.length === 0) {
      console.log(chalk.red('❌ 未找到 Electron 窗口'));
      process.exit(1);
    }

    const mainWindow = windows[0];

    // 定义测试用例
    const testCases: TestCase[] = [];

    if (scenario === 'all' || scenario === 'continuous') {
      testCases.push({
        name: '连续对话测试',
        description: '测试在同一会话中连续发送消息',
        execute: () => testContinuousConversation(mainWindow)
      });
    }

    if (scenario === 'all' || scenario === 'reuse') {
      testCases.push({
        name: '标签页复用测试',
        description: '测试多个会话复用同一标签页',
        execute: () => testTabReuse(mainWindow)
      });
    }

    // 执行测试
    console.log(chalk.gray(`\n运行 ${scenario} 测试场景...\n`));

    let passed = 0;
    let failed = 0;

    for (const testCase of testCases) {
      console.log(chalk.cyan(`\n📋 ${testCase.name}`));
      console.log(chalk.gray(`   ${testCase.description}\n`));

      try {
        const result = await executeWithTimeout(testCase.execute(), timeout);

        if (result.success) {
          console.log(chalk.green(`✅ ${result.message}`));
          if (result.details) {
            console.log(chalk.gray(JSON.stringify(result.details, null, 2)));
          }
          passed++;
        } else {
          console.log(chalk.red(`❌ ${result.message}`));
          failed++;
        }
      } catch (error) {
        console.log(chalk.red(`❌ 测试失败: ${error instanceof Error ? error.message : String(error)}`));
        failed++;
      }
    }

    // 输出测试总结
    console.log(chalk.blue.bold('\n📊 测试总结'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(`总计: ${testCases.length} | 通过: ${chalk.green(passed)} | 失败: ${chalk.red(failed)}`);

    if (failed === 0) {
      console.log(chalk.green.bold('\n✅ 所有测试通过！\n'));
      process.exit(0);
    } else {
      console.log(chalk.red.bold('\n❌ 部分测试失败\n'));
      process.exit(1);
    }

  } catch (error) {
    spinner.fail('无法连接到 Electron 应用');
    console.log(chalk.yellow('\n请确保：'));
    console.log(chalk.yellow('1. 已运行 npm run dev'));
    console.log(chalk.yellow('2. 应用已完全启动\n'));
    process.exit(1);
  }
}

/**
 * 测试连续对话功能 / Test continuous conversation
 */
async function testContinuousConversation(window: Electron.BrowserWindow): Promise<TestResult> {
  const testSpinner = ora('执行连续对话测试...').start();

  try {
    // 步骤1：创建新会话
    testSpinner.text = '创建新会话...';
    const createResult = await window.webContents.executeJavaScript(`
      (async () => {
        const api = window.electronAPI;
        const result = await api.conversations.create({
          conversationName: 'CLI自动化测试-连续对话',
          description: 'CLI automated test',
          aiApplicationIds: ['doubao']
        });
        return { success: true, conversationId: result.conversationId };
      })()
    `);

    if (!createResult.success) {
      throw new Error('创建会话失败');
    }

    const conversationId = createResult.conversationId;
    testSpinner.text = '会话已创建，等待 3 秒...';
    await sleep(3000);

    // 步骤2：发送第一条消息
    testSpinner.text = '发送第一条消息...';
    await window.webContents.executeJavaScript(`
      (async () => {
        const api = window.electronAPI;
        await api.conversations.sendMessage('${conversationId}', {
          content: '你好，请介绍一下你自己'
        });
      })()
    `);

    // 等待响应
    testSpinner.text = '等待 AI 响应（40秒）...';
    await sleep(40000);

    // 验证第一条消息
    testSpinner.text = '验证第一条消息...';
    const response1 = await window.webContents.executeJavaScript(`
      (async () => {
        const api = window.electronAPI;
        const conversation = await api.conversations.get('${conversationId}');
        const chat = conversation.chats[conversation.chats.length - 1];
        const doubaoMessage = chat.messages.find(m => m.sender === 'doubao');
        return {
          hasContent: !!doubaoMessage?.content,
          contentLength: doubaoMessage?.content?.length || 0,
          status: doubaoMessage?.status,
          platformConversationId: conversation.aiApplicationBindings[0]?.platformConversationId
        };
      })()
    `);

    if (!response1.hasContent || response1.contentLength === 0) {
      throw new Error('第一条消息未收到响应');
    }

    if (response1.status !== 'success') {
      throw new Error(`第一条消息状态错误: ${response1.status}`);
    }

    if (!response1.platformConversationId) {
      throw new Error('未获取到平台会话 ID');
    }

    // 步骤3：发送第二条消息
    testSpinner.text = '发送第二条消息...';
    await window.webContents.executeJavaScript(`
      (async () => {
        const api = window.electronAPI;
        await api.conversations.sendMessage('${conversationId}', {
          content: '你现在能做什么？'
        });
      })()
    `);

    // 等待响应
    testSpinner.text = '等待第二条消息响应（40秒）...';
    await sleep(40000);

    // 验证第二条消息
    testSpinner.text = '验证第二条消息...';
    const response2 = await window.webContents.executeJavaScript(`
      (async () => {
        const api = window.electronAPI;
        const conversation = await api.conversations.get('${conversationId}');
        const chat = conversation.chats[conversation.chats.length - 1];
        const doubaoMessage = chat.messages.find(m => m.sender === 'doubao');
        return {
          hasContent: !!doubaoMessage?.content,
          contentLength: doubaoMessage?.content?.length || 0,
          status: doubaoMessage?.status,
          chatCount: conversation.chats.length,
          platformConversationId: conversation.aiApplicationBindings[0]?.platformConversationId
        };
      })()
    `);

    if (!response2.hasContent || response2.contentLength === 0) {
      throw new Error('第二条消息未收到响应');
    }

    if (response2.status !== 'success') {
      throw new Error(`第二条消息状态错误: ${response2.status}`);
    }

    if (response2.chatCount !== 2) {
      throw new Error(`聊天数量不正确: 期望 2，实际 ${response2.chatCount}`);
    }

    testSpinner.succeed('连续对话测试通过');

    return {
      success: true,
      message: '连续对话功能正常',
      details: {
        第一条消息长度: response1.contentLength,
        第二条消息长度: response2.contentLength,
        平台会话ID: response1.platformConversationId,
        聊天数量: response2.chatCount
      }
    };

  } catch (error) {
    testSpinner.fail('连续对话测试失败');
    throw error;
  }
}

/**
 * 测试标签页复用功能 / Test tab reuse
 */
async function testTabReuse(window: Electron.BrowserWindow): Promise<TestResult> {
  const testSpinner = ora('执行标签页复用测试...').start();

  try {
    // 步骤1：创建第一个会话
    testSpinner.text = '创建第一个会话...';
    const createResult1 = await window.webContents.executeJavaScript(`
      (async () => {
        const api = window.electronAPI;
        const result = await api.conversations.create({
          conversationName: 'CLI自动化测试-标签页1',
          description: 'CLI automated test',
          aiApplicationIds: ['doubao']
        });
        return { success: true, conversationId: result.conversationId };
      })()
    `);

    const conversationId1 = createResult1.conversationId;
    await sleep(3000);

    // 步骤2：发送消息到第一个会话
    testSpinner.text = '发送消息到第一个会话...';
    await window.webContents.executeJavaScript(`
      (async () => {
        const api = window.electronAPI;
        await api.conversations.sendMessage('${conversationId1}', {
          content: '这是第一个会话'
        });
      })()
    `);

    await sleep(40000);

    // 获取第一个会话的 platformConversationId
    testSpinner.text = '获取第一个会话的 ID...';
    const info1 = await window.webContents.executeJavaScript(`
      (async () => {
        const api = window.electronAPI;
        const conversation = await api.conversations.get('${conversationId1}');
        return {
          platformConversationId: conversation.aiApplicationBindings[0]?.platformConversationId
        };
      })()
    `);

    // 步骤3：创建第二个会话
    testSpinner.text = '创建第二个会话...';
    const createResult2 = await window.webContents.executeJavaScript(`
      (async () => {
        const api = window.electronAPI;
        const result = await api.conversations.create({
          conversationName: 'CLI自动化测试-标签页2',
          description: 'CLI automated test',
          aiApplicationIds: ['doubao']
        });
        return { success: true, conversationId: result.conversationId };
      })()
    `);

    const conversationId2 = createResult2.conversationId;
    await sleep(3000);

    // 步骤4：发送消息到第二个会话
    testSpinner.text = '发送消息到第二个会话...';
    await window.webContents.executeJavaScript(`
      (async () => {
        const api = window.electronAPI;
        await api.conversations.sendMessage('${conversationId2}', {
          content: '这是第二个会话'
        });
      })()
    `);

    await sleep(40000);

    // 获取第二个会话的 platformConversationId
    testSpinner.text = '获取第二个会话的 ID...';
    const info2 = await window.webContents.executeJavaScript(`
      (async () => {
        const api = window.electronAPI;
        const conversation = await api.conversations.get('${conversationId2}');
        return {
          platformConversationId: conversation.aiApplicationBindings[0]?.platformConversationId
        };
      })()
    `);

    // 验证：两个会话的 platformConversationId 应该不同
    if (!info1.platformConversationId || !info2.platformConversationId) {
      throw new Error('未获取到平台会话 ID');
    }

    if (info1.platformConversationId === info2.platformConversationId) {
      throw new Error('两个会话使用了相同的平台会话 ID（应该不同）');
    }

    testSpinner.succeed('标签页复用测试通过');

    return {
      success: true,
      message: '标签页复用功能正常',
      details: {
        会话1_ID: info1.platformConversationId,
        会话2_ID: info2.platformConversationId,
        确认不同: info1.platformConversationId !== info2.platformConversationId
      }
    };

  } catch (error) {
    testSpinner.fail('标签页复用测试失败');
    throw error;
  }
}

/**
 * 执行带超时的操作 / Execute with timeout
 */
async function executeWithTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`操作超时 (${timeout}ms)`)), timeout);
  });

  return Promise.race([promise, timeoutPromise]);
}
