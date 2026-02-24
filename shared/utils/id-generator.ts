/**
 * ID 生成工具
 */

import {
  CONVERSATION_ID_CHARSET,
  CONVERSATION_ID_LENGTH,
  CHAT_ID_LENGTH,
  MESSAGE_ID_LENGTH
} from '../constants/conversation.constants';

/**
 * 生成随机 ID
 */
function generateRandomId(length: number, charset: string): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

/**
 * 生成会话 ID（32位小写字母和数字）
 */
export function generateConversationId(): string {
  return generateRandomId(CONVERSATION_ID_LENGTH, CONVERSATION_ID_CHARSET);
}

/**
 * 生成聊天 ID
 */
export function generateChatId(): string {
  return generateRandomId(CHAT_ID_LENGTH, CONVERSATION_ID_CHARSET);
}

/**
 * 生成消息 ID
 */
export function generateMessageId(): string {
  return generateRandomId(MESSAGE_ID_LENGTH, CONVERSATION_ID_CHARSET);
}

/**
 * 生成时间戳 ID（基于当前时间和随机数）
 */
export function generateTimestampId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}
