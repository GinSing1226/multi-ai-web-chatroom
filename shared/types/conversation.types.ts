/**
 * 会话相关类型定义
 * Conversation - 表示一个完整的对话会话
 * Chat - 一轮对话（包含1个用户消息 + 多个AI回复 + 可选的总结）
 */

import type { Message } from './message.types';

/**
 * AI 应用会话绑定关系
 * 存储各 AI 平台的会话 ID
 */
export interface AiApplicationBinding {
  /** AI 应用 ID (如: deepseek, chatgpt, gemini) */
  aiApplicationId: string;
  /** 平台端的会话 ID（通常在 URL 中） */
  platformConversationId: string;
}

/**
 * 会话 - 表示一个完整的对话会话
 * 包含多轮对话，每轮对话可能包含多个 AI 的回复和可选的总结
 */
export interface Conversation {
  // Frontmatter 元数据
  /** 会话标题 */
  conversationName: string;
  /** 会话描述 */
  description: string;
  /** 本产品的会话 ID (32位小写字母和数字) */
  conversationId: string;
  /** AI 应用会话绑定关系 */
  aiApplicationBindings: AiApplicationBinding[];
  /** 创建时间戳 / Creation timestamp */
  createTime: number;
  /** 更新时间戳 / Update timestamp */
  updateTime: number;

  // 会话内容
  /** 对话列表 */
  chats: Chat[];
}

/**
 * 一轮对话 - 包含用户消息、多个 AI 回复和可选总结
 */
export interface Chat {
  /** 聊天 ID (一问一答的对话 ID) */
  chatId: string;
  /** 消息列表 (1个 user + 多个 assistant + 可选 summary) */
  messages: Message[];
}

/**
 * 会话列表项（用于列表展示，不包含完整的消息内容）
 */
export interface ConversationListItem {
  conversationId: string;
  conversationName: string;
  description: string;
  /** 创建时间戳 / Creation timestamp */
  createTime: number;
  /** 更新时间戳 / Update timestamp */
  updateTime: number;
  /** 消息总数 */
  messageCount: number;
  /** 参与的 AI 应用数量 */
  aiApplicationCount: number;
}

/**
 * 会话元数据（用于编辑）
 */
export interface ConversationMetadata {
  conversationName: string;
  description: string;
}

/**
 * 会话创建选项
 */
export interface CreateConversationOptions {
  /** 启用的 AI 应用 ID 列表 */
  aiApplicationIds: string[];
  /** 会话标题（可选，默认自动生成） */
  conversationName?: string;
  /** 会话描述（可选，默认自动生成） */
  description?: string;
}
