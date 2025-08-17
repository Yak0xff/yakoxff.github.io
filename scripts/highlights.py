import os
import re
import json
import urllib.parse

CONTENT_DIR = "content"
OUTPUT_FILE = "data/highlights.json"

# 匹配 Hugo 文章中的 ==高亮==
highlight_pattern = re.compile(r"==(.+?)==")

# 匹配 front matter（支持 yaml 格式）
title_pattern = re.compile(r'^title:\s*["\']?(.+?)["\']?\s*$', re.MULTILINE)
slug_pattern = re.compile(r'^slug:\s*["\']?(.+?)["\']?\s*$', re.MULTILINE)

results = []

for root, _, files in os.walk(CONTENT_DIR):
    for f in files:
        if f.endswith(".md"):
            path = os.path.join(root, f)

            with open(path, "r", encoding="utf-8") as file:
                content = file.read()

            # 提取 title
            title_match = title_pattern.search(content)
            title = title_match.group(1) if title_match else os.path.basename(path)

            # 提取 slug（如果有就替换默认 URL）
            slug_match = slug_pattern.search(content)
            if slug_match:
                slug = slug_match.group(1).strip("/")
                # 用目录推断 section，比如 content/post/abc.md => /post/slug/
                rel_dir = os.path.relpath(root, CONTENT_DIR).replace("\\", "/")
                url = f"/{rel_dir}/{slug}/" if rel_dir != "." else f"/{slug}/"
            else:
                # 默认 Hugo URL 规则：相对路径去掉 .md
                url = "/" + os.path.relpath(path, CONTENT_DIR).replace("\\", "/").replace(".md", "/")

            # 提取高亮
            highlights = highlight_pattern.findall(content)
            if highlights:
                highlight_links = []
                for h in highlights:
                    encoded = urllib.parse.quote(h, safe="")
                    link = f"{url}#:~:text={encoded}"
                    highlight_links.append({"text": h, "link": link})

                results.append({
                    "title": title,
                    "url": url,
                    "highlights": highlight_links
                })

# 写入 data 文件夹
os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f"✔ 提取完成，共 {len(results)} 篇文章有高亮，已写入 {OUTPUT_FILE}")
