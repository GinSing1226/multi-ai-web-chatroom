/**
 * 会话业务逻辑服务
 * Conversation Business Logic Service
 */

import type { Conversation } from '@shared/types/conversation.types';
import type { Message, MessageRole } from '@shared/types/message.types';
import type { AiApplication } from '@shared/types/ai-application.types';
import { generateConversationId, generateChatId, generateMessageId } from '@shared/utils/id-generator';
import { storageService } from './storage.service';
import { browserService } from './browser.service';
import { logService, LogModule } from './log.service';
import { pollingService, AiResponseStatus } from './polling.service';
import { activeSessionService } from './active-session.service';
import { ipcMain, BrowserWindow } from 'electron';
import { IPC_EVENTS } from '@shared/types/ipc.types';
import { settingsService } from './settings.service';
// 导入任务类型枚举 / Import task type enums
import { TaskClass, InternalTaskType } from '@shared/types/task.types';
// 导入 AI 应用配置 / Import AI application configuration
import { getAiApplicationConfig as getConfig } from '@shared/config/ai-applications.config';

/**
 * 安全获取主窗口 / Safely get main window
 * 在测试环境或非 Electron 环境中返回 undefined
 * Returns undefined in test or non-Electron environment
 */
function getMainWindow(): Electron.BrowserWindow | undefined {
  try {
    if (typeof BrowserWindow === 'undefined') {
      return undefined;
    }
    return BrowserWindow.getAllWindows()[0];
  } catch {
    return undefined;
  }
}

/**
 * 发送活跃会话状态变化事件 / Send active session changed event
 */
function notifyActiveSessionChanged(): void {
  const mainWindow = getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    activeSessionService.getActiveSession().then(activeSession => {
      mainWindow.webContents.send(IPC_EVENTS.ACTIVE_SESSION_CHANGED, {
        conversationId: activeSession?.activeConversationId || null,
        timestamp: activeSession?.activeTimestamp || null
      });
      logService.info('conversation', `发送活跃会话变化事件: ${activeSession?.activeConversationId || 'none'} / Sent active session changed event`);
    }).catch(error => {
      logService.error('conversation', '获取活跃会话失败 / Failed to get active session', error);
    });
  }
}

/**
 * 会话服务类 / Conversation Service Class
 */
export class ConversationService {
  private updateCallback: ((conversation: Conversation) => void) | null = null;

  constructor() {
    // 初始化时设置轮询服务的更新回调
    this.initPollingCallback();
  }

  /**
   * 设置会话更新回调 / Set conversation update callback
   */
  setUpdateCallback(callback: (conversation: Conversation) => void): void {
    this.updateCallback = callback;
  }

  /**
   * 初始化轮询服务回调 / Initialize polling service callback
   */
  private initPollingCallback(): void {
    pollingService.setUpdateCallback(async (update) => {
      await this.handleAiResponseUpdate(update);
    });
  }

