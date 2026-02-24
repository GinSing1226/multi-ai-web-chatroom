/**
 * 各平台选择器配置
 */

import type { PlatformSelectors, PlatformExceptionSelectors } from '@shared/types/ai-application.types';

/**
 * DeepSeek 平台选择器
 * DeepSeek Platform Selectors - 选择器配置 / Selector Configuration
 *
 * DOM 结构说明 / DOM Structure Notes:
 * - 新建会话按钮 / New Chat Button: div._5a8ac7a > span:has-text("开启新对话")
 * - 输入框 / Input Box: textarea._27c9245[placeholder*="给 DeepSeek 发送消息"]
 * - 发送按钮 / Send Button: div.bf38813a > div.ds-icon-button:has(svg path[d*="M8.3125 0.981587"])
 * - 消息容器 / Message Container: div.ds-markdown (最新AI输出的容器)
 */
export const DEEPSEEK_SELECTORS: PlatformSelectors = {
  // 新建会话按钮 - 支持折叠和展开两种状态
  // 展开状态: div._5a8ac7a:has(span:text("开启新对话"))
  // 折叠状态: div.ds-icon-button__hover-bg (图标按钮)
  newChatButton: 'div._5a8ac7a:has(span:text("开启新对话")), div.ds-icon-button__hover-bg',

  // 输入框 - 通过 placeholder 和 class 定位
  inputBox: 'textarea._27c9245[placeholder*="给 DeepSeek 发送消息"]',

  // 发送按钮 - 通过 SVG 图标定位（发送箭头图标）
  sendButton: 'div.bf38813a div.ds-icon-button:has(svg path[d*="M8.3125 0.981587"])',

  // 停止按钮 - DeepSeek 生成时显示停止按钮
  stopButton: 'div:has(svg path[d*="stop"]), button:has-text("停止")',

  // 消息容器 - 包含 ds-markdown 类的消息容器
  messageContainer: 'div.ds-markdown',

  // 消息内容 - Markdown 渲染的内容
  messageContent: 'div.ds-markdown',

  // 生成指示器 - 生成中的消息容器会有特定的动画类
  generatingIndicator: 'div.ds-markdown:has(.animate-pulse), [class*="generating"]'
};

/**
 * DeepSeek 异常状态选择器
 */
export const DEEPSEEK_EXCEPTION_SELECTORS: PlatformExceptionSelectors = {
  loginPage: 'a[href="/login"]',
  rateLimited: 'text=请求过于频繁'
};

/**
 * ChatGPT 平台选择器
 * ChatGPT Platform Selectors - 选择器配置 / Selector Configuration
 *
 * DOM 结构说明 / DOM Structure Notes (基于实际 DOM 分析):
 * - 主页 / Home: https://chatgpt.com/
 * - 会话 / Conversation: https://chatgpt.com/c/{uuid}
 * - 新建会话按钮 / New Chat Button: a[data-testid="create-new-chat-button"][href="/"]
 * - 输入框 / Input Box:
 *   - 新会话 / New Chat: div.ProseMirror#prompt-textarea (在特定容器内)
 *   - 历史会话 / History Chat: div.ProseMirror#prompt-textarea (可能在不同容器内)
 * - 发送按钮 / Send Button: button#composer-submit-button[data-testid="send-button"]
 * - 停止按钮 / Stop Button: button#composer-submit-button[data-testid="stop-button"]
 * - 消息容器 / Message Container: div.markdown.prose
 * - 听写按钮 / Dictation Button: 出现在完成输出后，button[aria-label="听写按钮"]
 */
export const CHATGPT_SELECTORS: PlatformSelectors = {
  // 新建会话按钮 - 通过 data-testid 定位
  newChatButton: 'a[data-testid="create-new-chat-button"][href="/"]',

  // 输入框 - 支持新建会话和历史会话两种格式
  // 使用多个选择器，逗号分隔，Playwright 会尝试每个
  inputBox: 'div.ProseMirror#prompt-textarea[contenteditable="true"], div.ProseMirror#prompt-textarea',

  // 发送按钮 - 通过 id 和 data-testid 定位
  sendButton: 'button#composer-submit-button[data-testid="send-button"]',

  // 停止按钮 - 通过 data-testid 定位
  stopButton: 'button#composer-submit-button[data-testid="stop-button"]',

  // 消息容器 - 通过 class 定位
  messageContainer: 'div.markdown.prose',

  // 消息内容 - 通过 class 定位
  messageContent: 'div.markdown.prose',

  // 生成指示器 - 停止按钮存在说明正在生成
  generatingIndicator: 'button#composer-submit-button[data-testid="stop-button"]'
};

