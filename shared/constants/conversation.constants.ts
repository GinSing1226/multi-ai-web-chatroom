/**
 * 会话相关常量
 */

/**
 * 会话 ID 长度
 */
export const CONVERSATION_ID_LENGTH = 32;

/**
 * 会话 ID 字符集
 */
export const CONVERSATION_ID_CHARSET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/**
 * 聊天 ID 长度
 */
export const CHAT_ID_LENGTH = 32;

/**
 * 消息 ID 长度
 */
export const MESSAGE_ID_LENGTH = 32;

/**
 * 最大会话数
 */
export const MAX_CONVERSATIONS = 1000;

/**
 * 单会话最大聊天轮数
 */
export const MAX_CHATS_PER_CONVERSATION = 1000;

/**
 * 默认轮询间隔（毫秒）
 */
export const DEFAULT_POLLING_INTERVAL_MS = 2000;

/**
 * 默认重试次数
 */
export const DEFAULT_RETRY_COUNT = 3;

/**
 * 默认重试间隔（毫秒）
 */
export const DEFAULT_RETRY_INTERVAL_MS = 5000;

/**
 * 默认超时时间（毫秒）
 */
export const DEFAULT_TIMEOUT_MS = 60000;

/**
 * 降级判断：内容稳定时长（毫秒）
 */
export const CONTENT_STABLE_DURATION_MS = 10000;

/**
 * 会话标题最大长度
 */
export const MAX_CONVERSATION_NAME_LENGTH = 30;

/**
 * 会话描述最大长度
 */
export const MAX_CONVERSATION_DESCRIPTION_LENGTH = 200;
