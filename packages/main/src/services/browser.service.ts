/**
 * 浏览器服务
 * 管理 Playwright BrowserContext 和 Page 实例
 * Browser Service - Manage BrowserContext and Page instances
 */

import * as path from 'path';
import { app } from 'electron';
import { chromium, BrowserContext, Page } from 'playwright';
import type { ContextKey } from '@shared/types/ipc.types';
import { logService, LogModule } from './log.service';

/**
 * BrowserService 配置 / BrowserService Configuration
 */
interface BrowserServiceConfig {
  /** 是否 headless 模式（显示窗口）/ Whether to show browser window */
  headless?: boolean;
  /** 启动参数 / Launch arguments */
  args?: string[];
}

/**
 * 浏览器服务类 / Browser Service Class
 * 使用 launchPersistentContext 替代 launch + newContext 模式
 * Uses launchPersistentContext instead of launch + newContext pattern
 */
export class BrowserService {
  private persistentContext: BrowserContext | null = null;
  /** 存储 Context 对应的 Page / Store pages for each context */
  private contextPages: Map<ContextKey, Page> = new Map();
  private browserId: string = '';

  /**
   * 获取用户数据目录 / Get user data directory
   * 所有会话共享同一个用户数据目录，保持登录状态
   * All sessions share the same user data directory to maintain login status
   */
  private getUserDataDir(): string {
    // 使用项目根目录的 data 文件夹 / Use project root data folder
    const projectRoot = process.cwd();
    const userDataDir = path.join(projectRoot, 'data', 'browser-profile');
    logService.info('browser', `User data directory: ${userDataDir}`);
    return userDataDir;
  }

  /**
   * 初始化持久化 BrowserContext / Initialize persistent BrowserContext
   * 使用 launchPersistentContext 替代 launch + newContext
   * Uses launchPersistentContext to maintain login state
   */
  async initialize(config: BrowserServiceConfig = {}): Promise<void> {
    if (this.persistentContext) {
      logService.warn('browser', 'BrowserContext already initialized / 浏览器上下文已初始化');
      return;
    }

    try {
      const {
        headless = false,
        args = [
          '--no-sandbox', // 禁用沙箱以允许在某些环境下运行 / Disable sandbox to allow running in certain environments
          '--start-minimized',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-popup-blocking',
          '--disable-infobars',
          '--disable-notification',
          '--disable-gpu',
          // 反自动化检测参数 / Anti-automation detection parameters
          '--disable-blink-features=AutomationControlled',
          '--exclude-switches=enable-automation'
        ]
      } = config;

      // 确保用户数据目录存在
      // Ensure user data directory exists
      const userDataDir = this.getUserDataDir();
      const fs = await import('fs/promises');
      await fs.mkdir(userDataDir, { recursive: true });

      // 使用 launchPersistentContext 替代 launch + newContext
      // Use launchPersistentContext instead of launch + newContext
      // 这样可以保持登录状态持久化
      // This maintains persistent login state
      this.persistentContext = await chromium.launchPersistentContext(userDataDir, {
        headless,
        args,
        // 指定频道，避免与正在运行的 Chrome 冲突
        // Specify channel to avoid conflict with running Chrome
        channel: 'chrome',
        viewport: null, // 使用完整窗口 / Use full window
        locale: 'zh-CN',
        // 隐藏自动化特征 / Hide automation fingerprints
        ignoreDefaultArgs: ['--enable-automation'],
        // 禁用自动化标志 / Disable automation flag
        ignoreHTTPSErrors: true,
        // 设置真实的用户代理 / Set real user agent
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
      });

      // 在每个页面加载前注入脚本，隐藏 webdriver 属性
      // Inject script before each page load to hide webdriver property
      this.persistentContext.on('page', async (page) => {
        await page.addInitScript(() => {
          // 隐藏 navigator.webdriver
          Object.defineProperty(navigator, 'webdriver', {
            get: () => false,
          });

          // 伪装 chrome 对象
          (window as any).chrome = {
            runtime: {},
          };

          // 隐藏 Playwright 特征
          delete (window as any).__playwright;
          delete (window as any).__pw_manual;
          delete (window as any).__pw_inspect;
        });
      });

      this.browserId = Date.now().toString(36);

      logService.info('browser', `Persistent BrowserContext initialized successfully (ID: ${this.browserId})`);
      logService.info('browser', `Using user data directory: ${userDataDir}`);
      logService.info('browser', `Anti-detection measures enabled / 反自动化检测措施已启用`);
    } catch (error) {
      logService.error('browser', 'Failed to initialize persistent BrowserContext', error);
      throw error;
    }
  }

  /**
   * 生成 Context Key / Generate Context Key
   */
  private generateContextKey(conversationId: string, aiApplicationId: string): ContextKey {
    return `${conversationId}#${aiApplicationId}`;
  }

  /**
   * 获取持久化 BrowserContext / Get persistent BrowserContext
   * 所有会话共享同一个持久化上下文
   * All sessions share the same persistent context
   */
  async getOrCreateContext(
    conversationId: string,
    aiApplicationId: string
  ): Promise<BrowserContext> {
    // 确保持久化 BrowserContext 已初始化
    // Ensure persistent BrowserContext is initialized
    if (!this.persistentContext) {
      logService.info('browser', 'Persistent context not initialized, initializing now / 持久化上下文未初始化，正在初始化');
      await this.initialize();
    }

    // 使用同一个持久化上下文
    // Return the same persistent context for all sessions
    logService.info('browser', `Returning persistent context for ${conversationId}#${aiApplicationId}`);
    return this.persistentContext;
  }

