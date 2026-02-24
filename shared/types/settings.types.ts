/**
 * 设置相关类型定义
 * AppSettings - 应用设置
 */

/**
 * 应用设置
 */
export interface AppSettings {
  // 轮询参数
  /** 轮询间隔（秒）1-10000，默认2 */
  pollingInterval: number;
  /** 重试次数 0-10，默认3 */
  retryCount: number;
  /** 重试间隔（秒）1-30，默认5 */
  retryInterval: number;
  /** 重连次数 3-20，默认5 */
  reconnectCount: number;

  // 用户设置
  /** 用户名，最大20字符 */
  username: string;
  /** 头像路径 */
  avatarPath: string;
  /** 语言 */
  language: 'zh' | 'en';
  /** 主题 */
  theme: 'light' | 'dark' | 'system';
  /** 自动保存 */
  autoSave: boolean;

  // 智能玩法
  /** 总结提示词 */
  summaryPrompt: string;
  /** 总结默认AI */
  summaryAiApplication: string;
  /** 标题生成提示词 */
  titlePrompt: string;
  /** 标题生成默认AI */
  titleAiApplication: string;
}

/**
 * 主题模式
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * 默认设置
 */
export const DEFAULT_SETTINGS: AppSettings = {
  // 轮询参数
  pollingInterval: 2,
  retryCount: 3,
  retryInterval: 5,
  reconnectCount: 5,

  // 用户设置
  username: 'User',
  avatarPath: '',
  language: 'zh',
  theme: 'system',
  autoSave: true,

  // 智能玩法
  summaryPrompt: '深入阅读理解以下内容，总结综合各方内容并输出。你只能输出总结内容，禁止输出其它内容。',
  summaryAiApplication: 'deepseek',
  titlePrompt: '深入阅读理解以下内容，总结提炼出30字以内的标题、200字以内的描述。输出以下的JSON结构体：{"conversationName":"","description":""}。你只能输出以上JSON结构，禁止输出其它内容。',
  titleAiApplication: 'deepseek'
};
