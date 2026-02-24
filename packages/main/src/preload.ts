/**
 * Preload 脚本
 * 在主进程和渲染进程之间建立安全通信桥梁
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '@shared/types/ipc.types';

/**
 * 暴露给渲染进程的 API
 */
const electronAPI: ElectronAPI = {
  // 开发工具 (Development Tools)
  devTools: {
    open: () => {
      // 通过 IPC 调用主进程打开 DevTools
      ipcRenderer.send('devtools:open');
    },
    close: () => {
      ipcRenderer.send('devtools:close');
    }
  },
  // 会话管理
  conversations: {
    list: () => ipcRenderer.invoke('conversations:list'),
    create: (reservedConversationId: string | null, aiApplicationIds: string[]) =>
      ipcRenderer.invoke('conversations:create', reservedConversationId, aiApplicationIds),
    /** 🔥 预分配会话（两阶段创建：阶段1）/ Reserve conversation (Two-phase create: Phase 1) */
    beginCreate: () =>
      ipcRenderer.invoke('conversations:beginCreate'),
    /** 🔥 取消预分配 / Cancel reservation */
    cancelCreate: (conversationId: string) =>
      ipcRenderer.invoke('conversations:cancelCreate', conversationId),
    get: (conversationId: string) =>
      ipcRenderer.invoke('conversations:get', conversationId),
    delete: (conversationId: string) =>
      ipcRenderer.invoke('conversations:delete', conversationId),
    sendMessage: (conversationId: string, content: string) =>
      ipcRenderer.invoke('conversations:sendMessage', conversationId, content),
    generateSummary: (conversationId: string, chatId: string) =>
      ipcRenderer.invoke('conversations:generateSummary', conversationId, chatId),
    updateMetadata: (conversationId: string, metadata) =>
      ipcRenderer.invoke('conversations:updateMetadata', conversationId, metadata),
    regenerateMetadata: (conversationId: string, options?) =>
      ipcRenderer.invoke('conversations:regenerateMetadata', conversationId, options),
    getActiveSession: () =>
      ipcRenderer.invoke('conversations:getActiveSession'),
    getInternalTaskStatus: () =>
      ipcRenderer.invoke('conversations:getInternalTaskStatus'),
    bindAiApplication: (conversationId: string, aiApplicationId: string) =>
      ipcRenderer.invoke('conversations:bindAiApplication', conversationId, aiApplicationId),
    unbindAiApplication: (conversationId: string, aiApplicationId: string) =>
      ipcRenderer.invoke('conversations:unbindAiApplication', conversationId, aiApplicationId),
    updateMessage: (conversationId: string, messageId: string, newContent: string) =>
      ipcRenderer.invoke('conversations:updateMessage', conversationId, messageId, newContent),
    onMessageUpdated: (callback) => {
      ipcRenderer.on('message:updated', callback);
    },
    removeMessageUpdatedListener: (callback) => {
      ipcRenderer.removeListener('message:updated', callback);
    }
  },

  // AI 应用管理
  aiApplications: {
    list: () => ipcRenderer.invoke('aiApplications:list'),
    update: (id: string, updates) =>
      ipcRenderer.invoke('aiApplications:update', id, updates),
    reset: () =>
      ipcRenderer.invoke('aiApplications:reset'),
    checkStatus: (id: string) =>
      ipcRenderer.invoke('aiApplications:checkStatus', id),
    checkAllStatus: () =>
      ipcRenderer.invoke('aiApplications:checkAllStatus')
  },

  // 设置管理
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (settings) =>
      ipcRenderer.invoke('settings:update', settings),
    reset: () =>
      ipcRenderer.invoke('settings:reset')
  },

  // 归档管理 / Archive management
  archive: {
    archive: (conversationId: string) =>
      ipcRenderer.invoke('archive:archive', conversationId),
    unarchive: (conversationId: string) =>
      ipcRenderer.invoke('archive:unarchive', conversationId),
    list: () => ipcRenderer.invoke('archive:list'),
    delete: (conversationId: string) =>
      ipcRenderer.invoke('archive:delete', conversationId),
    open: (conversationId: string) =>
      ipcRenderer.invoke('archive:open', conversationId)
  },

  // 导出功能
  export: {
    exportConversation: (conversationId: string, format) =>
      ipcRenderer.invoke('export:exportConversation', conversationId, format)
  },

  // 日志功能
  logs: {
    saveRenderer: (content: string) =>
      ipcRenderer.invoke('logs:saveRenderer', content),
    saveLatestRenderer: (content: string) =>
      ipcRenderer.invoke('logs:saveLatestRenderer', content),
    getLatestRenderer: () =>
      ipcRenderer.invoke('logs:getLatestRenderer')
  },

  // 窗口控制
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close')
  }
};

/**
 * 监听主进程事件
 */
const setupEventListeners = () => {
  // 会话事件
  ipcRenderer.on('conversation:created', (_event, conversation) => {
    // 触发 Zustand store 更新
    window.dispatchEvent(new CustomEvent('conversation:created', { detail: conversation }));
  });

  ipcRenderer.on('conversation:updated', (_event, conversation) => {
    window.dispatchEvent(new CustomEvent('conversation:updated', { detail: conversation }));
  });

  ipcRenderer.on('message:added', (_event, message) => {
    window.dispatchEvent(new CustomEvent('message:added', { detail: message }));
  });

  ipcRenderer.on('message:updated', (_event, update) => {
    window.dispatchEvent(new CustomEvent('message:updated', { detail: update }));
  });

  // AI 状态事件
  ipcRenderer.on('ai:status-changed', (_event, status) => {
    window.dispatchEvent(new CustomEvent('ai:status-changed', { detail: status }));
  });

  // 设置变更事件
  ipcRenderer.on('settings:updated', (_event, settings) => {
    window.dispatchEvent(new CustomEvent('settings:updated', { detail: settings }));
  });

  // 活跃会话变更事件
  ipcRenderer.on('active-session:changed', (_event, activeSession) => {
    window.dispatchEvent(new CustomEvent('active-session:changed', { detail: activeSession }));
  });
};

// 暴露 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// 调试：确认 API 已暴露
console.log('[Preload] electronAPI exposed to window:', Object.keys(electronAPI));

// 设置事件监听
setupEventListeners();

console.log('[Preload] Preload script executed successfully');
