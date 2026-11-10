#!/usr/bin/env sh
# 字体子集化：把 LXGW WenKai 裁剪成「本站实际用字」的 woff2，自托管到 static/fonts/
# ---------------------------------------------------------------------------
# 为什么需要它：原来从 jsdelivr 拉 6 个字体族样式（≈630KB CSS / 582 条 @font-face），
# 实际只用到一个字族；且分片按需下载依赖第三方 CDN，国内首屏不稳定。
# 这里按全站字符集裁成单文件，一次请求、永久缓存、不依赖外部域名。
# V10.28：只生成 Regular（@font-face 用 font-weight:100 900 覆盖全部字重），
# 首屏不再同时下载两个各 683KB 的 woff2。
#
# 依赖：fonttools（pyftsubset） + brotli
#   python3 -m venv /tmp/fenv && /tmp/fenv/bin/pip install fonttools brotli
#
# 用法：sh scripts/build-font-subset.sh [pyftsubset 路径]
#   PYFTSUBSET=/tmp/fenv/bin/pyftsubset sh scripts/build-font-subset.sh
#
# 新增文章出现生僻字导致回退成系统字体时，重跑本脚本即可。
# 字体授权：LXGW WenKai 为 SIL Open Font License 1.1，允许子集化与再分发。
set -eu
cd "$(dirname "$0")/.."

PYFTSUBSET="${1:-${PYFTSUBSET:-pyftsubset}}"
WORK="${TMPDIR:-/tmp}/yak-font"
# V10.28 之前用同版本 Medium 承载 500–700 字重，两个文件各 683KB 且首屏都下；
# 现只留 Regular，加粗交给浏览器合成，首屏字体请求减半。
REGULAR_URL="https://github.com/lxgw/LxgwWenKai/releases/download/v1.510/LXGWWenKai-Regular.ttf"
mkdir -p "$WORK" static/fonts

# 1. 收集全站字符集 ---------------------------------------------------------
python3 - "$WORK" <<'PY'
import os, sys
work = sys.argv[1]
chars = set()
targets = [
    ('content', ('.md', '.markdown', '.html')),
    ('layouts', ('.html', '.xml', '.json')),
    ('i18n', ('.json', '.yaml', '.toml')),
    ('data', ('.json', '.yaml')),
    ('config', ('.yaml',)),
]
for root_dir, exts in targets:
    for root, _dirs, files in os.walk(root_dir):
        for name in files:
            if name.endswith(exts):
                try:
                    chars |= set(open(os.path.join(root, name), encoding='utf-8').read())
                except Exception:
                    pass

# 兜底：ASCII 可见字符 + 中文排版常用标点 / 符号，避免 UI 文案缺字
chars |= {chr(c) for c in range(0x20, 0x7f)}
chars |= set('　、。〈〉《》「」『』【】〔〕・ー—…‘’“”·×÷±≈≤≥°′″¥€£§¶†‡•‰※→←↑↓↔⇒⇐⇔①②③④⑤⑥⑦⑧⑨⑩')
chars -= {'\n', '\r', '\t'}

open(os.path.join(work, 'charset.txt'), 'w', encoding='utf-8').write(''.join(sorted(chars)))
han = [c for c in chars if '\u4e00' <= c <= '\u9fff']
print(f'  字符集：{len(chars)} 个（其中汉字 {len(han)}）')
PY

# 2. 下载源字体并裁剪 -------------------------------------------------------
for weight in Regular; do
  ttf="$WORK/LXGWWenKai-${weight}.ttf"
  out="static/fonts/lxgw-wenkai-$(echo "$weight" | tr 'A-Z' 'a-z').woff2"
  src="$REGULAR_URL"
  # 小于 1MB 视为下载失败（GitHub 的 404 会返回几字节文本），重下
  if [ ! -f "$ttf" ] || [ "$(wc -c < "$ttf")" -lt 1000000 ]; then
    echo "  下载 LXGWWenKai-${weight}.ttf"
    rm -f "$ttf"
    curl -sSL --max-time 600 -o "$ttf" "$src"
  fi
  echo "  裁剪 ${weight}"
  "$PYFTSUBSET" "$ttf" \
    --text-file="$WORK/charset.txt" \
    --flavor=woff2 \
    --layout-features='*' \
    --no-hinting \
    --desubroutinize \
    --output-file="$out"
  printf '  → %s  %s\n' "$out" "$(du -h "$out" | cut -f1)"
done

echo "完成。字体样式见 assets/css/fonts.css"
