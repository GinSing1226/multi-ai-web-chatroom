/**
 * IPC 处理器 - 导出和窗口控制
 * IPC Handler - Export and window control
 */

import { ipcMain, BrowserWindow, dialog } from 'electron';
import { logService } from '../services/log.service';
import { logFileService } from '../services/log-file.service';
import { storageService } from '../services/storage.service';
import * as fs from 'fs/promises';

/**
 * 注册导出和窗口控制相关 IPC 处理器
 * Register export and window control IPC handlers
 */
export function registerExportAndWindowHandlers(): void {
  /**
   * 导出会话到用户指定位置
   * Export conversation to user-specified location
   */
  ipcMain.handle('export:exportConversation', async (event, conversationId: string, format: string) => {
    try {
      // 获取源文件路径 / Get source file path
      const sourcePath = storageService.getConversationFilePath(conversationId);

      // 检查文件是否存在 / Check if file exists
      try {
        await fs.access(sourcePath);
      } catch {
        throw new Error('会话文件不存在 / Conversation file does not exist');
      }

      // 读取会话信息以获取默认文件名 / Read conversation to get default filename
      const sourceContent = await fs.readFile(sourcePath, 'utf-8');
      const matter = require('gray-matter');
      const { data } = matter(sourceContent);
      const conversationName = data.conversationId || conversationId;

      // 生成默认文件名 / Generate default filename
      const defaultFileName = `${conversationName}.md`;

      // 获取主窗口 / Get main window
      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win) {
        throw new Error('无法获取窗口 / Cannot get window');
      }

      // 显示保存文件对话框 / Show save file dialog
      const result = await dialog.showSaveDialog(win, {
        title: '导出会话 / Export Conversation',
        defaultPath: defaultFileName,
        filters: [
          { name: 'Markdown Files', extensions: ['md'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['createDirectory']
      });

      if (result.canceled || !result.filePath) {
        logService.info('ipc', `用户取消导出 / User canceled export`);
        return { canceled: true };
      }

      // 复制文件到用户选择的位置 / Copy file to user-selected location
      await fs.copyFile(sourcePath, result.filePath);

      logService.info('ipc', `导出会话成功: ${conversationId} -> ${result.filePath} / Export conversation success`);
      return {
        success: true,
        filePath: result.filePath
      };
    } catch (error) {
      logService.error('ipc', `导出会话失败: ${conversationId} / Export conversation failed`, error);
      throw error;
    }
  });

  // 保存渲染器日志
  ipcMain.handle('logs:saveRenderer', async (_event, content: string) => {
    try {
      const filepath = logFileService.saveRendererLogs(content);
      logService.info('ipc', `Saved renderer logs: ${filepath} / 保存渲染器日志`);
      return { success: true, filepath };
    } catch (error) {
      logService.error('ipc', 'Failed to save renderer logs / 保存渲染器日志失败', error);
      throw error;
    }
  });

  // 保存最新渲染器日志
  ipcMain.handle('logs:saveLatestRenderer', async (_event, content: string) => {
    try {
      const filepath = logFileService.saveLatestRendererLogs(content);
      logService.info('ipc', `Saved latest renderer logs: ${filepath} / 保存最新渲染器日志`);
      return { success: true, filepath };
    } catch (error) {
      logService.error('ipc', 'Failed to save latest renderer logs / 保存最新渲染器日志失败', error);
      throw error;
    }
  });

  // 获取最新渲染器日志
  ipcMain.handle('logs:getLatestRenderer', async () => {
    try {
      const content = logFileService.getLatestRendererLogs();
      return { success: true, content };
    } catch (error) {
      logService.error('ipc', 'Failed to get latest renderer logs / 获取最新渲染器日志失败', error);
      throw error;
    }
  });

  // 窗口最小化
  ipcMain.handle('window:minimize', async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.minimize();
  });

  // 窗口最大化
  ipcMain.handle('window:maximize', async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
  });

  // 关闭窗口
  ipcMain.handle('window:close', async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.close();
  });
}
