/**
 * IPC 处理器 - 归档管理
 * IPC Handler - Archive management
 */

import { ipcMain, shell } from 'electron';
import { storageService } from '../services/storage.service';
import { logService } from '../services/log.service';

/**
 * 注册归档相关 IPC 处理器
 * Register archive-related IPC handlers
 */
export function registerArchiveHandlers(): void {
  /**
   * 归档会话 / Archive conversation
   */
  ipcMain.handle('archive:archive', async (_event, conversationId: string) => {
    try {
      await storageService.archiveConversation(conversationId);
    } catch (error) {
      logService.error('ipc', 'archive:archive 失败 / archive:archive failed', error);
      throw error;
    }
  });

  /**
   * 取消归档 / Unarchive conversation
   */
  ipcMain.handle('archive:unarchive', async (_event, conversationId: string) => {
    try {
      await storageService.unarchiveConversation(conversationId);
    } catch (error) {
      logService.error('ipc', 'archive:unarchive 失败 / archive:unarchive failed', error);
      throw error;
    }
  });

  /**
   * 列出归档 / List archived conversations
   */
  ipcMain.handle('archive:list', async () => {
    try {
      return await storageService.listArchived();
    } catch (error) {
      logService.error('ipc', 'archive:list 失败 / archive:list failed', error);
      throw error;
    }
  });

  /**
   * 删除归档 / Delete archived conversation
   */
  ipcMain.handle('archive:delete', async (_event, conversationId: string) => {
    try {
      await storageService.deleteArchived(conversationId);
    } catch (error) {
      logService.error('ipc', 'archive:delete 失败 / archive:delete failed', error);
      throw error;
    }
  });

  /**
   * 打开归档文件 / Open archived file
   * 通过 conversationId 查找实际文件路径
   * Find actual file path by conversationId
   */
  ipcMain.handle('archive:open', async (_event, conversationId: string) => {
    try {
      // 🔥 修复：不能直接使用 getArchivedFilePath，因为文件名可能包含标题和日期
      // 需要在 archived 目录中搜索匹配 conversationId 的文件
      // 🔥 Fix: Cannot use getArchivedFilePath directly because filename may include title and date
      // Need to search for file matching conversationId in archived directory

      const filePath = await storageService.findArchivedFilePath(conversationId);
      if (!filePath) {
        throw new Error(`归档文件不存在: ${conversationId} / Archived file not found`);
      }

      await shell.openPath(filePath);
      logService.info('ipc', `打开归档文件: ${filePath} / Open archived file`);
    } catch (error) {
      logService.error('ipc', 'archive:open 失败 / archive:open failed', error);
      throw error;
    }
  });
}
