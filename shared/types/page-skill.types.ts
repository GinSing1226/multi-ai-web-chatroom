/**
 * pageSkill 相关类型定义
 * pageSkill - 用于自动化脚本识别页面元素和操作的元数据
 */

/**
 * 页面元数据
 */
export interface PageMeta {
  /** 会话名称 */
  conversationName?: string;
  /** 会话描述 */
  description?: string;
  /** 会话 ID */
  conversationId?: string;
  /** 页面标题 */
  title?: string;
  /** 其他元数据 */
  [key: string]: any;
}

/**
 * 页面操作指令
 */
export interface PageOperation {
  /** 操作名称 */
  name: string;
  /** 操作描述 */
  description: string;
  /** Playwright 命令 */
  playwrightCommand: string;
  /** 选择器 */
  selector?: string;
  /** 参数 */
  params?: Record<string, any>;
}

/**
 * 可操作元素
 */
export interface PageElement {
  /** 元素名称 */
  name: string;
  /** 元素描述 */
  description: string;
  /** 唯一标识符（test-id 或选择器） */
  identifier: string;
  /** 元素类型 */
  type: 'button' | 'input' | 'textarea' | 'select' | 'link' | 'other';
}

/**
 * 页面详情
 */
export interface PageDetail {
  /** 页面操作指令列表 */
  operations: PageOperation[];
  /** 页面可操作元素清单 */
  elements: PageElement[];
}

/**
 * 完整的 pageSkill 数据结构
 */
export interface PageSkill {
  /** 页面元数据 */
  meta: PageMeta;
  /** 页面详情 */
  detail: PageDetail;
}

/**
 * pageSkill 注入选项
 */
export interface InjectPageSkillOptions {
  /** 是否注入到 HTML 注释中 */
  useComment?: boolean;
  /** 是否注入到 data 属性中 */
  useDataAttr?: boolean;
  /** 自�认前缀 */
  prefix?: string;
}
