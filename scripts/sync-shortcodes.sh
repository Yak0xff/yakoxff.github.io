#!/bin/bash

# 同步短代码脚本
# 确保所有短代码在两个路径都存在

echo "🔄 同步短代码文件..."

# 创建目录（如果不存在）
mkdir -p layouts/shortcodes
mkdir -p layouts/_shortcodes

# 从 _shortcodes 复制到 shortcodes
if [ -d "layouts/_shortcodes" ]; then
    echo "📋 从 _shortcodes 复制到 shortcodes..."
    cp -f layouts/_shortcodes/* layouts/shortcodes/ 2>/dev/null || true
fi

# 从 shortcodes 复制到 _shortcodes（反向同步）
if [ -d "layouts/shortcodes" ]; then
    echo "📋 从 shortcodes 复制到 _shortcodes..."
    cp -f layouts/shortcodes/* layouts/_shortcodes/ 2>/dev/null || true
fi

echo "✅ 短代码同步完成"

# 显示同步结果
echo "📊 短代码文件列表:"
echo "layouts/_shortcodes/:"
ls -1 layouts/_shortcodes/ 2>/dev/null || echo "  (目录不存在)"
echo "layouts/shortcodes/:"
ls -1 layouts/shortcodes/ 2>/dev/null || echo "  (目录不存在)"