  /**
   * 获取或创建 Page / Get or create Page
   * 复用已有标签页 / Reuse existing tab
   *
   * 修改：同一个 AI 应用共享一个 Page，而不是每个会话创建一个
   * Modified: Same AI application shares one Page, not create one for each session
   */
  async getOrCreatePage(
    conversationId: string,
    aiApplicationId: string,
    baseUrl: string,
    options: { forceNavigate?: boolean } = {}
  ): Promise<Page> {
    // 使用 aiApplicationId 作为 key，而不是 conversationId
    // Use aiApplicationId as key instead of conversationId
    // 这样同一个 AI 应用的所有会话共享一个 Page
    // This way all sessions of the same AI application share one Page
    const appKey = aiApplicationId;

    logService.debug('browser', `getOrCreatePage 被调用: conversationId=${conversationId}, aiApplicationId=${aiApplicationId}, appKey=${appKey} / getOrCreatePage called`);
    logService.debug('browser', `当前 contextPages 中的 keys: ${Array.from(this.contextPages.keys()).join(', ')} / Current contextPages keys`);

    // 检查是否已有 Page / Check if page already exists for this AI application
    const existingPage = this.contextPages.get(appKey);
    logService.debug('browser', `existingPage: ${existingPage ? '存在' : '不存在'} / existingPage: ${existingPage ? 'exists' : 'does not exist'}`);

    if (existingPage) {
      const isClosed = existingPage.isClosed();
      logService.debug('browser', `existingPage.isClosed(): ${isClosed} / existingPage.isClosed(): ${isClosed}`);

      if (!isClosed) {
        logService.info('browser', `✅ 复用已有页面: ${appKey} / Reusing existing page for ${appKey}`);

        // 只有在强制导航时才重新加载
        if (options.forceNavigate) {
          logService.info('browser', `强制导航到: ${baseUrl} / Force navigating to`);
          await existingPage.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        }

        return existingPage;
      } else {
        logService.warn('browser', `⚠️ 已有页面已关闭，将创建新页面: ${appKey} / Existing page closed, will create new page for ${appKey}`);
        // 从 Map 中移除已关闭的页面
        this.contextPages.delete(appKey);
      }
    }

    // 获取持久化 Context / Get persistent context
    const context = await this.getOrCreateContext(conversationId, aiApplicationId);

    // 创建新 Page / Create new page
    try {
      logService.info('browser', `🆕 为 ${appKey} 创建新页面 / Creating new page for ${appKey}`);
      const page = await context.newPage();
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // 使用 aiApplicationId 作为 key 存储
      // Store using aiApplicationId as key
      this.contextPages.set(appKey, page);

      logService.info('browser', `✅ 为 ${appKey} 创建新页面成功 / Created new page for ${appKey} successfully`);
      logService.info('browser', `当前 contextPages 大小: ${this.contextPages.size} / Current contextPages size: ${this.contextPages.size}`);

      return page;
    } catch (error) {
      logService.error('browser', `创建页面失败 / Failed to create page`, error);
      throw error;
    }
  }

  /**
   * 获取 Page（不创建）/ Get page (don't create)
   * 注意：现在使用 aiApplicationId 作为 key，与 getOrCreatePage 保持一致
   * Note: Now using aiApplicationId as key, consistent with getOrCreatePage
   */
  getPage(conversationId: string, aiApplicationId: string): Page | undefined {
    // 使用 aiApplicationId 作为 key，与 getOrCreatePage 保持一致
    // Use aiApplicationId as key, consistent with getOrCreatePage
    const appKey = aiApplicationId;
    return this.contextPages.get(appKey);
  }

  /**
   * 获取 BrowserContext（不创建）/ Get BrowserContext (don't create)
   */
  getContext(conversationId: string, aiApplicationId: string): BrowserContext | undefined {
    // 返回持久化上下文
    // Return persistent context
    return this.persistentContext || undefined;
  }

  /**
   * Close all BrowserContexts for a specific conversation
   * 关闭指定会话的所有 BrowserContext
   *
   * 注意：由于现在是按 AI 应用共享 Page，这个方法不再需要关闭特定会话的 Page
   * Note: Since Pages are now shared by AI application, this method no longer needs to close Pages for specific sessions
   */
  async closeConversationContexts(conversationId: string): Promise<void> {
    // 不再关闭 Page，因为 Page 是按 AI 应用共享的
    // No longer close Pages because they are shared by AI application
    logService.info('browser', `跳过关闭会话 ${conversationId} 的页面（页面被共享）/ Skipping closing pages for session ${conversationId} (pages are shared)`);
  }

  /**
   * Close all Pages / 关闭所有 Pages
   */
  async closeAllContexts(): Promise<void> {
    for (const [key, page] of this.contextPages) {
      try {
        await page.close();
        logService.info('browser', `Page closed: ${key}`);
      } catch (error) {
        logService.error('browser', `Failed to close page: ${key}`, error);
      }
    }
    this.contextPages.clear();
  }

  /**
   * Close Browser (called when app exits) / 关闭浏览器
   */
  async close(): Promise<void> {
    try {
      await this.closeAllContexts();

      if (this.persistentContext) {
        await this.persistentContext.close();
        this.persistentContext = null;
        logService.info('browser', 'Persistent BrowserContext closed / 持久化上下文已关闭');
      }
    } catch (error) {
      logService.error('browser', 'Failed to close persistent BrowserContext / 关闭持久化上下文失败', error);
      throw error;
    }
  }

  /**
   * 获取 Browser 统计信息 / Get browser statistics
   */
  getStats(): { browserId: string; contextCount: number; pageCount: number } {
    return {
      browserId: this.browserId,
      contextCount: this.persistentContext ? 1 : 0,
      pageCount: this.contextPages.size
    };
  }
}

// 导出单例 / Export singleton
export const browserService = new BrowserService();
