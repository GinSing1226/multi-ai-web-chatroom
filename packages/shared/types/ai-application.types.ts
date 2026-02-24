/**
 * AI 应用类型定义
 * AI application type definitions
 */

/**
 * Logo 类型
 */
export type LogoType = 'emoji' | 'image';

/**
 * AI 应用接口
 * AI application interface
 */
export interface AiApplication {
  /** 应用 ID / Application ID */
  id: string;

  /** 应用名称 / Application name */
  name: string;

  /** 简短名称（用于显示在标签中）/ Short name (for tags) */
  shortName: string;

  /** 应用描述 / Application description */
  description: string;

  /** 网站 URL / Website URL */
  url: string;

  /** Logo 类型 / Logo type */
  logoType: LogoType;

  /** Logo 内容 / Logo content (emoji 或图片 URL) */
  logoContent: string;

  /** 图标 URL（可选，已废弃，使用 logoContent）/ Icon URL (optional, deprecated, use logoContent) */
  iconUrl?: string;

  /** 是否启用 / Whether enabled */
  enabled: boolean;

  /** 配置 / Configuration */
  config: Record<string, unknown>;

  /** 创建时间 / Creation time */
  createdAt: string;

  /** 更新时间 / Update time */
  updatedAt: string;
}

/**
 * 内置 AI 应用列表
 * Built-in AI applications list
 * 使用本地图标文件（位于 packages/renderer/public/icons/）
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
    logoContent: '/icons/chatgpt.svg',
    enabled: true,
    config: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    shortName: 'DS',
    description: 'DeepSeek AI 对话系统',
    url: 'https://chat.deepseek.com',
    logoType: 'image',
    logoContent: '/icons/deepseek.png',
    enabled: true,
    config: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'gemini',
    name: 'Gemini',
    shortName: 'Gem',
    description: 'Google Gemini AI 对话系统',
    url: 'https://gemini.google.com',
    logoType: 'image',
    logoContent: '/icons/gemini.svg',
    enabled: true,
    config: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'doubao',
    name: '豆包',
    shortName: '豆',
    description: '字节跳动豆包 AI 助手',
    url: 'https://www.doubao.com',
    logoType: 'image',
    logoContent: '/icons/doubao.png',
    enabled: true,
    config: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'glm',
    name: 'GLM (智谱清言)',
    shortName: 'GLM',
    description: '智谱清言 AI 对话系统',
    url: 'https://chat.z.ai',
    logoType: 'image',
    logoContent: '/icons/glm.svg',
    enabled: true,
    config: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'kimi',
    name: 'Kimi (月之暗面)',
    shortName: 'Kimi',
    description: '月之暗面 AI 对话系统',
    url: 'https://kimi.moonshot.cn',
    logoType: 'image',
    logoContent: '/icons/kimi.png',
    enabled: true,
    config: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'qwen',
    name: 'Qwen (千问)',
    shortName: 'Qwen',
    description: '阿里通义千问 AI 对话系统',
    url: 'https://www.qianwen.com',
    logoType: 'image',
    logoContent: '/icons/qwen.png',
    enabled: true,
    config: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
