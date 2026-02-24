/**
 * 测试 IPC Handler
 * 提供测试专用的 IPC 接口
 * Test-specific IPC handlers
 */

import { ipcMain, app } from 'electron';
import { conversationService } from '../services/conversation.service';
import { storageService } from '../services/storage.service';
import { logService, LogModule } from '../services/log.service';

/**
 * 运行完整流程测试
 * Run complete flow test (核心测试逻辑)
 */
async function runCompleteFlowTest(config: {
  conversationName: string;
  aiApplications: string[];
  message: string;
  timeout?: number;
}) {
  logService.info('test', `开始完整流程测试 / Starting complete flow test`);
  logService.info('test', `配置 / Config: ${JSON.stringify(config)}`);

  const result = {
    success: false,
    steps: [] as Array<{
      step: string;
      status: 'pending' | 'running' | 'success' | 'failed';
      timestamp: number;
      duration?: number;
      error?: string;
    }>,
    conversation: null as any,
    error: undefined as string | undefined
  };

  const addStep = (step: string) => {
    const testStep = {
      step,
      status: 'running' as const,
      timestamp: Date.now()
    };
    result.steps.push(testStep);
    return testStep;
  };

  const completeStep = (testStep: any, success: boolean, error?: string) => {
    testStep.status = success ? 'success' : 'failed';
    testStep.duration = Date.now() - testStep.timestamp;
    testStep.error = error;
  };

  try {
    // Step 1: 创建会话 / Step 1: Create conversation
    const step1 = addStep('创建会话 / Create conversation');
    try {
      const conversation = await conversationService.createConversation(config.aiApplications);
      await conversationService.updateMetadata(conversation.conversationId, {
        conversationName: config.conversationName,
        description: `测试会话 / Test conversation: ${config.conversationName}`
      });
      result.conversation = conversation;
      completeStep(step1, true);
      logService.info('test', `✅ 会话已创建: ${conversation.conversationId}`);
    } catch (error: any) {
      completeStep(step1, false, String(error));
      throw error;
    }

    // Step 2: 发送消息 / Step 2: Send message
    const step2 = addStep('发送消息 / Send message');
    try {
      await conversationService.sendMessage(result.conversation.conversationId, config.message);
      completeStep(step2, true);
      logService.info('test', `✅ 消息已发送`);
    } catch (error: any) {
      completeStep(step2, false, String(error));
      throw error;
    }

    // Step 3: 等待响应 / Step 3: Wait for response
    const step3 = addStep('等待 AI 响应 / Wait for AI response');
    try {
      const timeout = config.timeout || 60000;
      const startTime = Date.now();
      const checkInterval = 2000;

      while (Date.now() - startTime < timeout) {
        // 重新加载会话 / Reload conversation
        const updated = await storageService.loadConversation(result.conversation.conversationId);
        if (!updated) {
          throw new Error('会话不存在 / Conversation not found');
        }

        // 获取最后一个 Chat / Get last chat
        const lastChat = updated.chats[updated.chats.length - 1];
        if (!lastChat) {
          throw new Error('没有找到 Chat / No chat found');
        }

        // 检查是否所有 AI 都已响应 / Check if all AIs have responded
        const aiBindings = updated.aiApplicationBindings;
        const aiMessages = lastChat.messages.filter((m: any) => m.role === 'assistant');

        logService.debug('test', `响应进度 / Progress: ${aiMessages.length}/${aiBindings.length}`);

        // 检查是否所有消息都有内容 / Check if all messages have content
        const allCompleted = aiMessages.every((m: any) =>
          m.status === 'success' || m.status === 'failed'
        );

        if (allCompleted && aiMessages.length === aiBindings.length) {
          result.conversation = updated;
          completeStep(step3, true);
          logService.info('test', `✅ 所有 AI 响应完成`);
          break;
        }

        // 等待一段时间再检查 / Wait before checking again
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }

      if (step3.status === 'running') {
        completeStep(step3, false, '等待超时 / Timeout');
        throw new Error('等待 AI 响应超时 / Timed out waiting for AI response');
      }
    } catch (error: any) {
      completeStep(step3, false, String(error));
      throw error;
    }

    // Step 4: 验证响应 / Step 4: Verify response
    const step4 = addStep('验证响应 / Verify response');
    try {
      const lastChat = result.conversation.chats[result.conversation.chats.length - 1];
      const aiMessages = lastChat.messages.filter((m: any) => m.role === 'assistant');
      const aiBindings = result.conversation.aiApplicationBindings;

      const successfulAIs = aiMessages.filter((m: any) => m.status === 'success');
      const failedAIs = aiMessages.filter((m: any) => m.status === 'failed');

      const verification = {
        totalAIs: aiBindings.length,
        respondedAIs: aiMessages.length,
        successfulAIs: successfulAIs.length,
        failedAIs: failedAIs.length
      };

      const success = verification.respondedAIs === verification.totalAIs &&
                      verification.successfulAIs === verification.totalAIs;

      completeStep(step4, success);

      if (!success) {
        result.error = `部分 AI 响应失败 / Some AI responses failed`;
      } else {
        result.success = true;
      }

      logService.info('test', `✅ 验证完成: ${JSON.stringify(verification)}`);
    } catch (error: any) {
      completeStep(step4, false, String(error));
      throw error;
    }

  } catch (error: any) {
    result.error = String(error);
    logService.error('test', `❌ 测试失败: ${error}`);
  }

  return result;
}

