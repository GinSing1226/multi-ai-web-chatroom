/**
 * Development Bootstrap Script / 开发模式启动引导脚本
 *
 * This script is used by electron-vite in development mode
 * 此脚本在开发模式下由 electron-vite 使用
 *
 * It cleans up environment variables before starting the dev server
 * 它在启动开发服务器之前清理环境变量
 */

// Cleanup environment variables / 清理环境变量
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

// Export for electron-vite / 导出供 electron-vite 使用
export {};
