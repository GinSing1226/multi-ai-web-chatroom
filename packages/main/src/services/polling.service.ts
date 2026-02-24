/**
 * 轮询服务 / Polling Service
 * 按设置的间隔定时监控 AI 响应状态
 * Monitor AI response status at configured intervals
 */

import { logService, LogModule } from './log.service';
import { storageService } from './storage.service';
import { conversationService } from './conversation.service';
import { activeSessionService } from './active-session.service';
import { settingsService } from './settings.service';
import { aiApplicationsService } from './ai-applications.service';
import type { Message } from '@shared/types/message.types';
import { areAllAiOutputsComplete } from '@shared/utils/conversation.util';
import { DeepSeekAutomation } from '../automation/deepseek';
import { ChatGPTAutomation } from '../automation/chatgpt';
import { GeminiAutomation } from '../automation/gemini';
import { DoubaoAutomation } from '../automation/doubao';
import { GlMAutomation } from '../automation/glm';
import { KimiAutomation } from '../automation/kimi';
import { QwenAutomation } from '../automation/qwen';
import { browserService } from './browser.service';
import { BrowserWindow, ipcMain } from 'electron';
import { IPC_EVENTS } from '@shared/types/ipc.types';
// 导入任务类型枚举 / Import task type enums
import { TaskClass, InternalTaskType } from '@shared/types/task.types';

/**
 * AI 响应任务状态 / AI Response Task Status
 */
export enum AiResponseStatus {
  PENDING = 'pending',      // 等待中 / Waiting
  GENERATING = 'generating', // 生成中 / Generating
  COMPLETED = 'completed',   // 已完成 / Completed
  FAILED = 'failed'          // 失败 / Failed
}

/**
 * AI 响应任务 / AI Response Task
 *
 * 【新增字段说明 / New Fields Description】
 * 为了支持内部任务（如标题生成、总结），扩展了以下字段：
 * - taskClass: 任务分类（正常会话/内部任务），默认为 CONVERSATION
 * - internalTaskType: 内部任务类型（标题生成/总结生成）
 * - internalConversationId/internalChatId/internalMessageId: 内部任务的临时ID（用于轮询跟踪）
 *
 * 【参数使用规则 / Parameter Usage Rules】
 * 1. 正常会话任务：
 *    - conversationId/chatId/messageId: 用户可见的会话/Chat/Message ID
 *    - 内部任务相关字段为空
 *
 * 2. 标题生成任务（内部任务）：
 *    - conversationId: 目标会话ID（标题要写入的会话）
 *    - chatId/messageId: 空字符串（不创建消息）
 *    - internalConversationId/internalChatId/internalMessageId: 临时会话ID（用于轮询跟踪）
 *
 * 3. 总结生成任务（内部任务）：
 *    - conversationId: 目标会话ID（总结要写入的会话）
 *    - chatId: 目标Chat ID（总结要写入的Chat）
 *    - messageId: 目标Message ID（总结消息的ID）
 *    - internalConversationId/internalChatId/internalMessageId: 临时会话ID（用于轮询跟踪）
 */
interface AiResponseTask {
  // ========== 基础字段 / Basic Fields ==========
  conversationId: string;              // 会话ID（正常任务）/ Conversation ID (normal task)
  aiApplicationId: string;             // AI应用ID / AI application ID
  chatId: string;                      // Chat ID
  messageId: string;                   // Message ID
  status: AiResponseStatus;            // 任务状态 / Task status
  automation: InstanceType<typeof DeepSeekAutomation | typeof ChatGPTAutomation | typeof GeminiAutomation | typeof DoubaoAutomation | typeof GlMAutomation>;
  startTime: number;                   // 开始时间 / Start time
  lastCheckTime: number;               // 最后检查时间 / Last check time
  error?: string;                      // 错误信息 / Error message

  // ========== 内部任务扩展字段 / Internal Task Extension Fields ==========
  taskClass?: TaskClass;               // 任务分类 / Task classification (默认: CONVERSATION)
  internalTaskType?: InternalTaskType; // 内部任务类型 / Internal task type (仅当 taskClass=INTERNAL 时有效)

  // 内部任务专用：临时ID（用于轮询跟踪，不暴露给前端）/ Internal task only: Temp IDs (for polling, not exposed to frontend)
  internalConversationId?: string;     // 内部任务的临时会话ID / Internal task's temp conversation ID
  internalChatId?: string;             // 内部任务的临时Chat ID / Internal task's temp Chat ID
  internalMessageId?: string;          // 内部任务的临时Message ID / Internal task's temp Message ID
}

/**
 * 响应更新回调 / Response Update Callback
 */
type ResponseUpdateCallback = (update: {
  conversationId: string;
  chatId: string;
  messageId: string;
  aiApplicationId: string;
  status: AiResponseStatus;
  content?: string;
  error?: string;
}) => void;

/**
 * 轮询服务类 / Polling Service Class
 */
export class PollingService {
  private tasks = new Map<string, AiResponseTask>();
  private pollTimer: NodeJS.Timeout | null = null;
  private updateCallback: ResponseUpdateCallback | null = null;
  private isRunning = false;

  /**
   * 获取 AI 应用配置 / Get AI application config
   * 返回 AI 应用的基础 URL
   */
  private getAiApplicationConfig(aiApplicationId: string): { baseUrl: string } {
    switch (aiApplicationId) {
      case 'deepseek':
        return { baseUrl: 'https://chat.deepseek.com' };
      case 'chatgpt':
        return { baseUrl: 'https://chatgpt.com' };
      case 'gemini':
        return { baseUrl: 'https://gemini.google.com' };
      case 'doubao':
        return { baseUrl: 'https://www.doubao.com' };
      case 'glm':
        return { baseUrl: 'https://chat.z.ai' };
      case 'kimi':
        return { baseUrl: 'https://kimi.moonshot.cn' };
      case 'qwen':
        return { baseUrl: 'https://www.qianwen.com' };
      default:
        throw new Error(`未知的 AI 应用 / Unknown AI application: ${aiApplicationId}`);
    }
  }

  /**
   * 设置响应更新回调
   */
  setUpdateCallback(callback: ResponseUpdateCallback): void {
    this.updateCallback = callback;
  }

  /**
   * 创建自动化实例 / Create automation instance
   */
  private createAutomationInstance(aiApplicationId: string) {
    switch (aiApplicationId) {
      case 'deepseek':
        return new DeepSeekAutomation();
      case 'chatgpt':
        return new ChatGPTAutomation();
      case 'gemini':
        return new GeminiAutomation();
      case 'doubao':
        return new DoubaoAutomation();
      case 'glm':
        return new GlMAutomation();
      case 'kimi':
        return new KimiAutomation();
      case 'qwen':
        return new QwenAutomation();
      default:
        throw new Error(`不支持的 AI 应用: ${aiApplicationId}`);
    }
  }