/**
 * 注册测试相关的 IPC handlers
 * Register test-related IPC handlers
 */
export function registerTestHandlers(): void {
  /**
   * 运行完整流程测试（通过 IPC）
   * Run complete flow test (via IPC)
   */
  ipcMain.handle('test:runCompleteFlow', async (_event, config: {
    conversationName: string;
    aiApplications: string[];
    message: string;
    timeout?: number;
  }) => {
    return await runCompleteFlowTest(config);
  });

  logService.info('test', '✅ 测试 IPC handlers 已注册 / Test IPC handlers registered');
}

/**
 * 处理命令行测试参数（通过环境变量）
 * Handle command line test arguments (via environment variables)
 */
export function handleCommandLineTests(): void {
  // 使用环境变量检测测试模式 / Use environment variable to detect test mode
  const testMode = process.env.TEST_MODE;

  if (!testMode || testMode !== 'true') {
    return; // 不是测试模式 / Not test mode
  }

  logService.info('test', '🧪 检测到测试模式 / Test mode detected');

  // 从环境变量读取测试配置 / Read test config from environment variables
  const apps = process.env.TEST_APPS;
  const message = process.env.TEST_MESSAGE;
  const timeout = process.env.TEST_TIMEOUT;

  if (!apps || !message) {
    logService.error('test', '❌ 缺少必要参数 / Missing required parameters: TEST_APPS, TEST_MESSAGE');
    app.exit(1);
    return;
  }

  logService.info('test', `测试配置 / Test config:`);
  logService.info('test', `  AI 应用 / AI apps: ${apps}`);
  logService.info('test', `  消息 / Message: ${message.substring(0, 50)}...`);
  logService.info('test', `  超时 / Timeout: ${timeout || 60000}ms`);

  // 等待应用完全启动后运行测试
  // Wait for app to fully start before running test
  setTimeout(async () => {
    const result = await runCompleteFlowTest({
      conversationName: `测试会话_${Date.now()}`,
      aiApplications: apps.split(','),
      message,
      timeout: timeout ? parseInt(timeout) : 60000
    });

    console.log('\n📊 测试结果 / Test Result:');
    console.log(JSON.stringify(result, null, 2));

    // 退出应用（测试完成后）/ Exit app after test
    app.exit(result.success ? 0 : 1);
  }, 3000); // 等待 3 秒让浏览器启动 / Wait 3 seconds for browser to start
}
