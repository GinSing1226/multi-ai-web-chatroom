/**
 * 会话相关工具函数
 * Conversation-related utility functions
 */

import type { Conversation, Chat, Message } from '../types/conversation.types';
import type { MessageRole } from '../types/message.types';
import { XMLBuilder } from 'fast-xml-parser';

/**
 * 会话转 XML 格式
 * Convert conversation to XML format
 */
export function conversationToMarkdown(conversation: Conversation): string {
  let result = '';

  // 🔥 调试：检查是否有 undefined 字段
  // 🔥 Debug: Check for undefined fields
  if (conversation.conversationName === undefined) {
    console.error('❌ conversationName is undefined');
  }
  if (conversation.description === undefined) {
    console.error('❌ description is undefined');
  }
  if (conversation.conversationId === undefined) {
    console.error('❌ conversationId is undefined');
  }
  if (conversation.createTime === undefined) {
    console.error('❌ createTime is undefined');
  }
  if (conversation.updateTime === undefined) {
    console.error('❌ updateTime is undefined');
  }
  if (conversation.chats === undefined) {
    console.error('❌ chats is undefined');
  }

  // Frontmatter (YAML)
  result += '---\n';
  result += `conversationName: ${conversation.conversationName || ''}\n`;
  result += `description: ${conversation.description || ''}\n`;
  result += `conversationId: ${conversation.conversationId || ''}\n`;
  result += `createTime: ${conversation.createTime || 0}\n`;
  result += `updateTime: ${conversation.updateTime || 0}\n`;

  // AI 应用绑定 - 保存为数组格式 / AI Application Bindings - Save as array format
  if (conversation.aiApplicationBindings && conversation.aiApplicationBindings.length > 0) {
    result += `aiApplicationBindings:\n`;
    for (const binding of conversation.aiApplicationBindings) {
      result += `  - aiApplicationId: ${binding.aiApplicationId}\n`;
      result += `    platformConversationId: ${binding.platformConversationId || ''}\n`;
    }
  }

  result += '---\n\n';

  // 🔥 使用 XML 格式存储消息内容
  // 🔥 Use XML format to store message content
  const xmlBuilder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: true,
    indentBy: '  '
  });

  // 构建 XML 数据结构 / Build XML data structure
  const xmlData = {
    conversation: {
      chat: (conversation.chats || []).map((chat: Chat) => ({
        '@_id': chat.chatId,
        message: (chat.messages || []).map((msg: Message) => {
          const msgObj: any = {
            '@_role': msg.role,
            '@_id': msg.messageId,
            '@_timestamp': msg.timestamp,
            content: {
              '#cdata': msg.content || ''
            }
          };

          // sender 字段（仅 assistant 和 summary 需要）
          // sender field (only needed for assistant and summary)
          if (msg.sender) {
            msgObj['@_sender'] = msg.sender;
          }

          // 🔥 【新增】保存 status 字段
          // 🔥 【New】Save status field
          if (msg.status) {
            msgObj['@_status'] = msg.status;
          }

          // 🔥 【新增】保存 error 字段（如果有）
          // 🔥 【New】Save error field (if exists)
          if (msg.error) {
            msgObj['@_error'] = msg.error;
          }

          return msgObj;
        })
      }))
    }
  };

  // 生成 XML 字符串 / Generate XML string
  const xmlContent = xmlBuilder.build(xmlData);

  result += xmlContent;

  return result;
}

/**
 * Markdown 转会话对象
 */
export function markdownToConversation(markdown: string): Conversation {
  // TODO: 实现 Markdown 解析逻辑
  // 使用 gray-matter 解析 frontmatter
  // 解析消息内容
  throw new Error('未实现');
}

/**
 * 获取发送者标签
 */
function getSenderLabel(role: MessageRole, sender: string | null): string {
  if (role === 'user') {
    return sender || '用户';
  } else if (role === 'summary') {
    return '总结';
  } else {
    return sender || 'AI';
  }
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(timestamp: number, format: 'full' | 'date' | 'time' = 'full'): string {
  const date = new Date(timestamp);
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  if (format === 'date') {
    return `${year}-${month}-${day}`;
  } else if (format === 'time') {
    return `${hours}:${minutes}:${seconds}`;
  } else {
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
}

/**
 * 获取会话消息总数
 */
export function getConversationMessageCount(conversation: Conversation): number {
  return conversation.chats.reduce((total, chat) => total + chat.messages.length, 0);
}

/**
 * 获取会话最后更新时间
 */
export function getConversationLastUpdate(conversation: Conversation): number {
  if (conversation.chats.length === 0) {
    return conversation.updateTime;
  }

  const lastChat = conversation.chats[conversation.chats.length - 1];
  const lastMessage = lastChat.messages[lastChat.messages.length - 1];

  return lastMessage?.timestamp || conversation.updateTime;
}

/**
 * 检查聊天中所有AI输出是否完成
 * Check if all AI outputs in a chat are completed
 *
 * @param chat - 要检查的聊天对象 / Chat object to check
 * @param aiBindingsCount - AI应用绑定数量 / Number of AI application bindings
 * @returns 是否所有AI都已完成输出 / Whether all AIs have completed output
 *
 * @example
 * ```typescript
 * const latestChat = conversation.chats[conversation.chats.length - 1];
 * const aiBindingsCount = conversation.aiApplicationBindings.length;
 * const isComplete = areAllAiOutputsComplete(latestChat, aiBindingsCount);
 * ```
 *
 * @remarks
 * 🔥 【修改】使用 status 字段判断是否完成
 * 🔥 【Modified】Use status field to determine completion
 * 只有当消息状态不是 'sending' 或 'waiting' 时，才认为该 AI 已完成
 * Only consider an AI as completed when its message status is not 'sending' or 'waiting'
 */
export function areAllAiOutputsComplete(chat: Chat | undefined, aiBindingsCount: number): boolean {
  // 🔥 如果 chat 为 undefined，返回 false
  // 🔥 If chat is undefined, return false
  if (!chat) {
    return false;
  }

  // 没有AI绑定，认为已完成 / No AI bindings, consider as complete
  if (aiBindingsCount === 0) {
    return true;
  }

  // 过滤出AI输出消息 / Filter AI output messages
  const aiOutputs = chat.messages.filter(m => m.role === 'assistant');

  // 🔥 检查已完成的消息数量（非 sending/waiting 状态）
  // 🔥 Check count of completed messages (not sending/waiting status)
  const completedCount = aiOutputs.filter(m =>
    m.status !== 'sending' && m.status !== 'waiting'
  ).length;

  return completedCount >= aiBindingsCount;
}
