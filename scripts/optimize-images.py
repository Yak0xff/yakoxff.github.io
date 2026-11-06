#!/usr/bin/env python3
"""图片无损优化 + 尺寸元数据生成
=====================================================================
1. static/ 下的 PNG 用 oxipng（zlib 重压缩，像素完全不变）、
   JPG 用 jpegtran -optimize（无损重排 Huffman 表，像素完全不变）。
   逐张解码比对像素哈希，有任何差异就还原原文件，不做「看起来差不多」的有损处理。
2. 顺手把每张图的宽高写进 data/imgmeta.json，供 markdown 图片钩子
   输出 width/height —— 图片有固定占位尺寸，加载时不会推开正文（CLS）。

用法：python3 scripts/optimize-images.py [--dry-run]
依赖：oxipng / jpegtran（brew install oxipng jpeg-turbo）、Pillow
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC = os.path.join(ROOT, "static")
META_OUT = os.path.join(ROOT, "data", "imgmeta.json")
EXT_PNG = {".png"}
EXT_JPG = {".jpg", ".jpeg"}
DRY = "--dry-run" in sys.argv


def pixel_hash(path):
    """统一转到 RGBA 再比：调色板重排 / tRNS 优化不影响判等"""
    with Image.open(path) as im:
        im.load()
        return im.size, im.convert("RGBA").tobytes()


def optimize_png(path):
    before = os.path.getsize(path)
    if DRY:
        r = subprocess.run(["oxipng", "-o4", "--strip", "safe", "--pretend", path],
                           capture_output=True, text=True)
        return before, before
    subprocess.run(["oxipng", "-o4", "--strip", "safe", "--quiet", path],
                   check=True, capture_output=True)
    return before, os.path.getsize(path)


def optimize_jpg(path):
    before = os.path.getsize(path)
    if DRY:
        return before, before
    tmp = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False).name
    try:
        subprocess.run(["jpegtran", "-optimize", "-copy", "none", "-outfile", tmp, path],
                       check=True, capture_output=True)
        if os.path.getsize(tmp) < before:
            shutil.move(tmp, path)
        else:
            os.unlink(tmp)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)
    return before, os.path.getsize(path)


def main():
    meta, saved, touched, skipped = {}, 0, 0, 0
    for dirpath, _dirnames, filenames in os.walk(STATIC):
        for name in sorted(filenames):
            ext = os.path.splitext(name)[1].lower()
            if ext not in EXT_PNG | EXT_JPG:
                continue
            path = os.path.join(dirpath, name)
            url = "/" + os.path.relpath(path, STATIC).replace(os.sep, "/")

            try:
                with Image.open(path) as im:
                    meta[url] = {"w": im.width, "h": im.height}
                    real = im.format
                ref = pixel_hash(path)
            except Exception as exc:  # 损坏或格式不认识
                print(f"  跳过 {url}（{exc}）")
                skipped += 1
                continue

            # 按真实格式选工具：static 里有几张 .png 其实是 JPEG，
            # 按扩展名走 oxipng 会直接报错
            is_png = real == "PNG"
            if (ext in EXT_PNG) != is_png:
                print(f"  跳过 {url}（扩展名与真实格式不符：{real}）")
                skipped += 1
                continue

            try:
                before, after = optimize_png(path) if is_png else optimize_jpg(path)
            except subprocess.CalledProcessError as exc:
                print(f"  跳过 {url}（{exc.cmd[0]} 无法处理）")
                skipped += 1
                continue

            if not DRY and pixel_hash(path) != ref:  # 保险：像素必须一致
                print(f"  ✗ {url} 像素有变化，已跳过")
                skipped += 1
                continue

            if after < before:
                touched += 1
                saved += before - after
                print(f"  {url}  {before/1024:.0f}KB → {after/1024:.0f}KB")

    os.makedirs(os.path.dirname(META_OUT), exist_ok=True)
    with open(META_OUT, "w", encoding="utf-8") as fh:
        json.dump(meta, fh, ensure_ascii=False, separators=(",", ":"), sort_keys=True)

    print(f"\n优化 {touched} 张，省下 {saved/1048576:.2f}MB，跳过 {skipped} 张")
    print(f"尺寸元数据：{os.path.relpath(META_OUT, ROOT)}（{len(meta)} 条）")


if __name__ == "__main__":
    main()
