# 清除缓存并重启脚本
Write-Host "清除 Electron 缓存..."

# 清除 Vite 缓存
Remove-Item -Recurse -Force "node_modules\.vite" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "packages\renderer\dist" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "packages\main\dist" -ErrorAction SilentlyContinue

Write-Host "缓存已清除"
Write-Host "请运行 npm run dev 重启应用"
