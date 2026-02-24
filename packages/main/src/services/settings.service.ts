/**
 * 设置服务
 * 使用 electron-store 持久化应用配置
 */

import { app } from 'electron';
import Store from 'electron-store';
import type { AppSettings } from '@shared/types/settings.types';
import { DEFAULT_SETTINGS } from '@shared/types/settings.types';
import { logService, LogModule } from './log.service';
import { getDefaultSummaryPrompt, getDefaultTitlePrompt } from '@shared/constants/prompts';
import * as path from 'path';

/**
 * Settings Store 的 schema
 */
interface SettingsSchema {
  settings: AppSettings;
}

/**
 * 设置服务类
 */
export class SettingsService {
  private store: Store<SettingsSchema> | null = null;
  private currentSettings: AppSettings | null = null;
  private initialized = false;

  constructor() {
    // 延迟初始化
  }

  /**
   * 初始化设置服务
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    // 初始化 electron-store / Use project root data folder
    const projectRoot = process.cwd();
    this.store = new Store<SettingsSchema>({
      name: 'settings',
      cwd: path.join(projectRoot, 'data')
    });

    // 加载或初始化设置
    this.currentSettings = this.loadSettings();
    this.initialized = true;
  }

  /**
   * 加载设置
   * 🔥 【修改】合并存储的设置和默认设置，确保新字段能被添加
   * 🔥 【Modified】Merge stored settings with defaults to ensure new fields are added
   */
  private loadSettings(): AppSettings {
    if (!this.store) {
      throw new Error('Settings service not initialized');
    }

    const stored = this.store.get('settings');

    if (!stored) {
      // 首次运行，使用默认设置
      const defaults = this.getDefaults();
      this.store.set('settings', defaults);
      logService.info('settings', '初始化默认设置 / Initialized default settings');
      return defaults;
    }

    // 🔥 【修改】合并存储的设置和默认设置，确保新字段能被添加
    // 🔥 【Modified】Merge stored settings with defaults to ensure new fields are added
    const defaults = this.getDefaults();
    const merged = {
      ...defaults,    // 先用默认值作为基础
      ...stored       // 然后用存储的值覆盖（保留用户修改的所有字段）
    };

    // 如果有新字段，保存合并后的结果
    if (Object.keys(stored).length !== Object.keys(merged).length) {
      this.store.set('settings', merged);
      logService.info('settings', '设置已更新（添加新字段）/ Settings updated (new fields added)');
    }

    return merged;
  }

  /**
   * 获取默认设置
   * Get default settings
   *
   * 🔥 【修改】根据语言动态获取默认提示词
   * 🔥 【Modified】Get default prompts based on language
   */
  private getDefaults(): AppSettings {
    // 检测系统语言并自动设置 / Detect system language and auto-set
    const systemLocale = app.getLocale() || 'zh';
    const autoLanguage: 'zh' | 'en' = systemLocale.startsWith('zh') ? 'zh' : 'en';

    logService.info('settings', `检测到系统语言: ${systemLocale}, 自动设置为: ${autoLanguage} / Detected system locale: ${systemLocale}, auto-set to: ${autoLanguage}`);

    return {
      ...DEFAULT_SETTINGS,
      language: autoLanguage,
      // 🔥 根据语言动态获取默认提示词 / Get default prompts based on language
      summaryPrompt: getDefaultSummaryPrompt(autoLanguage),
      titlePrompt: getDefaultTitlePrompt(autoLanguage)
    };
  }

  /**
   * 获取所有设置
   */
  async getSettings(): Promise<AppSettings> {
    await this.initialize();
    return this.currentSettings!;
  }

  /**
   * 更新设置
   */
  async updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
    await this.initialize();
    try {
      // 合并更新
      this.currentSettings = {
        ...this.currentSettings!,
        ...updates
      };

      // 持久化
      this.store!.set('settings', this.currentSettings);

      logService.info('settings', `设置已更新: ${Object.keys(updates).join(', ')} / Settings updated`);

      return this.currentSettings;
    } catch (error) {
      logService.error('settings', '更新设置失败 / Failed to update settings', error);
      throw error;
    }
  }

  /**
   * 重置为默认设置
   */
  async resetSettings(): Promise<AppSettings> {
    await this.initialize();
    try {
      this.currentSettings = this.getDefaults();
      this.store!.set('settings', this.currentSettings);

      logService.info('settings', '设置已重置为默认值 / Settings reset to default values');

      return this.currentSettings;
    } catch (error) {
      logService.error('settings', '重置设置失败 / Failed to reset settings', error);
      throw error;
    }
  }
}

// 导出单例
export const settingsService = new SettingsService();
