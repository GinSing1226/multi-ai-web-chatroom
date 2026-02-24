/**
 * 文件相关工具函数
 */

import * as path from 'path';

/**
 * 确保目录存在
 */
export async function ensureDir(dirPath: string): Promise<void> {
  const fs = await import('fs/promises');
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * 读取文件
 */
export async function readFile(filePath: string): Promise<string> {
  const fs = await import('fs/promises');
  return await fs.readFile(filePath, 'utf-8');
}

/**
 * 写入文件
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  const fs = await import('fs/promises');
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * 删除文件
 */
export async function deleteFile(filePath: string): Promise<void> {
  const fs = await import('fs/promises');
  await fs.unlink(filePath);
}

/**
 * 文件是否存在
 */
export async function fileExists(filePath: string): Promise<boolean> {
  const fs = await import('fs/promises');
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 列出目录中的文件
 */
export async function listFiles(dirPath: string, extension?: string): Promise<string[]> {
  const fs = await import('fs/promises');
  const files = await fs.readdir(dirPath);
  
  if (extension) {
    return files.filter(file => file.endsWith(extension));
  }
  
  return files;
}

/**
 * 获取文件大小
 */
export async function getFileSize(filePath: string): Promise<number> {
  const fs = await import('fs/promises');
  const stats = await fs.stat(filePath);
  return stats.size;
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * 清理文件名，移除不安全的字符
 * Clean filename by removing unsafe characters
 * @param filename 原始文件名 / Original filename
 * @returns 清理后的文件名 / Cleaned filename
 */
export function sanitizeFilename(filename: string): string {
  // 移除或替换不安全的字符 / Remove or replace unsafe characters
  // Windows 不允许的字符: < > : " / \ | ? *
  // Windows disallowed characters: < > : " / \ | ? *
  return filename
    .replace(/[<>:"/\\|?*]/g, '') // 移除不安全字符 / Remove unsafe characters
    .replace(/\s+/g, '_') // 空格替换为下划线 / Replace spaces with underscores
    .replace(/\.+$/, '') // 移除结尾的点 / Remove trailing dots
    .slice(0, 200); // 限制长度 / Limit length
}

/**
 * 生成会话文件名
 * Generate conversation filename
 * @param conversationName 会话标题 / Conversation name
 * @param conversationId 会话ID / Conversation ID
 * @param createTime 创建时间戳 / Creation timestamp
 * @returns 文件名（不含扩展名）/ Filename without extension
 */
export function generateConversationFilename(
  conversationName: string,
  conversationId: string,
  createTime: number
): string {
  // 格式化日期为 yyyy-mm-dd / Format date as yyyy-mm-dd
  const date = new Date(createTime);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  // 清理标题 / Clean title
  const cleanName = sanitizeFilename(conversationName);

  // 提取 ID 的前 8 位作为短标识 / Extract first 8 chars of ID as short identifier
  const shortId = conversationId.substring(0, 8);

  // 组合文件名: 标题_yyyy-mm-dd_id / Combine filename: title_yyyy-mm-dd_id
  return `${cleanName}_${dateStr}_${shortId}`;
}

/**
 * 重命名文件
 * Rename file
 * @param oldPath 旧文件路径 / Old file path
 * @param newPath 新文件路径 / New file path
 */
export async function renameFile(oldPath: string, newPath: string): Promise<void> {
  const fs = await import('fs/promises');
  await fs.rename(oldPath, newPath);
}
