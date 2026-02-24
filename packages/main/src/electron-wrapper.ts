/**
 * Electron API 包装器
 * 解决 pnpm 符号链接导致 Electron API 注入失效的问题
 */

// 动态导入 electron API
let electronModule: any;

try {
  // 尝试直接导入
  electronModule = require('electron');

  // 如果返回的是路径字符串(说明API注入失败),尝试其他方式
  if (typeof electronModule === 'string') {
    console.error('[Electron Wrapper] require("electron") 返回路径字符串,API注入失败!');
    console.error('[Electron Wrapper] 路径:', electronModule);
    console.error('[Electron Wrapper] 这通常是 pnpm 符号链接问题');
    console.error('[Electron Wrapper] 当前 process.versions.electron:', process.versions.electron);
    throw new Error('Electron API 注入失败');
  }

  if (!electronModule || !electronModule.app) {
    console.error('[Electron Wrapper] electron.app 不存在!');
    console.error('[Electron Wrapper] electron module:', electronModule);
    console.error('[Electron Wrapper] electron module keys:', electronModule ? Object.keys(electronModule) : 'N/A');
    throw new Error('Electron app API 不存在');
  }

  console.log('[Electron Wrapper] Electron API 加载成功!');
  console.log('[Electron Wrapper] process.versions.electron:', process.versions.electron);
  console.log('[Electron Wrapper] electron.app:', typeof electronModule.app);
  console.log('[Electron Wrapper] electron.BrowserWindow:', typeof electronModule.BrowserWindow);

} catch (error) {
  console.error('[Electron Wrapper] 加载 Electron API 失败:', error);
  throw error;
}

export const { app, BrowserWindow, ipcMain, dialog, shell } = electronModule;
export default electronModule;
