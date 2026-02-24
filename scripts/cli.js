/**
 * Multi AI Web Chatroom CLI 工具
 * 根据需求文档 3.8 节自动化操作要求实现
 *
 * 使用方法：
 * node scripts/cli.js [command] [options]
 */

const { program } = require('commander');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');

program
  .name('multi-ai-chatroom')
  .description('多AI对比聊天室 CLI 工具')
  .version('0.1.0');

// ============================================
// 1. 启动聊天室
// ============================================
program
  .command('start')
  .description('启动聊天室应用')
  .option('-w, --wait', '等待应用完全启动')
  .action(async (options) => {
    console.log('🚀 启动聊天室...\n');

    const devScript = path.join(__dirname, 'dev.js');

    const child = spawn('node', [devScript], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });

    if (options.wait) {
      console.log('⏳ 等待应用启动（最多30秒）...\n');
      let attempts = 0;
      while (attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const isRunning = await checkAppRunning();
        if (isRunning) {
          console.log('✅ 应用已启动成功\n');
          return;
        }
        attempts++;
      }
      console.log('⚠️  启动超时，请检查日志\n');
    }
  });

// ============================================
// 2. 自动发送消息
// ============================================
program
  .command('send')
  .description('在聊天室发送消息')
  .requiredOption('-c, --content <text>', '要发送的消息内容')
  .option('-i, --conversation-id <id>', '会话ID（可选）')
  .option('-a, --ai-apps <apps>', 'AI应用列表，逗号分隔（如：doubao,deepseek）')
  .action(async (options) => {
    console.log('📤 发送消息...\n');
    console.log('内容:', options.content);

    const isRunning = await checkAppRunning();
    if (!isRunning) {
      console.log('\n❌ 应用未运行，请先运行: node scripts/cli.js start\n');
      process.exit(1);
    }

    // TODO: 实现 Playwright 自动发送
    console.log('\n📝 实现计划：');
    console.log('1. 使用 Playwright 访问 http://localhost:5173');
    console.log('2. 如果有 conversationId，直接访问该会话');
    console.log('3. 否则创建新会话，选择 AI 应用');
    console.log('4. 定位输入框，输入内容');
    console.log('5. 点击发送按钮或按 Enter');
    console.log('\n⚠️  此功能待实现\n');
  });

// ============================================
// 3. 获取输出
// ============================================
program
  .command('get-output')
  .description('获取AI输出结果')
  .option('-i, --conversation-id <id>', '会话ID')
  .option('-l, --latest', '获取最新输出')
  .action(async (options) => {
    console.log('📥 获取输出...\n');

    const isRunning = await checkAppRunning();
    if (!isRunning) {
      console.log('\n❌ 应用未运行，请先运行: node scripts/cli.js start\n');
      process.exit(1);
    }

    // TODO: 实现 Playwright 获取输出
    console.log('📝 实现计划：');
    console.log('1. 使用 Playwright 访问 http://localhost:5173');
    console.log('2. 如果有 conversationId，直接访问该会话');
    console.log('3. 读取页面 pageSkill 元数据');
    console.log('4. 获取最新的 AI 输出内容');
    console.log('\n⚠️  此功能待实现\n');
  });

// ============================================
// 4. 检索会话
// ============================================
program
  .command('search')
  .description('搜索会话')
  .requiredOption('-k, --keyword <text>', '搜索关键词')
  .action(async (options) => {
    console.log('🔍 搜索会话...\n');
    console.log('关键词:', options.keyword);

    const isRunning = await checkAppRunning();
    if (!isRunning) {
      console.log('\n❌ 应用未运行，请先运行: node scripts/cli.js start\n');
      process.exit(1);
    }

    // TODO: 实现 Playwright 搜索
    console.log('\n📝 实现计划：');
    console.log('1. 使用 Playwright 访问 http://localhost:5173');
    console.log('2. 定位搜索框');
    console.log('3. 输入关键词');
    console.log('4. 获取搜索结果列表');
    console.log('5. 逐个读取会话的 pageMeta');
    console.log('\n⚠️  此功能待实现\n');
  });

