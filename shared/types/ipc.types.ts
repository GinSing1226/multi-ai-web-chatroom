/**
 * IPC 接口类型定义
 * ElectronAPI - 主进程和渲染进程之间的 IPC 通信接口
 */

import type { Conversation } from './conversation.types';
import type { AiApplication, AiApplicationStatus } from './ai-application.types';
import type { AppSettings } from './settings.types';
import type { ExportFormat } from './export.types';

/**
 * Electron API 接口
 * 通过 contextBridge 暴露给渲染进程
 */
export interface ElectronAPI {
  // 会话管理
  conversations: {
    /** 列出所有会话 */
    list: () => Promise<Conversation[]>;
    /** 创建新会话 */
    create: (reservedConversationId: string | null, aiApplicationIds: string[]) => Promise<Conversation>;
    /** 🔥 预分配会话（两阶段创建：阶段1）/ Reserve conversation (Two-phase create: Phase 1) */
    beginCreate: () => Promise<{ success: boolean; conversationId: string | null }>;
    /** 🔥 取消预分配 / Cancel reservation */
    cancelCreate: (conversationId: string) => Promise<void>;
    /** 获取会话详情 */
    get: (conversationId: string) => Promise<Conversation | null>;
    /** 删除会话 */
    delete: (conversationId: string) => Promise<void>;
    /** 发送消息，返回更新后的会话 */
    sendMessage: (conversationId: string, content: string) => Promise<Conversation>;
    /** 生成总结 */
    generateSummary: (conversationId: string, chatId: string) => Promise<void>;
    /** 更新会话元数据 */
    updateMetadata: (conversationId: string, metadata: {
      conversationName?: string;
      description?: string;
    }) => Promise<void>;
    /** AI 重新生成标题描述 */
    regenerateMetadata: (conversationId: string, options?: {
      prompt?: string;
      aiApplicationId?: string;
    }) => Promise<{ conversationName: string; description: string }>;
    /** 获取活跃会话（包含类型信息）*/
    getActiveSession: () => Promise<{ conversationId: string; timestamp: number; type: 'normal' | 'title' | 'summary' } | null>;
    /** 获取内部任务状态 */
    getInternalTaskStatus: () => Promise<{ type: 'title' | 'summary' | null } | null>;
    /** 监听消息更新事件 */
    onMessageUpdated: (callback: (event: any, data: {
      conversationId: string;
      chatId: string;
      messageId: string;
      aiApplicationId: string;
      status: string;
      content?: string;
      error?: string;
    }) => void) => void;
    /** 移除消息更新监听器 */
    removeMessageUpdatedListener: (callback: (...args: any[]) => void) => void;
    /** 绑定 AI 应用到会话 */
    bindAiApplication: (conversationId: string, aiApplicationId: string) => Promise<void>;
    /** 解绑 AI 应用 */
    unbindAiApplication: (conversationId: string, aiApplicationId: string) => Promise<void>;
    /** 更新消息内容 */
    updateMessage: (conversationId: string, messageId: string, newContent: string) => Promise<void>;
  };

  // AI 应用管理
  aiApplications: {
    /** 列出所有 AI 应用 */
    list: () => Promise<AiApplication[]>;
    /** 更新 AI 应用 */
    update: (id: string, updates: Partial<AiApplication>) => Promise<void>;
    /** 检查 AI 应用状态 */
    checkStatus: (id: string) => Promise<AiApplicationStatus>;
    /** 检查所有 AI 应用状态 */
    checkAllStatus: () => Promise<AiApplicationStatus[]>;
  };

  // 设置管理
  settings: {
    /** 获取设置 */
    get: () => Promise<AppSettings>;
    /** 更新设置 */
    update: (settings: Partial<AppSettings>) => Promise<void>;
    /** 重置为默认设置 */
    reset: () => Promise<void>;
  };

  // 归档管理 / Archive management
  archive: {
    /** 归档会话 / Archive conversation */
    archive: (conversationId: string) => Promise<void>;
    /** 取消归档 / Unarchive conversation */
    unarchive: (conversationId: string) => Promise<void>;
    /** 列出已归档会话 / List archived conversations */
    list: () => Promise<Conversation[]>;
    /** 删除归档会话 / Delete archived conversation */
    delete: (conversationId: string) => Promise<void>;
    /** 打开归档文件 / Open archived file */
    open: (conversationId: string) => Promise<void>;
  };

  // 导出功能 / Export functionality
  export: {
    /**
     * 导出会话到用户指定位置 / Export conversation to user-specified location
     * @returns Promise<{ success: boolean; filePath: string; canceled?: boolean }>
     */
    exportConversation: (
      conversationId: string,
      format: ExportFormat
    ) => Promise<{ success: boolean; filePath: string; canceled?: boolean }>;
  };

  // 日志功能
  logs: {
    /** 保存渲染器日志 */
    saveRenderer: (content: string) => Promise<{ success: boolean; filepath: string }>;
    /** 保存最新渲染器日志 */
    saveLatestRenderer: (content: string) => Promise<{ success: boolean; filepath: string }>;
    /** 获取最新渲染器日志 */
    getLatestRenderer: () => Promise<{ success: boolean; content: string | null }>;
  };

  // 窗口控制
  window: {
    /** 最小化窗口 */
    minimize: () => Promise<void>;
    /** 最大化窗口 */
    maximize: () => Promise<void>;
    /** 关闭窗口 */
    close: () => Promise<void>;
  };

  // 开发工具
  devTools: {
    /** 打开开发者工具 */
    open: () => void;
    /** 关闭开发者工具 */
    close: () => void;
  };
}

/**
 * IPC 事件名称
 */
export const IPC_EVENTS = {
  // 会话事件
  CONVERSATION_CREATED: 'conversation:created',
  CONVERSATION_UPDATED: 'conversation:updated',
  CONVERSATION_DELETED: 'conversation:deleted',
  MESSAGE_ADDED: 'message:added',
  MESSAGE_UPDATED: 'message:updated',
  ACTIVE_SESSION_CHANGED: 'active-session:changed',

  // AI 应用事件
  AI_STATUS_CHANGED: 'ai:status-changed',

  // 设置事件
  SETTINGS_UPDATED: 'settings:updated',
  THEME_CHANGED: 'theme:changed',

  // 窗口事件
  WINDOW_MAXIMIZED: 'window:maximized',
  WINDOW_UNMAXIMIZED: 'window:unmaximized',
} as const;

/**
 * BrowserContext 标识符
 * 格式: {conversationId}#{aiApplicationId}
 */
export type ContextKey = string;
