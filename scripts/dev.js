#!/usr/bin/env node

/**
 * Development startup script
 * 开发环境启动脚本
 *
 * This script ensures problematic environment variables are deleted
 * before starting the development server.
 * 此脚本确保在启动开发服务器之前删除有问题的环境变量。
 */

const problematicVars = [
  'ELECTRON_RUN_AS_NODE',
  'ELECTRON_NO_ATTACH_CONSOLE'
];

// Delete problematic environment variables / 删除有问题的环境变量
for (const varName of problematicVars) {
  if (process.env[varName]) {
    console.log(`[Dev Script] Deleting environment variable: ${varName}=${process.env[varName]}`);
    delete process.env[varName];
  }
}

console.log('[Dev Script] Environment cleaned, starting electron-vite dev...');
console.log('[Dev Script] 📡 Remote debugging enabled on port 9222');
console.log('[Dev Script]    Playwright can connect via: http://localhost:9222\n');

// Start electron-vite dev using node_modules/.bin
// 使用 node_modules/.bin 启动 electron-vite dev
const { spawn } = require('child_process');
const path = require('path');

// Determine the correct electron-vite binary path
// 确定正确的 electron-vite 二进制文件路径
const isWindows = process.platform === 'win32';
const binPath = path.join(__dirname, '..', 'node_modules', '.bin', isWindows ? 'electron-vite.cmd' : 'electron-vite');

console.log(`[Dev Script] Using electron-vite from: ${binPath}`);

// 🔥 支持传递额外参数（例如 --test）/ Support passing extra arguments (e.g., --test)
const extraArgs = process.argv.slice(2);
// 🔥 使用 -- 分隔符，将后续参数传递给 Electron
// Use -- separator to pass following args to Electron
const electronArgs = ['--remote-debugging-port=9222', '--no-sandbox'];
const args = ['dev', '--', ...electronArgs, ...extraArgs];

console.log(`[Dev Script] Starting with args: ${args.join(' ')}`);

// 🔥 设置环境变量来传递 Electron 参数
// Set environment variables to pass Electron arguments
const env = {
  ...process.env,
  NODE_ENV: 'development'
};

const child = spawn(`"${binPath}"`, args, {
  stdio: 'inherit',
  env,
  shell: true
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
