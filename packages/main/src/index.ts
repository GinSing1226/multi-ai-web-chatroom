/**
 * Electron Main Process Entry / Electron 主进程入口
 *
 * Environment variables are now cleaned up in bootstrap.js BEFORE this file loads
 * 环境变量现在在此文件加载之前在 bootstrap.js 中清理
 */

import { app, BrowserWindow } from 'electron';
import path from 'path';
import { logService } from './services/log.service';
import { browserService } from './services/browser.service';
import { registerConversationHandlers } from './ipc/conversations.handler';
import { registerAiApplicationHandlers } from './ipc/ai-applications.handler';
import { registerSettingsHandlers } from './ipc/settings.handler';
import { registerArchiveHandlers } from './ipc/archive.handler';
import { registerExportAndWindowHandlers } from './ipc/export.handler';
import { setupGlobalIpcErrorHandler, setupIpcMonitoring, logIpcStatsReport } from './utils/ipc-logger';

/**
 * 创建主窗口
 */
function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1024,
    minHeight: 600,
    show: false, // 等内容加载完再显示
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true
    }
  });

  // 判断环境：开发模式加载开发服务器，生产模式加载打包后的文件
  // 只使用 app.isPackaged 来判断，避免环境变量干扰
  const isDev = !app.isPackaged;

  // 添加调试信息
  logService.info('main', `__dirname: ${__dirname}`);
  logService.info('main', `app.isPackaged: ${app.isPackaged}`);
  logService.info('main', `isDev: ${isDev}`);

  if (isDev) {
    // 开发模式：加载 Vite 开发服务器
    const devServerURL = 'http://localhost:5173'; // electron-vite 默认端口
    logService.info('main', `Loading dev server: ${devServerURL}`);
    mainWindow.loadURL(devServerURL);
  } else {
    // 生产模式：加载打包后的 index.html
    // 使用绝对路径，确保能正确加载
    const indexPath = path.join(__dirname, '..', 'renderer', 'index.html');
    logService.info('main', `Loading production build: ${indexPath}`);
    logService.info('main', `Absolute path: ${path.resolve(indexPath)}`);

    // 验证文件存在
    const fs = require('fs');
    if (!fs.existsSync(indexPath)) {
      logService.error('main', `index.html not found at: ${indexPath}`);
      logService.error('main', `Absolute path: ${path.resolve(indexPath)}`);

      // 列出目录内容用于调试
      const dir = path.dirname(indexPath);
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        logService.info('main', `Files in ${dir}: ${files.join(', ')}`);
      }
    }

    mainWindow.loadFile(indexPath);
  }

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    logService.info('main', 'Window shown and focused');

    // 开发模式下自动打开 DevTools（已禁用，准备开源）
    // DevTools can still be opened via IPC: devtools:open
    // Development mode auto-open DevTools (disabled for open source)
    // if (isDev) {
    //   mainWindow.webContents.openDevTools();
    //   logService.info('main', 'DevTools opened automatically');
    // }
  });

  // 监听加载事件
  mainWindow.webContents.on('did-start-loading', () => {
    logService.info('main', 'Page loading started');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    logService.info('main', 'Page loaded successfully');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    logService.error('main', `Page load failed: ${errorCode} - ${errorDescription}`);
  });

  mainWindow.on('closed', () => {
    // 窗口关闭时清理资源
    cleanup();
  });

  logService.info('main', 'Main window created');

  // 调试：打印窗口信息
  const [width, height] = mainWindow.getSize();
  const [x, y] = mainWindow.getPosition();
  logService.info('main', `Window info: ${width}x${height} at (${x}, ${y})`);

  return mainWindow;
}

/**
 * 清理资源
 */
async function cleanup(): Promise<void> {
  logService.info('main', 'Starting cleanup');

  try {
    // 停止轮询服务 / Stop polling service
    const { pollingService } = await import('./services/polling.service');
    pollingService.stopPolling();
    logService.info('main', 'Polling service stopped');

    // Close browser
    await browserService.close();

    logService.info('main', 'Cleanup completed');
  } catch (error) {
    logService.error('main', 'Cleanup failed', error);
  }
}

/**
 * 注册所有 IPC 处理器
 */
