/**
 * DeepSeek DOM 调试脚本
 * DeepSeek DOM Debug Script
 */

const { chromium } = require('playwright');

async function debugDeepSeekDOM() {
  console.log('[Debug] 启动 DeepSeek DOM 调试 / Starting DeepSeek DOM debug');

  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: null
  });

  const page = await context.newPage();

  try {
    console.log('[Debug] 导航到 DeepSeek');
    await page.goto('https://chat.deepseek.com', { waitUntil: 'networkidle', timeout: 30000 });

    console.log('[Debug] 截图保存到: debug-screenshot.png');
    await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });

    // 获取页面 HTML
    const html = await page.content();
    console.log('[Debug] 页面 HTML 长度:', html.length);

    // 查找包含 "新对话" 或 "新建" 的元素
    console.log('[Debug] 查找新建会话按钮...');

    // 尝试多种选择器
    const selectors = [
      'span:has-text("开启新对话")',
      'span:has-text("新对话")',
      'a:has-text("新对话")',
      'button:has-text("新对话")',
      '[class*="new"]',
      'div[role="button"]',
      'textarea[placeholder*="发送"]',
      'textarea[placeholder*="DeepSeek"]'
    ];

    for (const selector of selectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          console.log(`[Debug] ✓ 找到 ${elements.length} 个元素匹配: ${selector}`);

          // 获取第一个元素的详细信息
          const first = elements[0];
          const tagName = await first.evaluate(el => el.tagName);
          const textContent = await first.evaluate(el => el.textContent?.slice(0, 50));
          const className = await first.evaluate(el => el.className);
          console.log(`  标签: ${tagName}`);
          console.log(`  文本: ${textContent}`);
          console.log(`  类名: ${className}`);
        } else {
          console.log(`[Debug] ✗ 未找到元素: ${selector}`);
        }
      } catch (error) {
        console.log(`[Debug] ✗ 选择器错误: ${selector} - ${error.message}`);
      }
    }

    // 查找所有 div 和 button
    console.log('[Debug] 查找所有交互元素...');
    const allDivs = await page.$$('div[role="button"], button, a');
    console.log(`[Debug] 找到 ${allDivs.length} 个交互元素`);

    // 显示前 10 个
    for (let i = 0; i < Math.min(10, allDivs.length); i++) {
      const el = allDivs[i];
      try {
        const text = await el.evaluate(el => el.textContent?.slice(0, 30) || '');
        const className = await el.evaluate(el => el.className || '');
        if (text.includes('新') || text.includes('对话') || text.includes('发送')) {
          console.log(`  [${i}] 文本: "${text}" | 类名: ${className}`);
        }
      } catch (e) {
        // ignore
      }
    }

    console.log('[Debug] 保持浏览器打开 60 秒供手动检查...');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('[Debug] 错误:', error);
  } finally {
    await browser.close();
  }
}

debugDeepSeekDOM().catch(console.error);