/**
 * ChatGPT 异常状态选择器
 */
export const CHATGPT_EXCEPTION_SELECTORS: PlatformExceptionSelectors = {
  loginPage: 'a[href="/login"]'
};

/**
 * Gemini 平台选择器
 * Gemini Platform Selectors - 选择器配置 / Selector Configuration
 *
 * DOM 结构说明 / DOM Structure Notes (基于实际 DOM 分析):
 * - 主页 / Home: https://gemini.google.com/
 * - 会话 / Conversation: https://gemini.google.com/app/{conversationId}
 * - 新建会话按钮（展开） / New Chat Button (expanded): a[data-test-id="expanded-button"]:has-text("发起新对话")
 * - 新建会话按钮（折叠） / New Chat Button (collapsed): a.side-nav-action-collapsed-button:has(mat-icon[data-mat-icon-name="edit_square"])
 * - 输入框 / Input Box: rich-textarea .ql-editor[contenteditable="true"]
 * - 发送按钮 / Send Button: button.send-button.submit:has(mat-icon[data-mat-icon-name="send"])
 * - 停止按钮 / Stop Button: button.send-button.stop:has(.blue-circle.stop-icon)
 * - 完成指示器 / Completion Indicator: button.speech_dictation_mic_button (麦克风按钮出现说明已完成)
 * - 消息容器 / Message Container: message-content .markdown.markdown-main-panel
 *
 * 按钮状态说明 / Button State Notes:
 * - 发送状态 / Send State: button.send-button.submit 可见
 * - 等待状态 / Generating State: button.send-button.stop 可见（带蓝色停止图标）
 * - 完成状态 / Completed State: button.speech_dictation_mic_button 可见（麦克风按钮）
 */
export const GEMINI_SELECTORS: PlatformSelectors = {
  // 新建会话按钮 - 支持折叠和展开两种状态
  // 展开状态: a[data-test-id="expanded-button"] with href="/app" and text "发起新对话"
  // 折叠状态: a.side-nav-action-collapsed-button with href="/app"
  newChatButton: 'a[data-test-id="expanded-button"][href="/app"], a.side-nav-action-collapsed-button[href="/app"]',

  // 输入框 - rich-textarea 组件内的 contenteditable div
  inputBox: 'rich-textarea .ql-editor.textarea[contenteditable="true"]',

  // 发送按钮 - 通过 class 和 mat-icon 定位
  sendButton: 'button.send-button.submit:has(mat-icon[data-mat-icon-name="send"])',

  // 停止按钮 - 通过 class 和内部元素定位
  stopButton: 'button.send-button.stop',

  // 消息容器 - 通过组件名和 class 定位
  messageContainer: 'message-content .markdown.markdown-main-panel',

  // 消息内容 - 通过 class 定位
  messageContent: 'message-content .markdown.markdown-main-panel',

  // 生成指示器 - 停止按钮存在说明正在生成
  generatingIndicator: 'button.send-button.stop'
};

/**
 * Gemini 异常状态选择器
 */
export const GEMINI_EXCEPTION_SELECTORS: PlatformExceptionSelectors = {
  loginPage: 'a[href="/accounts"]'
};

/**
 * 豆包平台选择器
 * Doubao Platform Selectors - 选择器配置 / Selector Configuration
 *
 * 豆包是字节跳动的 AI 助手，无需登录即可使用
 * Doubao is ByteDance's AI assistant, no login required
 *
 * DOM 结构说明 / DOM Structure Notes (基于实际 DOM 分析):
 * - 新建会话按钮 / New Chat Button: div[data-testid="create_conversation_button"]
 * - 输入框 / Input Box: textarea.semi-input-textarea[data-testid="chat_input_input"]
 * - 发送按钮 / Send Button: button#flow-end-msg-send[data-testid="chat_input_send_button"]
 * - 停止按钮 / Stop Button: div[data-testid="chat_input_local_break_button"]
 * - 消息容器 / Message Container: div[data-testid="message_text_content"]
 *
 * 按钮状态说明 / Button State Notes:
 * - 发送状态 / Send State: send-btn-wrapper 可见，data-loading="false"
 * - 等待状态 / Waiting State: break-btn-fISNgC 可见，send-btn-wrapper 隐藏
 * - 输入框 / Input Box: textarea.semi-input-textarea with placeholder="发消息或输入"/"选择技能"
 */