function registerIpcHandlers(): void {
  registerConversationHandlers();
  registerAiApplicationHandlers();
  registerSettingsHandlers();
  registerArchiveHandlers();
  registerExportAndWindowHandlers();

  // DevTools handlers for debugging
  const { ipcMain } = require('electron');
  ipcMain.on('devtools:open', () => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      windows[0].webContents.openDevTools();
      logService.info('main', 'DevTools opened');
    }
  });

  ipcMain.on('devtools:close', () => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      windows[0].webContents.closeDevTools();
      logService.info('main', 'DevTools closed');
    }
  });

  logService.info('main', 'IPC handlers registered');
}

/**
 * 应用就绪
 */
app.whenReady().then(() => {
  // Initialize LogService first
  logService.initialize();
  logService.info('main', 'Electron app ready');

  // Setup IPC monitoring
  setupGlobalIpcErrorHandler();
  setupIpcMonitoring();
  logService.info('main', 'IPC monitoring enabled');

  // Initialize BrowserService
  browserService.initialize().catch(error => {
    logService.error('main', 'BrowserService initialization failed', error);
  });

  // Register IPC handlers
  registerIpcHandlers();

  // 🔥 【新增】启动时清理活跃会话文件和中断的消息状态
  // 🔥 【New】Clean up active session file and interrupted message statuses on startup
  import('./services/active-session.service').then(async ({ activeSessionService }) => {
    activeSessionService.clearActiveSession().then(() => {
      logService.info('main', '✅ 启动时活跃会话已清理 / Active session cleared on startup');
    }).catch(error => {
      logService.warn('main', '启动时清理活跃会话失败（可能文件不存在）/ Failed to clear active session on startup (file may not exist)', error);
    });

    // 🔥 【新增】清理所有中断的消息状态
    // 🔥 【New】Clean up all interrupted message statuses
    try {
      const { storageService } = await import('./services/storage.service');
      const conversations = await storageService.listConversations();
      let updatedCount = 0;

      for (const conversation of conversations) {
        let hasChanges = false;

        for (const chat of conversation.chats) {
          for (const message of chat.messages) {
            // 将 sending 状态改为 sendFailed
            if (message.status === 'sending') {
              message.status = 'sendFailed';
              message.error = '应用被关闭，发送中断 / Application closed, send interrupted';
              hasChanges = true;
            }
            // 将 waiting 状态改为 outputTimeout
            else if (message.status === 'waiting') {
              message.status = 'outputTimeout';
              message.error = '应用被关闭，获取输出超时 / Application closed, output timeout';
              hasChanges =true;
            }
          }
        }

        if (hasChanges) {
          await storageService.saveConversation(conversation);
          updatedCount++;
        }
      }

      if (updatedCount > 0) {
        logService.info('main', `✅ 启动时已清理 ${updatedCount} 个会话的中断消息状态 / Cleaned interrupted message statuses in ${updatedCount} conversations`);
      }
    } catch (error) {
      logService.error('main', '清理中断消息状态失败 / Failed to clean interrupted message statuses', error);
    }
  }).catch(error => {
    logService.error('main', '导入活跃会话服务失败 / Failed to import active session service', error);
  });

  // Create main window
  createWindow();

  // 清理轮询服务的旧任务（如果有）/ Clear old polling tasks (if any)
  import('./services/polling.service').then(({ pollingService }) => {
    // 停止任何正在运行的轮询
    pollingService.stopPolling();
    logService.info('main', 'Cleared any existing polling tasks on startup');
  }).catch(error => {
    logService.warn('main', 'Failed to clear polling tasks on startup', error);
  });

  logService.info('main', 'App startup completed');

  // Log IPC stats every 60 seconds
  setInterval(() => {
    logIpcStatsReport();
  }, 60000);
});

/**
 * 退出前清理
 */
app.on('before-quit', async () => {
  await cleanup();
});

/**
 * 所有窗口关闭时退出（macOS）
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * 激活应用（macOS）
 */
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

/**
 * Uncaught exception handler
 */
process.on('uncaughtException', (error) => {
  logService.error('system', 'Uncaught exception', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logService.error('system', `Unhandled Promise rejection at: ${promise}`, reason);
  // Log stack trace if available
  if (reason instanceof Error && reason.stack) {
    logService.error('system', `Promise rejection stack: ${reason.stack}`);
  }
});
