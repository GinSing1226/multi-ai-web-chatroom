/**
 * 读取最新的渲染器日志
 * Run with: node scripts/read-logs.js
 */

const fs = require('fs');
const path = require('path');

const logsDir = path.join(process.cwd(), 'logs');
const latestLogFile = path.join(logsDir, 'renderer-latest.txt');

console.log('='.repeat(80));
console.log('Latest Renderer Console Logs');
console.log('='.repeat(80));
console.log('');

try {
  if (fs.existsSync(latestLogFile)) {
    const content = fs.readFileSync(latestLogFile, 'utf-8');
    console.log(content);
  } else {
    console.log('❌ No renderer logs found.');
    console.log(`Expected file: ${latestLogFile}`);
    console.log('');
    console.log('Logs will be automatically saved when you run the app.');
    console.log('After using the app, run this script again to see the logs.');
  }
} catch (error) {
  console.error('❌ Failed to read logs:', error.message);
}

console.log('');
console.log('='.repeat(80));