export const DOUBAO_SELECTORS: PlatformSelectors = {
  // 新建会话按钮 - 通过 data-testid 定位
  newChatButton: 'div[data-testid="create_conversation_button"]',

  // 输入框 - 通过 data-testid 和 class 定位
  inputBox: 'textarea[data-testid="chat_input_input"].semi-input-textarea',

  // 发送按钮 - 通过 ID 和 data-testid 定位
  sendButton: 'button#flow-end-msg-send[data-testid="chat_input_send_button"]',

  // 停止按钮 - 通过 data-testid 定位
  stopButton: 'div[data-testid="chat_input_local_break_button"]',

  // 消息容器 - 通过 data-testid 定位
  messageContainer: 'div[data-testid="message_text_content"]',

  // 消息内容 - 通过 data-testid 定位
  messageContent: 'div[data-testid="message_text_content"]',

  // 生成指示器 - 停止按钮存在说明正在生成
  generatingIndicator: 'div[data-testid="chat_input_local_break_button"][data-state="closed"]'
};

/**
 * 豆包异常状态选择器
 * Doubao Exception State Selectors
 */
export const DOUBAO_EXCEPTION_SELECTORS: PlatformExceptionSelectors = {
  // 豆包无需登录，此字段保留用于可能的限流等情况
  loginPage: '',
  rateLimited: 'text=请求过于频繁, text=限流, text=请求过多'
};

/**
 * GLM (智谱清言) 平台选择器
 * GLM (ChatGLM/Zhipu) Platform Selectors - 选择器配置 / Selector Configuration
 *
 * DOM 结构说明 / DOM Structure Notes:
 * - 新建会话按钮 / New Chat Button: button#sidebar-new-chat-button
 * - 输入框 / Input Box: textarea#chat-input
 * - 发送按钮 / Send Button: button#send-message-button
 * - 停止按钮 / Stop Button: 包含停止图标的按钮
 * - 消息容器 / Message Container: div.markdown-prose
 */
export const GLM_SELECTORS: PlatformSelectors = {
  // 新建会话按钮 - 支持折叠和展开两种状态
  // 展开状态: button#sidebar-new-chat-button
  // 折叠状态: div.self-center:has(svg path[d*="M21 13"]) (包含编辑图标的按钮)
  newChatButton: 'button#sidebar-new-chat-button, div.self-center:has(svg path[d*="M21 13"])',

  // 输入框 - 通过 ID 定位
  inputBox: 'textarea#chat-input',

  // 发送按钮 - 通过 ID 定位
  sendButton: 'button#send-message-button, button.sendMessageButton',

  // 停止按钮 - 通过 SVG 图标中的方形块特征定位
  stopButton: 'button:has(svg rect), button[aria-label="停止"]',

  // 消息容器 - GLM 使用 markdown-prose 类
  messageContainer: 'div.markdown-prose',

  // 消息内容 - Markdown 渲染的内容
  messageContent: 'div.markdown-prose',

  // 生成指示器 - 生成中的指示器
  generatingIndicator: '[class*="loading"], [class*="generating"], svg[class*="spin"]'
};

/**
 * GLM 异常状态选择器
 */
export const GLM_EXCEPTION_SELECTORS: PlatformExceptionSelectors = {
  loginPage: 'a[href="/login"], button:has-text("登录")',
  rateLimited: 'text=请求过于频繁, text=限流, text=服务器繁忙'
};

/**
 * Kimi (月之暗面) 平台选择器
 * Kimi (Moonshot) Platform Selectors - 选择器配置 / Selector Configuration
 *
 * DOM 结构说明 / DOM Structure Notes:
 * - 新建会话按钮（展开） / New Chat Button (expanded): a.new-chat-btn
 * - 新建会话按钮（折叠） / New Chat Button (collapsed): div.icon-button.expand-btn:has(svg[name="AddConversation"])
 * - 输入框 / Input Box: div.chat-input-editor[contenteditable="true"]
 * - 发送按钮 / Send Button: div.send-button-container:not(.disabled) svg[name="Send"]
 * - 停止按钮 / Stop Button: div.send-button-container.disabled svg[name="stop"]
 * - 消息容器 / Message Container: div.markdown-container
 */
