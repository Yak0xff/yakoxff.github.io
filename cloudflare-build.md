# Cloudflare Pages 构建配置

## 构建设置

在 Cloudflare Pages 的项目设置中，使用以下配置：

### 基本设置
- **框架预设**: Hugo
- **构建命令**: `npm run build:uno:prod && hugo --gc --minify`
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

如果上面的构建命令失败，可以尝试以下命令：

### 方案 1: 使用构建脚本
```bash
chmod +x build.sh && ./build.sh
```

### 方案 2: 分步构建
```bash
npm ci && npm run build:uno:prod && mkdir -p static/css && cp assets/css/uno.css static/css/uno.css && hugo --gc --minify --cleanDestinationDir
```

### 方案 3: 最简构建
```bash
hugo --gc --minify
```

## 故障排除

如果遇到资源处理错误：

1. **检查 UnoCSS 文件**: 确保 `assets/css/uno.css` 存在
2. **检查短代码**: 确保所有短代码文件都在正确位置
3. **检查 Hugo 版本**: 使用 Hugo Extended 版本
4. **清理缓存**: 在构建前运行 `hugo mod clean --all`

## 当前修复

已经修复的问题：
- ✅ 资源管道类型错误
- ✅ 短代码路径问题  
- ✅ UnoCSS 构建流程
- ✅ 静态文件备份机制