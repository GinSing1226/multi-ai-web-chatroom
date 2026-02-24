/**
 * AI 应用状态管理
 * AI application state management
 */
import { create } from 'zustand';
import { AiApplication, BUILTIN_AI_APPLICATIONS } from '@shared';

interface AiApplicationsState {
  aiApplications: AiApplication[];
  isLoading: boolean;
  error: string | null;
  loadAiApplications: () => Promise<void>;
  updateAiApplication: (id: string, updates: Partial<AiApplication>) => Promise<void>;
}

export const useAiApplications = create<AiApplicationsState>((set, get) => ({
  aiApplications: BUILTIN_AI_APPLICATIONS,
  isLoading: false,
  error: null,

  loadAiApplications: async () => {
    set({ isLoading: true, error: null });
    try {
      const apps = await window.electronAPI.aiApplications.list();
      set({ aiApplications: apps, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '加载失败 / Load failed',
        isLoading: false,
      });
    }
  },

  updateAiApplication: async (id: string, updates: Partial<AiApplication>) => {
    try {
      await window.electronAPI.aiApplications.update(id, updates);
      const { aiApplications } = get();
      set({
        aiApplications: aiApplications.map(app =>
          app.id === id ? { ...app, ...updates } : app
        ),
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '更新失败',
      });
    }
  },
}));
