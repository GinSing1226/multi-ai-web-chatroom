/**
 * 豆包平台自动化实现
 * Doubao Platform Automation Implementation
 *
 * 豆包是字节跳动的 AI 助手
 * Doubao is ByteDance's AI assistant
 * 无需登录即可使用 / No login required
 */

import { BasePlatformAutomation } from './base';
import { DOUBAO_SELECTORS } from '@shared/constants/platform-selectors';
import { logService } from '../services/log.service';
import TurndownService from 'turndown';

/**
 * 豆包自动化类
 * Doubao Automation Class
 */
export class DoubaoAutomation extends BasePlatformAutomation {
  protected readonly platformId = 'doubao';
  protected readonly baseUrl = 'https://www.doubao.com';
  protected readonly selectors = DOUBAO_SELECTORS;

  /**
   * 导航到新会话 / Navigate to new session
   * 点击"新对话"按钮 / Click "New Chat" button
   * 返回临时标记，真实 ID 会在发送消息后获取 / Return temporary marker, real ID will be obtained after sending message
   *
   * 风控优化：随机延迟 1000-3000ms
   * Anti-detection: Random delay 1000-3000ms
   *
   * 重要：点击新对话按钮后，页面会刷新导航，需要等待新页面加载完成
   * Important: After clicking new chat button, page will refresh/navigate, need to wait for new page to load
   */
  async navigateToNewSession(): Promise<string> {
    if (!this.page) throw new Error('Page 未初始化 / Page not initialized');

    logService.info(this.platformId, '开始导航到新会话 / Navigating to new session');

    // 先打印当前页面状态
    const currentUrl = this.page.url();
    logService.info(this.platformId, `当前页面 URL (导航前): ${currentUrl} / Current URL (before navigate)`);

    // 检查是否已经在豆包聊天页面
    // Check if already on Doubao chat page
    if (currentUrl.includes('doubao.com/chat')) {
      logService.info(this.platformId, '已在豆包聊天页面，点击新对话按钮 / Already on Doubao chat page, clicking new chat button');
    } else {
      logService.info(this.platformId, '不在豆包聊天页面，先导航到首页 / Not on Doubao chat page, navigate to home first');
    }

    try {
      // ⚠️ 风控优化：随机延迟 1000-3000ms
      // Anti-detection: Random delay 1000-3000ms before clicking new chat
      const delay = Math.random() * 2000 + 1000; // 1000-3000ms
      logService.info(this.platformId, `⏰ 风控延迟: ${Math.round(delay)}ms / Anti-detection delay`);
      await this.page.waitForTimeout(delay);

      // 尝试点击新会话按钮 / Try to click new chat button
      logService.info(this.platformId, `尝试点击新会话按钮: ${this.selectors.newChatButton} / Trying to click new chat button`);

      // 点击新对话按钮 / Click new chat button
      // 注意：点击后页面可能会导航，需要等待导航完成
      // Note: Page might navigate after click, need to wait for navigation to complete
      await this.safeClick(this.selectors.newChatButton, 5000);

      // 等待页面导航完成（点击新对话按钮后页面会跳转）
      // Wait for page navigation to complete (page will redirect after clicking new chat button)
      logService.info(this.platformId, '等待页面导航完成 / Waiting for page navigation to complete');

      try {
        // 等待 URL 变化或页面加载完成
        // Wait for URL to change or page to finish loading
        await this.page.waitForLoadState('domcontentloaded', { timeout: 10000 });
        logService.info(this.platformId, '✅ 页面导航完成 / Page navigation completed');
      } catch (navError) {
        // 如果导航等待失败，可能是页面没有跳转，继续执行
        // If navigation wait fails, page might not have navigated, continue
        logService.warn(this.platformId, `页面导航等待超时或失败，可能页面未跳转: ${navError} / Page navigation timeout or failed, page might not have navigated`);
      }

      // 额外等待确保页面稳定 / Extra wait to ensure page is stable
      await this.page.waitForTimeout(1500);

      // 检查页面是否仍然有效 / Check if page is still valid
      if (this.page.isClosed()) {
        throw new Error('页面在导航后被关闭 / Page was closed after navigation');
      }

      const newUrl = this.page.url();
      logService.info(this.platformId, `导航后 URL: ${newUrl} / URL after navigate`);

      logService.info(this.platformId, '新对话按钮点击完成，真实会话 ID 将在发送消息后获取 / New chat button clicked, real conversation ID will be obtained after sending message');

      // 返回临时标记，真实 ID 会在 sendMessage 中获取
      // Return temporary marker, real ID will be obtained in sendMessage
      return 'pending';
    } catch (error) {
      logService.error(this.platformId, '导航到新会话失败 / Failed to navigate to new session', error);
      throw new Error(`导航到新会话失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 导航到指定会话 / Navigate to specific session
   * 通过会话 ID 跳转 / Navigate using conversation ID
   */
  async navigateToSession(conversationId: string): Promise<void> {
    if (!this.page) throw new Error('Page 未初始化 / Page not initialized');

    logService.info(this.platformId as any, `导航到会话: ${conversationId} / Navigating to session: ${conversationId}`);

    try {
      // 如果是 'current'，表示保持在当前会话
      // If 'current', stay in current session
      if (conversationId === 'current') {
        logService.info(this.platformId as any, '保持在当前会话 / Staying in current session');
        return;
      }

      // 检查页面是否有效
      // Check if page is still valid
      if (this.page.isClosed()) {
        throw new Error('页面已关闭，无法导航 / Page is closed, cannot navigate');
      }

      // 构建会话 URL - 直接使用保存的 ID（已经是 +2 后的值）
      // Build conversation URL - Use saved ID directly (already +2)
      const url = `${this.baseUrl}/chat/${conversationId}`;

      // 导航到会话 / Navigate to conversation
      logService.info(this.platformId as any, `正在导航到: ${url} / Navigating to`);
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // 等待页面加载完成 / Wait for page to fully load
      await this.page.waitForTimeout(1500);

      // 再次检查页面状态
      // Check page status again
      if (this.page.isClosed()) {
        throw new Error('页面在导航后被关闭 / Page was closed after navigation');
      }

      logService.info(this.platformId, `成功导航到会话: ${conversationId} / Successfully navigated to session: ${conversationId}`);
    } catch (error) {
      logService.error(this.platformId, `导航到会话失败: ${conversationId} / Failed to navigate to session: ${conversationId}`, error);
      throw new Error(`导航到会话失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 发送消息 / Send message
   * 在输入框中输入内容并通过 Enter 键发送 / Type content and send via Enter key
   *
   * 风控优化：
   * 1. 直接赋值所有内容（模拟粘贴）
   * 2. 发送前随机延迟 2000-10000ms
   * Anti-detection:
   * 1. Direct assignment (simulate paste)
   * 2. Random delay 2000-10000ms before sending
   */
  async sendMessage(content: string, useDirectFill = false): Promise<void> {
    if (!this.page) throw new Error('Page 未初始化 / Page not initialized');

    // 检查页面是否仍然有效
    // Check if page is still valid
    if (this.page.isClosed()) {
      throw new Error('页面已关闭，无法发送消息 / Page is closed, cannot send message');
    }

    logService.info(this.platformId, `准备发送消息: ${content.substring(0, 50)}... / Preparing to send message: ${content.substring(0, 50)}...`);

    try {
      // 1. 等待输入框可见 / Wait for input box to be visible
      await this.page.waitForSelector(this.selectors.inputBox, { timeout: 10000, state: 'visible' });

      // 2. 点击输入框聚焦
      // Click input box to focus
      await this.page.click(this.selectors.inputBox);
      await this.page.waitForTimeout(100); // 短暂延迟

      // 3. 清空输入框
      // Clear input box
      await this.page.fill(this.selectors.inputBox, '');

      // 4. ⚠️ 风控优化：直接赋值所有内容（模拟粘贴）
      // ⚠️ Anti-detection: Direct assignment (simulate paste)
      logService.info(this.platformId, `直接输入内容（模拟粘贴）/ Direct input (simulate paste)`);
      await this.page.fill(this.selectors.inputBox, content);
      logService.info(this.platformId, '✅ 内容已输入 / Content entered');

      // 5. ⚠️ 风控优化：输入内容后，2000-10000ms 随机延迟再发送
      // ⚠️ Anti-detection: Random delay 2000-10000ms after input before sending
      const delay = Math.random() * 8000 + 2000; // 2000-10000ms
      logService.info(this.platformId, `⏰ 风控延迟: ${Math.round(delay)}ms 后发送 / Anti-detection delay: sending in ${Math.round(delay)}ms`);

      // 分段延迟，定期检查页面状态 / Split delay, check page status periodically
      const checkInterval = 500;
      const totalDelay = Math.round(delay);
      let elapsed = 0;

      while (elapsed < totalDelay) {
        const remaining = totalDelay - elapsed;
        const currentDelay = Math.min(checkInterval, remaining);

        await this.page.waitForTimeout(currentDelay);

        // 检查页面是否仍然有效
        // Check if page is still valid
        if (this.page.isClosed()) {
          throw new Error('页面在延迟期间被关闭 / Page was closed during delay');
        }

        elapsed += currentDelay;
      }

      logService.info(this.platformId, '✅ 延迟完成，准备发送 / Delay completed, preparing to send');

      // 6. 按 Enter 键发送消息
      // Press Enter to send message
      await this.page.keyboard.press('Enter');

      // 7. 等待发送完成 / Wait for send to complete
      await this.page.waitForTimeout(1000);

      logService.info(this.platformId, '消息已成功发送，轮询服务将监控输出 / Message sent successfully, polling service will monitor output');
    } catch (error) {
      logService.error(this.platformId, '发送消息失败 / Failed to send message', error);
      throw new Error(`发送消息失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 从当前页面 URL 获取豆包会话 ID
   * Get Doubao conversation ID from current page URL
   * 由轮询服务在检测到输出时调用
   * Called by polling service when output detected
   *
   * ⚠️ 豆包特殊处理：URL 中的 ID 就是会话 ID，无需转换
   * ⚠️ Doubao special handling: URL ID is the conversation ID, no conversion needed
   * 增强版：支持更多 URL 格式 / Enhanced: Support more URL formats
   */
  async getCurrentConversationId(): Promise<string> {
    if (!this.page) throw new Error('Page 未初始化 / Page not initialized');

    const url = this.page.url();
    logService.info(this.platformId as any, `📍 当前 URL: ${url} / Current URL`);

    // 尝试多种提取模式 / Try multiple extraction patterns
    const patterns = [
      { regex: /\/chat\/(\d{10,20})/, name: '纯数字ID (10-20位)' },
      { regex: /\/chat\/([a-zA-Z0-9_-]+)/, name: '混合ID' },
      { regex: /conversation[\/=]([a-zA-Z0-9_-]+)/, name: 'conversation参数' },
    ];

    for (let i = 0; i < patterns.length; i++) {
      const { regex, name } = patterns[i];
      const match = url.match(regex);
      logService.debug(this.platformId as any, `尝试正则 ${i + 1}/${patterns.length}: ${name} | 匹配结果: ${match ? '✅ 成功' : '❌ 失败'}`);
      if (match) {
        const conversationId = match[1];

        // 🔥 豆包 ID: 直接使用 URL 中的 ID，无需转换
        // 🔥 Doubao ID: Use URL ID directly, no conversion needed
        logService.info(this.platformId as any, `✅ 从 URL 提取到会话 ID: ${conversationId} / Extracted conversation ID from URL`);
        return conversationId;
      }
    }

    // 如果在 URL 中没找到，尝试从页面 DOM 中查找
    // Try to find from page DOM if not found in URL
    try {
      logService.debug(this.platformId, 'URL 中未找到会话 ID，尝试从 DOM 中查找 / No ID in URL, trying DOM');
      const pageText = await this.page.evaluate(() => {
        // 查找包含对话链接的元素 / Find elements containing conversation links
        const links = Array.from(document.querySelectorAll('a[href*="/chat/"]'));
        return links.map(l => l.getAttribute('href')).filter(Boolean);
      });

      for (const link of pageText) {
        if (link) {
          const match = link.match(/\/chat\/([^\/\s?#]+)/);
          if (match) {
            logService.info(this.platformId, `从 DOM 链接提取到会话 ID: ${match[1]} / Extracted conversation ID from DOM link`);
            return match[1];
          }
        }
      }
    } catch (error) {
      logService.debug(this.platformId, `DOM 查找失败: ${error} / DOM lookup failed`);
    }

    logService.warn(this.platformId, '未能提取到会话 ID / Failed to extract conversation ID');
    return '';
  }

  /**
   * 等待响应 / Wait for response
   * 持续检测直到 AI 生成完成 / Continuously check until AI generation completes
   */
  async waitForResponse(timeout = 60000): Promise<string> {
    if (!this.page) throw new Error('Page 未初始化 / Page not initialized');

    logService.info(this.platformId, `开始等待响应 (超时: ${timeout}ms) / Starting to wait for response (timeout: ${timeout}ms)`);

    const startTime = Date.now();
    const checkInterval = 1000;
    let lastContent = '';

    try {
      // 第一阶段：使用停止按钮检测 / Phase 1: Use stop button detection
      while (Date.now() - startTime < Math.min(timeout, 30000)) {
        const isGenerating = await this.isGenerating();

        if (!isGenerating) {
          await this.page.waitForTimeout(1000);
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
        const finalContent = await this.extractResponse();
        logService.info(this.platformId, `内容稳定，最终响应长度: ${finalContent.length} / Content stable, final response length: ${finalContent.length}`);
        return finalContent;
      }

      throw new Error('响应超时 / Response timeout');
    } catch (error) {
      logService.error(this.platformId, '等待响应失败 / Failed to wait for response', error);
      throw error;
    }
  }

  /**
   * 判断是否正在生成 / Check if AI is generating
   * 通过停止按钮或生成指示器判断 / Determine via stop button or generation indicator
   *
   * 豆包 DOM 结构 / Doubao DOM Structure:
   * - 正在生成时 / While generating: div[data-testid="chat_input_local_break_button"][data-state="closed"] 可见
   * - 生成完成时 / After generation: 停止按钮消失，发送按钮出现 / Stop button disappears, send button appears
   */
  async isGenerating(): Promise<boolean> {
    if (!this.page) throw new Error('Page 未初始化 / Page not initialized');

    try {
      // 方法 1: 检查停止按钮是否存在且可见（支持多个选择器）
      // Method 1: Check if stop button exists and is visible (multiple selectors)
      const stopButtonSelectors = this.selectors.stopButton.split(',').map(s => s.trim());

      for (const selector of stopButtonSelectors) {
        if (!selector) continue;
        try {
          const stopButton = await this.page.$(selector);
          if (stopButton) {
            const isVisible = await stopButton.isVisible().catch(() => false);
            if (isVisible) {
              // 检查按钮状态
              const dataState = await stopButton.getAttribute('data-state').catch(() => null);
              const disabled = await stopButton.isDisabled().catch(() => false);

              // 如果按钮可见且未被禁用，可能在生成中
              if (!disabled) {
                logService.info(this.platformId, `检测到停止按钮(${selector})，状态: ${dataState}，可能正在生成 / Stop button detected, state: ${dataState}, possibly generating`);
                return true;
              }
            }
          }
        } catch {
          continue;
        }
      }

      // 方法 2: 检查发送按钮是否被禁用（生成中发送按钮是禁用的）
      // Method 2: Check if send button is disabled (send button is disabled during generation)
      const sendButtonSelector = 'button[data-testid="chat_input_send_button"]';
      try {
        const sendButton = await this.page.$(sendButtonSelector);
        if (sendButton) {
          const isDisabled = await sendButton.isDisabled().catch(() => false);
          if (isDisabled) {
            logService.info(this.platformId, '发送按钮被禁用，正在生成中 / Send button disabled, generating');
            return true;
          }
        }
      } catch {
        // 忽略错误，继续其他方法
      }

      // 方法 3: 检查生成指示器 / Method 3: Check generation indicator
      try {
        const indicatorVisible = await this.page.isVisible(this.selectors.generatingIndicator, { timeout: 1000 }).catch(() => false);
        if (indicatorVisible) {
          logService.info(this.platformId, '检测到生成指示器 / Generation indicator detected');
          return true;
        }
      } catch {
        // 忽略错误
      }

      // 方法 4: 检查页面中是否有"正在输入"或"正在思考"等提示
      // Method 4: Check if page has "typing" or "thinking" hints
      const hasGeneratingHint = await this.page.evaluate(() => {
        const text = document.body.innerText || '';
        const hints = ['正在输入', '正在思考', '生成中', 'thinking...', 'typing...'];
        return hints.some(hint => text.toLowerCase().includes(hint.toLowerCase()));
      });

      if (hasGeneratingHint) {
        logService.info(this.platformId, '检测到生成提示文本 / Generation hint text detected');
        return true;
      }

      logService.debug(this.platformId, '未检测到生成状态 / No generation state detected');
      return false;
    } catch (error) {
      logService.debug(this.platformId, `判断生成状态失败，返回 false / Failed to determine generation status, returning false: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * 提取响应内容 / Extract response content
   * 从页面中提取最后一条 AI 消息 / Extract the last AI message from the page
   *
   * 豆包 DOM 结构 / Doubao DOM Structure:
   * div[data-testid="message_content"]
   *   └── div[data-testid="message_text_content"] ← 实际文本内容 / Actual text content
   */
  async extractResponse(): Promise<string> {
    if (!this.page) throw new Error('Page 未初始化 / Page not initialized');

    try {
      // 等待一下确保页面加载完成 / Wait for page to load
      await this.page.waitForTimeout(500);

      // 方法 1: 使用 JavaScript 在页面中查找最新的 AI 回复
      // Method 1: Use JavaScript to find the latest AI response in the page
      logService.info(this.platformId, `开始提取响应（方法1: JS查找）/ Starting to extract response (method 1: JS lookup)`);

      const contentFromJs = await this.page.evaluate(() => {
        // 查找所有可能的消息容器 / Find all possible message containers
        const selectors = [
          '[data-testid="message_text_content"]',
          '[data-testid="message_content"]',
          'div[class*="messageContent"]',
          'div[class*="MessageContent"]',
          'div[class*="markdown"]',
          'article',
          '[role="presentation"]'
        ];

        let bestContent = '';
        let maxLength = 0;

        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);

          for (const element of elements) {
            const text = element.innerText || element.textContent || '';

            // 过滤：长度至少 10 个字符，且不包含输入框
            // Filter: At least 10 chars, and not input box
            if (text.length > maxLength && text.length > 10 && !element.querySelector('textarea, input')) {
              // 检查元素或其父元素是否有用户消息标记
              // Check if element or parent has user message marker
              const isUserMessage = element.closest('[data-testid*="user"], [class*="user"]');

              if (!isUserMessage) {
                bestContent = text;
                maxLength = text.length;
              }
            }
          }
        }

        return bestContent.trim();
      });

      if (contentFromJs && contentFromJs.length > 10) {
        logService.info(this.platformId, `提取到内容 (方法1)，长度: ${contentFromJs.length} / Extracted content (method 1), length`);
        return contentFromJs;
      }

      // 方法 2: 降级到 messageContent 选择器
      // Method 2: Fallback to messageContent selector
      logService.info(this.platformId, `方法1失败，尝试方法2，选择器: ${this.selectors.messageContent} / Method 1 failed, trying method 2, selector`);
      const contentElements = await this.page.$$(this.selectors.messageContent);
      logService.info(this.platformId, `找到 ${contentElements.length} 个消息内容元素 / Found ${contentElements.length} message content elements`);

      if (contentElements.length > 0) {
        // 获取最后一个内容元素（通常是最新响应）
        // Get the last content element (usually the latest response)
        const lastContentElement = contentElements[contentElements.length - 1];
        const content = await lastContentElement.innerText();

        if (content.trim()) {
          logService.info(this.platformId, `提取到内容 (方法2)，长度: ${content.length} / Extracted content (method 2), length: ${content.length}`);
          return content.trim();
        }
      }

      // 方法 3: 尝试从页面最后的长文本中提取
      // Method 3: Try to extract from the last long text in page
      logService.info(this.platformId, `方法2失败，尝试方法3（页面文本）/ Method 2 failed, trying method 3 (page text)`);

      const pageText = await this.page.evaluate(() => {
        // 获取页面所有文本内容 / Get all text content from page
        return document.body.innerText;
      });

      // 尝试从用户消息之后的内容 / Try to get content after user message
      const lines = pageText.split('\n').filter(line => line.trim().length > 20);
      if (lines.length > 0) {
        // 取最后几行中最长的一行 / Take the longest of the last few lines
        const lastLines = lines.slice(-5);
        const longestLine = lastLines.reduce((a, b) => (a.length > b.length ? a : b));

        if (longestLine && longestLine.length > 30) {
          logService.info(this.platformId, `从页面文本提取内容，长度: ${longestLine.length} / Extracted from page text, length`);
          return longestLine.trim();
        }
      }

      logService.warn(this.platformId, `所有方法都失败 / All methods failed. Page text length: ${pageText.length}`);
      logService.debug(this.platformId, `页面文本预览（前300字符）: ${pageText.substring(0, 300)} / Page text preview (first 300 chars)`);

      return '';
    } catch (error) {
      logService.error(this.platformId, '提取响应失败 / Failed to extract response', error);
      return '';
    }
  }
}
