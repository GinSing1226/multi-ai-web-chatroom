/**
 * IPC 处理器 - 会话管理
 * IPC Handler - Conversation Management
 */

import { ipcMain, BrowserWindow } from 'electron';
import { conversationService } from '../services/conversation.service';
import { storageService } from '../services/storage.service';
import { logService } from '../services/log.service';
import { activeSessionService } from '../services/active-session.service';
import { IPC_EVENTS } from '@shared/types/ipc.types';

/**
 * 获取主窗口 / Get main window
 */
function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows();
  return windows.length > 0 ? windows[0] : null;
}

/**
 * 注册会话相关 IPC 处理器
 * Register conversation-related IPC handlers
 */
export function registerConversationHandlers(): void {
  // 设置会话更新回调 / Set conversation update callback
  conversationService.setUpdateCallback((conversation) => {
    const mainWindow = getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      // 发送会话更新事件到渲染进程 / Send conversation update event to renderer
      mainWindow.webContents.send(IPC_EVENTS.CONVERSATION_UPDATED, conversation);
      logService.debug('ipc', `发送会话更新事件: ${conversation.conversationId} / Sent conversation update event`);
    }
  });
  // 列出所有会话
  ipcMain.handle('conversations:list', async () => {
    try {
      return await storageService.listConversations();
    } catch (error) {
      logService.error('ipc', 'conversations:list 失败 / conversations:list failed', error);
      throw error;
    }
  });

  // 创建新会话
  ipcMain.handle('conversations:create', async (_event, reservedConversationId: string | null, aiApplicationIds: string[]) => {
    try {
      return await conversationService.createConversation(reservedConversationId, aiApplicationIds);
    } catch (error) {
      logService.error('ipc', 'conversations:create 失败 / conversations:create failed', error);
      throw error;
    }
  });

  // 🔥 【新增】预分配会话（两阶段创建：阶段1）
  // 🔥 【New】Reserve conversation (Two-phase create: Phase 1)
  ipcMain.handle('conversations:beginCreate', async () => {
    try {
      return await conversationService.beginCreateConversation();
    } catch (error) {
      logService.error('ipc', 'conversations:beginCreate 失败 / conversations:beginCreate failed', error);
      throw error;
    }
  });

  // 🔥 【新增】取消预分配
  // 🔥 【New】Cancel reservation
  ipcMain.handle('conversations:cancelCreate', async (_event, conversationId: string) => {
    try {
      await conversationService.cancelCreateConversation(conversationId);
    } catch (error) {
      logService.error('ipc', 'conversations:cancelCreate 失败 / conversations:cancelCreate failed', error);
      throw error;
    }
  });

  // 获取会话详情
  ipcMain.handle('conversations:get', async (_event, conversationId: string) => {
    try {
      return await storageService.loadConversation(conversationId);
    } catch (error) {
      logService.error('ipc', 'conversations:get 失败 / conversations:get failed', error);
      throw error;
    }
  });

  // 删除会话
  ipcMain.handle('conversations:delete', async (_event, conversationId: string) => {
    try {
      await conversationService.deleteConversation(conversationId);
    } catch (error) {
      logService.error('ipc', 'conversations:delete 失败 / conversations:delete failed', error);
      throw error;
    }
  });

  // 发送消息
  ipcMain.handle('conversations:sendMessage', async (_event, conversationId: string, content: string) => {
    try {
      const updatedConversation = await conversationService.sendMessage(conversationId, content);
      // 返回更新后的会话，让前端可以刷新聊天区
      // Return updated conversation so frontend can refresh chat area
      return updatedConversation;
    } catch (error) {
      logService.error('ipc', 'conversations:sendMessage 失败 / conversations:sendMessage failed', error);
      throw error;
    }
  });

  // 生成总结
  ipcMain.handle('conversations:generateSummary', async (_event, conversationId: string, chatId: string) => {
    try {
      await conversationService.generateSummary(conversationId, chatId);
    } catch (error) {
      logService.error('ipc', 'conversations:generateSummary 失败 / conversations:generateSummary failed', error);
      throw error;
    }
  });

  // 更新会话元数据
  ipcMain.handle('conversations:updateMetadata', async (_event, conversationId: string, metadata) => {
    try {
      await conversationService.updateMetadata(conversationId, metadata);
    } catch (error) {
      logService.error('ipc', 'conversations:updateMetadata 失败 / conversations:updateMetadata failed', error);
      throw error;
    }
  });

  // AI 重新生成标题描述
  ipcMain.handle('conversations:regenerateMetadata', async (_event, conversationId: string, options?) => {
    try {
      // TODO: 实现逻辑
      const { DEFAULT_TITLE_PROMPT } = require('@shared/constants/prompts');
      return { conversationName: '新标题', description: '新描述' };
    } catch (error) {
      logService.error('ipc', 'conversations:regenerateMetadata 失败 / conversations:regenerateMetadata failed', error);
      throw error;
    }
  });

  // 获取活跃会话 / Get active session
  ipcMain.handle('conversations:getActiveSession', async () => {
    try {
      const activeSession = await activeSessionService.getActiveSession();
      if (activeSession) {
        const conversationId = activeSession.activeConversationId;

        // 🔥 【新增】判断是否是内部任务 / 【New】Determine if it's an internal task
        let type: 'normal' | 'title' | 'summary' = 'normal';
        if (conversationId.startsWith('internal_title_generation_')) {
          type = 'title';
        } else if (conversationId.startsWith('internal_summary_generation_')) {
          type = 'summary';
        }

        // 🔥 【新增】对于内部任务，返回归属的正常会话ID供显示
        // 🔥 【New】For internal tasks, return belonging conversation ID for display
        const displayConversationId = activeSession.belongingConversationId || conversationId;

        return {
          conversationId: displayConversationId,  // 🔥 【修改】返回显示用的会话ID / Return display conversation ID
          timestamp: activeSession.activeTimestamp,
          type,
          // 🔥 【新增】返回内部会话ID（如果有的话）/ Return internal conversation ID (if any)
          internalConversationId: activeSession.belongingConversationId ? conversationId : undefined
        };
      }
      return null;
    } catch (error) {
      logService.error('ipc', 'conversations:getActiveSession 失败 / conversations:getActiveSession failed', error);
      throw error;
    }
  });

  // 获取内部任务状态 / Get internal task status
  ipcMain.handle('conversations:getInternalTaskStatus', async () => {
    try {
      const status = await activeSessionService.getInternalTaskStatus();
      return status;
    } catch (error) {
      logService.error('ipc', 'conversations:getInternalTaskStatus 失败 / conversations:getInternalTaskStatus failed', error);
      throw error;
    }
  });

  // 绑定 AI 应用到会话 / Bind AI application to conversation
  ipcMain.handle('conversations:bindAiApplication', async (_event, conversationId: string, aiApplicationId: string) => {
    try {
      await conversationService.bindAiApplication(conversationId, aiApplicationId);
    } catch (error) {
      logService.error('ipc', 'conversations:bindAiApplication 失败 / conversations:bindAiApplication failed', error);
      throw error;
    }
  });

  // 解绑 AI 应用 / Unbind AI application from conversation
  ipcMain.handle('conversations:unbindAiApplication', async (_event, conversationId: string, aiApplicationId: string) => {
    try {
      await conversationService.unbindAiApplication(conversationId, aiApplicationId);
    } catch (error) {
      logService.error('ipc', 'conversations:unbindAiApplication 失败 / conversations:unbindAiApplication failed', error);
      throw error;
    }
  });

  // 更新消息内容 / Update message content
  ipcMain.handle('conversations:updateMessage', async (_event, conversationId: string, messageId: string, newContent: string) => {
    try {
      await conversationService.updateMessageContent(conversationId, messageId, newContent);
    } catch (error) {
      logService.error('ipc', 'conversations:updateMessage 失败 / conversations:updateMessage failed', error);
      throw error;
    }
  });
}
