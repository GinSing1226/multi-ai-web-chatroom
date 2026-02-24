/**
 * 导出功能相关类型定义
 */

/**
 * 导出格式
 */
export type ExportFormat = 'markdown' | 'pdf' | 'html' | 'json';

/**
 * 导出选项
 */
export interface ExportOptions {
  /** 是否包含总结 */
  includeSummary?: boolean;
  /** 是否包含时间戳 */
  includeTimestamp?: boolean;
  /** 代码高亮主题 */
  codeTheme?: string;
}

/**
 * 导出结果
 */
export interface ExportResult {
  /** 导出文件路径 */
  filePath: string;
  /** 文件大小（字节） */
  fileSize: number;
  /** 导出格式 */
  format: ExportFormat;
}
