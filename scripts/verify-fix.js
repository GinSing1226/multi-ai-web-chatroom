/**
 * Verification script for Electron startup fix / Electron 启动修复验证脚本
 *
 * This script verifies that:
 * 此脚本验证：
 * 1. bootstrap.js exists and contains cleanup code / bootstrap.js 存在并包含清理代码
 * 2. package.json main entry points to bootstrap.js / package.json main 入口指向 bootstrap.js
 * 3. Environment variables are properly cleaned / 环境变量被正确清理
 */

const fs = require('fs');
const path = require('path');

console.log('=== Electron Startup Fix Verification ===\n');

let allPassed = true;

// Test 1: Check bootstrap.js exists / 测试 1：检查 bootstrap.js 是否存在
console.log('Test 1: Checking bootstrap.js existence...');
const bootstrapPath = path.join(__dirname, '../packages/main/bootstrap.js');
if (fs.existsSync(bootstrapPath)) {
  console.log('✓ bootstrap.js exists at:', bootstrapPath);
} else {
  console.log('✗ bootstrap.js not found!');
  allPassed = false;
}

// Test 2: Check bootstrap.js content / 测试 2：检查 bootstrap.js 内容
console.log('\nTest 2: Checking bootstrap.js content...');
const bootstrapContent = fs.readFileSync(bootstrapPath, 'utf8');
const requiredElements = [
  'cleanupEnv',
  'ELECTRON_RUN_AS_NODE',
  'delete process.env',
  'require('
];

let missingElements = [];
for (const element of requiredElements) {
  if (!bootstrapContent.includes(element)) {
    missingElements.push(element);
  }
}

if (missingElements.length === 0) {
  console.log('✓ bootstrap.js contains all required elements');
} else {
  console.log('✗ bootstrap.js missing elements:', missingElements);
  allPassed = false;
}

// Test 3: Check package.json main entry / 测试 3：检查 package.json main 入口
console.log('\nTest 3: Checking package.json configuration...');
const mainPackageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../packages/main/package.json'), 'utf8')
);
const rootPackageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
);

if (mainPackageJson.main === './bootstrap.js') {
  console.log('✓ packages/main/package.json main field is correct');
} else {
  console.log('✗ packages/main/package.json main field is:', mainPackageJson.main);
  allPassed = false;
}

if (rootPackageJson.main === 'packages/main/bootstrap.js' ||
    rootPackageJson.main.includes('bootstrap.js')) {
  console.log('✓ Root package.json main field is correct');
} else {
  console.log('✗ Root package.json main field is:', rootPackageJson.main);
  allPassed = false;
}

// Test 4: Simulate environment variable cleanup / 测试 4：模拟环境变量清理
console.log('\nTest 4: Testing environment variable cleanup...');
process.env.ELECTRON_RUN_AS_NODE = '1';
process.env.ELECTRON_NO_ATTACH_CONSOLE = '1';

console.log('  Before cleanup:');
console.log('    ELECTRON_RUN_AS_NODE =', process.env.ELECTRON_RUN_AS_NODE);
console.log('    ELECTRON_NO_ATTACH_CONSOLE =', process.env.ELECTRON_NO_ATTACH_CONSOLE);

// Extract and execute cleanup function / 提取并执行清理函数
const cleanupMatch = bootstrapContent.match(/\(function cleanupEnv\(\) \{[\s\S]*?\}\)\(\);/);
if (cleanupMatch) {
  try {
    eval(cleanupMatch[0]);

    console.log('  After cleanup:');
    console.log('    ELECTRON_RUN_AS_NODE =', process.env.ELECTRON_RUN_AS_NODE);
    console.log('    ELECTRON_NO_ATTACH_CONSOLE =', process.env.ELECTRON_NO_ATTACH_CONSOLE);

    if (!process.env.ELECTRON_RUN_AS_NODE && !process.env.ELECTRON_NO_ATTACH_CONSOLE) {
      console.log('✓ Environment variables successfully cleaned');
    } else {
      console.log('✗ Environment variables not properly cleaned');
      allPassed = false;
    }
  } catch (error) {
    console.log('✗ Failed to execute cleanup function:', error.message);
    allPassed = false;
  }
} else {
  console.log('✗ Could not find cleanup function in bootstrap.js');
  allPassed = false;
}

// Test 5: Check built output / 测试 5：检查构建输出
console.log('\nTest 5: Checking built output...');
const builtBootstrapPath = path.join(__dirname, '../out/main/bootstrap.js');
if (fs.existsSync(builtBootstrapPath)) {
  console.log('✓ Built bootstrap.js exists at:', builtBootstrapPath);
} else {
  console.log('⚠ Built bootstrap.js not found (run npm run build first)');
}

// Final result / 最终结果
console.log('\n' + '='.repeat(50));
if (allPassed) {
  console.log('✓ All tests passed! The fix should work correctly.');
  console.log('\nTo test the application:');
  console.log('  Development mode: npm run dev');
  console.log('  Production mode: npm run build && npm run preview');
} else {
  console.log('✗ Some tests failed. Please review the issues above.');
  process.exit(1);
}
