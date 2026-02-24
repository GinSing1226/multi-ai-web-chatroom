/**
 * IPC 处理器 - AI 应用管理
 * IPC handlers for AI application management
 */

import { ipcMain } from 'electron';
import { aiApplicationsService } from '../services/ai-applications.service';
import { logService } from '../services/log.service';

/**
 * 注册 AI 应用相关 IPC 处理器
 */
export function registerAiApplicationHandlers(): void {
  // 列出所有 AI 应用
  ipcMain.handle('aiApplications:list', async () => {
    try {
      return await aiApplicationsService.getApplications();
    } catch (error) {
      logService.error('ipc', 'aiApplications:list 失败 / aiApplications:list failed', error);
      throw error;
    }
  });

  // 更新 AI 应用
  ipcMain.handle('aiApplications:update', async (_event, id: string, updates) => {
    try {
      return await aiApplicationsService.updateApplication(id, updates);
    } catch (error) {
      logService.error('ipc', 'aiApplications:update 失败 / aiApplications:update failed', error);
      throw error;
    }
  });

  // 重置 AI 应用配置
  ipcMain.handle('aiApplications:reset', async () => {
    try {
      return await aiApplicationsService.resetToDefaults();
    } catch (error) {
      logService.error('ipc', 'aiApplications:reset 失败 / aiApplications:reset failed', error);
      throw error;
    }
  });

  // 检查 AI 应用状态
  ipcMain.handle('aiApplications:checkStatus', async (_event, id: string) => {
    try {
      // TODO: 实现状态检测逻辑 - 检测网站是否可访问
      return {
        aiApplicationId: id,
        isAvailable: true,
        lastCheckTime: Date.now()
      };
    } catch (error) {
      logService.error('ipc', 'aiApplications:checkStatus 失败 / aiApplications:checkStatus failed', error);
      throw error;
    }
  });

  // 检查所有 AI 应用状态
  ipcMain.handle('aiApplications:checkAllStatus', async () => {
    try {
      // TODO: 批量状态检测
      const apps = await aiApplicationsService.getApplications();
      return apps.map(app => ({
        aiApplicationId: app.id,
        isAvailable: true,
        lastCheckTime: Date.now()
      }));
    } catch (error) {
      logService.error('ipc', 'aiApplications:checkAllStatus 失败 / aiApplications:checkAllStatus failed', error);
      throw error;
    }
  });
}