  /**
   * 处理 AI 响应更新 / Handle AI response update
   */
  private async handleAiResponseUpdate(update: {
    conversationId: string;
    chatId: string;
    messageId: string;
    aiApplicationId: string;
    status: AiResponseStatus;
    content?: string;
    error?: string;
    platformConversationId?: string;
  }): Promise<void> {
    logService.info('conversation', `收到 AI 响应更新: conversationId=${update.conversationId}, chatId=${update.chatId}, messageId=${update.messageId}, status=${update.status} / Received AI response update`);

    // 加载会话
    const conversation = await storageService.loadConversation(update.conversationId);
    if (!conversation) {
      logService.error('conversation', `会话不存在: ${update.conversationId} / Conversation not found`);
      return;
    }

    logService.info('conversation', `会话加载成功，共有 ${conversation.chats.length} 个 Chats / Conversation loaded, total chats`);

    // 打印所有 chatId 以便调试
    conversation.chats.forEach((c, idx) => {
      logService.debug('conversation', `  Chat[${idx}]: ${c.chatId}, 消息数: ${c.messages.length} / Chat info`);
    });

    // 查找对应的 Chat
    const chat = conversation.chats.find(c => c.chatId === update.chatId);
    if (!chat) {
      logService.error('conversation', `Chat 不存在: ${update.chatId}，可用的 Chats: ${conversation.chats.map(c => c.chatId).join(', ')} / Chat not found, available chats`);
      return;
    }

    logService.info('conversation', `✅ 找到 Chat: ${update.chatId}，消息数: ${chat.messages.length} / Found chat, message count`);
    chat.messages.forEach((m, idx) => {
      logService.debug('conversation', `  Message[${idx}]: messageId=${m.messageId}, sender=${m.sender}, status=${m.status} / Message info`);
    });

    // 如果 messageId 为空，说明是生成中状态更新，不需要查找消息，直接发送事件让前端刷新
    // If messageId is empty, it's a generating status update, no need to find message, just send event to let frontend refresh
    if (!update.messageId) {
      logService.debug('conversation', `messageId 为空，是生成中状态更新，直接发送事件 / messageId is empty, generating status update, sending event directly`);

      // 更新平台会话 ID（如果有）/ Update platform conversation ID (if provided)
      if (update.platformConversationId) {
        const binding = conversation.aiApplicationBindings.find(b => b.aiApplicationId === update.aiApplicationId);
        if (binding) {
          const oldId = binding.platformConversationId;
          binding.platformConversationId = update.platformConversationId;
          logService.info('conversation', `✅ 更新平台会话 ID: ${update.aiApplicationId} ${oldId} -> ${update.platformConversationId} / Updated platform conversation ID`);
          await storageService.saveConversation(conversation);
        }
      }

      // 仍然发送事件通知前端刷新 / Still send event to notify frontend to refresh
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC_EVENTS.MESSAGE_UPDATED, update);
        logService.info('conversation', `📤 发送消息更新事件到前端（生成中）/ Sent message update event to frontend (generating)`);
      }
      return;
    }

    // 查找对应的消息
    const message = chat.messages.find(m => m.messageId === update.messageId);
    if (!message) {
      // 🔥 【修改】消息可能已在 createAiMessage 中创建，这里找不到也没关系
      // 🔥 【Modified】Message may have been created in createAiMessage, it's OK if not found here
      logService.warn('conversation', `⚠️ 消息不存在: ${update.messageId}，可能在 createAiMessage 中已创建 / Message not found, may have been created in createAiMessage`);
      logService.warn('conversation', `   该 Chat 中的消息 IDs: ${chat.messages.map(m => m.messageId).join(', ')} / Message IDs in this chat`);
      // 🔥 不要 return，继续执行后面的逻辑（检查所有AI完成并触发自动生成标题）
      // 🔥 Don't return, continue to check if all AI completed and trigger auto title generation
    } else {
      // 消息存在，更新消息状态
      // Update message status if message exists

      // 更新平台会话 ID（如果有）
      // Update platform conversation ID (if provided)
      if (update.platformConversationId) {
        const binding = conversation.aiApplicationBindings.find(b => b.aiApplicationId === update.aiApplicationId);
        if (binding) {
          const oldId = binding.platformConversationId;
          binding.platformConversationId = update.platformConversationId;
          logService.info('conversation', `✅ 更新平台会话 ID: ${update.aiApplicationId} ${oldId} -> ${update.platformConversationId} / Updated platform conversation ID`);

          // 立即保存，确保会话 ID 不会丢失
          // Save immediately to ensure conversation ID is not lost
          await storageService.saveConversation(conversation);
          logService.info('conversation', `✅ 会话已保存（包含更新的平台会话 ID）/ Conversation saved (with updated platform conversation ID)`);
        }
      }

      // 更新消息状态
      if (update.status === AiResponseStatus.COMPLETED && update.content) {
        message.content = update.content;
        message.status = 'success';
        logService.info('conversation', `AI 响应成功: ${update.aiApplicationId} / AI response successful`);
      } else if (update.status === AiResponseStatus.FAILED) {
        message.status = 'failed';
        message.error = update.error || '未知错误';
        logService.error('conversation', `AI 响应失败: ${update.aiApplicationId} - ${update.error} / AI response failed`);
      } else if (update.status === AiResponseStatus.GENERATING) {
        // 生成中状态，可选：发送生成中事件
        logService.debug('conversation', `AI 正在生成: ${update.aiApplicationId} / AI is generating`);
      }

      // 更新会话时间戳
      conversation.updateTime = Date.now();

      // 保存会话
      await storageService.saveConversation(conversation);
    }

    // 🔥 【关键】无论消息是否找到，都要检查是否所有AI完成并触发自动生成标题
    // 🔥 【Key】Always check if all AI completed and trigger auto title generation, regardless of message found

    // 更新平台会话 ID（如果有）
    // Update platform conversation ID (if provided)
    if (update.platformConversationId) {
      const binding = conversation.aiApplicationBindings.find(b => b.aiApplicationId === update.aiApplicationId);
      if (binding) {
        const oldId = binding.platformConversationId;
        binding.platformConversationId = update.platformConversationId;
        logService.info('conversation', `✅ 更新平台会话 ID: ${update.aiApplicationId} ${oldId} -> ${update.platformConversationId} / Updated platform conversation ID`);

        // 立即保存，确保会话 ID 不会丢失
        // Save immediately to ensure conversation ID is not lost
        await storageService.saveConversation(conversation);
        logService.info('conversation', `✅ 会话已保存（包含更新的平台会话 ID）/ Conversation saved (with updated platform conversation ID)`);
      }
    }

    // 更新消息状态
    if (update.status === AiResponseStatus.COMPLETED && update.content) {
      message.content = update.content;
      message.status = 'success';
      logService.info('conversation', `AI 响应成功: ${update.aiApplicationId} / AI response successful`);
    } else if (update.status === AiResponseStatus.FAILED) {
      message.status = 'failed';
      message.error = update.error || '未知错误';
      logService.error('conversation', `AI 响应失败: ${update.aiApplicationId} - ${update.error} / AI response failed`);
    } else if (update.status === AiResponseStatus.GENERATING) {
      // 生成中状态，可选：发送生成中事件
      logService.debug('conversation', `AI 正在生成: ${update.aiApplicationId} / AI is generating`);
    }

    // 更新会话时间戳
    conversation.updateTime = Date.now();

    // 保存会话
    await storageService.saveConversation(conversation);

    // 通知前端更新
    if (this.updateCallback) {
      this.updateCallback(conversation);
    }

    // 发送 IPC 事件
    if (update.status === AiResponseStatus.COMPLETED) {
      ipcMain.emit(IPC_EVENTS.MESSAGE_UPDATED, {
        conversationId: update.conversationId,
        chatId: update.chatId,
        messageId: update.messageId,
        aiApplicationId: update.aiApplicationId
      });

      // 🔥 【移除】旧的"所有AI完成"检查逻辑已移除
      // 🔥 【Removed】Old "all AI completed" check logic removed
      // 真正的完成检查由 polling.service.ts 的 removeTask 通过剩余任务数量判断
      // Real completion check is done by polling.service.ts removeTask through remaining task count
    }
  }
  /**
   * 🔥 【新增】预分配会话（两阶段创建：阶段1）
   * 🔥 【New】Begin conversation creation (Two-phase create: Phase 1)
   *
   * 立即创建活跃会话文件，返回预分配的 conversationId
   * Immediately create active session file, return pre-allocated conversationId
   *
   * @returns 预分配结果 / Reserve result
   */
  async beginCreateConversation(): Promise<{ success: boolean; conversationId: string | null }> {
    logService.info('conversation', `开始预分配会话 / Starting to reserve conversation`);

    // 检查是否可以创建
    const canCreate = await activeSessionService.canCreateNewSession();
    if (!canCreate) {
      const activeSession = await activeSessionService.getActiveSession();
      logService.warn('conversation', `无法创建会话，当前有活跃会话: ${activeSession?.activeConversationId} / Cannot create, active session exists`);
      return { success: false, conversationId: null };
    }

    // 生成真实的 conversationId
    const conversationId = generateConversationId();

    // 立即写入活跃会话文件
    await activeSessionService.setActiveSession(conversationId);
    logService.info('conversation', `✅ 预分配成功，conversationId: ${conversationId} / Reserve successful`);

    return { success: true, conversationId };
  }

  /**
   * 🔥 【新增】取消预分配
   * 🔥 【New】Cancel reservation
   */
  async cancelCreateConversation(conversationId: string): Promise<void> {
    logService.info('conversation', `取消预分配: ${conversationId} / Canceling reservation: ${conversationId}`);

    const activeSession = await activeSessionService.getActiveSession();
    if (activeSession && activeSession.activeConversationId === conversationId) {
      await activeSessionService.clearActiveSession();
      logService.info('conversation', `✅ 预分配已取消: ${conversationId} / Reservation canceled`);
    }
  }

  /**
   * 创建新会话（修改为支持预留conversationId）
   * Create new conversation (Modified to support reserved conversationId)
   */
  async createConversation(reservedConversationId: string | null, aiApplicationIds: string[]): Promise<Conversation> {
    logService.info('conversation', `开始创建会话，AI应用: ${aiApplicationIds.join(', ')} / Starting to create conversation, AI applications`);

    // 🔥 【新增】如果有预留的 conversationId，验证它
    // 🔥 【New】If there's a reserved conversationId, validate it
    let conversationId: string;
    if (reservedConversationId) {
      const activeSession = await activeSessionService.getActiveSession();
      if (!activeSession || activeSession.activeConversationId !== reservedConversationId) {
        throw new Error('预留已失效，请重试 / Reservation expired, please retry');
      }
      conversationId = reservedConversationId;
      logService.info('conversation', `使用预留的 conversationId: ${conversationId} / Using reserved conversationId`);
    } else {
      // 兼容旧逻辑：没有预留时直接生成
      conversationId = generateConversationId();
      logService.info('conversation', `生成新的 conversationId: ${conversationId} / Generated new conversationId`);
    }

    const now = Date.now();

    logService.debug('conversation', `生成会话ID: ${conversationId} / Generated conversation ID`);

    // 生成 AI 应用绑定关系（临时，后续访问时会更新）
    const aiApplicationBindings = aiApplicationIds.map(id => ({
      aiApplicationId: id,
      platformConversationId: '' // 将在首次发送消息时创建
    }));

    const conversation: Conversation = {
      conversationName: `${new Date().toLocaleDateString('zh-CN')}_${conversationId.substring(0, 8)}`,
      description: '',
      conversationId,
      createTime: now,
      updateTime: now,
      aiApplicationBindings,
      chats: []
    };

    logService.debug('conversation', `会话对象创建完成，准备保存: ${JSON.stringify(conversation, null, 2)} / Conversation object created, preparing to save`);

    try {
      await storageService.saveConversation(conversation);
      logService.info('conversation', `会话保存成功: ${conversationId} / Conversation saved successfully`);
    } catch (error) {
      logService.error('conversation', `会话保存失败: ${conversationId} / Failed to save conversation`, error);
      throw error;
    }

    return conversation;
  }

  /**
   * 发送消息到各 AI 平台 / Send message to AI platforms
   * 使用轮询服务异步监控响应 / Use polling service for async response monitoring
   *
   * @returns 返回更新后的会话对象 / Returns updated conversation object
   */
  async sendMessage(
    conversationId: string,
    content: string
  ): Promise<Conversation> {
    logService.info('conversation', `开始发送消息到会话: ${conversationId} / Starting to send message to conversation`);

    // 1. 检查活跃会话限制 / Check active session restriction
    const canSend = await this.canSendMessage(conversationId);
    if (!canSend) {
      const activeSession = await activeSessionService.getActiveSession();
      throw new Error(`当前有其他活跃会话，请等待完成后再发送消息 / Another active session exists: ${activeSession?.activeConversationId}`);
    }

    // 2. 设置当前会话为活跃 / Set current session as active
    await activeSessionService.setActiveSession(conversationId);
    logService.info('conversation', `✅ 设置活跃会话: ${conversationId} / Set active session`);

    // 通知前端活跃会话状态变化 / Notify frontend of active session change
    notifyActiveSessionChanged();

    const conversation = await storageService.loadConversation(conversationId);
    if (!conversation) throw new Error('会话不存在 / Conversation not found');

    logService.info('conversation', `会话加载成功，AI 绑定数量: ${conversation.aiApplicationBindings.length} / Conversation loaded successfully, AI bindings count`);

    // 创建用户消息 / Create user message
    const userMessage: Message = {
      messageId: generateMessageId(),
      role: 'user',
      sender: null,
      timestamp: Date.now(),
      content
    };

    // 创建新的 Chat / Create new chat
    const chatId = generateChatId();
    const chat = {
      chatId,
      messages: [userMessage]
    };

    logService.info('conversation', `创建新 Chat: ${chatId} / Created new chat`);

    // 添加到会话 / Add to conversation
    conversation.chats.push(chat);
    conversation.updateTime = Date.now();

    // 检查是否有 AI 绑定 / Check if there are AI bindings
    if (conversation.aiApplicationBindings.length === 0) {
      logService.warn('conversation', '没有 AI 应用绑定，跳过发送 / No AI application bindings, skipping send');
      await storageService.saveConversation(conversation);
      return;
    }

    // 🔥 【新增】为每个 AI 绑定创建初始消息（状态为 sending）
    // 🔥 【New】Create initial messages for each AI binding (status: sending)
    for (const binding of conversation.aiApplicationBindings) {
      const aiMessage: Message = {
        messageId: generateMessageId(),
        role: 'assistant',
        sender: binding.aiApplicationId,
        timestamp: Date.now(),
        content: '',
        status: 'sending'  // 🔥 初始状态：发送中
      };
      chat.messages.push(aiMessage);
    }

    // 保存会话（包含用户消息和初始 AI 消息）
    // Save conversation (including user message and initial AI messages)
    await storageService.saveConversation(conversation);

    logService.info('conversation', `会话已保存（包含 ${conversation.aiApplicationBindings.length} 个初始 AI 消息），准备发送 / Conversation saved (with ${conversation.aiApplicationBindings.length} initial AI messages), preparing to send`);

    // 🔥 关键修改：异步发送消息到 AI 平台，不等待完成
    // 🔥 Key change: Send messages to AI platforms asynchronously, don't wait for completion
    // 这样可以立即返回，让前端显示用户消息
    // This allows immediate return so frontend can display user message
    this.sendToAiPlatformsAsync(conversationId, chatId, content, conversation.aiApplicationBindings)
      .catch(error => {
        logService.error('conversation', `异步发送到 AI 平台失败 / Async send to AI platforms failed`, error);
      });

    logService.info('conversation', `✅ 消息已保存，AI 平台发送在后台进行 / Message saved, AI platform sending in background`);

    // 立即返回会话对象，让前端可以立即显示用户消息
    // Return conversation object immediately so frontend can display user message right away
    return conversation;
  }

  /**
   * 获取 AI 应用配置 / Get AI application config
   * 从配置文件读取 / Read from configuration file
   */
  private getAiApplicationConfig(aiApplicationId: string): { baseUrl: string } {
    const config = getConfig(aiApplicationId);
    return { baseUrl: config.baseUrl };
  }

  /**
   * 【更新】生成总结 / 【Updated】Generate summary
   * 使用设置的AI应用来生成总结内容
   * 复用现有的发送消息和轮询机制
   *
   * 【可回滚标记 / Rollback Marker】🔥 总结生成-v2
   * 🔥 【修改】如果已有总结消息，清空内容；否则创建新的 / 【Modified】If summary exists, clear content; otherwise create new
   */
  async generateSummary(conversationId: string, chatId: string): Promise<void> {
    const conversation = await storageService.loadConversation(conversationId);
    if (!conversation) throw new Error('会话不存在 / Conversation not found');

    const chat = conversation.chats.find(c => c.chatId === chatId);
    if (!chat) throw new Error('聊天记录不存在 / Chat history not found');

    // 获取用户消息
    const userMessage = chat.messages.find(m => m.role === 'user');
    if (!userMessage) throw new Error('用户消息不存在 / User message not found');

    // 🔥 【简化】收集所有 AI 输出（role='assistant'），不检查status
    // 🔥 【Simplified】Collect all AI outputs (role='assistant'), don't check status
    const aiOutputs = chat.messages
      .filter(m => m.role === 'assistant')
      .map(m => `【${m.sender}】:\n${m.content}`)
      .join('\n\n---\n\n');

    if (aiOutputs.length === 0) {
      throw new Error('没有可用的AI输出进行总结 / No AI outputs available for summary');
    }

    // 获取设置中的总结AI应用和提示词
    const settings = await settingsService.getSettings();
    const summaryAiApplication = settings.summaryAiApplication || 'deepseek';
    const summaryPrompt = settings.summaryPrompt || '深入阅读理解以下内容，总结综合各方内容并输出。你只能输出总结内容，禁止输出其它内容。';

    // 构建完整的prompt
    const fullPrompt = `${summaryPrompt}\n\n用户问题：\n${userMessage.content}\n\nAI回答：\n${aiOutputs}`;

    logService.info('conversation', `开始生成总结，使用AI应用: ${summaryAiApplication} / Starting summary generation, using AI: ${summaryAiApplication}`);

    // 🔥 【修改】查找是否已有总结消息 / 【Modified】Check if summary message already exists
    let summaryMessage = chat.messages.find(m => m.role === 'summary');

    if (summaryMessage) {
      // 🔥 【新增】清空现有总结内容，准备刷新 / 【New】Clear existing summary content for refresh
      logService.info('conversation', `发现现有总结消息，清空内容准备刷新 / Found existing summary message, clearing content for refresh`);
      summaryMessage.content = '';
    } else {
      // 🔥 【新增】创建新的总结消息（初始状态为空字符串）/ 【New】Create new summary message (initial content is empty)
      summaryMessage = {
        messageId: generateMessageId(),
        role: 'summary',
        sender: null,
        timestamp: Date.now(),
        content: ''
        // 🔥 【移除】不设置status字段，会话文件中的消息没有这个字段
        // 🔥 【Removed】Don't set status field, messages in conversation files don't have this field
      };
      chat.messages.push(summaryMessage);
    }

    await storageService.saveConversation(conversation);

    // 🔥 【新增】立即通知前端刷新，显示空的总结气泡
    // 🔥 【New】Immediately notify frontend to refresh and show empty summary bubble
    if (this.updateCallback) {
      this.updateCallback(conversation);
    }
    const mainWindow = getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('conversation:updated', conversation);
      logService.info('conversation', `📤 已发送会话更新事件，前端将显示总结气泡 / Sent conversation update event, frontend will show summary bubble`);
    }

    // 🔥 【更新】复用现有的发送消息和轮询机制，使用新的枚举系统
    // 【Updated】Reuse existing send message and polling mechanism, using new enum system
    this.sendInternalMessageAsync(
      conversationId,                        // 目标会话ID / Target conversation ID
      chatId,                                // 目标Chat ID / Target Chat ID
      summaryMessage.messageId,             // 目标Message ID / Target Message ID
      summaryAiApplication,                  // AI应用ID / AI application ID
      fullPrompt,                            // 完整prompt / Full prompt
      InternalTaskType.SUMMARY_GENERATION    // 🔥 使用枚举而非布尔值 / Use enum instead of boolean
    )
      .catch(error => {
        logService.error('conversation', `异步生成总结失败 / Async summary generation failed`, error);
      });
  }

  /**
   * 【更新】自动生成会话标题和描述 / 【Updated】Auto-generate conversation title and description
   * 当第一轮对话完成时触发
   * 复用现有的发送消息和轮询机制
   *
   * 【可回滚标记 / Rollback Marker】🔥 标题生成-v2
   */
  public async autoGenerateTitle(conversationId: string, chatId: string): Promise<void> {
    logService.info('conversation', `🔥 ========================================`);
    logService.info('conversation', `🔥 autoGenerateTitle 方法被调用 / autoGenerateTitle method called`);
    logService.info('conversation', `🔥 ========================================`);
    logService.info('conversation', `   conversationId: ${conversationId}`);
    logService.info('conversation', `   chatId: ${chatId}`);

    try {
      const conversation = await storageService.loadConversation(conversationId);
      if (!conversation) {
        logService.warn('conversation', `⚠️ 会话不存在，跳过标题生成 / Conversation not found, skipping title generation`);
        return;
      }

      const chat = conversation.chats.find(c => c.chatId === chatId);
      if (!chat) {
        logService.warn('conversation', `⚠️ Chat不存在，跳过标题生成 / Chat not found, skipping title generation`);
        return;
      }

      logService.info('conversation', `✅ 会话和Chat加载成功 / Conversation and chat loaded successfully`);
      logService.info('conversation', `   Chat消息数 / Chat messages count: ${chat.messages.length}`);

      // 获取用户消息
      const userMessage = chat.messages.find(m => m.role === 'user');
      if (!userMessage) {
        logService.warn('conversation', `⚠️ 用户消息不存在，跳过标题生成 / User message not found, skipping title generation`);
        return;
      }

      logService.info('conversation', `✅ 用户消息找到 / User message found`);
      logService.info('conversation', `   用户消息内容 / User message content: ${userMessage.content.substring(0, 50)}...`);

      // 🔥 【新增】等待一小段时间，确保文件系统写入完成
      await new Promise(resolve => setTimeout(resolve, 100));

      // 🔥 【调试】打印所有消息状态（不检查status字段）
      // 🔥 【Debug】Print all message status (no status field check)
      logService.info('conversation', `📋 Chat中所有消息状态 / All messages status in chat:`);
      chat.messages.forEach((m, idx) => {
        logService.info('conversation', `   [${idx}] role=${m.role}, sender=${m.sender}, contentLength=${m.content?.length || 0}`);
      });

      // 🔥 【简化】收集所有AI输出（role='assistant'），不检查status
      // 🔥 【Simplified】Collect all AI outputs (role='assistant'), don't check status
      const aiOutputs = chat.messages
        .filter(m => m.role === 'assistant')
        .map(m => `【${m.sender}】:\n${m.content}`)
        .join('\n\n---\n\n');

      if (aiOutputs.length === 0) {
        logService.info('conversation', `⚠️ 没有可用的AI输出，跳过自动生成标题 / No AI outputs available, skipping auto title generation`);
        logService.info('conversation', `   过滤条件 / Filter condition: role='assistant'`);
        return;
      }

      logService.info('conversation', `✅ AI输出收集成功 / AI outputs collected`);
      logService.info('conversation', `   AI输出总长度 / AI outputs total length: ${aiOutputs.length} 字符 / chars`);

      // 获取设置中的标题AI应用和提示词
      const settings = await settingsService.getSettings();
      const titleAiApplication = settings.titleAiApplication || 'deepseek';
      const titlePrompt = settings.titlePrompt || '深入阅读理解以下内容，总结提炼出30字以内的标题、200字以内的描述。输出以下的JSON结构体：{"conversationName":"","description":""}。你只能输出以上JSON结构，禁止输出其它内容。';

      // 构建完整的prompt
      const fullPrompt = `${titlePrompt}\n\n用户问题：\n${userMessage.content}\n\nAI回答：\n${aiOutputs}`;

      logService.info('conversation', `开始自动生成标题，使用AI应用: ${titleAiApplication} / Starting auto title generation, using AI: ${titleAiApplication}`);

      // 🔥 【更新】复用现有的发送消息和轮询机制，使用新的枚举系统
      // 【Updated】Reuse existing send message and polling mechanism, using new enum system
      // 标题生成不需要保存消息，chatId 和 messageId 传空字符串
      // Title generation doesn't need to save message, pass empty strings for chatId and messageId
      this.sendInternalMessageAsync(
        conversationId,                      // 目标会话ID / Target conversation ID
        '',                                  // 空字符串（标题任务不创建消息）/ Empty string (title task doesn't create message)
        null,                                // null（标题任务不创建消息）/ null (title task doesn't create message)
        titleAiApplication,                  // AI应用ID / AI application ID
        fullPrompt,                          // 完整prompt / Full prompt
        InternalTaskType.TITLE_GENERATION    // 🔥 使用枚举而非布尔值 / Use enum instead of boolean
      )
        .catch(error => {
          logService.error('conversation', `自动生成标题失败 / Auto title generation failed`, error);
        });
    } catch (error) {
      logService.error('conversation', `自动生成标题失败 / Auto title generation failed`, error);
    }
  }

  /**
   * 【重写】发送内部消息（用于总结、标题生成等内部任务）
   * 【Rewrite】Send internal message (for summary, title generation and other internal tasks)
   *
   * 【功能说明 / Function Description】
   * 复用现有的 sendMessage → sendToAiPlatformsAsync → pollingService.addTask 流程
   * Reuse existing sendMessage → sendToAiPlatformsAsync → pollingService.addTask flow
   *
   * 【与正常消息的区别 / Differences from normal messages】
   * 1. 复用AI应用标签页，不创建新的会话文件
   *    Reuse AI application tab page, don't create new conversation file
   * 2. 使用内部任务类型枚举，占用"活跃会话"状态（完成后才释放）
   *    Use internal task type enums, occupy "active session" status (released only after completion)
   * 3. 轮询完成后不关闭page，直接在page中新建会话继续使用
   *    Don't close page after polling completes, create new session in page to continue using
   *
   * 【参数使用规则 / Parameter Usage Rules】
   * 1. 标题生成任务：
   *    - conversationId: 目标会话ID（标题要写入的会话）
   *    - chatId/messageId: 空字符串（不创建消息）
   *    - internalTaskType: InternalTaskType.TITLE_GENERATION
   *
   * 2. 总结生成任务：
   *    - conversationId: 目标会话ID（总结要写入的会话）
   *    - chatId: 目标Chat ID（总结要写入的Chat）
   *    - messageId: 目标Message ID（总结消息的ID）
   *    - internalTaskType: InternalTaskType.SUMMARY_GENERATION
   *
   * 【可回滚设计 / Rollback Design】
   * 如果新方案有问题，可以通过搜索 "🔥 优化2.0内部任务" 找到所有相关代码并回滚
   * If new approach has issues, search "🔥 优化2.0内部任务" to find all related code and rollback
   *
   * @param conversationId - 目标会话ID / Target conversation ID
   * @param chatId - 目标Chat ID（总结任务）/ Target Chat ID (for summary task)
   * @param messageId - 目标Message ID（总结任务）/ Target Message ID (for summary task)
   * @param aiApplicationId - AI应用ID / AI application ID
   * @param prompt - 发送的提示词 / Prompt to send
   * @param internalTaskType - 内部任务类型 / Internal task type
   */
  private async sendInternalMessageAsync(
    conversationId: string,
    chatId: string,
    messageId: string | null,
    aiApplicationId: string,
    prompt: string,
    internalTaskType: InternalTaskType
  ): Promise<void> {
    logService.info('conversation', `🚀 ========================================`);
    logService.info('conversation', `🚀 sendInternalMessageAsync 方法被调用 (优化2.0)`);
    logService.info('conversation', `🚀 ========================================`);
    logService.info('conversation', `   任务类型 / Task type: ${internalTaskType}`);
    logService.info('conversation', `   目标会话ID / Target conversationId: ${conversationId}`);
    logService.info('conversation', `   目标Chat ID / Target chatId: ${chatId || '(empty)'}`);
    logService.info('conversation', `   目标Message ID / Target messageId: ${messageId || '(null)'}`);
    logService.info('conversation', `   AI应用ID / AI application ID: ${aiApplicationId}`);
    logService.info('conversation', `   Prompt长度 / Prompt length: ${prompt.length}`);

    try {
      // 🔥 Step 1: 生成临时会话ID / Generate temporary conversation ID
      const internalConversationId = `internal_${internalTaskType}_${Date.now()}`;
      const internalChatId = generateChatId();
      const internalMessageId = generateMessageId();

      logService.info('conversation', `   临时会话ID / Temp conversationId: ${internalConversationId}`);
      logService.info('conversation', `   临时Chat ID / Temp chatId: ${internalChatId}`);

      // 🔥 Step 2: 创建临时会话文件（用于轮询）/ Create temporary conversation file (for polling)
      const tempConversation: Conversation = {
        conversationId: internalConversationId,
        createTime: Date.now(),
        updateTime: Date.now(),
        aiApplicationBindings: [],
        chats: [{
          chatId: internalChatId,
          messages: [{
            messageId: internalMessageId,
            role: 'user',
            sender: null,
            timestamp: Date.now(),
            content: prompt
          }]
        }],
        metadata: {
          isInternal: true,  // 🔥 标记为内部任务 / Mark as internal task
          internalTaskType: internalTaskType,
          belongingConversationId: conversationId  // 🔥 新增：归属的正常会话ID
        }
      };

      // 🔥 保存临时会话到 internal 文件夹 / Save temporary conversation to internal folder
      await storageService.saveConversation(tempConversation, true);  // true = isInternal
      logService.info('conversation', `✅ 临时会话文件已创建 / Temporary conversation file created`);

      // 🔥 Step 3: 获取AI应用配置 / Get AI application config
      const { baseUrl } = this.getAiApplicationConfig(aiApplicationId);

      // 🔥 Step 4: 获取或创建Page / Get or create Page（复用AI应用标签页）
      // 🔥 【优化2.0】使用AI应用ID作为page标识，复用标签页，不再创建新标签页
      const page = await browserService.getOrCreatePage(
        aiApplicationId,  // 🔥 使用AI应用ID复用标签页 / Use AI application ID to reuse tab
        aiApplicationId,
        baseUrl,
        { forceNavigate: false }
      );

      // 🔥 Step 5: 创建automation实例 / Create automation instance
      let automation;
      switch (aiApplicationId) {
        case 'deepseek':
          automation = new (await import('../automation/deepseek')).DeepSeekAutomation();
          break;
        case 'chatgpt':
          automation = new (await import('../automation/chatgpt')).ChatGPTAutomation();
          break;
        case 'gemini':
          automation = new (await import('../automation/gemini')).GeminiAutomation();
          break;
        case 'doubao':
          automation = new (await import('../automation/doubao')).DoubaoAutomation();
          break;
        case 'glm':
          automation = new (await import('../automation/glm')).GlMAutomation();
          break;
        case 'kimi':
          automation = new (await import('../automation/kimi')).KimiAutomation();
          break;
        case 'qwen':
          automation = new (await import('../automation/qwen')).QwenAutomation();
          break;
        default:
          throw new Error(`不支持的 AI 应用 / Unsupported AI application: ${aiApplicationId}`);
      }

      automation.setPage(page);

      // 🔥 Step 6: 导航到新对话 / Navigate to new session（在AI应用标签页中新建会话）
      await automation.navigateToNewSession();
      await page.waitForTimeout(2000);

      // 🔥 Step 7: 发送prompt / Send prompt
      // 🔥 【优化】使用直接填充模式，避免换行符被识别为回车键导致提前发送
      // 🔥 【Optimization】Use direct fill mode to avoid newlines being interpreted as Enter key
      await automation.sendMessage(prompt, true);  // true = useDirectFill
      logService.info('conversation', `内部消息prompt已发送（直接填充模式）/ Internal message prompt sent (direct fill mode)`);

      // 🔥 Step 8: 短暂延迟后添加到轮询服务 / Add to polling service after short delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // 🔥 Step 9: 设置活跃会话（阻塞用户操作）/ Set active session (block user operations)
      // 🔥 【优化2.0】使用临时会话ID作为活跃会话ID，任务完成后才释放
      // 🔥 【新增】传入归属会话ID，让前端显示正确的会话ID / Pass belonging conversation ID for correct display
      await activeSessionService.setActiveSession(
        internalConversationId,
        {
          belongingConversationId: conversationId,
          internalTaskType: internalTaskType
        }
      );
      logService.info('conversation', `✅ 内部任务活跃会话已设置 / Internal task active session set: ${internalConversationId} (归属: ${conversationId})`);

      // 🔥 Step 10: 添加轮询任务（使用新的枚举参数）/ Add polling task (using new enum parameters)
      await pollingService.addTask({
        // ========== 目标会话信息（正常任务的ID）/ Target conversation info (normal task IDs) ==========
        conversationId: conversationId,        // 标题任务：目标会话 / Title task: target conversation
                                                   // 总结任务：目标会话 / Summary task: target conversation
        chatId: chatId || '',                  // 标题任务：空字符串 / Title task: empty string
                                                   // 总结任务：目标Chat ID / Summary task: target Chat ID
        messageId: messageId || '',            // 标题任务：空字符串 / Title task: empty string
                                                   // 总结任务：目标Message ID / Summary task: target Message ID

        // ========== 轮询任务基础信息 / Polling task basic info ==========
        aiApplicationId: aiApplicationId,
        automation: automation,

        // ========== 内部任务标识 / Internal task identifiers ==========
        taskClass: TaskClass.INTERNAL,
        internalTaskType: internalTaskType,

        // ========== 临时会话ID（用于轮询和活跃会话管理）/ Temp conversation IDs (for polling and active session management) ==========
        internalConversationId: internalConversationId,
        internalChatId: internalChatId,
        internalMessageId: internalMessageId
      });

      logService.info('conversation', `✅ 内部消息已发送，开始轮询监控 / Internal message sent, polling started`);
    } catch (error) {
      logService.error('conversation', `❌ 发送内部消息失败 / Failed to send internal message`, error);

      // 🔥 错误处理：如果有messageId，更新消息状态为失败 / Error handling: update message status to failed if messageId exists
      if (messageId) {
        const conversation = await storageService.loadConversation(conversationId);
        if (!conversation) return;

        const chat = conversation.chats.find(c => c.chatId === chatId);
        if (!chat) return;

        const message = chat.messages.find(m => m.messageId === messageId);
        if (message) {
          message.content = '生成失败 / Generation failed';
          message.status = 'failed';
          message.error = String(error);
          await storageService.saveConversation(conversation);
        }
      }
    }
  }

  /**
   * 更新会话元数据 / Update conversation metadata
   * 支持活跃会话和归档会话 / Supports both active and archived conversations
   */
  async updateMetadata(
    conversationId: string,
    metadata: {
      conversationName?: string;
      description?: string;
    }
  ): Promise<void> {
    // 先尝试加载活跃会话 / Try loading active conversation first
    let conversation = await storageService.loadConversation(conversationId);

    // 如果活跃会话不存在，尝试加载归档会话
    // If active conversation doesn't exist, try loading archived conversation
    if (!conversation) {
      try {
        const archivedList = await storageService.listArchived();
        conversation = archivedList.find(c => c.conversationId === conversationId) || null;
      } catch (error) {
        logService.error('conversation', `加载归档会话失败 / Failed to load archived conversation`, error);
      }
    }

    if (!conversation) {
      throw new Error('会话不存在 / Conversation not found');
    }

    if (metadata.conversationName) {
      conversation.conversationName = metadata.conversationName;
    }
    if (metadata.description) {
      conversation.description = metadata.description;
    }

    conversation.updateTime = Date.now();

    // 判断是活跃会话还是归档会话，使用对应的保存方法
    // Determine if it's active or archived conversation, use corresponding save method
    const archivedList = await storageService.listArchived().catch(() => []);
    const isArchived = archivedList.some(c => c.conversationId === conversationId);

    if (isArchived) {
      // 保存归档会话 / Save archived conversation
      await storageService.saveArchivedConversation(conversation);
      logService.info('conversation', `更新归档会话元数据: ${conversationId} / Updated archived conversation metadata`);
    } else {
      // 保存活跃会话 / Save active conversation
      await storageService.saveConversation(conversation);
      logService.info('conversation', `更新活跃会话元数据: ${conversationId} / Updated active conversation metadata`);
    }

    // 🔥 【新增】发送IPC事件通知前端刷新会话列表
    // 🔥 【New】Send IPC event to notify frontend to refresh conversation list
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_EVENTS.MESSAGE_UPDATED, {
        conversationId,
        metadataChanged: true  // 标记这是元数据变更
      });
      logService.info('conversation', `📤 发送会话元数据更新事件 / Sent conversation metadata update event`);
    }
  }

  /**
   * 删除会话 / Delete conversation
   */
  async deleteConversation(conversationId: string): Promise<void> {
    // 如果删除的是活跃会话，清除活跃会话标记
    // If deleting active session, clear active session marker
    const isActive = await activeSessionService.isSessionActive(conversationId);
    if (isActive) {
      await activeSessionService.clearActiveSession();
      logService.info('conversation', `删除活跃会话，已清除活跃标记 / Deleted active session, cleared active marker`);

      // 通知前端活跃会话状态变化 / Notify frontend of active session change
      notifyActiveSessionChanged();
    }

    // 移除轮询任务 / Remove polling tasks
    pollingService.removeConversationTasks(conversationId);

    // 关闭相关的 BrowserContext
    await browserService.closeConversationContexts(conversationId);

    // 删除会话文件
    await storageService.deleteConversation(conversationId);

    logService.info('conversation', `删除会话: ${conversationId} / Deleted conversation`);
  }

  /**
   * 检查是否可以发送消息 / Check if message can be sent
   * @param conversationId 会话ID / Conversation ID
   * @returns 是否可以发送 / Whether can send
   */
  private async canSendMessage(conversationId: string): Promise<boolean> {
    const activeSession = await activeSessionService.getActiveSession();

    // 没有活跃会话，可以发送 / No active session, can send
    if (!activeSession) {
      return true;
    }

    // 就是当前活跃会话，可以发送 / Is current active session, can send
    if (activeSession.activeConversationId === conversationId) {
      return true;
    }

    // 有其他活跃会话，不能发送 / Has other active session, cannot send
    return false;
  }

  /**
   * 更新平台会话ID / Update platform conversation ID
   * 由轮询服务在获取到平台会话ID后调用
   * Called by polling service after getting platform conversation ID
   */
  async updatePlatformConversationId(
    conversationId: string,
    aiApplicationId: string,
    platformConversationId: string
  ): Promise<void> {
    const conversation = await storageService.loadConversation(conversationId);
    if (!conversation) {
      logService.error('conversation', `会话不存在，无法更新平台会话ID: ${conversationId} / Conversation not found, cannot update platform conversation ID`);
      return;
    }

    const binding = conversation.aiApplicationBindings.find(b => b.aiApplicationId === aiApplicationId);
    if (!binding) {
      logService.error('conversation', `AI应用绑定不存在: ${aiApplicationId} / AI application binding not found`);
      return;
    }

    const oldId = binding.platformConversationId;
    binding.platformConversationId = platformConversationId;

    // 立即保存 / Save immediately
    await storageService.saveConversation(conversation);

    // 🔥 保存会话文件后，自动触发消息更新事件（根据会话流程方案.md 第7步）
    // 🔥 Auto-trigger message update event after saving conversation file (per doc step 7)
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_EVENTS.MESSAGE_UPDATED, {
        conversationId
      });
      logService.info('conversation', `📤 发送消息更新事件（platformConversationId 已更新）/ Sent message update event (platformConversationId updated)`);
    }

    logService.info('conversation', `✅ 更新平台会话ID: ${aiApplicationId} ${oldId} -> ${platformConversationId} / Updated platform conversation ID`);
  }

  /**
   * 异步发送消息到 AI 平台
   * Async send message to AI platforms
   *
   * 这个方法在后台运行，不阻塞 sendMessage 的返回
   * This method runs in background and doesn't block sendMessage return
   */
  private async sendToAiPlatformsAsync(
    conversationId: string,
    chatId: string,
    content: string,
    aiApplicationBindings: any[]
  ): Promise<void> {
    logService.info('conversation', `🚀 开始异步发送到 ${aiApplicationBindings.length} 个 AI 平台 / Starting async send to ${aiApplicationBindings.length} AI platforms`);

    // 为每个 AI 平台发送消息并启动轮询
    // Send message and start polling for each AI platform
    for (const binding of aiApplicationBindings) {
      try {
        await this.sendToSingleAiPlatform(conversationId, chatId, content, binding);
      } catch (error) {
        await this.handleSendError(conversationId, chatId, binding.aiApplicationId, error);
      }
    }

    logService.info('conversation', `✅ 所有 AI 平台发送完成 / All AI platforms send completed`);
  }

  /**
   * 发送消息到单个 AI 平台
   * Send message to a single AI platform
   */
  private async sendToSingleAiPlatform(
    conversationId: string,
    chatId: string,
    content: string,
    binding: any
  ): Promise<void> {
    logService.info('conversation', `处理 AI 应用 / Processing AI: ${binding.aiApplicationId}`);

    // 准备页面和自动化实例
    const { page, automation } = await this.prepareAiPlatform(binding.aiApplicationId, conversationId);

    // 导航到目标会话
    await this.navigateToTargetConversation(automation, page, binding, conversationId);

    // 等待页面加载完成
    await this.waitForPageLoad(page);

    // 验证历史会话（如果是历史会话）
    await this.verifyHistoricalSessionIfNeeded(automation, page, binding, conversationId);

    // 发送消息
    await automation.sendMessage(content);

    // 添加到轮询服务
    await this.startPolling(conversationId, chatId, binding.aiApplicationId, automation);
  }

  /**
   * 准备 AI 平台的页面和自动化实例
   * Prepare AI platform page and automation instance
   */
  private async prepareAiPlatform(aiApplicationId: string, conversationId: string) {
    logService.info('conversation', `🌐 准备获取或创建 Page: aiApplicationId=${aiApplicationId} / Preparing to get or create page`);

    const { baseUrl } = this.getAiApplicationConfig(aiApplicationId);
    const page = await browserService.getOrCreatePage(
      conversationId,
      aiApplicationId,
      baseUrl,
      { forceNavigate: false }
    );

    logService.info('conversation', `✅ Page 获取成功: ${page.url()} / Page retrieved successfully`);

    const automation = await this.createAutomationInstance(aiApplicationId);
    automation.setPage(page);

    logService.info('conversation', `🤖 Automation 实例创建并设置成功 / Automation instance created and set`);

    return { page, automation };
  }

  /**
   * 创建自动化实例
   * Create automation instance
   */
  private async createAutomationInstance(aiApplicationId: string) {
    switch (aiApplicationId) {
      case 'deepseek':
        return new (await import('../automation/deepseek')).DeepSeekAutomation();
      case 'chatgpt':
        return new (await import('../automation/chatgpt')).ChatGPTAutomation();
      case 'gemini':
        return new (await import('../automation/gemini')).GeminiAutomation();
      case 'doubao':
        return new (await import('../automation/doubao')).DoubaoAutomation();
      case 'glm':
        return new (await import('../automation/glm')).GlMAutomation();
      case 'kimi':
        return new (await import('../automation/kimi')).KimiAutomation();
      case 'qwen':
        return new (await import('../automation/qwen')).QwenAutomation();
      default:
        throw new Error(`不支持的 AI 应用 / Unsupported AI application: ${aiApplicationId}`);
    }
  }

  /**
   * 导航到目标会话
   * Navigate to target conversation
   */
  private async navigateToTargetConversation(
    automation: any,
    page: any,
    binding: any,
    conversationId: string
  ): Promise<void> {
    const isNewSession = !binding.platformConversationId || binding.platformConversationId === '';

    if (isNewSession) {
      logService.info('conversation', `首次对话，准备点击新对话按钮 / First session, preparing to click new chat button`);
      await automation.navigateToNewSession();
      return;
    }

    logService.info('conversation', `历史会话，检查当前页面 URL / Historical session, checking current page URL`);

    const shouldNavigate = await this.shouldNavigateToSession(automation, binding.platformConversationId);

    if (shouldNavigate) {
      logService.info('conversation', `导航到会话 ID: ${binding.platformConversationId} / Navigating to conversation ID`);
      await automation.navigateToSession(binding.platformConversationId);
    }
  }

  /**
   * 判断是否需要导航到指定会话
   * Check if navigation to target session is needed
   */
  private async shouldNavigateToSession(automation: any, targetConversationId: string): Promise<boolean> {
    try {
      const currentConversationId = await (automation as any).getCurrentConversationId();

      logService.info('conversation', `🔍 当前页面会话 ID: "${currentConversationId}" | 目标会话 ID: "${targetConversationId}" / Current page session ID | Target session ID`);

      if (currentConversationId && currentConversationId === targetConversationId) {
        logService.info('conversation', `✅ 当前页面已在目标会话，跳过导航 / Current page already on target session, skipping navigation`);
        return false;
      }

      if (!currentConversationId) {
        logService.warn('conversation', `⚠️ 无法从当前页面提取会话 ID，将执行导航 / Unable to extract session ID, will navigate`);
      } else {
        logService.info('conversation', `当前页面会话 ID 与目标不同，需要导航 / Current session ID differs from target, navigation needed`);
      }
    } catch (error) {
      logService.warn('conversation', `❌ 获取当前会话 ID 时出错，将执行导航 / Error getting current session ID, will navigate`, error);
    }

    return true;
  }

  /**
   * 等待页面加载完成
   * Wait for page to finish loading
   */
  private async waitForPageLoad(page: any): Promise<void> {
    logService.info('conversation', `等待页面加载完成 / Waiting for page to finish loading`);

    // 尝试多种加载状态，按优先级降级
    const loadStates = [
      { state: 'load', timeout: 15000, extraWait: 2000, name: 'load' },
      { state: 'domcontentloaded', timeout: 10000, extraWait: 3000, name: 'domcontentloaded' },
      { state: 'networkidle', timeout: 10000, extraWait: 3000, name: 'network idle' }
    ];

    for (const loadState of loadStates) {
      try {
        await page.waitForLoadState(loadState.state, { timeout: loadState.timeout });
        logService.info('conversation', `✅ 页面 ${loadState.name} 状态完成 / Page ${loadState.name} state completed`);
        await page.waitForTimeout(loadState.extraWait);
        return; // 成功则直接返回
      } catch (error) {
        logService.warn('conversation', `${loadState.name} 等待超时，尝试下一个 / ${loadState.name} wait timeout, trying next`, error);
      }
    }

    // 所有方法都失败后的兜底
    logService.warn('conversation', `所有加载等待都超时，使用兜底等待 / All load waits timed out, using fallback wait`);
    await page.waitForTimeout(2000);
  }

  /**
   * 验证历史会话（如果需要）
   * Verify historical session if needed
   */
  private async verifyHistoricalSessionIfNeeded(
    automation: any,
    page: any,
    binding: any,
    conversationId: string
  ): Promise<void> {
    const isNewSession = !binding.platformConversationId || binding.platformConversationId === '';

    if (isNewSession || !binding.platformConversationId) {
      return;
    }

    logService.info('conversation', `🔍 验证历史会话导航结果 / Verifying historical session navigation result`);

    try {
      const actualConversationId = await (automation as any).getCurrentConversationId();
      logService.info('conversation', `📍 实际页面会话 ID: "${actualConversationId}" | 期望会话 ID: "${binding.platformConversationId}" / Actual page session ID | Expected session ID`);

      if (!actualConversationId || actualConversationId !== binding.platformConversationId) {
        logService.warn('conversation', `⚠️ 会话 ID 不匹配！AI 应用那边可能删除了会话 / Session ID mismatch! AI application may have deleted the session`);
        logService.info('conversation', `🔄 删除 platformConversationId 并触发新建会话流程 / Delete platformConversationId and trigger new session flow`);

        await this.updatePlatformConversationId(conversationId, binding.aiApplicationId, '');
        await automation.navigateToNewSession();
        await page.waitForTimeout(2000);
      } else {
        logService.info('conversation', `✅ 会话 ID 验证通过，继续发送消息 / Session ID verified, continuing to send message`);
      }
    } catch (error) {
      logService.warn('conversation', `❌ 验证会话 ID 时出错，继续发送消息 / Error verifying session ID, continuing to send message`, error);
    }
  }

  /**
   * 启动轮询监控
   * Start polling monitoring
   */
  private async startPolling(
    conversationId: string,
    chatId: string,
    aiApplicationId: string,
    automation: any
  ): Promise<void> {
    logService.info('conversation', `准备添加轮询任务 / Preparing to add polling task`);

    // 等待一小段时间，确保会话已经保存到磁盘
    await new Promise(resolve => setTimeout(resolve, 500));

    await pollingService.addTask({
      conversationId,
      aiApplicationId,
      chatId,
      messageId: '',
      automation
    });

    logService.info('conversation', `${aiApplicationId} 消息已发送，开始轮询监控 / Message sent, polling started`);
  }

  /**
   * 处理发送错误
   * Handle send error
   */
  private async handleSendError(
    conversationId: string,
    chatId: string,
    aiApplicationId: string,
    error: any
  ): Promise<void> {
    logService.error('conversation', `${aiApplicationId} 发送失败 / Send failed`, error);

    try {
      const conversation = await storageService.loadConversation(conversationId);
      if (!conversation) return;

      const chat = conversation.chats.find(c => c.chatId === chatId);
      if (!chat) return;

      const message = chat.messages.find(m =>
        m.role === 'assistant' &&
        m.sender === aiApplicationId &&
        m.status === 'sending'
      );

      if (message) {
        message.status = 'sendFailed';
        message.error = error instanceof Error ? error.message : String(error);
        await storageService.saveConversation(conversation);
        logService.info('conversation', `✅ 已更新消息状态为 sendFailed / Message status updated to sendFailed`);

        if (this.updateCallback) {
          this.updateCallback(conversation);
        }
      } else {
        logService.warn('conversation', `未找到 ${aiApplicationId} 的 sending 状态消息 / No sending message found`);
      }
    } catch (saveError) {
      logService.error('conversation', `更新失败消息状态时出错 / Error updating failed message status`, saveError);
    }
  }

  /**
   * 绑定 AI 应用到会话 / Bind AI application to conversation
   */
  async bindAiApplication(
    conversationId: string,
    aiApplicationId: string
  ): Promise<void> {
    const conversation = await storageService.loadConversation(conversationId);
    if (!conversation) {
      throw new Error('会话不存在 / Conversation not found');
    }

    // 检查是否已经绑定
    const existingBinding = conversation.aiApplicationBindings.find(
      b => b.aiApplicationId === aiApplicationId
    );
    if (existingBinding) {
      logService.info('conversation', `AI 应用 ${aiApplicationId} 已经绑定，跳过 / AI application already bound, skipping`);
      return;
    }

    // 添加绑定
    conversation.aiApplicationBindings.push({
      aiApplicationId,
      platformConversationId: '' // 将在首次发送消息时创建
    });

    // 保存会话
    await storageService.saveConversation(conversation);
    logService.info('conversation', `✅ 已绑定 AI 应用 ${aiApplicationId} 到会话 ${conversationId} / AI application bound`);

    // 触发更新回调
    if (this.updateCallback) {
      this.updateCallback(conversation);
    }
  }

  /**
   * 解绑 AI 应用 / Unbind AI application from conversation
   */
  async unbindAiApplication(
    conversationId: string,
    aiApplicationId: string
  ): Promise<void> {
    const conversation = await storageService.loadConversation(conversationId);
    if (!conversation) {
      throw new Error('会话不存在 / Conversation not found');
    }

    // 查找并移除绑定
    const bindingIndex = conversation.aiApplicationBindings.findIndex(
      b => b.aiApplicationId === aiApplicationId
    );
    if (bindingIndex === -1) {
      logService.info('conversation', `AI 应用 ${aiApplicationId} 未绑定，跳过 / AI application not bound, skipping`);
      return;
    }

    conversation.aiApplicationBindings.splice(bindingIndex, 1);

    // 保存会话
    await storageService.saveConversation(conversation);
    logService.info('conversation', `✅ 已解绑 AI 应用 ${aiApplicationId} 从会话 ${conversationId} / AI application unbound`);

    // 触发更新回调
    if (this.updateCallback) {
      this.updateCallback(conversation);
    }
  }

  /**
   * 更新消息内容
   * Update message content
   *
   * @param conversationId - 会话 ID / Conversation ID
   * @param messageId - 消息 ID / Message ID
   * @param newContent - 新内容 / New content
   */
  async updateMessageContent(
    conversationId: string,
    messageId: string,
    newContent: string
  ): Promise<void> {
    const conversation = await storageService.loadConversation(conversationId);
    if (!conversation) {
      throw new Error('会话不存在 / Conversation not found');
    }

    // 查找消息 / Find message
    let messageFound = false;
    for (const chat of conversation.chats) {
      const message = chat.messages.find(m => m.messageId === messageId);
      if (message) {
        message.content = newContent;
        messageFound = true;
        logService.info('conversation', `✅ 更新消息内容: messageId=${messageId} / Message content updated`);
        break;
      }
    }

    if (!messageFound) {
      throw new Error(`消息不存在 / Message not found: ${messageId}`);
    }

    // 保存会话 / Save conversation
    await storageService.saveConversation(conversation);

    // 触发更新回调 / Trigger update callback
    if (this.updateCallback) {
      this.updateCallback(conversation);
    }
  }
}

// 导出单例
export const conversationService = new ConversationService();
