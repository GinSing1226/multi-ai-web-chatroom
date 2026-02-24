/**
 * 测试 ID 常量
 * 用于自动化测试和 pageSkill 注入
 */

/**
 * DeepSeek 平台的测试 ID
 */
export const DEEPSEEK_TEST_IDS = {
  /** 新会话按钮 */
  NEW_CHAT_BUTTON: 'ds-new-chat',
  /** 输入框 */
  INPUT_BOX: 'ds-input-box',
  /** 发送按钮 */
  SEND_BUTTON: 'ds-send',
  /** 停止按钮 */
  STOP_BUTTON: 'ds-stop',
  /** 消息容器 */
  MESSAGE_CONTAINER: 'ds-message-container',
  /** 消息内容 */
  MESSAGE_CONTENT: 'ds-message-content',
} as const;

/**
 * ChatGPT 平台的测试 ID
 */
export const CHATGPT_TEST_IDS = {
  /** 新会话按钮 */
  NEW_CHAT_BUTTON: 'gpt-new-chat',
  /** 输入框 */
  INPUT_BOX: 'gpt-input-box',
  /** 发送按钮 */
  SEND_BUTTON: 'gpt-send',
  /** 停止按钮 */
  STOP_BUTTON: 'gpt-stop',
  /** 消息容器 */
  MESSAGE_CONTAINER: 'gpt-message-container',
  /** 消息内容 */
  MESSAGE_CONTENT: 'gpt-message-content',
} as const;

/**
 * Gemini 平台的测试 ID
 */
export const GEMINI_TEST_IDS = {
  /** 新会话按钮 */
  NEW_CHAT_BUTTON: 'gemini-new-chat',
  /** 输入框 */
  INPUT_BOX: 'gemini-input-box',
  /** 发送按钮 */
  SEND_BUTTON: 'gemini-send',
  /** 停止按钮 */
  STOP_BUTTON: 'gemini-stop',
  /** 消息容器 */
  MESSAGE_CONTAINER: 'gemini-message-container',
  /** 消息内容 */
  MESSAGE_CONTENT: 'gemini-message-content',
} as const;
