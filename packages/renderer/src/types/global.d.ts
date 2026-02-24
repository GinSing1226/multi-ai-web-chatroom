/**
 * Global type declarations for ElectronAPI
 * 全局类型声明
 */

import type { ElectronAPI } from '@shared/types/ipc.types';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    rendererLogger?: any;
  }
}

export {};
