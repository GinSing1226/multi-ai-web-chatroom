/**
 * 图标生成脚本 / Icon Generation Script
 *
 * 使用 Sharp 库从 logo.png 生成各种尺寸的图标
 * Use Sharp library to generate icons of various sizes from logo.png
 *
 * 注意：Windows icon.ico 和 macOS icon.icns 需要手动转换
 * Note: Windows icon.ico and macOS icon.icns need to be converted manually
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sourceIcon = path.resolve(__dirname, '../build/logo.png');
const buildDir = path.resolve(__dirname, '../build');
const iconsDir = path.resolve(__dirname, '../build/icons');

// 确保目录存在
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

ensureDir(buildDir);
ensureDir(iconsDir);

/**
 * Linux 图标尺寸 / Linux icon sizes
 */
const linuxSizes = [16, 32, 48, 64, 128, 256, 512, 1024];

/**
 * 生成 Linux 图标 / Generate Linux icons
 */
async function generateLinuxIcons() {
  console.log('🔨 生成 Linux 图标...');

  for (const size of linuxSizes) {
    const outputFile = path.join(iconsDir, `${size}x${size}.png`);
    await sharp(sourceIcon)
      .resize(size, size, { fit: 'cover', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toFile(outputFile);
    console.log(`  ✓ ${size}x${size}.png`);
  }

  console.log('✅ Linux 图标生成完成\n');
}

/**
 * 主函数 / Main function
 */
async function main() {
  try {
    console.log('🚀 开始生成图标...\n');

    // 检查源图标是否存在
    if (!fs.existsSync(sourceIcon)) {
      console.error(`❌ 源图标不存在: ${sourceIcon}`);
      console.log('请将 logo.png 放到 build/ 目录下');
      process.exit(1);
    }

    // 只生成 Linux PNG 图标
    await generateLinuxIcons();

    // 提示用户手动转换 Windows 和 macOS 图标
    console.log('📝 提示：');
    console.log('  - Windows icon.ico 需要手动转换（已放在 build/icon.ico）');
    console.log('  - macOS icon.icns 需要手动转换（已放在 build/icon.icns）');
    console.log('  - 推荐使用在线工具：https://convertio.co/zh/png-ico/\n');

    console.log('🎉 Linux 图标生成完成！');
  } catch (error) {
    console.error('❌ 生成图标时出错:', error.message);
    process.exit(1);
  }
}

main();
