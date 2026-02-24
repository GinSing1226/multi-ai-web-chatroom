/**
 * 会话类型定义
 * Conversation type definitions
 */

import { AiApplication } from './ai-application.types';

/**
 * 消息角色
 */
export type MessageRole = 'user' | 'assistant';

/**
 * 消息状态
 */
export type MessageStatus = 'sending' | 'sent' | 'error';

/**
 * 单条消息
 */
export interface Message {
  /** 消息 ID */
  id: string;

  /** 消息角色 */
  role: MessageRole;

  /** 消息内容 */
  content: string;

  /** 消息状态 */
  status: MessageStatus;

  /** 发送时间 */
  timestamp: string;

  /** AI 应用绑定（仅助手消息） */
  aiBinding?: AiApplicationBinding;
}

/**
 * AI 应用绑定
 */
export interface AiApplicationBinding {
  /** AI 应用 ID */
  aiAppId: string;

  /** AI 应用名称 */
  aiAppName: string;

  /** 是否成功获取响应 */
  success: boolean;

  /** 错误信息（如果失败） */
  error?: string;

  /** 响应时间（毫秒） */
  responseTime?: number;

  /** 获取响应的时间戳 */
  timestamp: string;
}

/**
 * 聊天记录（用户发送的一次消息及其所有 AI 响应）
 */
export interface Chat {
  /** 聊天 ID */
  id: string;

  /** 用户消息 */
  userMessage: Message;

  /** AI 响应列表 */
  aiResponses: Message[];

  /** 创建时间 */
  createdAt: string;
}

/**
 * 显示模式
 */
export type DisplayMode = 'unified' | 'split';

/**
 * 会话
 */
export interface Conversation {
  /** 会话 ID */
  id: string;

  /** 会话标题 */
  title: string;

  /** 聊天记录列表 */
  chats: Chat[];

  /** 显示模式 */
  displayMode: DisplayMode;

  /** 创建时间 */
  createdAt: string;

  /** 更新时间 */
  updatedAt: string;
}
