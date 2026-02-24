/**
 * 设置类型定义
 * Settings type definitions
 */

/**
 * 应用设置
 */
export interface AppSettings {
  /** 主题 */
  theme: 'light' | 'dark' | 'auto';

  /** 语言 */
  language: 'zh-CN' | 'en-US';

  /** 自动保存 */
  autoSave: boolean;

  /** 保存间隔（秒） */
  autoSaveInterval: number;

  /** 最大聊天记录数 */
  maxChats: number;

  /** 启用的 AI 应用 ID 列表 */
  enabledAiApps: string[];
}

/**
 * 默认设置
 */
export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'auto',
  language: 'zh-CN',
  autoSave: true,
  autoSaveInterval: 30,
  maxChats: 1000,
  enabledAiApps: ['chatgpt', 'deepseek', 'gemini'],
};
