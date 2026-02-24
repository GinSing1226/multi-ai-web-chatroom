#!/usr/bin/env node
/**
 * 开发启动脚本（带远程调试）
 * Development startup script with remote debugging
 */

const problematicVars = [
  'ELECTRON_RUN_AS_NODE',
  'ELECTRON_NO_ATTACH_CONSOLE'
];

// Delete problematic environment variables
for (const varName of problematicVars) {
  if (process.env[varName]) {
    console.log(`[Dev Script] Deleting environment variable: ${varName}=${process.env[varName]}`);
    delete process.env[varName];
  }
}

console.log('[Dev Script] Environment cleaned, starting electron-vite dev with remote debugging...');
console.log('[Dev Script] 📡 Remote debugging enabled on port 9222');
console.log('[Dev Script]    Playwright can connect via: http://localhost:9222\n');

// Start electron-vite dev using node_modules/.bin
const { spawn } = require('child_process');
const path = require('path');

const isWindows = process.platform === 'win32';
const binPath = path.join(__dirname, '..', 'node_modules', '.bin', isWindows ? 'electron-vite.cmd' : 'electron-vite');

// 🔥 直接启动 Electron，而不是通过 electron-vite
// Directly launch Electron with debugging flags
const electronPath = path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron.exe');

const args = [
  '.', // 项目根目录
  '--remote-debugging-port=9222',
  '--no-sandbox',
  '--inspect', // 启用 inspector 调试
];

console.log(`[Dev Script] Starting Electron with debugging enabled...`);
console.log(`[Dev Script] Command: ${electronPath} ${args.join(' ')}\n`);

const child = spawn(electronPath, args, {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
  env: {
    ...process.env,
    NODE_ENV: 'development'
  },
  shell: true
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