  /**
   * 添加响应任务 / Add response task
   * 接受已有的 automation 实例 / Accept existing automation instance
   *
   * 【内部任务支持 / Internal Task Support】
   * 内部任务（标题生成、总结）通过以下可选参数支持：
   * - taskClass: 任务分类（默认 CONVERSATION）
   * - internalTaskType: 内部任务类型（TITLE_GENERATION/SUMMARY_GENERATION）
   * - internalConversationId/internalChatId/internalMessageId: 内部任务的临时ID
   *
   * 【参数使用示例 / Parameter Usage Examples】
   * 1. 正常任务: addTask({ conversationId, aiApplicationId, chatId, messageId, automation })
   * 2. 标题生成: addTask({ conversationId, aiApplicationId, chatId: '', messageId: '', automation,
   *                  taskClass: TaskClass.INTERNAL, internalTaskType: InternalTaskType.TITLE_GENERATION,
   *                  internalConversationId, internalChatId, internalMessageId })
   * 3. 总结生成: addTask({ conversationId, aiApplicationId, chatId, messageId, automation,
   *                  taskClass: TaskClass.INTERNAL, internalTaskType: InternalTaskType.SUMMARY_GENERATION,
   *                  internalConversationId, internalChatId, internalMessageId })
   */
  async addTask(config: {
    conversationId: string;
    aiApplicationId: string;
    chatId: string;
    messageId: string;
    automation: InstanceType<typeof DeepSeekAutomation | typeof ChatGPTAutomation | typeof GeminiAutomation | typeof DoubaoAutomation | typeof GlMAutomation>;
    // ========== 内部任务可选参数 / Internal Task Optional Parameters ==========
    taskClass?: TaskClass;              // 任务分类 / Task classification (默认: CONVERSATION)
    internalTaskType?: InternalTaskType; // 内部任务类型 / Internal task type
    internalConversationId?: string;    // 内部任务的临时会话ID / Internal task's temp conversation ID
    internalChatId?: string;            // 内部任务的临时Chat ID / Internal task's temp Chat ID
    internalMessageId?: string;         // 内部任务的临时Message ID / Internal task's temp Message ID
  }): Promise<void> {
    const taskKey = this.getTaskKey(config.conversationId, config.aiApplicationId);

    logService.info('polling', `📥 addTask 被调用: ${taskKey} / addTask called: ${taskKey}`);
    logService.info('polling', `   当前 isRunning: ${this.isRunning} / Current isRunning`);
    logService.info('polling', `   当前任务数量: ${this.tasks.size} / Current task count`);
    // 【新增日志】记录内部任务信息 / Log internal task info
    if (config.taskClass === TaskClass.INTERNAL) {
      logService.info('polling', `   🔥 内部任务 / Internal task: ${config.internalTaskType}`);
      logService.info('polling', `      internalConversationId: ${config.internalConversationId}`);
      logService.info('polling', `      internalChatId: ${config.internalChatId}`);
    }

    // 检查是否已存在 / Check if already exists
    if (this.tasks.has(taskKey)) {
      logService.warn('polling', `任务已存在 / Task already exists: ${taskKey}`);
      return;
    }

    const task: AiResponseTask = {
      conversationId: config.conversationId,
      aiApplicationId: config.aiApplicationId,
      chatId: config.chatId,
      messageId: config.messageId,
      status: AiResponseStatus.PENDING,
      automation: config.automation,
      startTime: Date.now(),
      lastCheckTime: 0,
      // ========== 内部任务字段 / Internal Task Fields ==========
      // 🔥 【默认值】默认为正常会话任务，只有内部任务才会设置为INTERNAL
      // 🔥 【Default】Default to CONVERSATION task, only INTERNAL tasks set to INTERNAL
      taskClass: config.taskClass ?? TaskClass.CONVERSATION,
      internalTaskType: config.internalTaskType,
      internalConversationId: config.internalConversationId,
      internalChatId: config.internalChatId,
      internalMessageId: config.internalMessageId
    };

    this.tasks.set(taskKey, task);
    logService.info('polling', `✅ 任务已添加到 Map / Task added to map: ${taskKey}`);
    logService.info('polling', `   当前任务数量: ${this.tasks.size} / Current task count after add`);

    // 🔥 【新增】更新消息状态为 waiting（发送成功，等待输出）
    // 🔥 【New】Update message status to waiting (send success, waiting for output)
    if (task.taskClass === TaskClass.CONVERSATION) {
      try {
        const { storageService } = require('./storage.service');
        const conversation = await storageService.loadConversation(task.conversationId);
        if (conversation) {
          const chat = conversation.chats.find(c => c.chatId === task.chatId);
          if (chat) {
            const message = chat.messages.find(m =>
              m.role === 'assistant' &&
              m.sender === task.aiApplicationId &&
              m.status === 'sending'
            );
            if (message) {
              message.status = 'waiting';
              await storageService.saveConversation(conversation);
              logService.info('polling', `✅ 消息状态已更新为 waiting: ${task.aiApplicationId} / Message status updated to waiting`);

              // 🔥 【新增】发送 IPC 事件通知前端，确保 UI 及时更新
              // 🔥 【New】Send IPC event to notify frontend, ensure UI updates in time
              const mainWindow = BrowserWindow.getAllWindows()[0];
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send(IPC_EVENTS.MESSAGE_UPDATED, {
                  conversationId: task.conversationId
                });
                logService.info('polling', `📤 已发送 waiting 状态更新事件到前端 / Sent waiting status update event to frontend`);
              }
            }
          }
        }
      } catch (error) {
        logService.warn('polling', `更新消息状态失败（继续执行）/ Failed to update message status (continuing)`, error);
      }
    }

    // 如果轮询未运行，启动轮询 / Start polling if not running
    if (!this.isRunning) {
      logService.info('polling', `🚀 轮询未运行，准备启动 / Polling not running, preparing to start`);
      try {
        await this.startPolling();
        logService.info('polling', `✅ startPolling() 调用完成 / startPolling() call completed`);
      } catch (error) {
        logService.error('polling', `❌ startPolling() 调用失败 / startPolling() call failed`, error);
      }
    } else {
      logService.info('polling', `轮询已在运行，不重复启动 / Polling already running, not starting again`);
    }

