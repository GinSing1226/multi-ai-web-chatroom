/**
 * 设置状态管理 / Settings state management
 */

import { create } from 'zustand';
import type { AppSettings } from '@shared';
import { applyTheme } from '@renderer/hooks/useTheme';

interface SettingsStore {
  settings: AppSettings;
  isLoading: boolean;

  // 操作 / Operations
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  // 初始状态（使用默认值）/ Initial state with defaults
  settings: {
    pollingInterval: 2,
    retryCount: 3,
    retryInterval: 5,
    reconnectCount: 5,
    username: 'User',
    avatarPath: '',
    language: 'zh',
    theme: 'system',
    autoSave: true,
    summaryPrompt: '深入阅读理解以下内容，总结综合各方内容并输出。你只能输出总结内容，禁止输出其它内容。',
    summaryAiApplication: 'deepseek',
    titlePrompt: '深入阅读理解以下内容，总结提炼出30字以内的标题、200字以内的描述。输出以下的JSON结构体：{"conversationName":"","description":""}。你只能输出以上JSON结构，禁止输出其它内容。',
    titleAiApplication: 'deepseek'
  },
  isLoading: false,

  // 加载设置 / Load settings
  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const settings = await window.electronAPI.settings.get();
      set({ settings, isLoading: false });
      // 🔥 修复：不要在加载设置时自动应用主题，避免重复应用
      // 🔥 Fix: Don't auto-apply theme when loading settings to avoid duplicate applications
      // 主题应该在应用启动时初始化，用户更改主题时才更新
      // Theme should be initialized on app startup, and only update when user changes it
    } catch (error) {
      console.error('加载设置失败 / Failed to load settings:', error);
      set({ isLoading: false });
    }
  },

  // 更新设置 / Update settings
  updateSettings: async (updates: Partial<AppSettings>) => {
    set({ isLoading: true });
    try {
      const updated = await window.electronAPI.settings.update(updates);
      set({ settings: updated, isLoading: false });
      // 应用主题设置
      if (updates.theme) {
        applyTheme(updated.theme);
      }
    } catch (error) {
      console.error('更新设置失败 / Failed to update settings:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // 重置设置 / Reset settings
  resetSettings: async () => {
    set({ isLoading: true });
    try {
      const reset = await window.electronAPI.settings.reset();
      set({ settings: reset, isLoading: false });
      // 应用主题设置
      applyTheme(reset.theme);
    } catch (error) {
      console.error('重置设置失败 / Failed to reset settings:', error);
      set({ isLoading: false });
      throw error;
    }
  }
}));
