/**
 * 日志服务
 * 使用 winston 和 electron-log 记录日志
 */

import * as path from 'path';
import { app } from 'electron';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

/**
 * 日志级别
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * 日志模块
 */
export type LogModule = 
  | 'session'      // 会话管理
  | 'automation'   // 平台自动化
  | 'browser'      // 浏览器
  | 'storage'      // 存储
  | 'ipc'          // IPC通信
  | 'settings'     // 设置
  | 'window'       // 窗口
  | 'system';      // 系统

/**
 * 日志服务类
 */
export class LogService {
  private logger: winston.Logger | null = null;
  private logsDir: string = '';

  constructor() {
    // 延迟初始化,等待 app ready
  }

  /**
   * 初始化日志服务(需要在 app ready 后调用)
   */
  initialize(): void {
    if (this.logger) return; // 已初始化

    // 设置日志目录 / Use project root data folder
    const projectRoot = process.cwd();
    this.logsDir = path.join(projectRoot, 'data', 'logs');

    // 设置控制台编码为 UTF-8（修复 Windows 中文乱码）
    // 在 Electron 环境中强制设置，不管是否为 TTY
    try {
      process.stdout.setEncoding('utf-8');
      process.stderr.setEncoding('utf-8');
    } catch (e) {
      // 忽略设置编码失败的情况
    }

    // 自定义格式化器
    const customFormat = winston.format.printf(({ level, message, timestamp, module, stack }) => {
      let log = `${timestamp} [${module}] ${level}: ${message}`;
      if (stack) {
        log += `\n${stack}`;
      }
      return log;
    });

    // 创建 winston logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true })
      ),
      transports: [
        // 控制台输出（带颜色）
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize({ all: true }),
            customFormat
          )
        }),
        // 文件输出（按日期轮转）
        new DailyRotateFile({
          dirname: this.logsDir,
          filename: 'log_%DATE%.txt',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d',
          format: customFormat
        })
      ]
    });
  }

  /**
   * 记录 debug 日志
   */
  debug(module: LogModule, message: string): void {
    if (!this.logger) return;
    this.logger.debug(message, { module });
  }

  /**
   * 记录 info 日志
   */
  info(module: LogModule, message: string): void {
    if (!this.logger) return;
    this.logger.info(message, { module });
  }

  /**
   * 记录 warn 日志
   */
  warn(module: LogModule, message: string): void {
    if (!this.logger) return;
    this.logger.warn(message, { module });
  }

  /**
   * 记录 error 日志
   */
  error(module: LogModule, message: string, error?: Error | unknown): void {
    if (!this.logger) return;
    let errorMessage = message;
    if (error instanceof Error) {
      errorMessage += `: ${error.message}`;
      this.logger.error(errorMessage, { module, stack: error.stack });
    } else {
      this.logger.error(errorMessage, { module });
    }
  }

  /**
   * 获取日志目录
   */
  getLogsDir(): string {
    return this.logsDir;
  }

  /**
   * 获取日志文件列表
   */
  async getLogFiles(): Promise<string[]> {
    const fs = await import('fs/promises');
    try {
      const files = await fs.readdir(this.logsDir);
      return files
        .filter(file => file.endsWith('.txt'))
        .sort()
        .reverse();
    } catch {
      return [];
    }
  }

  /**
   * 读取日志文件内容
   */
  async readLogFile(filename: string): Promise<string> {
    const fs = await import('fs/promises');
    const filePath = path.join(this.logsDir, filename);
    return await fs.readFile(filePath, 'utf-8');
  }
}

// 导出单例
export const logService = new LogService();
