#!/usr/bin/env python3
"""生成站点默认分享图 static/img/header.png（1200×630）。

V10.21：旧卡片还停留在 V10.5 的点阵形状 + 旧标语「向死而生」，
与当前「实心朱砂点 + 纸墨」的视觉不一致。这里用系统字体重画一张
克制的标准 OG 卡片：域名 / 站名 / 一句主张 / 分类信息。

用法：python3 scripts/gen-og-image.py && oxipng -o4 --strip safe static/img/header.png
依赖：Pillow、macOS 系统字体（Hiragino Sans GB、Menlo）。
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "static" / "img" / "header.png"

PAPER = "#f4f1ea"     # --paper（明色）
INK = "#16130f"       # --ink
INK_2 = "#4a443b"
INK_3 = "#8a8378"
ZHU = "#d9431f"       # --zhu
LINE = "#ded8cc"

HEI = "/System/Library/Fonts/Hiragino Sans GB.ttc"
MONO = "/System/Library/Fonts/Menlo.ttc"


def face(path, size, index=0):
    return ImageFont.truetype(path, size, index=index)


W, H = 1200, 630
im = Image.new("RGB", (W, H), PAPER)
d = ImageDraw.Draw(im)

# 顶部：域名
d.text((88, 72), "YAKOXFF.PAGES.DEV", font=face(MONO, 22), fill=INK_3)

# 主视觉：黑体「一点」+ 一枚实心朱砂句点
big = face(HEI, 176, index=1)
d.text((80, 186), "一点", font=big, fill=INK)
box = d.textbbox((80, 186), "一点", font=big)
cx = box[2] + 40
cy = box[1] + (box[3] - box[1]) * 0.66
r = 21
d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=ZHU)

# 主张
d.text((88, 428), "写下来，就是在时间里刻下坐标。", font=face(HEI, 36), fill=INK_2)

# 底部：细线 + 分类与署名
d.line((88, 540, 1112, 540), fill=LINE, width=2)
small = face(HEI, 22)
d.text((88, 568), "独立写作 · 技术 / 思考 / 生活", font=small, fill=INK_3)
d.text((1112, 568), "一点", font=small, fill=INK_3, anchor="ra")

im.save(OUT, optimize=True)
print("wrote", OUT, im.size)
