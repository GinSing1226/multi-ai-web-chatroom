/**
 * Console Logger with File Persistence
 * 带文件持久化的控制台日志记录器
 *
 * Intercepts console methods and saves logs to a file for debugging
 * 拦截 console 方法并保存日志到文件以便调试
 */

interface LogEntry {
  timestamp: number;
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  message: string;
  args: any[];
  stack?: string;
}

class ConsoleLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // 最多保存 1000 条日志
  private originalConsole: {
    log: typeof console.log;
    info: typeof console.info;
    warn: typeof console.warn;
    error: typeof console.error;
    debug: typeof console.debug;
  };

  constructor() {
    // 保存原始 console 方法
    this.originalConsole = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: console.debug.bind(console),
    };

    // 拦截 console 方法
    this.interceptConsole();
  }

  /**
   * 拦截 console 方法
   */
  private interceptConsole() {
    const self = this;

    console.log = function(...args: any[]) {
      self.originalConsole.log(...args);
      self.addLog('log', args);
    };

    console.info = function(...args: any[]) {
      self.originalConsole.info(...args);
      self.addLog('info', args);
    };

    console.warn = function(...args: any[]) {
      self.originalConsole.warn(...args);
      self.addLog('warn', args);
    };

    console.error = function(...args: any[]) {
      self.originalConsole.error(...args);
      // 提取错误堆栈
      const stack = args[0] instanceof Error ? args[0].stack : undefined;
      self.addLog('error', args, stack);
    };

    console.debug = function(...args: any[]) {
      self.originalConsole.debug(...args);
      self.addLog('debug', args);
    };
  }

  /**
   * 添加日志
   */
  private addLog(level: LogEntry['level'], args: any[], stack?: string) {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message: this.formatMessage(args),
      args,
      stack,
    };

    this.logs.push(entry);

    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // 自动保存到文件
    this.saveToFile();
  }

  /**
   * 格式化消息
   */
  private formatMessage(args: any[]): string {
    return args
      .map(arg => {
        if (typeof arg === 'string') return arg;
        if (arg instanceof Error) return arg.message;
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      })
      .join(' ');
  }

  /**
   * 保存日志到文件 (通过 Electron API)
   */
  private async saveToFile() {
    // 检查是否在 Electron 环境
    if (typeof window.electronAPI === 'undefined') {
      // 浏览器环境：保存到 localStorage
      try {
        const content = this.exportAsString();
        localStorage.setItem('console-logs', content);
        localStorage.setItem('console-logs-timestamp', Date.now().toString());
      } catch (error) {
        // 静默失败，避免无限循环
      }
      return;
    }

    try {
      const content = this.exportAsString();
      // 通过 Electron API 保存到文件
      await window.electronAPI.logs.saveLatestRenderer(content);
    } catch (error) {
      // 静默失败，避免无限循环
      // 备选：保存到 localStorage
      try {
        localStorage.setItem('console-logs', this.exportAsString());
      } catch {
        // 忽略
      }
    }
  }

  /**
   * 导出日志为字符串
   */
  public exportAsString(): string {
    const lines: string[] = [];

    lines.push('='.repeat(80));
    lines.push('Console Logs Export');
    lines.push(`Export Time: ${new Date().toISOString()}`);
    lines.push(`Total Logs: ${this.logs.length}`);
    lines.push('='.repeat(80));
    lines.push('');

    for (const log of this.logs) {
      const time = new Date(log.timestamp).toISOString();
      const prefix = `[${time}] [${log.level.toUpperCase()}]`;

      lines.push(prefix);
      lines.push(log.message);

      if (log.stack) {
        lines.push('Stack trace:');
        lines.push(log.stack);
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * 导出日志为 JSON
   */
  public exportAsJSON(): string {
    return JSON.stringify({
      exportTime: new Date().toISOString(),
      totalLogs: this.logs.length,
      logs: this.logs,
    }, null, 2);
  }

  /**
   * 清除所有日志
   */
  public clear() {
    this.logs = [];
    this.saveToFile();
  }

  /**
   * 获取所有日志
   */
  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * 获取最近的 N 条日志
   */
  public getRecentLogs(count: number): LogEntry[] {
    return this.logs.slice(-count);
  }
}

// 创建全局实例
let consoleLogger: ConsoleLogger | null = null;

/**
 * 初始化 Console Logger
 */
export function initConsoleLogger() {
  if (consoleLogger) return;
  consoleLogger = new ConsoleLogger();
  console.log('✅ Console Logger initialized');
}

/**
 * 获取 Console Logger 实例
 */
export function getConsoleLogger(): ConsoleLogger | null {
  return consoleLogger;
}

/**
 * 导出日志用于调试
 */
export function exportLogs(): string {
  return consoleLogger?.exportAsString() || 'No logs available';
}

/**
 * 保存日志到文件 (通过 Electron API)
 */
export async function saveLogsToFile(): Promise<void> {
  if (!consoleLogger) {
    throw new Error('Console logger not initialized');
  }

  // 这里需要添加 Electron API 来保存文件
  // 暂时通过下载方式实现
  const content = consoleLogger.exportAsString();
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `console-logs-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// 自动初始化
if (typeof window !== 'undefined') {
  initConsoleLogger();

  // 将日志导出函数暴露到全局
  (window as any).exportLogs = exportLogs;
  (window as any).saveLogsToFile = saveLogsToFile;
}