export const KIMI_SELECTORS: PlatformSelectors = {
  // 新建会话按钮 - 支持折叠和展开两种状态
  // 展开状态: a.new-chat-btn
  // 折叠状态: div.icon-button.expand-btn:has(svg[name="AddConversation"])
  newChatButton: 'a.new-chat-btn, div.icon-button.expand-btn:has(svg[name="AddConversation"])',

  // 输入框 - 通过 contenteditable 属性定位
  inputBox: 'div.chat-input-editor[contenteditable="true"]',

  // 发送按钮 - 通过 SVG name 定位
  sendButton: 'div.send-button-container:not(.disabled) svg[name="Send"]',

  // 停止按钮 - 通过 disabled 类和 SVG name 定位
  stopButton: 'div.send-button-container.disabled svg[name="stop"]',

  // 消息容器 - Kimi 使用 markdown-container 类
  messageContainer: 'div.markdown-container',

  // 消息内容 - Markdown 渲染的内容
  messageContent: 'div.markdown-container',

  // 生成指示器 - 生成中的指示器
  generatingIndicator: '[class*="loading"], [class*="generating"], svg[class*="spin"]'
};

/**
 * Kimi 异常状态选择器
 */
export const KIMI_EXCEPTION_SELECTORS: PlatformExceptionSelectors = {
  loginPage: 'a[href="/login"], button:has-text("登录")',
  rateLimited: 'text=请求过于频繁, text=限流, text=服务器繁忙'
};

/**
 * Qwen (千问) 平台选择器
 * Qwen Platform Selectors - 选择器配置 / Selector Configuration
 *
 * DOM 结构说明 / DOM Structure Notes (基于实际 DOM 分析):
 * - 主页 / Home: https://www.qianwen.com/
 * - 会话 / Conversation: https://www.qianwen.com/chat/{id}
 * - 新建会话按钮（展开） / New Chat Button (expanded): button.newChatButton-ce3yCU:has(span:text("新对话"))
 * - 新建会话按钮（折叠） / New Chat Button (collapsed): button:has(span[data-icon-type="qwpcicon-newDialogue"])
 * - 输入框 / Input Box: div[role="textbox"][data-placeholder="向千问提问"][data-slate-editor="true"][contenteditable="true"]
 * - 发送按钮 / Send Button: div.optionBtn-dJvtI6:has(span[data-icon-type="qwpcicon-attachment"])
 * - 停止按钮 / Stop Button: div.stop-yGpvO2 (可见时说明正在生成)
 * - 消息容器 / Message Container: div.markdown-pc-special-class div.qk-markdown-complete
 *
 * 按钮状态说明 / Button State Notes:
 * - 等待状态 / Generating State: div.stop-yGpvO2 可见（带停止图标）
 * - 完成状态 / Completed State: div.disabled-ZaDDJC 可见（发送按钮被禁用）
 */
export const QWEN_SELECTORS: PlatformSelectors = {
  // 新建会话按钮 - 支持折叠和展开两种状态
  // 展开状态: button.newChatButton-ce3yCU:has(span:text("新对话"))
  // 折叠状态: button:has(span[data-icon-type="qwpcicon-newDialogue"])
  newChatButton: 'button.newChatButton-ce3yCU:has(span:text("新对话")), button:has(span[data-icon-type="qwpcicon-newDialogue"])',

  // 输入框 - 千问使用 Slate.js 编辑器，通过 role、data-placeholder 和 data-slate-editor 定位
  // Input box - Qwen uses Slate.js editor, located by role, data-placeholder and data-slate-editor
  inputBox: 'div[role="textbox"][data-placeholder="向千问提问"][data-slate-editor="true"][contenteditable="true"]',

  // 发送按钮 - 通过 data-icon-type 定位
  sendButton: 'div.optionBtn-dJvtI6:has(span[data-icon-type="qwpcicon-sendChat"])',

  // 停止按钮 - 通过 class 定位
  stopButton: 'div.stop-yGpvO2',

  // 消息容器 - 通过 class 定位
  messageContainer: 'div.markdown-pc-special-class div.qk-markdown-complete',

  // 消息内容 - 通过 class 定位
  messageContent: 'div.markdown-pc-special-class div.qk-markdown-complete',

  // 生成指示器 - 停止按钮存在说明正在生成
  generatingIndicator: 'div.stop-yGpvO2'
};

/**
 * Qwen 异常状态选择器
 */
export const QWEN_EXCEPTION_SELECTORS: PlatformExceptionSelectors = {
  loginPage: 'a[href="/login"], button:has-text("登录")',
  rateLimited: 'text=请求过于频繁, text=限流, text=服务器繁忙'
};
