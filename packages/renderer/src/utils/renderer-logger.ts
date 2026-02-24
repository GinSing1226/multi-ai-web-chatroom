/**
 * Renderer process monitoring and error capture
 * 渲染进程监控和错误捕获
 */

import { logService as electronLogService } from '@shared/types/ipc.types'; // Will use window.electronAPI

/**
 * 错误级别
 */
type LogLevel = 'info' | 'warn' | 'error';

/**
 * 日志条目
 */
interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  stack?: string;
  context?: Record<string, any>;
}

class RendererLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private isInitialized = false;

  /**
   * 初始化监控
   */
  initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 捕获全局错误
    window.addEventListener('error', (event) => {
      this.log('error', `Global error: ${event.message}`, {
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // 捕获未处理的 Promise 拒绝
    window.addEventListener('unhandledrejection', (event) => {
      this.log('error', `Unhandled promise rejection: ${event.reason}`, {
        reason: String(event.reason),
        stack: event.reason instanceof Error ? event.reason.stack : undefined,
      });
    });

    // 监控 React 渲染错误（如果使用 React）
    this.monitorReact();

    // 监控网络请求
    this.monitorNetwork();

    // 监控资源加载
    this.monitorResources();

    this.log('info', 'Renderer logger initialized');
  }

  /**
   * 记录日志
   */
  log(level: LogLevel, message: string, context?: Record<string, any>) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    // 保存到内存
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // 发送到主进程
    try {
      if (window.electronAPI?.log) {
        window.electronAPI.log(level, message, context);
      }
    } catch (e) {
      console.error('[RendererLogger] Failed to send log to main:', e);
    }

    // 同时输出到控制台
    const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    consoleMethod(`[Renderer] ${message}`, context || '');
  }

  /**
   * 获取所有日志
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * 导出日志为文本
   */
  exportLogs(): string {
    return this.logs
      .map(log => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}${log.context ? ' ' + JSON.stringify(log.context) : ''}`)
      .join('\n');
  }

  /**
   * 清空日志
   */
  clearLogs() {
    this.logs = [];
    this.log('info', 'Logs cleared');
  }

  /**
   * 监控 React
   */
  private monitorReact() {
    // 检测是否使用了 React
    if (typeof window !== 'undefined' && (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      this.log('info', 'React detected, setting up monitoring');

      // 监控组件渲染性能
      const renderer = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers?.get(1);
      if (renderer?.render) {
        const originalRender = renderer.render;
        renderer.render = function(this: any, ...args: any[]) {
          const start = performance.now();
          try {
            const result = originalRender.apply(this, args);
            const duration = performance.now() - start;
            if (duration > 100) {
              // 记录慢渲染
              console.warn(`[React] Slow render detected: ${duration.toFixed(2)}ms`);
            }
            return result;
          } catch (error) {
            console.error('[React] Render error:', error);
            throw error;
          }
        };
      }
    }
  }

  /**
   * 监控网络请求
   */
  private monitorNetwork() {
    // 拦截 fetch
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const start = performance.now();
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || 'unknown';

      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - start;

        if (!response.ok) {
          this.log('warn', `HTTP ${response.status}: ${url}`, {
            status: response.status,
            duration: `${duration.toFixed(2)}ms`,
          });
        } else if (duration > 3000) {
          this.log('info', `Slow request: ${url}`, {
            duration: `${duration.toFixed(2)}ms`,
          });
        }

        return response;
      } catch (error) {
        const duration = performance.now() - start;
        this.log('error', `Network error: ${url}`, {
          error: error instanceof Error ? error.message : String(error),
          duration: `${duration.toFixed(2)}ms`,
        });
        throw error;
      }
    };

    this.log('info', 'Network monitoring enabled');
  }

  /**
   * 监控资源加载
   */
  private monitorResources() {
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        // 资源加载错误
        const target = event.target as HTMLElement;
        const tagName = target.tagName?.toLowerCase();
        const src = target instanceof HTMLImageElement
          ? target.src
          : target instanceof HTMLScriptElement
          ? target.src
          : target instanceof HTMLLinkElement
          ? target.href
          : 'unknown';

        this.log('error', `Resource load failed: <${tagName}> ${src}`, {
          tagName,
          src,
        });
      }
    }, true);

    this.log('info', 'Resource monitoring enabled');
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics(): Record<string, any> {
    if (typeof performance === 'undefined') {
      return {};
    }

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');

    return {
      // 页面加载时间
      pageLoad: navigation?.loadEventEnd - navigation?.fetchStart,
      domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.fetchStart,

      // 首次绘制
      firstPaint: paint.find(p => p.name === 'first-paint')?.startTime,
      firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime,

      // 内存使用（如果可用）
      memory: (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
      } : null,
    };
  }

  /**
   * 打印性能报告
   */
  logPerformanceReport() {
    const metrics = this.getPerformanceMetrics();
    this.log('info', 'Performance metrics', metrics);

    // 打印到控制台
    console.table(metrics);
  }
}

// 导出单例
export const rendererLogger = new RendererLogger();

// 将 rendererLogger 暴露到 window 对象，供 DevToolsPanel 使用
// Expose rendererLogger to window object for DevToolsPanel access
if (typeof window !== 'undefined') {
  (window as any).rendererLogger = rendererLogger;
}

// 开发环境：自动初始化并添加全局快捷键
if (import.meta.env.DEV) {
  // 等待 DOM 加载
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      rendererLogger.initialize();
    });
  } else {
    rendererLogger.initialize();
  }

  // 添加快捷键：Ctrl+Shift+L 打印日志
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'L') {
      e.preventDefault();
      console.log('=== Renderer Logs ===');
      console.log(rendererLogger.exportLogs());
      console.log('=== Performance Metrics ===');
      rendererLogger.logPerformanceReport();
    }
  });

  // 添加快捷键：Ctrl+Shift+D 清空日志
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      rendererLogger.clearLogs();
      console.log('[RendererLogger] Logs cleared');
    }
  });
}
