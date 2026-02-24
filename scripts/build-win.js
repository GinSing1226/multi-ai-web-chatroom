const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Windows build process...\n');

// Step 1: Build with electron-vite
console.log('📦 Step 1: Building with electron-vite...');
const viteBuild = spawn('npm', ['run', 'build'], {
  cwd: path.resolve(__dirname, '..'),
  shell: true,
  stdio: 'inherit'
});

viteBuild.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ electron-vite build failed');
    process.exit(code);
  }

  console.log('\n✅ electron-vite build completed');

  // Step 2: Build with electron-builder
  console.log('\n📦 Step 2: Building Windows installer with electron-builder...');
  const builderBuild = spawn('npx', ['electron-builder', '--win'], {
    cwd: path.resolve(__dirname, '..'),
    shell: true,
    stdio: 'inherit'
  });

  builderBuild.on('close', (code) => {
    if (code !== 0) {
      console.error('❌ electron-builder failed');
      process.exit(code);
    }

    console.log('\n✅ Build completed successfully!');
    console.log('📁 Check the release/ directory for output files');
  });
});
