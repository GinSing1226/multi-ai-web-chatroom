/**
 * Bootstrap Script - Electron Bootstrap / 启动引导脚本
 *
 * Purpose: Clean up environment variables BEFORE importing any modules
 * 目的：在导入任何模块之前清理环境变量
 *
 * Problem: ELECTRON_RUN_AS_NODE=1 causes Electron to run in Node.js mode
 * 问题：ELECTRON_RUN_AS_NODE=1 会导致 Electron 以 Node.js 模式运行
 * This prevents preload scripts from injecting and breaks the app
 * 这会阻止 preload 脚本注入并破坏应用
 *
 * Solution: Delete problematic env vars before importing Electron
 * 解决方案：在导入 Electron 之前删除有问题的环境变量
 */

// Cleanup environment variables / 清理环境变量
// IMPORTANT: This must run BEFORE any require() or import!
// 重要：这必须在任何 require() 或 import 之前执行！
(function cleanupEnv() {
  const problematicVars = [
    'ELECTRON_RUN_AS_NODE',
    'ELECTRON_NO_ATTACH_CONSOLE'
  ];

  for (const varName of problematicVars) {
    if (process.env[varName]) {
      console.log(`[Bootstrap] Deleting environment variable: ${varName}=${process.env[varName]}`);
      delete process.env[varName];
    }
  }

  // Log completion / 记录完成
  console.log('[Bootstrap] Environment cleanup completed');
  console.log('[Bootstrap] Loading main process...');

  // 🔥 启用远程调试（用于 Playwright 连接）
  // Enable remote debugging (for Playwright connection)
  // 只有在开发模式下启用 / Only enable in development mode
  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  if (isDev) {
    console.log('[Bootstrap] 📡 Remote debugging enabled on port 9222');
    console.log('[Bootstrap]    Playwright can connect via: http://localhost:9222');
    // 添加命令行参数 / Add command line switches
    process.argv.push('--remote-debugging-port=9222');
  }
})();

// Now import the actual main process / 现在导入真正的主进程
// The main entry point is specified in package.json as ./dist/index.js
// 主入口点在 package.json 中指定为 ./dist/index.js
// electron-vite will handle the resolution in development mode
// electron-vite 会在开发模式下处理解析

// Try to load from dist first (production), fallback to out (build output)
// 首先尝试从 dist 加载（生产环境），回退到 out（构建输出）
const path = require('path');
const fs = require('fs');

let mainEntry = './dist/index.js';
if (!fs.existsSync(path.join(__dirname, mainEntry))) {
  // bootstrap.cjs is in packages/main/, so out/main/ is ../../out/main/
  mainEntry = '../../out/main/index.js';
}

console.log(`[Bootstrap] Loading main process from: ${mainEntry}`);
console.log(`[Bootstrap] __dirname: ${__dirname}`);
require(mainEntry);
