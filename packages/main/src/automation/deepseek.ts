/**
 * DeepSeek 平台自动化实现
 * DeepSeek Platform Automation Implementation
 * 实现 DeepSeek 对话的自动化操作 / Implements automated DeepSeek conversation operations
 */

import { BasePlatformAutomation } from './base';
import { DEEPSEEK_SELECTORS } from '@shared/constants/platform-selectors';
import { logService } from '../services/log.service';
import TurndownService from 'turndown';

/**
 * DeepSeek 自动化类
 * DeepSeek Automation Class
 */
export class DeepSeekAutomation extends BasePlatformAutomation {
  protected readonly platformId = 'deepseek';
  protected readonly baseUrl = 'https://chat.deepseek.com';
  protected readonly selectors = DEEPSEEK_SELECTORS;

  /**
   * 导航到新会话 / Navigate to new session
   * 点击"开启新对话"按钮 / Click "Start New Chat" button
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
      await this.safeClick(this.selectors.newChatButton, 5000);

      // 等待页面稳定 / Wait for page to stabilize
      await this.page.waitForTimeout(1500);

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
   * 从 URL 中提取 DeepSeek 会话 ID / Extract DeepSeek conversation ID from URL
   */
  async getCurrentConversationId(): Promise<string | null> {
    if (!this.page) throw new Error('Page 未初始化 / Page not initialized');

    try {
      const url = this.page.url();
      logService.debug(this.platformId, `当前 URL: ${url} / Current URL`);

      // DeepSeek URL 格式: https://chat.deepseek.com/a/chat/s/{conversationId}
      const urlMatch = url.match(/\/a\/chat\/s\/([a-zA-Z0-9_-]+)/);
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
      const url = `${this.baseUrl}/a/chat/s/${conversationId}`;

      // 导航到会话 / Navigate to conversation
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // 等待页面加载完成 / Wait for page to fully load
      await this.page.waitForTimeout(1500);

      logService.info(this.platformId, `成功导航到会话: ${conversationId} / Successfully navigated to session: ${conversationId}`);
    } catch (error) {
      logService.error(this.platformId, `导航到会话失败: ${conversationId} / Failed to navigate to session: ${conversationId}`, error);
      throw new Error(`导航到会话失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 判断是否有页面 / Check if has page
   */
  hasPage(): boolean {
    return !!this.page;
  }

  /**
   * 发送消息 / Send message
   * 在输入框中输入内容并点击发送按钮 / Type content in input box and click send button
   *
   * @param content - 要发送的内容 / Content to send
   * @param useDirectFill - 是否直接填充（避免换行符被识别为回车键）/ Whether to use direct fill (avoid newlines being interpreted as Enter)
   */
  async sendMessage(content: string, useDirectFill = false): Promise<void> {
    if (!this.page) throw new Error('Page 未初始化 / Page not initialized');

    logService.info(this.platformId, `准备发送消息: ${content.substring(0, 50)}... / Preparing to send message: ${content.substring(0, 50)}...`);
    if (useDirectFill) {
      logService.info(this.platformId, `使用直接填充模式（避免换行符触发发送）/ Using direct fill mode (avoid newlines triggering send)`);
    }

    try {
      // 1. 等待输入框可见 / Wait for input box to be visible
      await this.page.waitForSelector(this.selectors.inputBox, { timeout: 10000, state: 'visible' });

      // 2. 清空输入框并输入内容 / Clear input box and type content
      await this.page.fill(this.selectors.inputBox, '');

      // 🔥 【优化】根据参数选择输入方式 / 【Optimization】Choose input method based on parameter
      if (useDirectFill) {
        // 直接填充内容（适用于包含换行符的内部任务prompt）
        // Direct fill content (suitable for internal task prompts containing newlines)
        await this.page.fill(this.selectors.inputBox, content);
        logService.debug(this.platformId, '内容已直接填充到输入框 / Content filled directly into input box');
      } else {
        // 逐字符输入（模拟真实用户输入，适用于正常消息）
        // Type character by character (simulate real user input, suitable for normal messages)
        await this.page.type(this.selectors.inputBox, content, { delay: 10 });
        logService.debug(this.platformId, '内容已逐字符输入到输入框 / Content typed character by character into input box');
      }

      logService.debug(this.platformId, '内容已输入到输入框 / Content typed into input box');

      // 3. 三层延迟机制 / Three-tier delay mechanism (anti-scraping)
      // 延迟1: 输入后延迟 2000-10000ms / Delay 1: 2000-10000ms after input
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
          await this.page.waitForTimeout(2000); // 增加到 2000ms，确保 DOM 完全渲染 / Increased to 2000ms to ensure DOM fully renders

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
   * 通过按钮状态判断 / Determine via button state
   *
   * 关键特征 / Key characteristic:
   * - 生成中：按钮可用（没有 disabled 类），aria-disabled="false"
   * - 生成完成：按钮禁用（有 ds-icon-button--disabled 类），aria-disabled="true"
   */
  async isGenerating(): Promise<boolean> {
    if (!this.page) throw new Error('Page 未初始化 / Page not initialized');

    try {
      // 🔥 关键：检查发送/停止按钮的状态
      // 🔥 Key: Check the state of send/stop button
      const result = await this.page.evaluate(() => {
        // 查找所有按钮
        const buttons = document.querySelectorAll('div.ds-icon-button');
        console.log(`[Playwright] 找到 ${buttons.length} 个 ds-icon-button 按钮`);

        for (let i = 0; i < buttons.length; i++) {
          const btn = buttons[i];

          // 检查是否包含发送按钮的SVG图标（箭头）
          const svg = btn.querySelector('svg');
          if (!svg) {
            console.log(`[Playwright] 按钮 ${i}: 没有 SVG`);
            continue;
          }

          const path = svg.querySelector('path');
          if (!path) {
            console.log(`[Playwright] 按钮 ${i}: SVG 中没有 path`);
            continue;
          }

          const pathData = path.getAttribute('d') || '';
          console.log(`[Playwright] 按钮 ${i} pathData 前50字符: ${pathData.substring(0, 50)}`);

          // 发送按钮的特征路径（包含箭头）
          if (pathData.includes('M8.3125') && pathData.includes('0.981587')) {
            // 找到发送按钮，检查它的状态
            const ariaDisabled = btn.getAttribute('aria-disabled');
            const hasDisabledClass = btn.classList.contains('ds-icon-button--disabled');
            const allClasses = Array.from(btn.classList);
            const isDisabled = hasDisabledClass || ariaDisabled === 'true';

            console.log(`[Playwright] ✅ 找到发送按钮 ${i}`);
            console.log(`[Playwright]    - aria-disabled: ${ariaDisabled}`);
            console.log(`[Playwright]    - hasDisabledClass: ${hasDisabledClass}`);
            console.log(`[Playwright]    - 所有类: ${allClasses.join(', ')}`);
            console.log(`[Playwright]    - 判定为: ${isDisabled ? '已禁用（生成完成）' : '可用（正在生成）'}`);

            return { found: true, isGenerating: !isDisabled };
          }
        }

        console.log(`[Playwright] ❌ 没找到发送按钮`);
        return { found: false, isGenerating: false };
      });

      logService.info(this.platformId, `生成状态检测: found=${result.found}, isGenerating=${result.isGenerating} / Generation detection`);

      // 如果没找到按钮，默认返回 true（正在生成），避免提前结束
      if (!result.found) {
        logService.warn(this.platformId, '未找到发送按钮，默认判定为正在生成 / Send button not found, defaulting to generating');
        return true;
      }

      return result.isGenerating;
    } catch (error) {
      logService.error(this.platformId, '判断生成状态失败，返回 true（避免提前结束）/ Failed to determine generation status, returning true to avoid premature end', error);
      return true; // 出错时默认返回 true，继续等待
    }
  }

  /**
   * 提取响应内容 / Extract response content
   * 从页面中提取最后一条 AI 消息 / Extract the last AI message from the page
   *
   * DeepSeek 特殊处理：提取所有内容（包括深度思考区域）
   * DeepSeek Special Handling: Extract all content (including deep think area)
   */
  async extractResponse(): Promise<string> {
    if (!this.page) throw new Error('Page 未初始化 / Page not initialized');

    try {
      logService.debug(this.platformId, '开始提取响应 / Starting to extract response');

      // 🔥 等待新内容渲染，并检查容器数量是否稳定
      // 🔥 Wait for new content to render and check if container count is stable
      let lastCount = 0;
      let stableCount = 0;
      const maxStableChecks = 5; // 最多检查5次

      for (let i = 0; i < maxStableChecks; i++) {
        await this.page.waitForTimeout(1000); // 每次等待1秒

        const currentCount = await this.page.evaluate(() => {
          return document.querySelectorAll('div.ds-markdown').length;
        });

        console.log(`[DeepSeek] 等待渲染... 容器数量: ${currentCount} (上次: ${lastCount})`);

        if (currentCount === lastCount) {
          stableCount++;
          if (stableCount >= 2) {
            // 容器数量连续2次没有变化，认为渲染完成
            console.log(`[DeepSeek] 容器数量稳定，准备提取`);
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
        // 🔥 查找所有 div.ds-markdown 容器（包含段落、标题等所有内容）
        // 🔥 Find all div.ds-markdown containers (including paragraphs, headers, etc.)
        const containers = document.querySelectorAll('div.ds-markdown');

        console.log(`[Playwright] ===== 提取开始 =====`);
        console.log(`[Playwright] 找到 ${containers.length} 个 div.ds-markdown 容器`);

        if (containers.length === 0) {
          return { containers: 0, html: '' };
        }

        // 🔥 只提取最后2个容器（当前对话的深度思考+正文），避免提取历史内容
        // 🔥 Only extract the last 2 containers (current conversation's deep think + main response)
        // 避免提取历史对话内容 / Avoid extracting historical conversation content
        const allHtmlParts: string[] = [];

        // 确定要提取的容器索引
        // 如果只有1个容器，提取第1个（最后一个）
        // 如果有2个或更多容器，提取最后2个
        const startIndex = Math.max(0, containers.length - 2);
        console.log(`[Playwright] 提取容器范围: ${startIndex} 到 ${containers.length - 1}（最后 ${containers.length - startIndex} 个容器）`);

        for (let i = startIndex; i < containers.length; i++) {
          const container = containers[i];
          const html = container.innerHTML;
          const text = container.textContent || '';

          // 获取所有标题
          const headers = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
          const headerList = Array.from(headers).map(h => `${h.tagName}: ${h.textContent?.trim()}`);

          // 获取所有 strong 标签（可能用于小标题）
          const strongs = container.querySelectorAll('strong');
          const strongList = Array.from(strongs).map(s => s.textContent?.trim()).filter(t => t.length > 0 && t.length < 50);

          // 获取段落数量
          const paragraphs = container.querySelectorAll('div.ds-markdown-paragraph, p');

          console.log(`[Playwright] ========== 容器 ${i} ==========`);
          console.log(`[Playwright]   内部段落数: ${paragraphs.length}`);
          console.log(`[Playwright]   HTML 长度: ${html.length}`);
          console.log(`[Playwright]   文本长度: ${text.length}`);
          console.log(`[Playwright]   标题 (${headerList.length}个): ${headerList.join('; ') || '无'}`);
          console.log(`[Playwright]   粗体/小标题 (${strongList.length}个): ${strongList.slice(0, 5).join('; ') || '无'}`);
          console.log(`[Playwright]   文本预览（前300字符）:\n${text.substring(0, 300)}`);
          console.log(`[Playwright]   文本预览（后300字符）:\n${text.substring(Math.max(0, text.length - 300))}`);
          console.log(`[Playwright]   HTML 前500字符:\n${html.substring(0, 500)}`);
          console.log(`[Playwright]   HTML 后500字符:\n${html.substring(Math.max(0, html.length - 500))}`);

          if (html && html.trim().length > 0) {
            allHtmlParts.push(html);
          }
        }

        // 合并提取的容器
        const combinedHtml = allHtmlParts.join('\n\n'); // 用换行符分隔，而不是 <hr>
        console.log(`[Playwright] ===== 提取完成 =====`);
        console.log(`[Playwright] 总容器数: ${containers.length}`);
        console.log(`[Playwright] 提取容器数: ${allHtmlParts.length}`);
        console.log(`[Playwright] 合并后 HTML 长度: ${combinedHtml.length}`);

        return { containers: containers.length, extracted: allHtmlParts.length, html: combinedHtml };
      });

      logService.debug(this.platformId, `提取到 HTML，总容器数: ${result.containers}, 提取容器数: ${result.extracted}, HTML长度: ${result.html.length} / Extracted HTML`);

      // 🔥 修复反斜杠转义问题（DeepSeek 输出中有大量 \n \t \# 等）
      // 🔥 Fix backslash escape issues (DeepSeek output has many \n \t \# etc)
      let fixedHtml = result.html;

      console.log('[DeepSeek] 原始 HTML 长度:', fixedHtml.length);
      console.log('[DeepSeek] 原始 HTML 前1000字符:', fixedHtml.substring(0, 1000));
      console.log('[DeepSeek] 原始 HTML 中间1000字符:', fixedHtml.substring(Math.floor(fixedHtml.length / 2) - 500, Math.floor(fixedHtml.length / 2) + 500));
      console.log('[DeepSeek] 原始 HTML 后1000字符:', fixedHtml.substring(Math.max(0, fixedHtml.length - 1000)));

      // 将 \\n \\t \\# \\= \\_ 等替换为换行符、制表符等
      fixedHtml = fixedHtml
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '    ')
        .replace(/\\#/g, '#')
        .replace(/\\=/g, '=')
        .replace(/\\_/g, '_')
        .replace(/\\\\/g, '\\'); // 最后处理 \\ -> \

      console.log('[DeepSeek] 修复后 HTML 前1000字符:', fixedHtml.substring(0, 1000));
      console.log('[DeepSeek] 修复后 HTML 长度:', fixedHtml.length);

      // 🔥 使用 Turndown 将 HTML 转换为 Markdown（在 Node.js 环境中执行）
      // 🔥 Use Turndown to convert HTML to Markdown (execute in Node.js environment)
      const turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        bulletListMarker: '-'
      });

      // 🔥 添加自定义规则处理表格
      // 🔥 Add custom rule to handle tables
      turndownService.addRule('table', {
        filter: ['table'],
        replacement: function (content: string, node: any) {
          // 🔥 提取表格内容并转换为Markdown表格格式
          // 🔥 Extract table content and convert to Markdown table format
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

      const markdownContent = turndownService.turndown(fixedHtml);
      console.log('[DeepSeek] 转换后的 Markdown 长度:', markdownContent.length);
      console.log('[DeepSeek] 转换后的 Markdown 前1000字符:', markdownContent.substring(0, 1000));
      console.log('[DeepSeek] 转换后的 Markdown 中间1000字符:', markdownContent.substring(Math.floor(markdownContent.length / 2) - 500, Math.floor(markdownContent.length / 2) + 500));
      console.log('[DeepSeek] 转换后的 Markdown 后1000字符:', markdownContent.substring(Math.max(0, markdownContent.length - 1000)));

      // 🔥 调试：将Markdown保存到文件
      // 🔥 Debug: Save Markdown to file
      try {
        const fs = require('fs');
        const path = require('path');
        const debugPath = path.join(process.cwd(), 'debug-markdown-output.md');
        const debugContent = `<!-- Markdown 长度: ${markdownContent.length} -->\n<!-- 生成时间: ${new Date().toISOString()} -->\n\n${markdownContent}`;
        fs.writeFileSync(debugPath, debugContent, 'utf-8');
        console.log('[DeepSeek] Markdown 已保存到:', debugPath);
        console.log('[DeepSeek] 文件路径:', debugPath);
        console.log('[DeepSeek] Markdown 内容长度:', markdownContent.length);
      } catch (err) {
        console.error('[DeepSeek] 保存Markdown失败:', err);
      }

      logService.info(this.platformId, `HTML 修复完成，长度: ${fixedHtml.length} / HTML fixed`);
      logService.debug(this.platformId, `HTML 转 Markdown 完成，长度: ${markdownContent.length} / HTML to Markdown conversion completed`);

      const extractedContent = markdownContent;

      if (!extractedContent || extractedContent.trim().length === 0) {
        // 降级方案：如果提取为空，尝试直接获取容器的 innerText
        // Fallback: If extraction is empty, try getting container's innerText directly
        logService.warn(this.platformId, '提取为空，尝试 innerText 降级方案 / Extraction empty, trying innerText fallback');

        const fallbackContent = await this.page.evaluate(() => {
          const containers = document.querySelectorAll('div.ds-markdown');
          if (containers.length === 0) return '';

          // 🔥 降级方案：提取最后2个容器的 innerText（与主逻辑一致）
          // 🔥 Fallback: Extract innerText from last 2 containers (consistent with main logic)
          let targetContainers: Element[] = [];

          if (containers.length === 1) {
            targetContainers = [containers[0]];
          } else {
            targetContainers = [
              containers[containers.length - 2],
              containers[containers.length - 1]
            ];
          }

          const allText: string[] = [];
          targetContainers.forEach((container, idx) => {
            const text = container.innerText || container.textContent || '';
            if (text && text.trim().length > 0) {
              console.log(`[Playwright Fallback] 容器 ${idx} 内容长度: ${text.length}`);
              allText.push(text.trim());
            }
          });

          return allText.join('\n\n\n');
        });

        if (fallbackContent && fallbackContent.trim().length > 0) {
          logService.info(this.platformId, `通过 innerText 降级方案提取到内容，长度: ${fallbackContent.length} / Extracted content via innerText fallback, length: ${fallbackContent.length}`);
          return fallbackContent.trim();
        }

        logService.warn(this.platformId, '未能提取到任何内容 / Failed to extract any content');
        return '';
      }

      const trimmedContent = extractedContent.trim();
      logService.info(this.platformId, `成功提取内容，原始长度: ${extractedContent.length}, trim后长度: ${trimmedContent.length} / Successfully extracted content, original length: ${extractedContent.length}, trimmed length: ${trimmedContent.length}`);
      console.log('[DeepSeek] 返回内容前500字符:', trimmedContent.substring(0, 500));
      console.log('[DeepSeek] 返回内容后500字符:', trimmedContent.substring(Math.max(0, trimmedContent.length - 500)));
      return trimmedContent;
    } catch (error) {
      logService.error(this.platformId, '提取响应失败 / Failed to extract response', error);
      return '';
    }
  }
}
