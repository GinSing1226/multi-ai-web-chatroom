/**
 * Qwen (千问) 平台自动化实现
 * Qwen Platform Automation Implementation
 * 实现 Qwen 对话的自动化操作 / Implements automated Qwen conversation operations
 */

import { BasePlatformAutomation } from './base';
import { QWEN_SELECTORS } from '@shared/constants/platform-selectors';
import { logService } from '../services/log.service';
import TurndownService from 'turndown';

/**
 * Qwen 自动化类
 * Qwen Automation Class
 */
export class QwenAutomation extends BasePlatformAutomation {
  protected readonly platformId = 'qwen';
  protected readonly baseUrl = 'https://www.qianwen.com';
  protected readonly selectors = QWEN_SELECTORS;

  /**
   * 导航到新会话 / Navigate to new session
   * 点击"新对话"按钮 / Click "New Chat" button
   * 返回会话 ID / Return conversation ID
   *
   * 注意：首次对话时，会话 ID 只有在发送消息后才会由轮询任务从 URL 中提取
   * Note: For first session, conversation ID will be extracted from URL by polling task after sending message
   */
  async navigateToNewSession(): Promise<string> {
    if (!this.page) throw new Error('Page 未初始化 / Page not initialized');

    logService.info(this.platformId, '开始导航到新会话 / Navigating to new session');

    try {
      // 尝试点击新会话按钮 / Try to click new chat button
      try {
        await this.safeClick(this.selectors.newChatButton, 5000);
        // 等待页面稳定 / Wait for page to stabilize
        await this.page.waitForTimeout(1500);
      } catch (clickError) {
        // Qwen 特殊处理：如果点击新建按钮失败，直接跳过
        // Qwen special handling: If clicking new chat button fails, skip it
        logService.warn(this.platformId, '点击新建按钮失败，直接跳过（Qwen 特殊处理）/ Clicking new chat button failed, skipping (Qwen special handling)', clickError);
      }

      // 尝试获取会话 ID (如果有的话,比如历史会话)
      // Try to get conversation ID (if exists, e.g., historical session)
      const conversationId = await this.getCurrentConversationId();

      if (conversationId) {
        logService.info(this.platformId, `成功导航到会话: ${conversationId} / Successfully navigated to session`);
        return conversationId;
      }

      // 首次对话时返回空字符串,真正的 ID 会在发送消息后由轮询任务提取
      // For first session, return empty string, real ID will be extracted by polling task after sending message
      logService.info(this.platformId, '新会话已创建 (会话 ID 将在发送消息后由轮询任务提取) / New session created (conversation ID will be extracted by polling task after sending message)');
      return '';
    } catch (error) {
      logService.error(this.platformId, '导航到新会话失败 / Failed to navigate to new session', error);
      throw new Error(`导航到新会话失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取当前会话 ID / Get current conversation ID
   * 从 URL 中提取 Qwen 会话 ID / Extract Qwen conversation ID from URL
   */
  async getCurrentConversationId(): Promise<string | null> {
    if (!this.page) throw new Error('Page 未初始化 / Page not initialized');

    try {
      const url = this.page.url();
      logService.debug(this.platformId, `当前 URL: ${url} / Current URL`);

      // Qwen URL 格式: https://www.qianwen.com/chat/{id} (32位十六进制字符串)
      const urlMatch = url.match(/\/chat\/([a-f0-9]{32})/);
      if (urlMatch && urlMatch[1]) {
        const conversationId = urlMatch[1];
        logService.info(this.platformId, `✅ 提取到会话 ID: ${conversationId} / Extracted conversation ID`);
        return conversationId;
      }

      logService.warn(this.platformId, '未能从 URL 提取会话 ID / Failed to extract conversation ID from URL');
      return null;
    } catch (error) {
      logService.error(this.platformId, '获取会话 ID 失败 / Failed to get conversation ID', error);
      return null;
    }
  }

  /**
   * 导航到指定会话 / Navigate to specific session
   * 通过会话 ID 跳转 / Navigate using conversation ID
   */
  async navigateToSession(conversationId: string): Promise<void> {
    if (!this.page) throw new Error('Page 未初始化 / Page not initialized');

    logService.info(this.platformId, `导航到会话: ${conversationId} / Navigating to session: ${conversationId}`);

    try {
      // 构建会话 URL / Build conversation URL
      const url = `${this.baseUrl}/chat/${conversationId}`;

      // 导航到会话 / Navigate to conversation
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // 等待页面加载完成 / Wait for page to fully load
      await this.page.waitForTimeout(2000);

      logService.info(this.platformId, `成功导航到会话: ${conversationId} / Successfully navigated to session: ${conversationId}`);
    } catch (error) {
      logService.error(this.platformId, `导航到会话失败: ${conversationId} / Failed to navigate to session: ${conversationId}`, error);
      throw new Error(`导航到会话失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 发送消息 / Send message
   * 在输入框中输入内容并点击发送按钮 / Type content in input box and click send button
   */
  async sendMessage(content: string, useDirectFill = false): Promise<void> {
    if (!this.page) throw new Error('Page 未初始化 / Page not initialized');

    logService.info(this.platformId, `准备发送消息: ${content.substring(0, 50)}... / Preparing to send message: ${content.substring(0, 50)}...`);

    try {
      // 1. 等待输入框可见 / Wait for input box to be visible
      await this.page.waitForSelector(this.selectors.inputBox, { timeout: 10000, state: 'visible' });

      // 2. 清空输入框并输入内容 / Clear input box and type content
      // Qwen 使用 contenteditable div，需要用 fill 而不是 type
      await this.page.fill(this.selectors.inputBox, '');
      // 🔥 根据参数选择输入方式 / Choose input method based on parameter
      if (useDirectFill) {
        await this.page.fill(this.selectors.inputBox, content);
      } else {
        await this.page.type(this.selectors.inputBox, content, { delay: 10 }); // 模拟真实输入，逐字输入
      }

      logService.debug(this.platformId, '内容已输入到输入框 / Content typed into input box');

      // 3. 随机延迟（反爬虫） / Random delay (anti-scraping)
      await this.randomDelay(2000, 10000);

      // 4. 点击发送按钮 / Click send button
      try {
        await this.safeClick(this.selectors.sendButton, 5000);
        logService.info(this.platformId, '通过按钮发送消息 / Message sent via button');
      } catch (buttonError) {
        // 如果按钮点击失败，尝试使用 Enter 键 / If button click fails, try Enter key
        logService.warn(this.platformId, '按钮点击失败，尝试使用 Enter 键 / Button click failed, trying Enter key', buttonError);
        await this.page.keyboard.press('Enter');
        logService.info(this.platformId, '通过 Enter 键发送消息 / Message sent via Enter key');
      }

      // 5. 等待发送完成 / Wait for send to complete
      await this.page.waitForTimeout(1000);

      logService.info(this.platformId, '消息已成功发送 / Message sent successfully');
    } catch (error) {
      logService.error(this.platformId, '发送消息失败 / Failed to send message', error);
      throw new Error(`发送消息失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 等待响应 / Wait for response
   * 持续检测直到 AI 生成完成 / Continuously check until AI generation completes
   */
  async waitForResponse(timeout = 60000): Promise<string> {
    if (!this.page) throw new Error('Page 未初始化 / Page not initialized');

    logService.info(this.platformId, `开始等待响应 (超时: ${timeout}ms) / Starting to wait for response (timeout: ${timeout}ms)`);

    const startTime = Date.now();
    const checkInterval = 1000; // 检查间隔 / Check interval
    let lastContent = '';

    try {
      // 第一阶段：优先使用停止按钮检测 / Phase 1: Priority using stop button detection
      while (Date.now() - startTime < Math.min(timeout, 30000)) {
        const isGenerating = await this.isGenerating();

        if (!isGenerating) {
          // 确认生成完成，额外等待确保内容完全渲染
          // Confirm generation complete, extra wait to ensure content fully rendered
          await this.page.waitForTimeout(2000);

          const responseContent = await this.extractResponse();
          if (responseContent && responseContent !== lastContent) {
            logService.info(this.platformId, `检测到生成完成，响应长度: ${responseContent.length} / Generation completed, response length: ${responseContent.length}`);
            return responseContent;
          }
        }

        lastContent = await this.extractResponse();
        await this.page.waitForTimeout(checkInterval);
      }

      // 第二阶段：降级到内容稳定性检测 / Phase 2: Fallback to content stability detection
      logService.warn(this.platformId, '停止按钮检测超时，启用内容稳定性判断 / Stop button detection timeout, enabling content stability check');

      const isStable = await this.waitForContentStable(10000, 1000);
      if (isStable) {
        // 再次额外等待，确保内容完全渲染 / Extra wait again to ensure content fully rendered
        await this.page.waitForTimeout(2000);

        const finalContent = await this.extractResponse();
        logService.info(this.platformId, `内容稳定，最终响应长度: ${finalContent.length} / Content stable, final response length: ${finalContent.length}`);
        return finalContent;
      }

      // 如果仍然没有响应，抛出超时错误 / If still no response, throw timeout error
      throw new Error('响应超时 / Response timeout');
    } catch (error) {
      logService.error(this.platformId, '等待响应失败 / Failed to wait for response', error);
      throw error;
    }
  }

  /**
   * 判断是否正在生成 / Check if AI is generating
   * 通过停止按钮和生成指示器判断 / Determine via stop button and generating indicator
   *
   * Qwen 特征 / Qwen Characteristics:
   * - 生成中: 停止按钮可见 (div.stop-yGpvO2)
   * - 已完成: 发送按钮被禁用 (div.disabled-ZaDDJC)
   */
  async isGenerating(): Promise<boolean> {
    if (!this.page) throw new Error('Page 未初始化 / Page not initialized');

    try {
      const result = await this.page.evaluate(() => {
        // 1. 检查停止按钮 - 生成中时可见
        // Check stop button - visible when generating
        const stopButton = document.querySelector('div.stop-yGpvO2');
        const hasStopButton = stopButton !== null;

        // 2. 检查发送按钮是否被禁用 - 完成后会被禁用
        // Check if send button is disabled - will be disabled after completion
        const sendButton = document.querySelector('div.disabled-ZaDDJC');
        const hasDisabledSendButton = sendButton !== null;

        console.log(`[Qwen isGenerating] hasStopButton=${hasStopButton}, hasDisabledSendButton=${hasDisabledSendButton}`);

        // 判断逻辑: 如果有停止按钮，说明正在生成
        // Determine logic: If has stop button, generating
        const isGenerating = hasStopButton;

        return isGenerating;
      });

      logService.debug(this.platformId, `生成状态检测: isGenerating=${result} / Generation detection`);

      return result;
    } catch (error) {
      logService.error(this.platformId, '判断生成状态失败，返回 true（避免提前结束）/ Failed to determine generation status, returning true to avoid premature end', error);
      return true; // 出错时默认返回 true，继续等待
    }
  }

  /**
   * 提取响应内容 / Extract response content
   * 从页面中提取最后一条 AI 消息 / Extract the last AI message from the page
   */
  async extractResponse(): Promise<string> {
    if (!this.page) throw new Error('Page 未初始化 / Page not initialized');

    try {
      logService.debug(this.platformId, '开始提取响应 / Starting to extract response');

      // 等待新内容渲染，检查容器数量是否稳定
      // Wait for new content to render and check if container count is stable
      let lastCount = 0;
      let stableCount = 0;
      const maxStableChecks = 5; // 最多检查5次

      for (let i = 0; i < maxStableChecks; i++) {
        await this.page.waitForTimeout(1000); // 每次等待1秒

        const currentCount = await this.page.evaluate(() => {
          return document.querySelectorAll('div.qk-markdown-complete').length;
        });

        console.log(`[Qwen] 等待渲染... 容器数量: ${currentCount} (上次: ${lastCount})`);

        if (currentCount === lastCount) {
          stableCount++;
          if (stableCount >= 2) {
            // 容器数量连续2次没有变化，认为渲染完成
            console.log(`[Qwen] 容器数量稳定，准备提取`);
            break;
          }
        } else {
          stableCount = 0;
          lastCount = currentCount;
        }
      }

      // 最后再等待2秒确保完全渲染
      await this.page.waitForTimeout(2000);

      // 使用 JavaScript 在页面中提取最新一轮对话的 HTML 内容
      // Use JavaScript to extract the latest conversation's HTML content in the page
      const result = await this.page.evaluate(() => {
        const containers = document.querySelectorAll('div.qk-markdown-complete');

        console.log(`[Playwright] ===== 提取开始 =====`);
        console.log(`[Playwright] 找到 ${containers.length} 个 div.qk-markdown-complete 容器`);

        if (containers.length === 0) {
          return { containers: 0, html: '' };
        }

        // 只提取最后一个容器（当前 AI 回复），避免提取历史内容
        // Only extract the last container (current AI response), avoid extracting historical content
        const lastContainer = containers[containers.length - 1];

        // 🔥 排除个性化卡片：移除所有 data-c="result_card" 的元素
        // 🔥 Exclude personalized cards: Remove all elements with data-c="result_card"
        const containerClone = lastContainer.cloneNode(true) as HTMLElement;
        const cardElements = containerClone.querySelectorAll('[data-c="result_card"]');
        console.log(`[Playwright] 移除 ${cardElements.length} 个个性化卡片 (data-c="result_card")`);
        cardElements.forEach(card => card.remove());

        const html = containerClone.innerHTML;
        const text = containerClone.textContent || '';

        console.log(`[Playwright] ========== 最后一个容器 ==========`);
        console.log(`[Playwright]   HTML 长度: ${html.length}`);
        console.log(`[Playwright]   文本长度: ${text.length}`);
        console.log(`[Playwright]   文本预览（前300字符）:\n${text.substring(0, 300)}`);

        return { containers: containers.length, html };
      });

      logService.debug(this.platformId, `提取到 HTML，总容器数: ${result.containers}, HTML长度: ${result.html.length} / Extracted HTML`);

      if (!result.html || result.html.trim().length === 0) {
        logService.warn(this.platformId, '未能提取到任何内容 / Failed to extract any content');
        return '';
      }

      // 使用 Turndown 将 HTML 转换为 Markdown
      // Use Turndown to convert HTML to Markdown
      const turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        bulletListMarker: '-'
      });

      // 添加自定义规则处理表格
      // Add custom rule to handle tables
      turndownService.addRule('table', {
        filter: ['table'],
        replacement: function (content: string, node: any) {
          const rows = Array.from(node.querySelectorAll('tr'));
          if (rows.length === 0) return '';

          const markdownRows: string[] = [];

          rows.forEach((row: any, rowIndex: number) => {
            const cells = Array.from(row.querySelectorAll('td, th'));
            const cellTexts = cells.map((cell: any) => {
              const text = cell.textContent || '';
              return text.trim().replace(/\|/g, '\\|'); // 转义管道符
            });
            markdownRows.push('| ' + cellTexts.join(' | ') + ' |');

            // 表头后添加分隔线
            if (rowIndex === 0) {
              const separator = cells.map(() => '---').join(' | ');
              markdownRows.push('| ' + separator + ' |');
            }
          });

          return '\n\n' + markdownRows.join('\n') + '\n\n';
        }
      });

      const markdownContent = turndownService.turndown(result.html);

      logService.debug(this.platformId, `HTML 转 Markdown 完成，长度: ${markdownContent.length} / HTML to Markdown conversion completed`);

      const trimmedContent = markdownContent.trim();
      logService.info(this.platformId, `成功提取内容，长度: ${trimmedContent.length} / Successfully extracted content, length: ${trimmedContent.length}`);

      return trimmedContent;
    } catch (error) {
      logService.error(this.platformId, '提取响应失败 / Failed to extract response', error);
      return '';
    }
  }
}
