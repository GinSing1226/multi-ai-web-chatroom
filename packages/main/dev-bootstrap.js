/**
 * Development Bootstrap Script / 开发模式启动引导脚本
 *
 * This script is used to launch Electron in development mode
 * 此脚本用于在开发模式下启动 Electron
 *
 * It cleans up environment variables before importing the main process
 * 它在导入主进程之前清理环境变量
 */

// Cleanup environment variables / 清理环境变量
// IMPORTANT: This must run BEFORE importing the main process!
// 重要：这必须在导入主进程之前执行！
(function cleanupEnv() {
  const problematicVars = [
    'ELECTRON_RUN_AS_NODE',
    'ELECTRON_NO_ATTACH_CONSOLE'
  ];

  for (const varName of problematicVars) {
    if (process.env[varName]) {
      console.log(`[Dev Bootstrap] Deleting: ${varName}=${process.env[varName]}`);
      delete process.env[varName];
    }
  }

  console.log('[Dev Bootstrap] Environment cleanup completed');
})();

// Import and register the main process using tsx (TypeScript executor)
// 使用 tsx（TypeScript 执行器）导入并注册主进程
console.log('[Dev Bootstrap] Loading main process with tsx...');

// Use import to load the TypeScript file directly
// 使用 import 直接加载 TypeScript 文件
import('./src/index.js').catch(err => {
  console.error('[Dev Bootstrap] Failed to load main process:', err);
  process.exit(1);
});
