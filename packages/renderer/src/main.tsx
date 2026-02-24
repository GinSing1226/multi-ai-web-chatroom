/**
 * 渲染进程入口 / Renderer process entry
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// 导入 console logger（会自动初始化并拦截所有 console 输出）
// Import console logger (will auto-initialize and intercept all console output)
import './utils/console-logger';

// 导入 renderer logger（渲染进程日志监控系统）
// Import renderer logger (renderer process logging and monitoring)
import './utils/renderer-logger';

// 🔥 修复：主题初始化改为异步，从主进程读取设置
// 🔥 Fix: Make theme initialization async, read from main process settings
const initializeTheme = async () => {
  const savedMode = localStorage.getItem('theme-mode') as 'light' | 'dark' || 'light';

  const applyTheme = (mode: 'light' | 'dark') => {
    const isDark = mode === 'dark';

    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme-mode', mode); // 同步到 localStorage
  };

  // 先应用 localStorage 中的值（避免闪烁）
  applyTheme(savedMode);

  // 🔥 等待 electronAPI 可用后，从主进程读取正确的主题设置
  // 🔥 Wait for electronAPI to be ready, then read correct theme from main process
  try {
    // 使用 setTimeout 确保 electronAPI 已初始化
    await new Promise(resolve => setTimeout(resolve, 100));

    if (window.electronAPI && window.electronAPI.settings) {
      const settings = await window.electronAPI.settings.get();
      applyTheme(settings.theme);
    }
  } catch (error) {
    console.error('❌ [init] 读取主题设置失败，使用 localStorage 值 / Failed to read theme settings, using localStorage value:', error);
  }
};

initializeTheme();

// 基本渲染
console.log('🚀 Starting React render...');
const rootElement = document.getElementById('root');
console.log('Root element found:', rootElement);

try {
  ReactDOM.createRoot(rootElement!).render(
    <React.StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </React.StrictMode>
  );
  console.log('✅ React render initiated');
} catch (error) {
  console.error('❌ React render error:', error);
  rootElement!.innerHTML = `<div style="color: red; padding: 20px;">
    <h1>React Render Error</h1>
    <pre>${error}</pre>
  </div>`;
}
