/**
 * AI 应用配置
 * AI Applications Configuration
 *
 * 集中管理各 AI 平台的配置信息
 * Centralized configuration for AI platforms
 */

/**
 * AI 应用配置接口
 * AI Application Configuration Interface
 */
export interface AiApplicationConfig {
  /** AI 应用 ID / AI Application ID */
  id: string;
  /** AI 应用名称 / AI Application Name */
  name: string;
  /** 基础 URL / Base URL */
  baseUrl: string;
  /** 图标文件名（不含路径和扩展名）/ Icon filename (without path and extension) */
  icon: string;
  /** 是否默认启用 / Whether enabled by default */
  enabled: boolean;
}

/**
 * AI 应用配置列表
 * AI Applications Configuration List
 */
export const AI_APPLICATIONS_CONFIG: Record<string, AiApplicationConfig> = {
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek / 深度求索',
    baseUrl: 'https://chat.deepseek.com',
    icon: 'deepseek',
    enabled: true
  },
  chatgpt: {
    id: 'chatgpt',
    name: 'ChatGPT',
    baseUrl: 'https://chatgpt.com',
    icon: 'chatgpt',
    enabled: true
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    baseUrl: 'https://gemini.google.com',
    icon: 'gemini',
    enabled: true
  },
  doubao: {
    id: 'doubao',
    name: '豆包 / Doubao',
    baseUrl: 'https://www.doubao.com',
    icon: 'doubao',
    enabled: true
  },
  glm: {
    id: 'glm',
    name: '智谱 GLM / Zhipu GLM',
    baseUrl: 'https://chat.z.ai',
    icon: 'glm',
    enabled: true
  },
  kimi: {
    id: 'kimi',
    name: 'Kimi',
    baseUrl: 'https://kimi.moonshot.cn',
    icon: 'kimi',
    enabled: true
  },
  qwen: {
    id: 'qwen',
    name: '通义千问 / Qwen',
    baseUrl: 'https://www.qianwen.com',
    icon: 'qwen',
    enabled: true
  }
};

/**
 * 获取 AI 应用配置
 * Get AI application configuration
 * @param aiApplicationId AI 应用 ID / AI Application ID
 * @returns AI 应用配置 / AI Application Configuration
 * @throws 如果 AI 应用不存在则抛出错误 / Throws error if AI application doesn't exist
 */
export function getAiApplicationConfig(aiApplicationId: string): AiApplicationConfig {
  const config = AI_APPLICATIONS_CONFIG[aiApplicationId];
  if (!config) {
    throw new Error(`未知的 AI 应用 / Unknown AI application: ${aiApplicationId}`);
  }
  return config;
}

/**
 * 获取所有已启用的 AI 应用
 * Get all enabled AI applications
 * @returns 已启用的 AI 应用列表 / List of enabled AI applications
 */
export function getEnabledAiApplications(): AiApplicationConfig[] {
  return Object.values(AI_APPLICATIONS_CONFIG).filter(app => app.enabled);
}

/**
 * 获取所有 AI 应用
 * Get all AI applications
 * @returns 所有 AI 应用列表 / List of all AI applications
 */
export function getAllAiApplications(): AiApplicationConfig[] {
  return Object.values(AI_APPLICATIONS_CONFIG);
}
