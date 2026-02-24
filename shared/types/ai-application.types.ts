/**
 * AI 应用相关类型定义
 * AiApplication - 统一表示 AI 平台/应用
 * AI 应用 = AI 平台（同一概念）
 * AI application related type definitions
 */

/**
 * Logo 类型 / Logo type
 */
export type LogoType = 'emoji' | 'image';

/**
 * AI 应用 - 统一表示 AI 平台/应用
 * AI application - Unified representation of AI platform/application
 */
export interface AiApplication {
  /** 应用 ID (如: deepseek, chatgpt, gemini) / Application ID */
  id: string;
  /** 应用名称 (如: DeepSeek, ChatGPT, Gemini) / Application name */
  name: string;
  /** 简短名称（用于显示在标签中）/ Short name (for tags) */
  shortName: string;
  /** 应用描述 / Application description */
  description?: string;
  /** 应用基础 URL (如: https://chat.deepseek.com) / Base URL */
  baseUrl: string;
  /** 网站 URL / Website URL */
  url: string;
  /** Logo 类型 / Logo type */
  logoType: LogoType;
  /** Logo 内容 / Logo content (emoji 或图片 URL，支持 PNG、JPG、SVG 等格式) */
  logoContent: string;
  /** 图标 URL (已废弃，使用 logoContent) / Icon URL (deprecated, use logoContent) */
  iconUrl?: string;
  /** 会话 URL 模板 (如: /a/chat/s/{conversationId}) / Conversation URL template */
  conversationUrlTemplate?: string;
  /** 是否启用 / Whether enabled */
  isEnabled: boolean;
  /** 超时时间（秒）/ Timeout in seconds */
  timeout?: number;
  /** 对应的自动化类名 / Automation class name */
  automationClass?: string;
  /** 配置 / Configuration */
  config?: Record<string, unknown>;
}

/**
 * AI 应用状态
 */
export interface AiApplicationStatus {
  /** AI 应用 ID */
  aiApplicationId: string;
  /** 是否可用 */
  isAvailable: boolean;
  /** 最后检查时间 */
  lastCheckTime: number;
  /** 异常类型（如果不可用） */
  exception?: AiExceptionType;
  /** 异常消息（如果不可用） */
  exceptionMessage?: string;
}

/**
 * AI 异常类型
 */
export enum AiExceptionType {
  /** 登录过期 */
  LOGIN_EXPIRED = 'login_expired',
  /** 维护中 */
  MAINTENANCE = 'maintenance',
  /** 限流 */
  RATE_LIMITED = 'rate_limited',
  /** 网络错误 */
  NETWORK_ERROR = 'network_error',
  /** 页面结构变化 */
  DOM_CHANGED = 'dom_changed',
  /** 未知错误 */
  UNKNOWN = 'unknown'
}

/**
 * 内置 AI 应用列表
 * Built-in AI applications list
 * 使用本地图标文件（位于 packages/renderer/public/icons/）
 * 使用相对路径 ./icons/xxx 以兼容 Electron 的 file:// 协议
 * Using relative paths ./icons/xxx to support Electron's file:// protocol
 */
export const BUILTIN_AI_APPLICATIONS: AiApplication[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    shortName: 'GPT',
    description: 'OpenAI 的 ChatGPT 对话系统',
    url: 'https://chatgpt.com',
    baseUrl: 'https://chatgpt.com',
    logoType: 'image',
    logoContent: './icons/chatgpt.svg',
    conversationUrlTemplate: '/c/{conversationId}',
    isEnabled: true,
    timeout: 120,
    automationClass: 'ChatGPTAutomation',
    config: {}
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    shortName: 'DS',
    description: 'DeepSeek AI 对话系统',
    url: 'https://chat.deepseek.com',
    baseUrl: 'https://chat.deepseek.com',
    logoType: 'image',
    logoContent: './icons/deepseek.png',
    conversationUrlTemplate: '/a/chat/s/{conversationId}',
    isEnabled: true,
    timeout: 120,
    automationClass: 'DeepSeekAutomation',
    config: {}
  },
  {
    id: 'doubao',
    name: '豆包',
    shortName: '豆',
    description: '字节跳动豆包 AI 助手',
    url: 'https://www.doubao.com',
    baseUrl: 'https://www.doubao.com',
    logoType: 'image',
    logoContent: './icons/doubao.png',
    conversationUrlTemplate: '/chat/{conversationId}',
    isEnabled: true,
    timeout: 120,
    automationClass: 'DoubaoAutomation',
    config: {}
  },
  {
    id: 'gemini',
    name: 'Gemini',
    shortName: 'Gem',
    description: 'Google Gemini AI 对话系统',
    url: 'https://gemini.google.com',
    baseUrl: 'https://gemini.google.com',
    logoType: 'image',
    logoContent: './icons/gemini.svg',
    conversationUrlTemplate: '/app/{conversationId}',
    isEnabled: true,
    timeout: 120,
    automationClass: 'GeminiAutomation',
    config: {}
  },
  {
    id: 'glm',
    name: 'GLM (智谱清言)',
    shortName: 'GLM',
    description: '智谱清言 AI 对话系统',
    url: 'https://chat.z.ai',
    baseUrl: 'https://chat.z.ai',
    logoType: 'image',
    logoContent: './icons/glm.svg',
    conversationUrlTemplate: '/c/{conversationId}',
    isEnabled: true,
    timeout: 120,
    automationClass: 'GlMAutomation',
    config: {}
  },
  {
    id: 'kimi',
    name: 'Kimi (月之暗面)',
    shortName: 'Kimi',
    description: '月之暗面 AI 对话系统',
    url: 'https://kimi.moonshot.cn',
    baseUrl: 'https://kimi.moonshot.cn',
    logoType: 'image',
    logoContent: './icons/kimi.png',
    conversationUrlTemplate: '/chat/{conversationId}',
    isEnabled: true,
    timeout: 120,
    automationClass: 'KimiAutomation',
    config: {}
  },
  {
    id: 'qwen',
    name: 'Qwen (千问)',
    shortName: 'Qwen',
    description: '阿里通义千问 AI 对话系统',
    url: 'https://www.qianwen.com',
    baseUrl: 'https://www.qianwen.com',
    logoType: 'image',
    logoContent: './icons/qwen.png',
    conversationUrlTemplate: '/chat/{conversationId}',
    isEnabled: true,
    timeout: 120,
    automationClass: 'QwenAutomation',
    config: {}
  }
];

/**
 * 平台选择器配置
 */
export interface PlatformSelectors {
  /** 新会话按钮选择器 */
  newChatButton: string;
  /** 输入框选择器 */
  inputBox: string;
  /** 发送按钮选择器 */
  sendButton: string;
  /** 停止按钮选择器（可选） */
  stopButton?: string;
  /** 消息容器选择器 */
  messageContainer: string;
  /** 消息内容选择器 */
  messageContent: string;
  /** 生成中指示器选择器 */
  generatingIndicator: string;
}

/**
 * 平台异常状态选择器
 */
export interface PlatformExceptionSelectors {
  /** 登录页面选择器 */
  loginPage?: string;
  /** 维护中提示选择器 */
  maintenance?: string;
  /** 限流提示选择器 */
  rateLimited?: string;
  /** 账号异常选择器 */
  accountError?: string;
}
