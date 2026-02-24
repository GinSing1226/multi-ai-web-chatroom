/**
 * 豆包 DOM 调试脚本
 * Doubao DOM Debug Script
 */

const { chromium } = require('playwright');

async function debugDoubaoDOM() {
  console.log('[Debug] 启动豆包 DOM 调试 / Starting Doubao DOM debug');

  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: null
  });

  const page = await context.newPage();

  try {
    console.log('[Debug] 导航到豆包 / Navigating to Doubao');
    // 豆包网址：https://www.doubao.com/
    await page.goto('https://www.doubao.com/', { waitUntil: 'networkidle', timeout: 30000 });

    console.log('[Debug] 等待页面完全加载...');
    await page.waitForTimeout(3000);

    console.log('[Debug] 截图保存到: doubao-screenshot.png');
    await page.screenshot({ path: 'doubao-screenshot.png', fullPage: true });

    // 尝试多种选择器找到关键元素
    const selectors = [
      // 新建会话按钮
      'span:has-text("新对话")',
      'span:has-text("新建")',
      'span:has-text("开启")',
      'button:has-text("新对话")',
      'a:has-text("新对话")',

      // 输入框
      'textarea[placeholder*="发送"]',
      'textarea[placeholder*="消息"]',
      'textarea[placeholder*="输入"]',
      'div[contenteditable="true"]',
      'input[type="text"]',

      // 发送按钮
      'button:has-text("发送")',
      'button:has(svg)',
      'div[role="button"]'
    ];

    console.log('[Debug] 测试选择器:');
    for (const selector of selectors) {
      try {
        const visible = await page.isVisible(selector).catch(() => false);
        if (visible) {
          const elements = await page.$$(selector);
          console.log(`  ✓ 找到 ${elements.length} 个: ${selector}`);

          // 获取第一个元素的信息
          const first = elements[0];
          const tagName = await first.evaluate(el => el.tagName);
          const textContent = await first.evaluate(el => el.textContent?.slice(0, 30) || '');
          const className = await first.evaluate(el => el.className?.slice(0, 50) || '');
          console.log(`    标签: ${tagName}, 文本: "${textContent}", 类名: ${className}`);
        }
      } catch (e) {
        // 忽略错误
      }
    }

    // 查找所有按钮和输入框
    console.log('\n[Debug] 查找页面上的交互元素:');
    const buttons = await page.$$('button, div[role="button"], a[role="button"]');
    console.log(`  找到 ${buttons.length} 个按钮`);

    const inputs = await page.$$('textarea, input, div[contenteditable="true"]');
    console.log(`  找到 ${inputs.length} 个输入框`);

    // 显示前几个输入框的 placeholder
    for (let i = 0; i < Math.min(5, inputs.length); i++) {
      const input = inputs[i];
      try {
        const placeholder = await input.evaluate(el => el.placeholder || '');
        const tagName = await input.evaluate(el => el.tagName);
        if (placeholder) {
          console.log(`  输入框[${i}]: <${tagName}> placeholder="${placeholder}"`);
        }
      } catch (e) {
        // 忽略
      }
    }

    console.log('\n[Debug] 保持浏览器打开 60 秒供手动检查...');
    console.log('[Debug] 请手动在浏览器中操作，观察 DOM 结构');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('[Debug] 错误:', error);
  } finally {
    await browser.close();
    console.log('[Debug] 浏览器已关闭');
  }
}

debugDoubaoDOM().catch(console.error);
