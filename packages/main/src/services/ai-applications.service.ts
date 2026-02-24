/**
 * AI 应用服务
 * AI application service for managing AI application configurations
 */

import { app } from 'electron';
import Store from 'electron-store';
import type { AiApplication } from '@shared/types/ai-application.types';
import { BUILTIN_AI_APPLICATIONS } from '@shared/types/ai-application.types';
import { logService } from './log.service';
import * as path from 'path';

/**
 * AI Applications Store 的 schema
 */
interface AiApplicationsSchema {
  applications: AiApplication[];
}

/**
 * AI 应用服务类
 */
export class AiApplicationsService {
  private store: Store<AiApplicationsSchema> | null = null;
  private currentApplications: AiApplication[] | null = null;
  private initialized = false;

  constructor() {
    // 延迟初始化
  }

  /**
   * 初始化 AI 应用服务
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    // 初始化 electron-store - Use project root data folder
    const projectRoot = process.cwd();
    this.store = new Store<AiApplicationsSchema>({
      name: 'ai-applications',
      cwd: path.join(projectRoot, 'data')
    });

    // 加载或初始化应用列表
    this.currentApplications = this.loadApplications();
    this.initialized = true;
  }

  /**
   * 加载应用列表
   */
  private loadApplications(): AiApplication[] {
    if (!this.store) {
      throw new Error('AI applications service not initialized');
    }

    const stored = this.store.get('applications');

    if (!stored) {
      // 首次运行，使用默认应用列表
      this.store.set('applications', BUILTIN_AI_APPLICATIONS);
      logService.info('ai-applications', '初始化默认 AI 应用列表 / Initialized default AI applications');
      return BUILTIN_AI_APPLICATIONS;
    }

    // 合并存储的配置和内置配置（确保新增的内置应用会被添加）
    const merged = this.mergeApplications(BUILTIN_AI_APPLICATIONS, stored);
    if (merged.length !== stored.length) {
      this.store!.set('applications', merged);
      logService.info('ai-applications', 'AI 应用列表已更新 / AI applications list updated');
    }

    return merged;
  }

  /**
   * 合并内置应用和存储的应用配置
   * 优先使用存储的配置（用户自定义的名称、图标、超时等）
   * 🔥 【修改】保留用户修改的所有字段 / 【Modified】Preserve all user-modified fields
   */
  private mergeApplications(
    builtin: AiApplication[],
    stored: AiApplication[]
  ): AiApplication[] {
    const storedMap = new Map(stored.map(app => [app.id, app]));

    return builtin.map(app => {
      const storedApp = storedMap.get(app.id);
      if (storedApp) {
        // 🔥 【修改】优先使用存储的配置，内置配置只作为补充
        // 🔥 【Modified】Prioritize stored config, builtin config as supplement
        return {
          ...app,        // 先用内置配置作为基础
          ...storedApp   // 然后用存储的配置覆盖（保留用户修改的所有字段）
        };
      }
      return app;
    });
  }

  /**
   * 获取所有 AI 应用
   */
  async getApplications(): Promise<AiApplication[]> {
    await this.initialize();
    return this.currentApplications!;
  }

  /**
   * 更新 AI 应用
   */
  async updateApplication(id: string, updates: Partial<AiApplication>): Promise<AiApplication> {
    await this.initialize();
    try {
      const index = this.currentApplications!.findIndex(app => app.id === id);
      if (index === -1) {
        throw new Error(`AI 应用不存在: ${id} / AI application not found: ${id}`);
      }

      // 更新应用配置（只允许更新 name, icon, enabled）
      const updated = {
        ...this.currentApplications![index],
        ...updates,
        id // 确保 ID 不会被修改
      };

      this.currentApplications![index] = updated;

      // 持久化
      this.store!.set('applications', this.currentApplications!);

      logService.info('ai-applications', `AI 应用已更新: ${id} / AI application updated: ${id}`);

      return updated;
    } catch (error) {
      logService.error('ai-applications', `更新 AI 应用失败: ${id} / Failed to update AI application: ${id}`, error);
      throw error;
    }
  }

  /**
   * 重置为默认配置
   */
  async resetToDefaults(): Promise<AiApplication[]> {
    await this.initialize();
    try {
      this.currentApplications = BUILTIN_AI_APPLICATIONS;
      this.store!.set('applications', this.currentApplications);

      logService.info('ai-applications', 'AI 应用已重置为默认配置 / AI applications reset to defaults');

      return this.currentApplications;
    } catch (error) {
      logService.error('ai-applications', '重置 AI 应用失败 / Failed to reset AI applications', error);
      throw error;
    }
  }
}

// 导出单例
export const aiApplicationsService = new AiApplicationsService();
