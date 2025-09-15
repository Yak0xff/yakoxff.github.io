#!/bin/bash

# Cloudflare Pages 构建脚本
set -e

echo "🚀 开始构建 Hugo 站点..."

# 1. 检查环境
echo "📋 检查构建环境..."
echo "Hugo 版本: $(hugo version)"
echo "Node.js 版本: $(node --version)"
echo "npm 版本: $(npm --version)"

# 2. 安装依赖
echo "📦 安装 Node.js 依赖..."
if [ -f package-lock.json ]; then
    npm ci
elif [ -f package.json ]; then
    npm install
fi

# 3. 构建 UnoCSS
echo "🎨 构建 UnoCSS..."
if [ -f package.json ] && grep -q "build:uno:prod" package.json; then
    npm run build:uno:prod
    # 确保静态目录存在并复制 UnoCSS
    mkdir -p static/css
    cp assets/css/uno.css static/css/uno.css || echo "⚠️  复制 UnoCSS 到静态目录失败"
else
    echo "⚠️  未找到 UnoCSS 构建脚本，跳过..."
fi

# 4. 同步短代码文件
echo "🔄 同步短代码文件..."
if [ -f scripts/sync-shortcodes.sh ]; then
    chmod +x scripts/sync-shortcodes.sh
    ./scripts/sync-shortcodes.sh
else
    # 手动同步
    mkdir -p layouts/shortcodes layouts/_shortcodes
    cp -f layouts/_shortcodes/* layouts/shortcodes/ 2>/dev/null || true
    cp -f layouts/shortcodes/* layouts/_shortcodes/ 2>/dev/null || true
fi

# 5. 检查关键文件
echo "🔍 检查关键文件..."
echo "检查 UnoCSS 文件:"
ls -la assets/css/uno.css || echo "❌ UnoCSS 文件不存在"

echo "检查短代码目录:"
ls -la layouts/_shortcodes/ || echo "❌ _shortcodes 目录不存在"
ls -la layouts/shortcodes/ || echo "❌ shortcodes 目录不存在"

echo "检查配置文件:"
ls -la config/_default/

# 5. 清理缓存
echo "🧹 清理 Hugo 缓存..."
hugo mod clean --all || true
rm -rf resources/_gen || true

# 6. 构建 Hugo 站点
echo "🏗️  构建 Hugo 站点..."
hugo \
    --gc \
    --minify \
    --cleanDestinationDir \
    --verbose \
    --logLevel info

# 7. 验证构建结果
echo "✅ 验证构建结果..."
echo "构建输出目录:"
ls -la public/

echo "检查关键文件:"
[ -f public/index.html ] && echo "✓ index.html 存在" || echo "❌ index.html 缺失"
[ -f public/sitemap.xml ] && echo "✓ sitemap.xml 存在" || echo "❌ sitemap.xml 缺失"

echo "构建目录大小:"
du -sh public/

echo "🎉 构建完成！"