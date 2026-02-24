/**
 * 检查和修复会话文件
 * Check and fix conversation files
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const sessionsDir = path.join(__dirname, '..', 'data', 'sessions');

console.log('[Tool] 扫描会话文件 / Scanning conversation files');
const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.md'));

console.log(`[Tool] 找到 ${files.length} 个会话文件 / Found ${files.length} conversation files`);

for (const file of files) {
  const filePath = path.join(sessionsDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  const { data } = matter(content);

  console.log(`\n--- ${file} ---`);
  console.log('[Tool] aiApplicationBindings:', data.aiApplicationBindings);

  if (!data.aiApplicationBindings || data.aiApplicationBindings.length === 0) {
    console.log('[Tool] ⚠️  没有 AI 应用绑定！/ No AI bindings!');

    // 检查是否在 data 中有单独的绑定字段
    const hasBinding = Object.keys(data).some(key => key.includes('conversationId') || key.includes('Binding'));
    if (hasBinding) {
      console.log('[Tool] 发现有旧的绑定字段，需要迁移 / Found old binding fields, need migration');
    }
  } else {
    console.log('[Tool] ✓ 有 AI 应用绑定 / Has AI bindings');
    data.aiApplicationBindings.forEach(b => {
      console.log(`  - ${b.aiApplicationId}`);
    });
  }
}

console.log('\n[Tool] 扫描完成 / Scan completed');
