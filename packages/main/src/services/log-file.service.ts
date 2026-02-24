/**
 * Log File Service
 * 日志文件服务
 *
 * Manages saving renderer logs to files in the project
 * 管理将渲染器日志保存到项目文件
 */

import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { logService } from './log.service';

class LogFileService {
  private logsDir: string;

  constructor() {
    // 日志保存在项目根目录的 logs 文件夹
    this.logsDir = path.join(process.cwd(), 'logs');
    this.ensureLogsDirectory();
  }

  /**
   * 确保 logs 目录存在
   */
  private ensureLogsDirectory(): void {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
      logService.info('LogFileService', `Created logs directory: ${this.logsDir}`);
    }
  }

  /**
   * 保存渲染器日志
   */
  public saveRendererLogs(content: string): string {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `renderer-${timestamp}.txt`;
      const filepath = path.join(this.logsDir, filename);

      // 添加时间戳头部
      const header = `Renderer Console Logs\nTime: ${new Date().toISOString()}\n${'='.repeat(80)}\n\n`;
      const fullContent = header + content;

      fs.writeFileSync(filepath, fullContent, 'utf-8');

      logService.info('LogFileService', `Saved renderer logs to: ${filename}`);
      return filepath;
    } catch (error) {
      logService.error('LogFileService', 'Failed to save renderer logs', error);
      throw error;
    }
  }

  /**
   * 保存最新日志（覆盖）
   */
  public saveLatestRendererLogs(content: string): string {
    try {
      const filepath = path.join(this.logsDir, 'renderer-latest.txt');

      const header = `Renderer Console Logs (Latest)\nTime: ${new Date().toISOString()}\n${'='.repeat(80)}\n\n`;
      const fullContent = header + content;

      fs.writeFileSync(filepath, fullContent, 'utf-8');

      logService.debug('LogFileService', 'Saved latest renderer logs');
      return filepath;
    } catch (error) {
      logService.error('LogFileService', 'Failed to save latest renderer logs', error);
      throw error;
    }
  }

  /**
   * 获取最新的渲染器日志
   */
  public getLatestRendererLogs(): string | null {
    try {
      const filepath = path.join(this.logsDir, 'renderer-latest.txt');

      if (!fs.existsSync(filepath)) {
        return null;
      }

      return fs.readFileSync(filepath, 'utf-8');
    } catch (error) {
      logService.error('LogFileService', 'Failed to read latest renderer logs', error);
      return null;
    }
  }

  /**
   * 清理旧日志（保留最近 10 个）
   */
  public cleanupOldLogs(): void {
    try {
      const files = fs.readdirSync(this.logsDir)
        .filter(file => file.startsWith('renderer-') && file.endsWith('.txt'))
        .map(file => ({
          name: file,
          path: path.join(this.logsDir, file),
          time: fs.statSync(path.join(this.logsDir, file)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);

      // 删除超过 10 个的旧日志
      if (files.length > 10) {
        const toDelete = files.slice(10);
        for (const file of toDelete) {
          fs.unlinkSync(file.path);
          logService.info('LogFileService', `Deleted old log: ${file.name}`);
        }
      }
    } catch (error) {
      logService.error('LogFileService', 'Failed to cleanup old logs', error);
    }
  }

  /**
   * 获取日志目录路径
   */
  public getLogsDirectory(): string {
    return this.logsDir;
  }
}

export const logFileService = new LogFileService();