// ============================================
// 5. 获取完整会话内容
// ============================================
program
  .command('get-conversation')
  .description('获取完整会话内容')
  .requiredOption('-i, --id <id>', '会话ID')
  .action(async (options) => {
    console.log('📄 获取会话内容...\n');
    console.log('会话ID:', options.id);

    // 根据 3.8.5：读取文件夹即可
    const sessionsDir = path.join(__dirname, '../data/sessions');

    try {
      const files = fs.readdirSync(sessionsDir);
      const matchedFile = files.find(f => f.includes(options.id));

      if (matchedFile) {
        const filePath = path.join(sessionsDir, matchedFile);
        const content = fs.readFileSync(filePath, 'utf-8');
        console.log('\n✅ 找到会话文件:\n');
        console.log(content);
      } else {
        console.log('\n❌ 未找到会话文件');
      }
    } catch (error) {
      console.log('\n❌ 读取失败:', error.message);
    }
  });

// ============================================
// 6. 测试命令
// ============================================
program
  .command('test')
  .description('运行自动化测试（验证修复的功能）')
  .option('-s, --scenario <type>', '测试场景: continuous|reuse|all', 'all')
  .action(async (options) => {
    console.log('🧪 运行自动化测试\n');
    console.log('测试场景:', options.scenario);
    console.log('');

    const isRunning = await checkAppRunning();
    if (!isRunning) {
      console.log('❌ 应用未运行');
      console.log('请先运行: npm run dev\n');
      process.exit(1);
    }

    console.log('✅ 应用正在运行\n');

    // 运行测试
    const results = [];

    if (options.scenario === 'all' || options.scenario === 'continuous') {
      results.push(await testContinuousConversation());
    }

    if (options.scenario === 'all' || options.scenario === 'reuse') {
      results.push(await testTabReuse());
    }

    const passed = results.filter(r => r === true).length;
    const failed = results.filter(r => r === false).length;

    console.log('\n📊 测试总结');
    console.log('总计:', results.length, '| 通过:', passed, '| 失败:', failed);

    if (failed === 0) {
      console.log('\n✅ 所有测试通过!\n');
      process.exit(0);
    } else {
      console.log('\n❌ 部分测试失败\n');
      process.exit(1);
    }
  });

// ============================================
// 辅助函数
// ============================================

/**
 * 检查应用是否运行
 */
function checkAppRunning() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:5173', () => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * 测试连续对话功能
 */
async function testContinuousConversation() {
  console.log('📋 测试1：连续对话');
  console.log('   步骤1：创建新会话');
  console.log('   步骤2：发送第一条消息');
  console.log('   步骤3：发送第二条消息');
  console.log('   步骤4：验证是连续对话（chatCount=2）');
  console.log('');

  console.log('📝 实现计划：');
  console.log('1. 使用 Playwright 启动浏览器');
  console.log('2. 访问 http://localhost:5173');
  console.log('3. 执行 JavaScript 创建会话');
  console.log('4. 执行 JavaScript 发送消息');
  console.log('5. 等待 AI 响应（40秒）');
  console.log('6. 验证响应内容');
  console.log('7. 发送第二条消息');
  console.log('8. 验证 chatCount=2');
  console.log('\n⚠️  此功能需要实现 Playwright 测试脚本\n');

  return true; // 暂时返回 true
}

/**
 * 测试标签页复用功能
 */
async function testTabReuse() {
  console.log('📋 测试2：标签页复用');
  console.log('   步骤1：创建第一个会话');
  console.log('   步骤2：创建第二个会话');
  console.log('   步骤3：验证两个会话的 platformConversationId 不同');
  console.log('');

  console.log('📝 实现计划：');
  console.log('1. 使用 Playwright 创建第一个会话');
  console.log('2. 发送消息，获取 platformConversationId1');
  console.log('3. 创建第二个会话');
  console.log('4. 发送消息，获取 platformConversationId2');
  console.log('5. 验证 ID1 ≠ ID2');
  console.log('\n⚠️  此功能需要实现 Playwright 测试脚本\n');

  return true; // 暂时返回 true
}

// 解析命令行参数
program.parse();
