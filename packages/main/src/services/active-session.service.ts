/**
 * 活跃会话管理服务
 * Active Session Management Service
 *
 * 用于管理当前活跃的会话，确保同一时间只有一个会话处于活跃状态
 * Manages the currently active session, ensuring only one session is active at a time
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import { logService, LogModule } from './log.service';

/**
 * 活跃会话数据结构 / Active session data structure
 */
export interface ActiveSession {
  /** 当前活跃的会话ID / Current active conversation ID */
  activeConversationId: string;
  /** 会话激活的时间戳（毫秒）/ Session activation timestamp (milliseconds) */
  activeTimestamp: number;
  /** 关联的正常会话ID（用于内部任务）/ Associated normal conversation ID (for internal tasks) */
  belongingConversationId?: string;
  /** 内部任务类型（如果是内部任务）/ Internal task type (if internal task) */
  internalTaskType?: string;
}

/**
 * 活跃会话管理服务类 / Active Session Management Service Class
 */
export class ActiveSessionService {
  private readonly filePath: string;
  private readonly STALE_TIMEOUT = 3600000; // 1小时（毫秒）/ 1 hour in milliseconds

  constructor() {
    // 活跃会话文件路径 / Active session file path
    // 使用项目根目录的 data 文件夹 / Use project root data folder
    const projectRoot = process.cwd();
    this.filePath = path.join(projectRoot, 'data', 'ACTIVE_SESSION.md');
    this.ensureDirectoryExists();
  }

  /**
   * 确保数据目录存在 / Ensure data directory exists
   */
  private async ensureDirectoryExists(): Promise<void> {
    try {
      const dir = path.dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      logService.error('active-session', '创建数据目录失败 / Failed to create data directory', error);
    }
  }

  /**
   * 获取当前活跃会话 / Get current active session
   * @returns 活跃会话信息，如果不存在则返回 null / Active session info, or null if not exists
   */
  async getActiveSession(): Promise<ActiveSession | null> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      const { data } = matter(content);

      // 验证数据格式 / Validate data format
      if (data.activeConversationId && data.activeTimestamp) {
        return {
          activeConversationId: data.activeConversationId,
          activeTimestamp: data.activeTimestamp
        };
      }

      return null;
    } catch (error) {
      // 文件不存在或读取失败 / File does not exist or read failed
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        logService.warn('active-session', `读取活跃会话文件失败 / Failed to read active session file: ${error}`);
      }
      return null;
    }
  }

  /**
   * 设置活跃会话 / Set active session
   * @param conversationId 会话ID / Conversation ID
   * @param options 可选参数 / Optional parameters
   */
  async setActiveSession(
    conversationId: string,
    options?: {
      belongingConversationId?: string;
      internalTaskType?: string;
    }
  ): Promise<void> {
    try {
      // 🔥 构建数据对象，过滤掉 undefined 值
      // 🔥 Build data object, filter out undefined values
      const data: Record<string, any> = {
        activeConversationId: conversationId,
        activeTimestamp: Date.now()
      };

      // 只有在存在时才添加可选字段
      // Only add optional fields when they exist
      if (options?.belongingConversationId) {
        data.belongingConversationId = options.belongingConversationId;
      }
      if (options?.internalTaskType) {
        data.internalTaskType = options.internalTaskType;
      }

      const content = matter.stringify('', data);
      await fs.writeFile(this.filePath, content, 'utf-8');

      logService.info('active-session', `设置活跃会话: ${conversationId}${options?.belongingConversationId ? ` (归属: ${options.belongingConversationId})` : ''} / Set active session`);
    } catch (error) {
      logService.error('active-session', '设置活跃会话失败 / Failed to set active session', error);
      throw error;
    }
  }

  /**
   * 清除活跃会话 / Clear active session
   */
  async clearActiveSession(): Promise<void> {
    try {
      await fs.unlink(this.filePath);
      logService.info('active-session', '活跃会话已清除 / Active session cleared');
    } catch (error) {
      // 文件不存在，视为已清除 / File does not exist, considered as cleared
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        logService.warn('active-session', `清除活跃会话失败 / Failed to clear active session: ${error}`);
      }
    }
  }

  /**
   * 检查是否可以新建会话 / Check if new session can be created
   * @returns 是否可以新建会话 / Whether new session can be created
   */
  async canCreateNewSession(): Promise<boolean> {
    const activeSession = await this.getActiveSession();

    // 没有活跃会话，可以新建 / No active session, can create new
    if (!activeSession) {
      return true;
    }

    // 检查是否过期 / Check if stale
    const elapsed = Date.now() - activeSession.activeTimestamp;
    if (elapsed > this.STALE_TIMEOUT) {
      logService.warn('active-session', `检测到过期活跃会话，自动清除 / Detected stale active session, auto-cleared`);
      await this.clearActiveSession();
      return true;
    }

    // 有活跃会话，不能新建 / Has active session, cannot create new
    logService.info('active-session', `当前有活跃会话: ${activeSession.activeConversationId}，不能新建会话 / Has active session, cannot create new`);
    return false;
  }

  /**
   * 检查指定会话是否是活跃会话 / Check if specified session is active
   * @param conversationId 会话ID / Conversation ID
   * @returns 是否是活跃会话 / Whether is active session
   */
  async isSessionActive(conversationId: string): Promise<boolean> {
    const activeSession = await this.getActiveSession();
    return activeSession?.activeConversationId === conversationId;
  }

  /**
   * 清理过期的活跃会话（应用启动时调用）/ Cleanup stale active session (called on app startup)
   */
  async cleanupStaleSession(): Promise<void> {
    const activeSession = await this.getActiveSession();

    if (activeSession) {
      const elapsed = Date.now() - activeSession.activeTimestamp;

      if (elapsed > this.STALE_TIMEOUT) {
        logService.warn('active-session', `清理过期活跃会话: ${activeSession.activeConversationId}（超时 ${(elapsed / 1000 / 60).toFixed(0)} 分钟）/ Cleanup stale active session (timeout ${(elapsed / 1000 / 60).toFixed(0)} minutes)`);
        await this.clearActiveSession();
      }
    }
  }
}

// 导出单例 / Export singleton
export const activeSessionService = new ActiveSessionService();
