/**
 * IPC 处理器 - 设置管理
 */

import { ipcMain } from 'electron';
import { settingsService } from '../services/settings.service';
import { logService } from '../services/log.service';

/**
 * 注册设置相关 IPC 处理器
 */
export function registerSettingsHandlers(): void {
  // 获取设置
  ipcMain.handle('settings:get', async () => {
    try {
      return await settingsService.getSettings();
    } catch (error) {
      logService.error('ipc', 'settings:get 失败 / settings:get failed', error);
      throw error;
    }
  });

  // 更新设置
  ipcMain.handle('settings:update', async (_event, updates) => {
    try {
      return await settingsService.updateSettings(updates);
    } catch (error) {
      logService.error('ipc', 'settings:update 失败 / settings:update failed', error);
      throw error;
    }
  });

  // 重置设置
  ipcMain.handle('settings:reset', async () => {
    try {
      return await settingsService.resetSettings();
    } catch (error) {
      logService.error('ipc', 'settings:reset 失败 / settings:reset failed', error);
      throw error;
    }
  });
}
