#!/usr/bin/env sh
# 本地预览服务（development 环境）
#   baseURL = http://localhost:1313/  ← 绝不会跳到线上域名
#   --renderToMemory：渲染进内存，不写 public/，与生产构建完全隔离
#     （0.146+ 的 server 默认 renderToDisk，跑一次 hugo 生产构建会覆盖预览内容）
#   --disableFastRender：改动 SCSS 后避免偶发渲染卡滞
# 用法：sh scripts/dev-server.sh   [PORT=1314 sh scripts/dev-server.sh]
set -e
cd "$(dirname "$0")/.."

HUGO_BIN="${HUGO_BIN:-$(command -v hugo || echo /opt/homebrew/bin/hugo)}"

echo "→ 本地预览：http://localhost:${PORT:-1313}/  (environment=development)"
exec "$HUGO_BIN" server \
  --environment development \
  --bind 127.0.0.1 \
  --port "${PORT:-1313}" \
  --renderToMemory \
  --disableFastRender \
  --buildDrafts \
  --buildFuture