    logService.info('polling', `✅ addTask 完成 / addTask completed`);
  }

  /**
   * 移除任务 / Remove task
   */
  removeTask(conversationId: string, aiApplicationId: string): void {
    const taskKey = this.getTaskKey(conversationId, aiApplicationId);
    const task = this.tasks.get(taskKey);

    if (task) {
      this.tasks.delete(taskKey);
      logService.info('polling', `移除任务: ${taskKey} / Removing task: ${taskKey}`);

      // 🔥 关键：检查该 conversationId 是否还有剩余任务
      // 🔥 Key: Check if this conversationId has any remaining tasks
      const hasRemainingTasks = Array.from(this.tasks.keys()).some(key =>
        key.startsWith(`${conversationId}#`)
      );

      if (!hasRemainingTasks) {
        // 该会话的所有任务都已完成，移除活跃状态
        // All tasks for this conversation completed, remove active status
        logService.info('polling', `✅ 会话 ${conversationId} 的所有任务已完成，移除活跃状态 / All tasks completed for ${conversationId}, removing active status`);
        activeSessionService.clearActiveSession(conversationId);

        // 🔥 【优化】只在正常会话任务完成时触发自动生成标题，不在内部任务完成时触发
        // 🔥 【Optimized】Only trigger auto title generation when normal conversation tasks complete, not when internal tasks complete
        if (task.taskClass === TaskClass.CONVERSATION) {
          this.triggerAutoGenerateTitleIfNeeded(conversationId, task.chatId).catch(error => {
            logService.error('polling', `自动生成标题失败 / Auto title generation failed`, error);
          });
        }
      } else {
        logService.info('polling', `会话 ${conversationId} 还有剩余任务 / Conversation ${conversationId} still has remaining tasks`);
      }
    }
  }

  /**
   * 移除会话的所有任务 / Remove all tasks for a conversation
   */
  removeConversationTasks(conversationId: string): void {
    const keysToRemove: string[] = [];

    for (const [key, task] of this.tasks.entries()) {
      if (task.conversationId === conversationId) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => this.tasks.delete(key));

    if (keysToRemove.length > 0) {
      logService.info('polling', `移除会话的所有任务: ${conversationId}, 数量: ${keysToRemove.length}`);
    }
  }

  /**
   * 启动轮询 / Start polling
   */
  private async startPolling(): Promise<void> {
    logService.info('polling', `📍 进入 startPolling() / Entered startPolling()`);

    if (this.isRunning) {
      logService.warn('polling', '轮询已在运行 / Polling already running');
      return;
    }

    logService.info('polling', `🔄 设置 isRunning = true / Setting isRunning = true`);
    this.isRunning = true;
    logService.info('polling', '🚀 启动轮询服务');

    // 立即执行一次检查
    logService.info('polling', `📋 准备执行第一次 checkTasks() / About to execute first checkTasks()`);
    try {
      await this.checkTasks();
      logService.info('polling', `✅ 第一次 checkTasks() 完成 / First checkTasks() completed`);
    } catch (error) {
      logService.error('polling', `❌ 第一次 checkTasks() 失败 / First checkTasks() failed`, error);
    }

    // 启动定时器
    logService.info('polling', `⏰ 准备启动定时器 / About to start timer`);
    this.scheduleNextCheck();
    logService.info('polling', `✅ startPolling() 完成 / startPolling() completed`);
  }

  /**
   * 停止轮询 / Stop polling
   */
  stopPolling(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    this.isRunning = false;
    logService.info('polling', '停止轮询服务');
  }

  /**
   * 安排下一次检查 / Schedule next check
   * 🔥 【修改】从 settings 获取轮询间隔 / 【Modified】Get polling interval from settings
   */
  private scheduleNextCheck(): void {
    logService.info('polling', `📍 进入 scheduleNextCheck() / Entered scheduleNextCheck()`);
    logService.info('polling', `   isRunning: ${this.isRunning}, tasks.size: ${this.tasks.size} / isRunning, tasks.size`);

    if (!this.isRunning || this.tasks.size === 0) {
      logService.warn('polling', `⚠️ 停止轮询：isRunning=${this.isRunning}, tasks.size=${this.tasks.size} / Stopping polling`);
      this.stopPolling();
      return;
    }

    // 🔥 【修改】从 settings 获取轮询间隔（秒转毫秒）
    // 🔥 【Modified】Get polling interval from settings (seconds to milliseconds)
    settingsService.getSettings().then(settings => {
      const interval = settings.pollingInterval * 1000;
      logService.info('polling', `⏰ 设置定时器，${interval}ms 后执行检查 / Setting timer, will check in ${interval}ms`);

      this.pollTimer = setTimeout(async () => {
        logService.info('polling', `⏰ 定时器触发，执行 checkTasks() / Timer triggered, executing checkTasks()`);
        await this.checkTasks();
        this.scheduleNextCheck(); // 递归安排下一次检查 / Schedule next check recursively
      }, interval);

      logService.info('polling', `✅ 定时器已设置 / Timer scheduled`);
    }).catch(error => {
      logService.error('polling', '获取设置失败，使用默认轮询间隔 2 秒 / Failed to get settings, using default polling interval 2s', error);
      // 使用默认值 / Use default value
      const interval = 2000;
      this.pollTimer = setTimeout(async () => {
        await this.checkTasks();
        this.scheduleNextCheck();
      }, interval);
    });
  }

  /**
   * 检查所有任务 / Check all tasks
   */
  private async checkTasks(): Promise<void> {
    logService.info('polling', `📍 checkTasks() 被调用 / checkTasks() called`);
    logService.info('polling', `   当前任务数量: ${this.tasks.size} / Current task count`);

    if (this.tasks.size === 0) {
      logService.debug('polling', '没有任务需要检查 / No tasks to check');
      return;
    }

    logService.info('polling', `检查任务，数量: ${this.tasks.size} / Checking tasks, count`);

    const tasksToCheck = Array.from(this.tasks.values());
    logService.info('polling', `准备检查 ${tasksToCheck.length} 个任务 / About to check ${tasksToCheck.length} tasks`);

    for (const task of tasksToCheck) {
      logService.info('polling', `→ 即将检查任务: ${this.getTaskKey(task.conversationId, task.aiApplicationId)} / About to check task`);
      try {
        await this.checkTask(task);
        logService.info('polling', `✅ 任务检查完成: ${this.getTaskKey(task.conversationId, task.aiApplicationId)} / Task check completed`);
      } catch (error) {
        logService.error('polling', `❌ 任务检查抛出异常: ${this.getTaskKey(task.conversationId, task.aiApplicationId)} / Task check threw error`, error);
      }
    }

    logService.info('polling', `✅ checkTasks() 完成，剩余任务数量: ${this.tasks.size} / checkTasks() completed, remaining tasks: ${this.tasks.size}`);
  }

  /**
   * 检查单个任务 / Check single task
   */
  private async checkTask(task: AiResponseTask): Promise<void> {
    const taskKey = this.getTaskKey(task.conversationId, task.aiApplicationId);

    logService.info('polling', `📍 checkTask() 方法被调用 / checkTask() method called`);
    logService.info('polling', `   taskKey: ${taskKey} / taskKey`);

    // 🔥 【新增】记录内部任务信息 / Log internal task info
    if (task.taskClass === TaskClass.INTERNAL) {
      logService.info('polling', `🔥 检测到内部任务 / Detected internal task`);
      logService.info('polling', `   任务类型 / Task type: ${task.internalTaskType} / ${task.internalTaskType}`);
      logService.info('polling', `   目标会话ID / Target conversationId: ${task.conversationId}`);
      logService.info('polling', `   临时会话ID / Temp conversationId: ${task.internalConversationId}`);
    }

    try {
      task.lastCheckTime = Date.now();

      logService.info('polling', `===== 开始检查任务 ===== / ===== Starting task check =====`);
      logService.info('polling', `任务信息: conversationId=${task.conversationId}, aiApplicationId=${task.aiApplicationId}, chatId=${task.chatId}, messageId=${task.messageId} / Task info`);

      // 🔥 关键改动：每次检查时动态获取当前打开的页面，而不是依赖存储的 automation 对象
      // 🔥 Key change: Dynamically get current open page on each check, instead of relying on stored automation object
      const { baseUrl } = this.getAiApplicationConfig(task.aiApplicationId);

      // 🔥 【新增】内部任务使用临时会话ID获取page / Internal tasks use temp conversation ID to get page
      const pageConversationId = task.taskClass === TaskClass.INTERNAL
        ? (task.internalConversationId || task.conversationId)
        : task.conversationId;

      logService.info('polling', `🔥 使用page标识符 / Using page identifier: ${pageConversationId}`);

      const page = await browserService.getOrCreatePage(
        pageConversationId,  // 🔥 内部任务使用临时ID / Internal tasks use temp ID
        task.aiApplicationId,
        baseUrl,
        { forceNavigate: false }
      );

      logService.info('polling', `✅ 动态获取页面成功: ${page.url()} / Dynamically retrieved page successfully`);

      // 创建新的 automation 实例并设置 page
      // Create new automation instance and set page
      let automation;
      switch (task.aiApplicationId) {
        case 'deepseek':
          automation = new DeepSeekAutomation();
          break;
        case 'chatgpt':
          automation = new ChatGPTAutomation();
          break;
        case 'gemini':
          automation = new GeminiAutomation();
          break;
        case 'doubao':
          automation = new DoubaoAutomation();
          break;
        case 'glm':
          automation = new GlMAutomation();
          break;
        case 'kimi':
          automation = new KimiAutomation();
          break;
        case 'qwen':
          automation = new QwenAutomation();
          break;
        default:
          throw new Error(`不支持的 AI 应用 / Unsupported AI application: ${task.aiApplicationId}`);
      }

      automation.setPage(page);
      logService.info('polling', `✅ Automation 实例创建并设置 Page / Automation instance created and page set`);

      // 检查是否正在生成 / Check if generating
      const isGenerating = await automation.isGenerating();
      logService.info('polling', `${taskKey}: 检查生成状态 isGenerating = ${isGenerating} / Checking generation status`);

      if (isGenerating) {
        // 仍在生成中 / Still generating
        // 继续等待，不做其他处理
        // Continue waiting, do nothing else
        if (task.status !== AiResponseStatus.GENERATING) {
          task.status = AiResponseStatus.GENERATING;

          // 🔥 关键：如果 platformConversationId 为空，延迟2秒后触发获取会话ID任务
          // 🔥 Key: If platformConversationId is empty, trigger get conversation ID task after 2 seconds delay
          const conversation = await storageService.loadConversation(task.conversationId);
          if (conversation) {
            const binding = conversation.aiApplicationBindings.find(b => b.aiApplicationId === task.aiApplicationId);
            if (binding && (!binding.platformConversationId || binding.platformConversationId === '')) {
              logService.info('polling', `监控到第一个字产生，延迟2秒后获取会话ID / Detected first character, will get conversation ID after 2 seconds`);

              setTimeout(async () => {
                if (task.aiApplicationId === 'doubao') {
                  await this.updateDoubaoConversationId(task);
                } else if (task.aiApplicationId === 'deepseek') {
                  await this.updateDeepSeekConversationId(task);
                } else if (task.aiApplicationId === 'glm') {
                  await this.updateGlmConversationId(task);
                } else if (task.aiApplicationId === 'kimi') {
                  await this.updateKimiConversationId(task);
                } else if (task.aiApplicationId === 'chatgpt') {
                  await this.updateChatGPTConversationId(task);
                } else if (task.aiApplicationId === 'gemini') {
                  await this.updateGeminiConversationId(task);
                } else if (task.aiApplicationId === 'qwen') {
                  await this.updateQwenConversationId(task);
                }
              }, 2000);
            }
          }

          this.notifyUpdate(task);
          logService.info('polling', `${taskKey}: 开始生成 / Started generating`);
        }
        return;
      }

      // 🔥 关键保护：如果从未进入生成状态，且时间太短，可能是检测失败
      // 🔥 Key protection: If never entered generating state and too short, might be detection failure
      const elapsedMs = Date.now() - task.startTime;
      if (elapsedMs < 5000) {
        // 5秒内就检测到完成，可能是误判，继续等待
        logService.warn('polling', `${taskKey}: 检测时间过短（${elapsedMs}ms），可能是误判，继续等待 / Detection too short, might be false positive, continuing to wait`);
        return;
      }

      // 不在生成状态，尝试提取响应
      // Not generating, try to extract response
      logService.info('polling', `不在生成状态，开始提取响应 / Not generating, starting to extract response`);
      const responseContent = await automation.extractResponse();
      logService.info('polling', `${taskKey}: 提取到内容长度 = ${responseContent?.length || 0} / Extracted content length`);

      // 🔥 关键：如果 platformConversationId 为空，说明响应太快，从未进入生成状态
      // 🔥 Key: If platformConversationId is empty, it means response was too fast, never entered generating state
      // 需要在提取响应后立即获取 ID
      // Need to get ID immediately after extracting response
      const conversation = await storageService.loadConversation(task.conversationId);
      if (conversation) {
        const binding = conversation.aiApplicationBindings.find(b => b.aiApplicationId === task.aiApplicationId);
        if (binding && (!binding.platformConversationId || binding.platformConversationId === '')) {
          logService.info('polling', `响应已完成但 platformConversationId 为空，立即获取会话ID / Response completed but platformConversationId is empty, getting ID immediately`);

          if (task.aiApplicationId === 'doubao') {
            await this.updateDoubaoConversationId(task);
          } else if (task.aiApplicationId === 'deepseek') {
            await this.updateDeepSeekConversationId(task);
          } else if (task.aiApplicationId === 'glm') {
            await this.updateGlmConversationId(task);
          } else if (task.aiApplicationId === 'kimi') {
            await this.updateKimiConversationId(task);
          } else if (task.aiApplicationId === 'chatgpt') {
            await this.updateChatGPTConversationId(task);
          } else if (task.aiApplicationId === 'gemini') {
            await this.updateGeminiConversationId(task);
          } else if (task.aiApplicationId === 'qwen') {
            await this.updateQwenConversationId(task);
          }
        }
      }

      if (responseContent && responseContent.trim().length > 0) {
        // 成功获取响应 / Successfully got response
        task.status = AiResponseStatus.COMPLETED;

        // 🔥 【新增】根据任务类型路由到不同的处理逻辑 / Route to different handlers based on task type
        if (task.taskClass === TaskClass.INTERNAL) {
          // 内部任务处理 / Internal task handling
          logService.info('polling', `${taskKey}: 检测到内部任务，路由到专用处理器 / Detected internal task, routing to specialized handler`);
          logService.info('polling', `   internalTaskType: ${task.internalTaskType} / internalTaskType`);

          if (task.internalTaskType === InternalTaskType.TITLE_GENERATION) {
            // 标题生成任务 / Title generation task
            await this.handleTitleGenerationComplete(task, responseContent);
          } else if (task.internalTaskType === InternalTaskType.SUMMARY_GENERATION) {
            // 总结生成任务 / Summary generation task
            await this.handleSummaryGenerationComplete(task, responseContent);
          } else {
            logService.warn('polling', `${taskKey}: 未知内部任务类型 / Unknown internal task type: ${task.internalTaskType}`);
            this.removeTask(task.conversationId, task.aiApplicationId);
          }
        } else {
          // 正常会话任务处理（原有逻辑）/ Normal conversation task handling (existing logic)
          // 🔥 【修改】使用 updateMessageStatus 更新现有消息，而不是创建新消息
          // 🔥 【Modified】Use updateMessageStatus to update existing message instead of creating new one
          await this.updateMessageStatus(
            task.conversationId,
            task.chatId,
            task.aiApplicationId,
            'success',
            responseContent
          );

          // 查找消息以获取 messageId（用于通知）
          // Find message to get messageId (for notification)
          const conversation = await storageService.loadConversation(task.conversationId);
          if (conversation) {
            const chat = conversation.chats.find(c => c.chatId === task.chatId);
            if (chat) {
              const message = chat.messages.find(m =>
                m.role === 'assistant' &&
                m.sender === task.aiApplicationId
              );
              if (message) {
                task.messageId = message.messageId;
              }
            }
          }

          this.notifyUpdate(task, responseContent);
          logService.info('polling', `${taskKey}: 响应完成，长度: ${responseContent.length} / Response completed, length`);

          // 移除已完成任务（会检查是否需要清除活跃状态）
          // Remove completed task (will check if active status needs to be cleared)
          this.removeTask(task.conversationId, task.aiApplicationId);
        }
      } else {
        // 没有响应内容，检查是否超时
        // No response content, check if timeout
        // 🔥 【修改】从 AI 应用获取超时时间 / 【Modified】Get timeout from AI application
        const elapsedMs = Date.now() - task.startTime;

        // 🔥 【修改】获取 AI 应用的超时时间设置
        // 🔥 【Modified】Get timeout setting from AI application
        const aiApps = await aiApplicationsService.getApplications();
        const aiApp = aiApps.find(app => app.id === task.aiApplicationId);
        const timeoutSeconds = aiApp?.timeout || 120; // 默认 120 秒
        const timeoutMs = timeoutSeconds * 1000;

        logService.info('polling', `${taskKey}: 等待响应中，已过时间: ${elapsedMs}ms, 超时设置: ${timeoutSeconds}s / Waiting for response, elapsed: ${elapsedMs}ms, timeout: ${timeoutSeconds}s`);

        if (elapsedMs > timeoutMs) {
          // 超时，标记为失败 / Timeout, mark as failed
          task.status = AiResponseStatus.FAILED;
          task.error = '响应超时 / Response timeout';
          this.notifyUpdate(task);
          logService.warn('polling', `${taskKey}: 响应超时 / Response timeout`);

          // 🔥 【新增】更新消息状态为 outputTimeout
          // 🔥 【New】Update message status to outputTimeout
          if (task.taskClass === TaskClass.CONVERSATION) {
            await this.updateMessageStatus(
              task.conversationId,
              task.chatId,
              task.aiApplicationId,
              'outputTimeout',
              '',
              task.error
            );
          }

          // 🔥 【新增】内部任务需要清理临时资源 / Internal tasks need to cleanup temporary resources
          if (task.taskClass === TaskClass.INTERNAL) {
            logService.warn('polling', `${taskKey}: 内部任务超时，清理临时资源 / Internal task timeout, cleaning up temporary resources`);
            await this.cleanupInternalTask(task);
          } else {
            this.removeTask(task.conversationId, task.aiApplicationId);
          }
        } else if (elapsedMs > 15000) {
          // 🔥 如果已经等待超过 15 秒，且 isGenerating 返回 false，但提取不到内容
          // 说明可能 isGenerating 判断错误，或者 AI 已经完成但内容提取失败
          // 此时应该尝试最后一次提取，如果还是失败就移除任务
          logService.warn('polling', `${taskKey}: 已等待超过 15 秒但仍未提取到内容，可能提取失败 / Waited over 15s but still no content, extraction might have failed`);

          // 尝试最后一次提取（可能需要更长的等待时间）
          // Try one last extraction (might need longer wait time)
          await page.waitForTimeout(3000);
          const finalContent = await automation.extractResponse();

          if (finalContent && finalContent.trim().length > 0) {
            // 最后一次提取成功 / Last extraction successful
            // 🔥 【修改】使用 updateMessageStatus 更新现有消息
            // 🔥 【Modified】Use updateMessageStatus to update existing message
            task.status = AiResponseStatus.COMPLETED;
            await this.updateMessageStatus(
              task.conversationId,
              task.chatId,
              task.aiApplicationId,
              'success',
              finalContent
            );

            // 查找消息以获取 messageId / Find message to get messageId
            const conversation = await storageService.loadConversation(task.conversationId);
            if (conversation) {
              const chat = conversation.chats.find(c => c.chatId === task.chatId);
              if (chat) {
                const message = chat.messages.find(m =>
                  m.role === 'assistant' &&
                  m.sender === task.aiApplicationId
                );
                if (message) {
                  task.messageId = message.messageId;
                }
              }
            }
            this.notifyUpdate(task, finalContent);
            logService.info('polling', `${taskKey}: 延迟提取成功，长度: ${finalContent.length} / Delayed extraction succeeded, length`);
            this.removeTask(task.conversationId, task.aiApplicationId);
          } else {
            // 最后一次提取也失败，标记为失败
            task.status = AiResponseStatus.FAILED;
            task.error = '提取失败 / Extraction failed';
            this.notifyUpdate(task);
            logService.error('polling', `${taskKey}: 提取失败，移除任务 / Extraction failed, removing task`);

            // 🔥 【新增】更新消息状态为 outputFailed
            // 🔥 【New】Update message status to outputFailed
            if (task.taskClass === TaskClass.CONVERSATION) {
              await this.updateMessageStatus(
                task.conversationId,
                task.chatId,
                task.aiApplicationId,
                'outputFailed',
                '',
                task.error
              );
            }

            this.removeTask(task.conversationId, task.aiApplicationId);
          }
        }
      }
    } catch (error) {
      logService.error('polling', `${taskKey}: 检查失败 / Check failed`, error);

      task.status = AiResponseStatus.FAILED;
      task.error = error instanceof Error ? error.message : '未知错误';
      this.notifyUpdate(task);

      // 🔥 【新增】更新消息状态为 outputFailed
      // 🔥 【New】Update message status to outputFailed
      if (task.taskClass === TaskClass.CONVERSATION) {
        await this.updateMessageStatus(
          task.conversationId,
          task.chatId,
          task.aiApplicationId,
          'outputFailed',
          '',
          task.error
        );
      }

      // 🔥 【新增】内部任务需要清理临时资源 / Internal tasks need to cleanup temporary resources
      if (task.taskClass === TaskClass.INTERNAL) {
        logService.error('polling', `${taskKey}: 内部任务失败，清理临时资源 / Internal task failed, cleaning up temporary resources`);
        await this.cleanupInternalTask(task);
      } else {
        this.removeTask(task.conversationId, task.aiApplicationId);
      }
    }
  }

  /**
   * 更新豆包会话 ID
   * Update Doubao conversation ID
   */
  private async updateDoubaoConversationId(task: AiResponseTask): Promise<void> {
    try {
      logService.info('polling', `尝试获取豆包会话 ID / Trying to get Doubao conversation ID`);
      const doubaoAutomation = task.automation as any;
      if (typeof doubaoAutomation.getCurrentConversationId === 'function') {
        const conversationId = await doubaoAutomation.getCurrentConversationId();
        logService.info('polling', `getCurrentConversationId 返回: ${conversationId || 'empty'} / getCurrentConversationId returned`);
        if (conversationId) {
          logService.info('polling', `✅ 获取到豆包会话 ID: ${conversationId} / Got Doubao conversation ID`);
          // 直接调用 conversationService 更新 platformConversationId
          // Directly call conversationService to update platformConversationId
          await conversationService.updatePlatformConversationId(
            task.conversationId,
            task.aiApplicationId,
            conversationId
          );
          logService.info('polling', `✅ 已保存豆包会话 ID 到会话文件 / Saved Doubao conversation ID to session file`);
        } else {
          logService.warn('polling', `豆包会话 ID 为空，可能 URL 还未更新 / Doubao conversation ID is empty, URL might not have updated yet`);
        }
      } else {
        logService.warn('polling', `getCurrentConversationId 方法不存在 / getCurrentConversationId method does not exist`);
      }
    } catch (error) {
      logService.error('polling', `获取豆包会话 ID 失败 / Failed to get Doubao conversation ID`, error);
    }
  }

  /**
   * 更新 DeepSeek 会话 ID
   * Update DeepSeek conversation ID
   */

  /**
   * 更新消息状态 / Update message status
   * 用于更新已有消息的状态（如从 waiting 改为 success/failed）
   * Used to update existing message status (e.g., from waiting to success/failed)
   */
  private async updateMessageStatus(
    conversationId: string,
    chatId: string,
    aiApplicationId: string,
    status: 'success' | 'outputTimeout' | 'outputFailed',
    content?: string,
    error?: string
  ): Promise<void> {
    try {
      const conversation = await storageService.loadConversation(conversationId);
      if (!conversation) {
        logService.warn('polling', `更新消息状态失败：会话不存在 / Update message status failed: conversation not found: ${conversationId}`);
        return;
      }

      const chat = conversation.chats.find(c => c.chatId === chatId);
      if (!chat) {
        logService.warn('polling', `更新消息状态失败：Chat 不存在 / Update message status failed: Chat not found: ${chatId}`);
        return;
      }

      // 查找该 AI 的消息（状态为 waiting 的）
      const message = chat.messages.find(m =>
        m.role === 'assistant' &&
        m.sender === aiApplicationId &&
        (m.status === 'sending' || m.status === 'waiting')
      );

      if (message) {
        // 更新状态
        message.status = status;
        if (content !== undefined) {
          message.content = content;
        }
        if (error) {
          message.error = error;
        }

        await storageService.saveConversation(conversation);
        logService.info('polling', `✅ 消息状态已更新: ${aiApplicationId} -> ${status} / Message status updated: ${aiApplicationId} -> ${status}`);
      } else {
        logService.warn('polling', `未找到 ${aiApplicationId} 的 waiting/sending 状态消息 / No waiting/sending message found for ${aiApplicationId}`);
      }
    } catch (saveError) {
      logService.error('polling', `更新消息状态时出错 / Error updating message status`, saveError);
    }
  }

  /**
   * 创建 AI 消息并插入到会话中 / Create AI message and insert into conversation
   * 由轮询服务在获取到 AI 响应后调用 / Called by polling service after getting AI response
   */
  private async createAiMessage(
    conversationId: string,
    chatId: string,
    aiApplicationId: string,
    content: string
  ): Promise<string> {
    try {
      // 加载会话 / Load conversation
      const conversation = await storageService.loadConversation(conversationId);
      if (!conversation) {
        logService.error('polling', `会话不存在: ${conversationId} / Conversation not found`);
        return '';
      }

      // 查找对应的 Chat / Find corresponding chat
      const chat = conversation.chats.find(c => c.chatId === chatId);
      if (!chat) {
        logService.error('polling', `Chat 不存在: ${chatId} / Chat not found`);
        return '';
      }

      // 生成新的 messageId / Generate new messageId
      const { generateMessageId } = await import('@shared/utils/id-generator');
      const messageId = generateMessageId();

      // 创建 AI 消息 / Create AI message
      const aiMessage: Message = {
        messageId,
        role: 'assistant',
        sender: aiApplicationId,
        timestamp: Date.now(),
        content,
        status: 'success'
      };

      // 添加到 chat 中 / Add to chat
      chat.messages.push(aiMessage);

      // 🔥 调试：确认消息内容
      // 🔥 Debug: Verify message content
      logService.info('polling', `📝 即将保存消息，content长度: ${content.length}`);
      logService.info('polling', `📝 消息内容前500字符: ${content.substring(0, 500)}`);
      logService.info('polling', `📝 消息内容后500字符: ${content.substring(Math.max(0, content.length - 500))}`);

      // 更新会话时间戳 / Update conversation timestamp
      conversation.updateTime = Date.now();

      // 保存会话 / Save conversation
      await storageService.saveConversation(conversation);

      logService.info('polling', `✅ 保存完成，验证消息长度: ${aiMessage.content.length}`);

      logService.info('polling', `✅ 创建 AI 消息成功: messageId=${messageId}, chatId=${chatId}, aiApplicationId=${aiApplicationId}, contentLength=${content.length} / AI message created successfully`);

      return messageId;
    } catch (error) {
      logService.error('polling', `创建 AI 消息失败 / Failed to create AI message`, error);
      return '';
    }
  }

  private async updateDeepSeekConversationId(task: AiResponseTask): Promise<void> {
    try {
      logService.info('polling', `尝试获取 DeepSeek 会话 ID / Trying to get DeepSeek conversation ID`);
      const deepseekAutomation = task.automation as any;
      if (typeof deepseekAutomation.getCurrentConversationId === 'function') {
        const conversationId = await deepseekAutomation.getCurrentConversationId();
        logService.info('polling', `getCurrentConversationId 返回: ${conversationId || 'empty'} / getCurrentConversationId returned`);
        if (conversationId) {
          logService.info('polling', `✅ 获取到 DeepSeek 会话 ID: ${conversationId} / Got DeepSeek conversation ID`);
          // 直接调用 conversationService 更新 platformConversationId
          // Directly call conversationService to update platformConversationId
          await conversationService.updatePlatformConversationId(
            task.conversationId,
            task.aiApplicationId,
            conversationId
          );
          logService.info('polling', `✅ 已保存 DeepSeek 会话 ID 到会话文件 / Saved DeepSeek conversation ID to session file`);
        } else {
          logService.warn('polling', `DeepSeek 会话 ID 为空，可能 URL 还未更新 / DeepSeek conversation ID is empty, URL might not have updated yet`);
        }
      } else {
        logService.warn('polling', `getCurrentConversationId 方法不存在 / getCurrentConversationId method does not exist`);
      }
    } catch (error) {
      logService.error('polling', `获取 DeepSeek 会话 ID 失败 / Failed to get DeepSeek conversation ID`, error);
    }
  }

  /**
   * 更新 GLM 会话 ID
   * Update GLM conversation ID
   */
  private async updateGlmConversationId(task: AiResponseTask): Promise<void> {
    try {
      logService.info('polling', `尝试获取 GLM 会话 ID / Trying to get GLM conversation ID`);
      const glmAutomation = task.automation as any;
      if (typeof glmAutomation.getCurrentConversationId === 'function') {
        const conversationId = await glmAutomation.getCurrentConversationId();
        logService.info('polling', `getCurrentConversationId 返回: ${conversationId || 'empty'} / getCurrentConversationId returned`);
        if (conversationId) {
          logService.info('polling', `✅ 获取到 GLM 会话 ID: ${conversationId} / Got GLM conversation ID`);
          // 直接调用 conversationService 更新 platformConversationId
          // Directly call conversationService to update platformConversationId
          await conversationService.updatePlatformConversationId(
            task.conversationId,
            task.aiApplicationId,
            conversationId
          );
          logService.info('polling', `✅ 已保存 GLM 会话 ID 到会话文件 / Saved GLM conversation ID to session file`);
        } else {
          logService.warn('polling', `GLM 会话 ID 为空，可能 URL 还未更新 / GLM conversation ID is empty, URL might not have updated yet`);
        }
      } else {
        logService.warn('polling', `getCurrentConversationId 方法不存在 / getCurrentConversationId method does not exist`);
      }
    } catch (error) {
      logService.error('polling', `获取 GLM 会话 ID 失败 / Failed to get GLM conversation ID`, error);
    }
  }

  /**
   * 更新 Kimi 会话 ID
   * Update Kimi conversation ID
   */
  private async updateKimiConversationId(task: AiResponseTask): Promise<void> {
    try {
      logService.info('polling', `尝试获取 Kimi 会话 ID / Trying to get Kimi conversation ID`);
      const kimiAutomation = task.automation as any;
      if (typeof kimiAutomation.getCurrentConversationId === 'function') {
        const conversationId = await kimiAutomation.getCurrentConversationId();
        logService.info('polling', `getCurrentConversationId 返回: ${conversationId || 'empty'} / getCurrentConversationId returned`);
        if (conversationId) {
          logService.info('polling', `✅ 获取到 Kimi 会话 ID: ${conversationId} / Got Kimi conversation ID`);
          // 直接调用 conversationService 更新 platformConversationId
          // Directly call conversationService to update platformConversationId
          await conversationService.updatePlatformConversationId(
            task.conversationId,
            task.aiApplicationId,
            conversationId
          );
          logService.info('polling', `✅ 已保存 Kimi 会话 ID 到会话文件 / Saved Kimi conversation ID to session file`);
        } else {
          logService.warn('polling', `Kimi 会话 ID 为空，可能 URL 还未更新 / Kimi conversation ID is empty, URL might not have updated yet`);
        }
      } else {
        logService.warn('polling', `getCurrentConversationId 方法不存在 / getCurrentConversationId method does not exist`);
      }
    } catch (error) {
      logService.error('polling', `获取 Kimi 会话 ID 失败 / Failed to get Kimi conversation ID`, error);
    }
  }

  /**
   * 更新 ChatGPT 会话 ID
   * Update ChatGPT conversation ID
   */
  private async updateChatGPTConversationId(task: AiResponseTask): Promise<void> {
    try {
      logService.info('polling', `尝试获取 ChatGPT 会话 ID / Trying to get ChatGPT conversation ID`);
      const chatgptAutomation = task.automation as any;
      if (typeof chatgptAutomation.getCurrentConversationId === 'function') {
        const conversationId = await chatgptAutomation.getCurrentConversationId();
        logService.info('polling', `getCurrentConversationId 返回: ${conversationId || 'empty'} / getCurrentConversationId returned`);
        if (conversationId) {
          logService.info('polling', `✅ 获取到 ChatGPT 会话 ID: ${conversationId} / Got ChatGPT conversation ID`);
          // 直接调用 conversationService 更新 platformConversationId
          // Directly call conversationService to update platformConversationId
          await conversationService.updatePlatformConversationId(
            task.conversationId,
            task.aiApplicationId,
            conversationId
          );
          logService.info('polling', `✅ 已保存 ChatGPT 会话 ID 到会话文件 / Saved ChatGPT conversation ID to session file`);
        } else {
          logService.warn('polling', `ChatGPT 会话 ID 为空，可能 URL 还未更新 / ChatGPT conversation ID is empty, URL might not have updated yet`);
        }
      } else {
        logService.warn('polling', `getCurrentConversationId 方法不存在 / getCurrentConversationId method does not exist`);
      }
    } catch (error) {
      logService.error('polling', `获取 ChatGPT 会话 ID 失败 / Failed to get ChatGPT conversation ID`, error);
    }
  }

  /**
   * 更新 Gemini 会话 ID
   * Update Gemini conversation ID
   */
  private async updateGeminiConversationId(task: AiResponseTask): Promise<void> {
    try {
      logService.info('polling', `尝试获取 Gemini 会话 ID / Trying to get Gemini conversation ID`);
      const geminiAutomation = task.automation as any;
      if (typeof geminiAutomation.getCurrentConversationId === 'function') {
        const conversationId = await geminiAutomation.getCurrentConversationId();
        logService.info('polling', `getCurrentConversationId 返回: ${conversationId || 'empty'} / getCurrentConversationId returned`);
        if (conversationId) {
          logService.info('polling', `✅ 获取到 Gemini 会话 ID: ${conversationId} / Got Gemini conversation ID`);
          // 直接调用 conversationService 更新 platformConversationId
          // Directly call conversationService to update platformConversationId
          await conversationService.updatePlatformConversationId(
            task.conversationId,
            task.aiApplicationId,
            conversationId
          );
          logService.info('polling', `✅ 已保存 Gemini 会话 ID 到会话文件 / Saved Gemini conversation ID to session file`);
        } else {
          logService.warn('polling', `Gemini 会话 ID 为空，可能 URL 还未更新 / Gemini conversation ID is empty, URL might not have updated yet`);
        }
      } else {
        logService.warn('polling', `getCurrentConversationId 方法不存在 / getCurrentConversationId method does not exist`);
      }
    } catch (error) {
      logService.error('polling', `获取 Gemini 会话 ID 失败 / Failed to get Gemini conversation ID`, error);
    }
  }

  /**
   * 更新 Qwen 会话 ID
   * Update Qwen conversation ID
   */
  private async updateQwenConversationId(task: AiResponseTask): Promise<void> {
    try {
      logService.info('polling', `尝试获取 Qwen 会话 ID / Trying to get Qwen conversation ID`);
      const qwenAutomation = task.automation as any;
      if (typeof qwenAutomation.getCurrentConversationId === 'function') {
        const conversationId = await qwenAutomation.getCurrentConversationId();
        logService.info('polling', `getCurrentConversationId 返回: ${conversationId || 'empty'} / getCurrentConversationId returned`);
        if (conversationId) {
          logService.info('polling', `✅ 获取到 Qwen 会话 ID: ${conversationId} / Got Qwen conversation ID`);
          // 直接调用 conversationService 更新 platformConversationId
          // Directly call conversationService to update platformConversationId
          await conversationService.updatePlatformConversationId(
            task.conversationId,
            task.aiApplicationId,
            conversationId
          );
          logService.info('polling', `✅ 已保存 Qwen 会话 ID 到会话文件 / Saved Qwen conversation ID to session file`);
        } else {
          logService.warn('polling', `Qwen 会话 ID 为空，可能 URL 还未更新 / Qwen conversation ID is empty, URL might not have updated yet`);
        }
      } else {
        logService.warn('polling', `getCurrentConversationId 方法不存在 / getCurrentConversationId method does not exist`);
      }
    } catch (error) {
      logService.error('polling', `获取 Qwen 会话 ID 失败 / Failed to get Qwen conversation ID`, error);
    }
  }

  /**
   * 清理内部任务临时资源 / Cleanup internal task temporary resources
   *
   * 【功能说明 / Function Description】
   * 统一处理内部任务的临时资源清理，包括：
   * - 删除临时会话文件
   * - 关闭 AI 应用的 page
   * - 移除轮询任务
   *
   * 【调用时机 / Call Timing】
   * - 正常完成后
   * - 超时后
   * - 发生错误后
   *
   * 【参数说明 / Parameter Description】
   * @param task - 轮询任务对象
   */
  /**
   * 清理内部任务临时资源（优化2.0）
   * Cleanup internal task temporary resources (Optimized 2.0)
   *
   * 【优化点 / Optimizations】
   * 1. 不关闭AI应用的page（复用标签页）/ Don't close AI application page (reuse tab)
   * 2. 清除活跃会话（允许用户继续操作）/ Clear active session (allow user to continue)
   * 3. 删除临时会话文件 / Delete temporary conversation file
   */
  private async cleanupInternalTask(task: AiResponseTask): Promise<void> {
    try {
      logService.info('polling', `🧹 清理内部任务临时资源 (优化2.0) / Cleanup internal task temporary resources (Optimized 2.0)`);
      logService.info('polling', `   internalConversationId: ${task.internalConversationId}`);
      logService.info('polling', `   aiApplicationId: ${task.aiApplicationId}`);

      // 🔥 【优化2.0】Step 1: 清除活跃会话（允许用户继续操作）
      // 🔥 【Optimized 2.0】Step 1: Clear active session (allow user to continue)
      if (task.internalConversationId) {
        await activeSessionService.clearActiveSession(task.internalConversationId);
        logService.info('polling', `✅ 内部任务活跃会话已清除 / Internal task active session cleared`);
      }

      // Step 2: 删除临时会话文件 / Delete temporary conversation file
      if (task.internalConversationId) {
        await storageService.deleteConversation(task.internalConversationId);
        logService.info('polling', `✅ 临时会话文件已删除 / Temporary conversation file deleted`);
      }

      // 🔥 【优化2.0】Step 3: 不关闭page（复用AI应用标签页）
      // 🔥 【Optimized 2.0】Step 3: Don't close page (reuse AI application tab)
      // 之前是：await browserService.closePage(task.aiApplicationId, task.internalConversationId);
      // 现在是：不调用closePage，让page保持打开状态，供后续使用
      logService.info('polling', `ℹ️ 保持AI应用page打开（复用标签页）/ Keep AI application page open (reuse tab)`);

      // Step 4: 移除轮询任务 / Remove polling task
      this.removeTask(task.conversationId, task.aiApplicationId);

      logService.info('polling', `✅ 内部任务清理完成 (优化2.0) / Internal task cleanup completed (Optimized 2.0)`);
    } catch (error) {
      logService.error('polling', '❌ 清理内部任务失败 / Cleanup internal task failed', error);
      // 即使清理失败，也要确保任务被移除
      this.removeTask(task.conversationId, task.aiApplicationId);
    }
  }

  /**
   * 处理标题生成任务完成 / Handle title generation task completion
   *
   * 【触发时机 / Trigger Timing】
   * 轮询服务检测到标题生成任务完成（isGenerating = false 且提取到内容）
   * Polling service detects title generation task completed
   *
   * 【可回滚标记 / Rollback Marker】🔥 标题生成完成处理-v2
   */
  private async handleTitleGenerationComplete(
    task: AiResponseTask,
    responseContent: string
  ): Promise<void> {
    logService.info('polling', `🎯 ========================================`);
    logService.info('polling', `🎯 标题生成任务完成 / Title generation task completed`);
    logService.info('polling', `🎯 ========================================`);
    logService.info('polling', `   目标会话ID / Target conversationId: ${task.conversationId}`);
    logService.info('polling', `   临时会话ID / Temp conversationId: ${task.internalConversationId}`);
    logService.info('polling', `   AI输出长度 / AI output length: ${responseContent.length}`);
    logService.info('polling', `   AI输出预览 / AI output preview: ${responseContent.substring(0, 100)}...`);

    try {
      // Step 1: 提取JSON内容 / Extract JSON content
      // AI可能返回纯JSON或包裹在markdown代码块中
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('未找到JSON格式的输出 / No JSON format output found');
      }

      const jsonString = jsonMatch[0];

      // Step 2: 解析JSON / Parse JSON
      let parsed: { conversationName?: string; description?: string };
      try {
        parsed = JSON.parse(jsonString);
      } catch (error) {
        logService.error('polling', 'JSON解析失败 / JSON parse failed', error);
        throw new Error('JSON解析失败 / JSON parse failed');
      }

      // 验证必要字段 / Validate required fields
      if (!parsed.conversationName || !parsed.description) {
        throw new Error('JSON缺少必要字段 / JSON missing required fields');
      }

      // 截断超长文本 / Truncate oversized text
      const conversationName = parsed.conversationName.length > 30
        ? parsed.conversationName.substring(0, 30)
        : parsed.conversationName;
      const description = parsed.description.length > 200
        ? parsed.description.substring(0, 200)
        : parsed.description;

      logService.info('polling', `   解析结果 / Parsed result:`);
      logService.info('polling', `      conversationName: ${conversationName}`);
      logService.info('polling', `      description: ${description}`);

      // Step 3: 更新会话元数据 / Update conversation metadata
      await conversationService.updateMetadata(task.conversationId, {
        conversationName,
        description
      });

      logService.info('polling', `✅ 会话元数据已更新 / Conversation metadata updated`);

      // 🔥 【优化2.0】Step 4: 清理内部任务临时资源 / Cleanup internal task temporary resources
      // 不再直接调用 closePage，而是调用统一的 cleanupInternalTask
      await this.cleanupInternalTask(task);

      logService.info('polling', `✅ 标题生成任务完成处理结束 / Title generation task handling completed`);

    } catch (error) {
      logService.error('polling', '❌ 标题生成任务处理失败 / Title generation task handling failed', error);

      // 🔥 【优化2.0】失败时也要清理临时资源 / Cleanup temporary resources even on failure
      await this.cleanupInternalTask(task);
    }
  }

  /**
   * 处理总结生成任务完成 / Handle summary generation task completion
   *
   * 【触发时机 / Trigger Timing】
   * 轮询服务检测到总结生成任务完成（isGenerating = false 且提取到内容）
   * Polling service detects summary generation task completed
   *
   * 【可回滚标记 / Rollback Marker】🔥 总结生成完成处理-v2
   */
  private async handleSummaryGenerationComplete(
    task: AiResponseTask,
    responseContent: string
  ): Promise<void> {
    logService.info('polling', `📝 ========================================`);
    logService.info('polling', `📝 总结生成任务完成 / Summary generation task completed`);
    logService.info('polling', `📝 ========================================`);
    logService.info('polling', `   目标会话ID / Target conversationId: ${task.conversationId}`);
    logService.info('polling', `   目标Chat ID / Target chatId: ${task.chatId}`);
    logService.info('polling', `   目标Message ID / Target messageId: ${task.messageId}`);
    logService.info('polling', `   临时会话ID / Temp conversationId: ${task.internalConversationId}`);
    logService.info('polling', `   总结内容长度 / Summary content length: ${responseContent.length}`);
    logService.info('polling', `   总结内容预览 / Summary content preview: ${responseContent.substring(0, 100)}...`);

    try {
      // Step 1: 加载目标会话 / Load target conversation
      const conversation = await storageService.loadConversation(task.conversationId);
      if (!conversation) {
        throw new Error(`目标会话不存在 / Target conversation not found: ${task.conversationId}`);
      }

      // Step 2: 找到目标 Chat / Find target Chat
      const chat = conversation.chats.find(c => c.chatId === task.chatId);
      if (!chat) {
        throw new Error(`目标Chat不存在 / Target Chat not found: ${task.chatId}`);
      }

      // Step 3: 找到目标总结消息 / Find target summary message
      const message = chat.messages.find(m => m.messageId === task.messageId);
      if (!message) {
        throw new Error(`目标总结消息不存在 / Target summary message not found: ${task.messageId}`);
      }

      // Step 4: 更新消息内容 / Update message content
      message.content = responseContent;
      // 🔥 【移除】不设置status字段，会话文件中的消息没有这个字段
      // 🔥 【Removed】Don't set status field, messages in conversation files don't have this field

      logService.info('polling', `   总结消息已更新 / Summary message updated`);
      logService.info('polling', `   总结内容长度 / Summary content length: ${responseContent.length}`);

      // Step 5: 保存会话文件 / Save conversation file
      await storageService.saveConversation(conversation);
      logService.info('polling', `✅ 会话文件已保存 / Conversation file saved`);

      // Step 6: 发送 IPC 事件通知前端 / Send IPC event to notify frontend
      // 🔥 【新增】总结完成后发送特殊标记，让前端清除加载状态
      // 🔥 【New】Send special marker after summary completion so frontend can clear loading state
      this.notifyUpdate(task, undefined, undefined, true);  // 🔥 第4个参数标记为内部任务完成
      logService.info('polling', `✅ IPC 事件已发送（内部任务完成）/ IPC event sent (internal task completed)`);

      // 🔥 【优化2.0】Step 7: 清理内部任务临时资源 / Cleanup internal task temporary resources
      // 不再直接调用 closePage，而是调用统一的 cleanupInternalTask
      await this.cleanupInternalTask(task);

      logService.info('polling', `✅ 总结生成任务完成处理结束 / Summary generation task handling completed`);

    } catch (error) {
      logService.error('polling', '❌ 总结生成任务处理失败 / Summary generation task handling failed', error);

      // 🔥 【优化2.0】失败时也要清理临时资源 / Cleanup temporary resources even on failure
      await this.cleanupInternalTask(task);
    }
  }

  /**
   * 通知更新 / Notify update
   * 根据文档：只发送 IPC 事件，不调用回调函数
   * According to document: Only send IPC event, don't call callback function
   *
   * 🔥 【修改】需要先调用 updateCallback 触发 handleAiResponseUpdate
   * 🔥 【Modified】Need to call updateCallback first to trigger handleAiResponseUpdate
   *
   * @param task - AI响应任务 / AI response task
   * @param content - 响应内容 / Response content
   * @param platformConversationId - 平台会话ID / Platform conversation ID
   * @param internalTaskComplete - 内部任务完成标记 / Internal task completion marker
   */
  private notifyUpdate(task: AiResponseTask, content?: string, platformConversationId?: string, internalTaskComplete?: boolean): void {
    // 🔥 【新增】先调用 updateCallback，触发 handleAiResponseUpdate
    // 这会触发自动生成标题等逻辑
    if (this.updateCallback) {
      this.updateCallback({
        conversationId: task.conversationId,
        chatId: task.chatId,
        messageId: task.messageId,
        aiApplicationId: task.aiApplicationId,
        status: task.status,
        content: content,
        error: task.error,
        platformConversationId: platformConversationId
      });
      logService.info('polling', `✅ updateCallback 已调用 / updateCallback called`);
    }

    // 发送 IPC 事件到渲染进程
    // 根据文档：事件只携带 conversationId，前端收到后调用 selectConversation(id) 获取最新会话文件内容
    // According to document: Event only carries conversationId, frontend calls selectConversation(id) to get latest conversation file content
    const mainWindow = BrowserWindow.getAllWindows()[0];

    logService.info('polling', `📍 notifyUpdate 被调用 / notifyUpdate called`);
    logService.info('polling', `   mainWindow 存在: ${!!mainWindow} / mainWindow exists`);
    logService.info('polling', `   conversationId: ${task.conversationId} / conversationId`);

    if (mainWindow && !mainWindow.isDestroyed()) {
      const eventData: any = {
        conversationId: task.conversationId
      };

      // 🔥 【新增】如果是内部任务完成，添加标记
      // 🔥 【New】Add marker if internal task completed
      if (internalTaskComplete) {
        eventData.internalTaskComplete = true;
      }

      logService.info('polling', `📤 准备发送事件 / Preparing to send event`);
      logService.info('polling', `   主窗口 URL: ${mainWindow.webContents.getURL()} / Main window URL`);
      logService.info('polling', `   主窗口是否聚焦: ${mainWindow.isFocused()} / Main window focused`);
      logService.info('polling', `   事件名称: ${IPC_EVENTS.MESSAGE_UPDATED} / Event name`);
      logService.info('polling', `   事件数据: ${JSON.stringify(eventData)} / Event data`);

      mainWindow.webContents.send(IPC_EVENTS.MESSAGE_UPDATED, eventData);

      logService.info('polling', `✅ webContents.send() 已调用 / webContents.send() called`);
    } else {
      logService.warn('polling', `⚠️ 主窗口不存在或已销毁，无法发送事件 / Main window does not exist or is destroyed`);
    }
  }

  /**
   * 生成任务键 / Generate task key
   */
  private getTaskKey(conversationId: string, aiApplicationId: string): string {
    return `${conversationId}#${aiApplicationId}`;
  }

  /**
   * 触发自动生成标题（如果需要）
   * Trigger auto title generation (if needed)
   *
   * 【触发条件 / Trigger Conditions】
   * 1. 所有AI任务都已完成（removeTask被调用）
   * 2. 是第一轮对话（conversation.chats.length === 1）
   * 3. 有AI输出（role='assistant'，允许为空）
   */
  private async triggerAutoGenerateTitleIfNeeded(conversationId: string, chatId: string): Promise<void> {
    try {
      logService.info('polling', `🎯 检查是否需要自动生成标题 / Checking if auto title generation needed`);
      logService.info('polling', `   conversationId: ${conversationId}`);
      logService.info('polling', `   chatId: ${chatId}`);

      // 🔥 【新增】等待一小段时间，确保 createAiMessage 的保存完成
      await new Promise(resolve => setTimeout(resolve, 200));

      // 加载会话
      logService.info('polling', `📂 加载会话文件 / Loading conversation file`);
      const conversation = await storageService.loadConversation(conversationId);
      if (!conversation) {
        logService.warn('polling', `⚠️ 会话不存在，跳过 / Conversation not found, skipping`);
        return;
      }

      logService.info('polling', `✅ 会话已加载 / Conversation loaded`);
      logService.info('polling', `   Chat数 / Chats count: ${conversation.chats.length}`);

      // 检查是否是第一轮对话
      if (conversation.chats.length !== 1) {
        logService.info('polling', `跳过自动生成标题：不是第一轮对话 / Skip auto title: not first round (chats: ${conversation.chats.length})`);
        return;
      }

      const chat = conversation.chats[0];
      logService.info('polling', `✅ 找到第一个Chat / Found first chat`);
      logService.info('polling', `   Chat消息数 / Chat messages count: ${chat.messages.length}`);

      // 🔥 【关键】检查是否所有AI都已输出完成（使用公共方法）
      // 🔥 【Key】Check if all AIs have completed output (using common method)
      const aiBindingsCount = conversation.aiApplicationBindings.length;
      const allCompleted = areAllAiOutputsComplete(chat, aiBindingsCount);

      logService.info('polling', `   AI应用绑定数量 / AI bindings count: ${aiBindingsCount}`);
      logService.info('polling', `   所有AI是否完成 / All AIs completed: ${allCompleted}`);

      // 只有当所有AI都输出完成后才生成标题
      if (!allCompleted) {
        logService.info('polling', `跳过自动生成标题：尚未收到所有AI输出 / Skip auto title: not all AI outputs received`);
        return;
      }

      logService.info('polling', `✅ 满足条件，触发自动生成标题 / Conditions met, triggering auto title generation`);

      // 调用 conversationService 的 autoGenerateTitle 方法
      await conversationService.autoGenerateTitle(conversationId, chat.chatId);

    } catch (error) {
      logService.error('polling', `❌ 触发自动生成标题失败 / Failed to trigger auto title generation`, error);
    }
  }

  /**
   * 获取任务状态 / Get task status
   */
  getTaskStatus(conversationId: string, aiApplicationId: string): AiResponseStatus | null {
    const taskKey = this.getTaskKey(conversationId, aiApplicationId);
    const task = this.tasks.get(taskKey);
    return task ? task.status : null;
  }

  /**
   * 获取活跃任务数量 / Get active task count
   */
  getActiveTaskCount(): number {
    return this.tasks.size;
  }
}

// 导出单例
export const pollingService = new PollingService();
