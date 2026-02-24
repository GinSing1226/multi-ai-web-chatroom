/**
 * IPC 通信监控和日志工具
 * IPC communication monitoring and logging utility
 */

import { ipcMain } from 'electron';
import { logService } from '../services/log.service';

/**
 * IPC 调用统计
 */
interface IPCStats {
  channel: string;
  callCount: number;
  totalDuration: number;
  errorCount: number;
  lastCalled: string;
}

/**
 * IPC 日志配置
 */
interface IPCLogConfig {
  /** 是否记录调用开始的日志 */
  logCall?: boolean;
  /** 是否记录调用成功的日志 */
  logSuccess?: boolean;
  /** 是否记录参数 */
  logArgs?: boolean;
}

const stats = new Map<string, IPCStats>();

/**
 * 需要静默记录成功的 IPC channels
 * 只记录失败，不记录成功
 */
const silentSuccessChannels = new Set<string>([
  'conversations:getActiveSession',
  'conversations:getActiveConversation',
  'logs:saveLatestRenderer', // 日志保存操作不需要记录成功的调用
  // 可以继续添加其他高频/不重要的 IPC 调用
]);

/**
 * 完全静默的 IPC channels（不记录任何日志，包括 debug）
 */
const completelySilentChannels = new Set<string>([
  'logs:saveLatestRenderer', // 完全静默日志保存操作
]);

/**
 * 包装 IPC 处理器，添加日志和监控
 */
export function wrapIpcHandler(
  channel: string,
  handler: (event: Electron.IpcMainInvokeEvent, ...args: any[]) => Promise<any> | any
) {
  return async (event: Electron.IpcMainInvokeEvent, ...args: any[]) => {
    const startTime = Date.now();
    const callId = `${channel}-${startTime}-${Math.random().toString(36).slice(2, 9)}`;
    const shouldSilentSuccess = silentSuccessChannels.has(channel);
    const isCompletelySilent = completelySilentChannels.has(channel);

    try {
      // 记录调用开始（对于完全静默或静默成功的 channel，不记录调用开始）
      if (!shouldSilentSuccess && !isCompletelySilent) {
        logService.info('ipc', `[${callId}] IPC call: ${channel}`);
      }
      // 只对非完全静默的 channel 记录 debug 日志
      if (!isCompletelySilent) {
        logService.debug('ipc', `[${callId}] Args: ${JSON.stringify(args).slice(0, 500)}`);
      }

      // 执行处理器
      const result = await handler(event, ...args);

      // 记录调用成功（静默成功的 channel 不记录）
      const duration = Date.now() - startTime;
      updateStats(channel, duration, false);

      if (!shouldSilentSuccess && !isCompletelySilent) {
        logService.info('ipc', `[${callId}] IPC success: ${channel} (${duration}ms)`);
      }

      return result;
    } catch (error) {
      // 记录调用失败（总是记录失败，除非是完全静默的 channel）
      const duration = Date.now() - startTime;
      updateStats(channel, duration, true);

      if (!isCompletelySilent) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logService.error('ipc', `[${callId}] IPC error: ${channel} - ${errorMessage}`, error);
      }

      throw error;
    }
  };
}

/**
 * 更新 IPC 统计
 */
function updateStats(channel: string, duration: number, isError: boolean) {
  const existing = stats.get(channel);
  const updated: IPCStats = {
    channel,
    callCount: (existing?.callCount || 0) + 1,
    totalDuration: (existing?.totalDuration || 0) + duration,
    errorCount: (existing?.errorCount || 0) + (isError ? 1 : 0),
    lastCalled: new Date().toISOString(),
  };
  stats.set(channel, updated);
}

/**
 * 获取 IPC 统计信息
 */
export function getIpcStats(): IPCStats[] {
  return Array.from(stats.values()).sort((a, b) => b.callCount - a.callCount);
}

/**
 * 打印 IPC 统计报告
 */
export function logIpcStatsReport() {
  const allStats = getIpcStats();
  const totalCalls = allStats.reduce((sum, s) => sum + s.callCount, 0);
  const totalErrors = allStats.reduce((sum, s) => sum + s.errorCount, 0);

  logService.info('ipc', `=== IPC Statistics Report ===`);
  logService.info('ipc', `Total channels: ${allStats.length}`);
  logService.info('ipc', `Total calls: ${totalCalls}`);
  logService.info('ipc', `Total errors: ${totalErrors}`);

  // 显示前 10 个最常调用的 channel
  allStats.slice(0, 10).forEach(stat => {
    const avgDuration = stat.callCount > 0
      ? Math.round(stat.totalDuration / stat.callCount)
      : 0;

    logService.info('ipc',
      `  ${stat.channel}:` +
      ` calls=${stat.callCount}` +
      ` errors=${stat.errorCount}` +
      ` avg=${avgDuration}ms` +
      ` last=${stat.lastCalled}`
    );
  });
}

/**
 * 设置全局 IPC 错误处理
 */
export function setupGlobalIpcErrorHandler() {
  ipcMain.on('error', (error: Error) => {
    logService.error('ipc', 'Global IPC error / 全局 IPC 错误', error);
  });
}

/**
 * 添加需要静默记录成功的 IPC channel
 * @param channels IPC channel 名称数组
 */
export function addSilentSuccessChannels(channels: string[]) {
  channels.forEach(channel => silentSuccessChannels.add(channel));
  logService.debug('ipc', `Added silent success channels: ${channels.join(', ')}`);
}

/**
 * 获取当前静默记录的 channels
 */
export function getSilentSuccessChannels(): string[] {
  return Array.from(silentSuccessChannels);
}

/**
 * 监控所有 IPC 注册
 * 注意：必须在 Electron app ready 后调用
 */
export function setupIpcMonitoring() {
  const originalHandle = ipcMain.handle;
  ipcMain.handle = function(channel: string, listener: (...args: any[]) => any) {
    const wrappedListener = wrapIpcHandler(channel, listener);
    return originalHandle.call(this, channel, wrappedListener);
  };

  logService.info('ipc', `IPC monitoring enabled / IPC 监控已启用`);
  logService.debug('ipc', `Silent success channels: ${Array.from(silentSuccessChannels).join(', ')}`);
}
