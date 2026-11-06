#!/usr/bin/env sh
# 生产构建（production 环境，baseURL = https://yakoxff.pages.dev/）
# 与 CI（.github/workflows/hugo.yml）保持同一套参数
set -e
cd "$(dirname "$0")/.."

HUGO_BIN="${HUGO_BIN:-$(command -v hugo || echo /opt/homebrew/bin/hugo)}"
HUGO_ENVIRONMENT=production

echo "→ 生产构建 → ./public"
HUGO_ENVIRONMENT=production "$HUGO_BIN" --gc --minify --cleanDestinationDir --logLevel info
