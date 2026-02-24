/**
 * 平台自动化基类
 * Platform Automation Base Class
 * 定义所有平台自动化必须实现的方法和通用功能
 * Define methods and common features that all platform automations must implement
 */

import { Page, BrowserContext } from 'playwright';
import type { PlatformSelectors } from '@shared/types/ai-application.types';
import { logService, LogModule } from '../services/log.service';

/**
 * 平台自动化基类 / Platform Automation Base Class
 */
export abstract class BasePlatformAutomation {
  protected abstract readonly platformId: string;
  protected abstract readonly baseUrl: string;
  protected abstract selectors: PlatformSelectors;
  protected page: Page | null = null;

  /**
   * 初始化（创建 Page）/ Initialize (create Page)
   */
  async initialize(context: BrowserContext): Promise<void> {
    if (this.page) {
      logService.warn(this.platformId, 'Page 已存在 / Page already exists');
      return;
    }

    try {
      this.page = await context.newPage();
      await this.page.goto(this.baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      logService.info(this.platformId, 'Page 初始化成功 / Page initialized successfully');
    } catch (error) {
      logService.error(this.platformId, 'Page 初始化失败 / Page initialization failed', error);
      throw error;
    }
  }

  /**
   * 设置已有 Page（复用标签页）/ Set existing page (reuse tab)
   */
  setPage(page: Page): void {
    this.page = page;
    logService.info(this.platformId, 'Page 已设置（复用）/ Page set (reused)');
  }

  /**
   * 检查 Page 是否已设置 / Check if page is set
   */
  hasPage(): boolean {
    return this.page !== null && !this.page.isClosed();
  }

  /**
   * 获取 Page（用于调试）/ Get page (for debugging)
   */
  getPage(): Page | null {
    return this.page;
  }

  /**
   * 导航到新会话 / Navigate to new session
   * 返回实际的会话 ID / Return actual conversation ID
   */
  abstract navigateToNewSession(): Promise<string>;

  /**
   * 导航到指定会话 / Navigate to specific session
   */
  abstract navigateToSession(conversationId: string): Promise<void>;

  /**
   * 发送消息 / Send message
   * @param content - 要发送的内容 / Content to send
   * @param useDirectFill - 是否直接填充（避免换行符被识别为回车键）/ Whether to use direct fill (avoid newlines being interpreted as Enter)
   */
  abstract sendMessage(content: string, useDirectFill?: boolean): Promise<void>;

  /**
   * 等待响应（带降级判断）/ Wait for response (with fallback)
   */
  abstract waitForResponse(timeout?: number): Promise<string>;

  /**
   * 判断是否正在生成 / Check if AI is generating
   */
  abstract isGenerating(): Promise<boolean>;

  /**
   * 提取响应内容 / Extract response content
   */
  abstract extractResponse(): Promise<string>;

  /**
   * 安全点击（带超时和重试）
   * 支持多个选择器（用逗号分隔），会依次尝试
   */
  protected async safeClick(selector: string, timeout = 10000): Promise<void> {
    if (!this.page) throw new Error('Page 未初始化');

    // 支持多个选择器（逗号分隔）
    const selectors = selector.split(',').map(s => s.trim());

    for (const sel of selectors) {
      try {
        logService.debug(this.platformId, `尝试点击选择器: ${sel} / Trying to click selector`);
        await this.page.waitForSelector(sel, { timeout: 5000, state: 'visible' });
        await this.page.click(sel);
        logService.info(this.platformId, `成功点击: ${sel} / Successfully clicked`);
        return;
      } catch (error) {
        logService.debug(this.platformId, `选择器 ${sel} 失败，尝试下一个 / Selector ${sel} failed, trying next`);
        continue;
      }
    }

    // 所有选择器都失败
    logService.error(this.platformId, `所有选择器都失败: ${selector} / All selectors failed`);
    throw new Error(`选择器失效: ${selector}`);
  }

  /**
   * 安全输入（带超时和清空）
   * 支持多个选择器（用逗号分隔），会依次尝试
   */
  protected async safeType(selector: string, text: string, timeout = 10000): Promise<void> {
    if (!this.page) throw new Error('Page 未初始化');

    // 支持多个选择器（逗号分隔）
    const selectors = selector.split(',').map(s => s.trim());

    for (const sel of selectors) {
      try {
        logService.debug(this.platformId, `尝试输入到选择器: ${sel} / Trying to type into selector`);
        await this.page.waitForSelector(sel, { timeout: 5000, state: 'visible' });
        await this.page.fill(sel, ''); // 先清空
        await this.page.fill(sel, text);
        logService.info(this.platformId, `成功输入到: ${sel} / Successfully typed into`);
        return;
      } catch (error) {
        logService.debug(this.platformId, `选择器 ${sel} 失败，尝试下一个 / Selector ${sel} failed, trying next`);
        continue;
      }
    }

    // 所有选择器都失败
    logService.error(this.platformId, `所有选择器都失败: ${selector} / All selectors failed`);
    throw new Error(`选择器失效: ${selector}`);
  }

  /**
   * 降级判断：监测内容在指定时间内是否无变化
   */
  protected async waitForContentStable(
    stableDurationMs: number = 10000,
    checkIntervalMs: number = 1000
  ): Promise<boolean> {
    if (!this.page) throw new Error('Page 未初始化');

    let lastContent = '';
    let stableStartTime: number | null = null;
    const maxWaitTime = 60000;
    const startTime = Date.now();

    logService.info(this.platformId, `开始降级判断: 内容稳定时长=${stableDurationMs}ms`);

    while (Date.now() - startTime < maxWaitTime) {
      const currentContent = await this.extractResponse();

      if (currentContent !== lastContent) {
        lastContent = currentContent;
        stableStartTime = Date.now();
        logService.info(this.platformId, '检测到内容变化，重置稳定计时');
      } else if (stableStartTime && Date.now() - stableStartTime >= stableDurationMs) {
        logService.info(this.platformId, '降级判断成功: 内容已稳定');
        return true;
      } else if (!stableStartTime && currentContent.length > 0) {
        stableStartTime = Date.now();
        logService.info(this.platformId, '检测到首次内容，开始稳定计时');
      }

      await this.page.waitForTimeout(checkIntervalMs);
    }

    logService.warn(this.platformId, '降级判断超时');
    return false;
  }

  /**
   * 生成随机延迟（反爬虫）/ Generate random delay (anti-scraping)
   * @param minMs 最小延迟（毫秒）/ Minimum delay (ms)
   * @param maxMs 最大延迟（毫秒）/ Maximum delay (ms)
   */
  protected async randomDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    logService.debug(this.platformId, `随机延迟: ${delay.toFixed(0)}ms / Random delay: ${delay.toFixed(0)}ms`);
    await this.page?.waitForTimeout(delay);
  }

  /**
   * 关闭 Page
   */
  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
      logService.info(this.platformId, 'Page 已关闭');
    }
  }
}
