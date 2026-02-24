/**
 * Playwright 测试配置
 * Playwright Test Configuration
 *
 * 用于 E2E 自动化测试
 * For E2E automated testing
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // 测试文件位置
  testDir: './tests/e2e',

  // 测试超时时间（90秒，因为需要等待 AI 响应）
  timeout: 90 * 1000,

  // 每个测试的超时时间
  expect: {
    timeout: 10 * 1000
  },

  // 失败时是否在后台运行测试
  fullyParallel: false,

  // 失败时禁止重试（因为涉及外部 AI 服务，重试可能无意义）
  retries: 0,

  // 并发执行测试数（设置为 1 因为测试依赖 Electron 应用状态）
  workers: 1,

  // 测试报告
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }]
  ],

  use: {
    // 基础 URL
    baseURL: 'http://localhost:5173',

    // 操作超时
    actionTimeout: 10 * 1000,

    // 导航超时
    navigationTimeout: 30 * 1000,

    // 截图（失败时）
    screenshot: 'only-on-failure',

    // 视频录制（失败时）
    video: 'retain-on-failure',

    // 追踪（失败时）
    trace: 'retain-on-failure',
  },

  // Electron 特定配置
  // Electron specific configuration
  // 这将传递给 _electron.launch()
  electron: {
    // 不使用 --remote-debugging-port=0
    // Instead of using --remote-debugging-port=0
  },

  // 项目配置
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // 测试运行前的全局设置
  globalSetup: undefined,

  // 测试运行后的全局清理
  globalTeardown: undefined,
});
