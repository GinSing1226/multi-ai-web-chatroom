/**
 * 消息相关类型定义
 * Message - 基础消息类型，支持三种角色
 */

/**
 * 消息角色类型
 */
export type MessageRole = 'user' | 'assistant' | 'summary';

/**
 * 消息状态（用于 UI 状态管理）
 * Message status (for UI state management)
 */
export type MessageStatus =
  | 'sending'       // 正在发送 / Sending
  | 'waiting'       // 等待输出 / Waiting for output
  | 'success'       // 成功 / Success
  | 'sendFailed'    // 发送失败 / Send failed
  | 'outputTimeout' // 输出超时 / Output timeout
  | 'outputFailed'; // 输出失败 / Output failed

/**
 * 消息 - 支持三种角色
 */
export interface Message {
  /** 消息 ID (全局唯一) */
  messageId: string;
  /** 角色 */
  role: MessageRole;
  /**
   * 发送者：
   * - user: 用户名
   * - assistant: AI应用ID
   * - summary: null (总结内容没有发送者)
   */
  sender: string | null;
  /** 发送时间戳 */
  timestamp: number;
  /** Markdown 格式内容 */
  content: string;
  /** 消息状态 (仅用于 UI 状态管理) */
  status?: MessageStatus;
  /** 错误信息（如果 status 为 failed） */
  error?: string;
}

/**
 * 用户消息
 */
export interface UserMessage extends Omit<Message, 'role' | 'sender'> {
  role: 'user';
  sender: string;
}

/**
 * AI 消息
 */
export interface AssistantMessage extends Omit<Message, 'role' | 'sender'> {
  role: 'assistant';
  sender: string;  // AI 应用 ID
}

/**
 * 总结消息
 */
export interface SummaryMessage extends Omit<Message, 'role' | 'sender'> {
  role: 'summary';
  sender: null;
}
