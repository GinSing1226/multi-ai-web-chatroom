#!/usr/bin/env node
/**
 * Multi AI Web Chatroom CLI Tool
 * 多 AI 对比聊天室命令行工具
 *
 * 用于通过命令行控制 Electron 应用进行自动化测试
 * For controlling Electron app via CLI for automated testing
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { testCommand } from './commands/test.js';

const program = new Command();

// CLI 信息
program
  .name('multi-ai-chatroom')
  .description('Multi AI Web Chatroom - 多 AI 对比聊天室命令行工具')
  .version('0.1.0');

// 测试命令
program
  .command('test')
  .description('运行自动化测试 / Run automated tests')
  .option('-s, --scenario <type>', '测试场景 / Test scenario (continuous|reuse|all)', 'all')
  .option('-t, --timeout <ms>', '超时时间 / Timeout in milliseconds', '120000')
  .action(testCommand);

// 解析命令行参数
program.parse();
