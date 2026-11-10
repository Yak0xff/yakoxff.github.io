#!/usr/bin/env python3
"""生成站点默认分享图 static/share/og-card-v4.png（1200×630）。

V10.21：旧卡片还停留在 V10.5 的点阵形状 + 旧标语「向死而生」，
与当前「实心朱砂点 + 纸墨」的视觉不一致。这里用系统字体重画一张
克制的标准 OG 卡片：域名 / 站名 / 一句主张 / 分类信息。

V10.25：换 URL + 换目录。旧 /img/header.png 的 URL 被 X 长期缓存，
且 _headers 给 /img/* 设了 30 天缓存，换了图片内容也不会重新抓取。
放到 /share/ 只受全站兜底 max-age=0 规则，文件名带版本号便于以后递增。

V10.30：全站正文改用系统宋体后，卡片里的主张与底部分类文字同步换成
宋体（Songti.ttc 的 STSong Regular）。

V10.31：大字「一点」也换成 Songti SC Bold（index 1），整张卡片
统一到宋体；Regular 版「一」横过细、撑不住朱砂点，未采用。
卡片自此自成一体（不再沿用站点「标题黑体」的分工），域名仍等宽。
内容一变就必须递增版本号，否则 X 仍按旧 URL 用缓存卡片；
v2 / v3 与 img/header.png 均保留，兼容旧分享链接。

用法：python3 scripts/gen-og-image.py && oxipng -o4 --strip safe static/share/og-card-v4.png
依赖：Pillow、macOS 系统字体（Songti.ttc、Menlo）。
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "static" / "share" / "og-card-v4.png"

PAPER = "#f4f1ea"     # --paper（明色）
INK = "#16130f"       # --ink
INK_2 = "#4a443b"
INK_3 = "#8a8378"
ZHU = "#d9431f"       # --zhu
LINE = "#ded8cc"

SONG = "/System/Library/Fonts/Supplemental/Songti.ttc"
SONG_INDEX = 4          # STSong Regular：标语与底部小字
SONG_BOLD_INDEX = 1     # Songti SC Bold：大字「一点」
MONO = "/System/Library/Fonts/Menlo.ttc"


def face(path, size, index=0):
    return ImageFont.truetype(path, size, index=index)


W, H = 1200, 630
im = Image.new("RGB", (W, H), PAPER)
d = ImageDraw.Draw(im)

# 顶部：域名
d.text((88, 72), "YAKOXFF.PAGES.DEV", font=face(MONO, 22), fill=INK_3)

# 主视觉：宋体 Bold「一点」+ 一枚实心朱砂句点
big = face(SONG, 176, index=SONG_BOLD_INDEX)
d.text((80, 186), "一点", font=big, fill=INK)
box = d.textbbox((80, 186), "一点", font=big)
cx = box[2] + 40
cy = box[1] + (box[3] - box[1]) * 0.66
r = 21
d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=ZHU)

# 主张：宋体行文，与正文 --font-read 一致
d.text((88, 428), "写下来，就是在时间里刻下坐标。", font=face(SONG, 36, index=SONG_INDEX), fill=INK_2)

# 底部：细线 + 分类与署名（同为宋体）
d.line((88, 540, 1112, 540), fill=LINE, width=2)
small = face(SONG, 22, index=SONG_INDEX)
d.text((88, 568), "独立写作 · 技术 / 思考 / 生活", font=small, fill=INK_3)
d.text((1112, 568), "一点", font=small, fill=INK_3, anchor="ra")

im.save(OUT, optimize=True)
print("wrote", OUT, im.size)
