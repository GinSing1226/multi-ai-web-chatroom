import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

/**
 * Custom plugin to copy bootstrap.cjs to output directory
 * 自定义插件：将 bootstrap.cjs 复制到输出目录
 */
function copyBootstrapPlugin() {
  return {
    name: 'copy-bootstrap',
    writeBundle() {
      const src = path.resolve(__dirname, './packages/main/bootstrap.cjs')
      const dest = path.resolve(__dirname, './out/main/bootstrap.cjs')

      // Ensure output directory exists / 确保输出目录存在
      const destDir = path.dirname(dest)
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true })
      }

      // Copy bootstrap.cjs / 复制 bootstrap.cjs
      fs.copyFileSync(src, dest)
      console.log('✓ Copied bootstrap.cjs to out/main/bootstrap.cjs')
    }
  }
}

export default defineConfig({
  main: {
    // 开发模式的入口点 / Entry point for dev mode
    'electron-vite': {
      libEntry: path.resolve(__dirname, './packages/main/src/index.ts')
    },
    resolve: {
      alias: {
        '@shared': path.resolve(__dirname, './shared'),
        '@main': path.resolve(__dirname, './packages/main/src')
      }
    },
    plugins: [copyBootstrapPlugin()],
    // 🔥 Electron 启动参数 / Electron startup options
    // 用于 Playwright CDP 连接 / For Playwright CDP connection
    // 已禁用远程调试端口，避免自动打开 DevTools（准备开源）
    // Disabled remote debugging port to prevent auto-opening DevTools (for open source)
    electronOptions: {
      // 在开发模式下启用远程调试 / Enable remote debugging in development
      // ...(process.env.NODE_ENV !== 'production' ? {
      //   args: ['--remote-debugging-port=9222', '--no-sandbox']
      // } : {})
    },
    build: {
      lib: {
        entry: path.resolve(__dirname, './packages/main/src/index.ts'),
        formats: ['cjs']
      },
      rollupOptions: {
        // electron 必须标记为 external，这样它不会被打包进代码
        // 在运行时，Electron 环境会自动注入 electron API
        external: ['electron', 'playwright', 'chromium-bidi/lib/cjs/bidiMapper/BidiMapper', 'chromium-bidi/lib/cjs/cdp/CdpConnection']
      }
    }
  },
  preload: {
    // 开发模式的入口点 / Entry point for dev mode
    'electron-vite': {
      libEntry: path.resolve(__dirname, './packages/main/src/preload.ts')
    },
    resolve: {
      alias: {
        '@shared': path.resolve(__dirname, './shared'),
        '@main': path.resolve(__dirname, './packages/main/src')
      }
    },
    build: {
      lib: {
        entry: path.resolve(__dirname, './packages/main/src/preload.ts'),
        formats: ['cjs']
      },
      rollupOptions: {
        // preload 中也移除 electron
        external: ['playwright']
      }
    }
  },
  renderer: {
    root: path.resolve(__dirname, './packages/renderer'),
    resolve: {
      alias: {
        '@shared': path.resolve(__dirname, './shared'),
        '@renderer': path.resolve(__dirname, './packages/renderer/src')
      }
    },
    build: {
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, './packages/renderer/index.html')
        }
      }
    },
    // 不要在 renderer 中设置 css.postcss
    // electron-vite 会自动从 postcss.config.cjs 读取配置
    plugins: [react()]
  }
})
