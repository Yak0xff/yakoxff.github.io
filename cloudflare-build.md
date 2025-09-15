# Cloudflare Pages 构建配置

## 构建设置

在 Cloudflare Pages 的项目设置中，使用以下配置：

### 🎯 推荐配置（最新修复版本）
- **框架预设**: Hugo
- **构建命令**: `chmod +x build.sh && ./build.sh`
- **构建输出目录**: `public`
- **根目录**: `/` (留空)

### 环境变量
```
HUGO_VERSION=0.134.3
NODE_VERSION=18
TZ=Asia/Shanghai
HUGO_ENVIRONMENT=production
```

## 备用构建命令

如果主构建命令失败，可以尝试以下命令：

### 方案 1: 手动同步短代码
```bash
mkdir -p layouts/shortcodes && cp -f layouts/_shortcodes/* layouts/shortcodes/ && npm run build:uno:prod && hugo --gc --minify
```

### 方案 2: 完整手动构建
```bash
npm ci && npm run build:uno:prod && mkdir -p static/css layouts/shortcodes && cp assets/css/uno.css static/css/uno.css && cp -f layouts/_shortcodes/* layouts/shortcodes/ && hugo --gc --minify --cleanDestinationDir
```

### 方案 3: 最简构建（应急）
```bash
cp -f layouts/_shortcodes/* layouts/shortcodes/ && hugo --gc --minify
```

## 故障排除

如果遇到资源处理错误：

1. **检查 UnoCSS 文件**: 确保 `assets/css/uno.css` 存在
2. **检查短代码**: 确保所有短代码文件都在正确位置
3. **检查 Hugo 版本**: 使用 Hugo Extended 版本
4. **清理缓存**: 在构建前运行 `hugo mod clean --all`

## 🔧 最新修复（2025-09-15）

### 已解决的问题：
- ✅ **资源管道类型错误**: 修复 `minify` 函数类型不匹配问题
- ✅ **短代码路径问题**: 创建双重路径保护机制
- ✅ **UnoCSS 构建流程**: 自动构建和静态文件备份
- ✅ **postcount/wordcount 短代码**: 确保所有短代码在标准路径存在
- ✅ **自动同步机制**: 构建时自动同步短代码文件

### 修复的文件：
- `layouts/_partials/head/css-safe.html` - 安全的资源处理
- `layouts/shortcodes/*` - 完整的短代码备份
- `build.sh` - 智能构建脚本
- `scripts/sync-shortcodes.sh` - 短代码同步脚本
- `static/css/uno.css` - UnoCSS 静态备份

### 构建流程优化：
1. 🔄 自动同步短代码到两个路径
2. 🎨 构建 UnoCSS 并创建静态备份
3. 🧹 清理 Hugo 缓存
4. 🏗️ 使用优化参数构建 Hugo
5. ✅ 验证构建结果

现在你的站点应该能在 Cloudflare Pages 上成功构建！