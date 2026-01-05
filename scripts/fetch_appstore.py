#!/usr/bin/env python3
"""
App Store 产品信息获取脚本

用法：
    # 获取单个应用
    python scripts/fetch_appstore.py 414478124
    
    # 从 data/products.yaml 批量获取
    python scripts/fetch_appstore.py --all
    
    # 指定国家/地区（默认 cn）
    python scripts/fetch_appstore.py 414478124 --country us
"""

import argparse
import json
import os
import re
import sys
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path

# 项目根目录
PROJECT_ROOT = Path(__file__).parent.parent
CONTENT_DIR = PROJECT_ROOT / "content" / "product"
STATIC_DIR = PROJECT_ROOT / "static" / "img" / "product"
DATA_FILE = PROJECT_ROOT / "data" / "products.yaml"


def fetch_screenshots_from_web(app_id: str, country: str = "us") -> list:
    """从 App Store 网页抓取截图 URL（iTunes API 有时不返回截图）"""
    # 先获取应用名称用于构建 URL
    url = f"https://apps.apple.com/{country}/app/id{app_id}"
    
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        })
        with urllib.request.urlopen(req, timeout=30) as response:
            html = response.read().decode("utf-8")
    except Exception as e:
        print(f"  警告：无法从网页获取截图 - {e}")
        return []
    
    # 查找 serialized-server-data 中的截图数据
    match = re.search(r'<script type="application/json" id="serialized-server-data">([^<]+)</script>', html)
    if not match:
        return []
    
    try:
        data = json.loads(match.group(1))
        screenshots = []
        
        # 遍历查找截图 URL 模板
        def find_screenshot_templates(obj):
            if isinstance(obj, dict):
                # 检查是否是截图对象
                if "screenshot" in obj and isinstance(obj["screenshot"], dict):
                    template = obj["screenshot"].get("template", "")
                    if template and "mzstatic.com" in template:
                        # 将模板转换为实际 URL（使用 1024 宽度）
                        actual_url = template.replace("{w}x{h}{c}.{f}", "1024x0w.jpg")
                        screenshots.append(actual_url)
                for v in obj.values():
                    find_screenshot_templates(v)
            elif isinstance(obj, list):
                for item in obj:
                    find_screenshot_templates(item)
        
        find_screenshot_templates(data)
        return screenshots[:5]  # 最多 5 张
        
    except json.JSONDecodeError:
        return []


def fetch_app_info(app_id: str, country: str = "cn") -> dict:
    """从 iTunes API 获取应用信息"""
    url = f"https://itunes.apple.com/lookup?id={app_id}&country={country}"
    
    try:
        with urllib.request.urlopen(url, timeout=30) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.URLError as e:
        print(f"错误：无法连接到 iTunes API - {e}")
        sys.exit(1)
    
    if data.get("resultCount", 0) == 0:
        print(f"错误：未找到 App ID 为 {app_id} 的应用")
        return None
    
    result = data["results"][0]
    
    # 如果 API 没有返回截图，尝试从网页获取
    if not result.get("screenshotUrls") and not result.get("ipadScreenshotUrls"):
        print(f"  iTunes API 未返回截图，尝试从网页获取...")
        web_screenshots = fetch_screenshots_from_web(app_id, country)
        if web_screenshots:
            result["screenshotUrls"] = web_screenshots
            print(f"  从网页获取到 {len(web_screenshots)} 张截图")
    
    return result


def download_image(url: str, save_path: Path) -> bool:
    """下载图片"""
    try:
        with urllib.request.urlopen(url, timeout=30) as response:
            save_path.parent.mkdir(parents=True, exist_ok=True)
            with open(save_path, "wb") as f:
                f.write(response.read())
        return True
    except Exception as e:
        print(f"  警告：下载图片失败 - {e}")
        return False


def slugify(text: str) -> str:
    """生成 URL 友好的 slug"""
    # 移除特殊字符，保留中文、英文、数字
    text = re.sub(r'[^\w\s\u4e00-\u9fff-]', '', text)
    # 空格替换为连字符
    text = re.sub(r'\s+', '-', text.strip())
    return text.lower()


def get_platform(devices: list) -> list:
    """解析支持的平台"""
    platforms = set()
    for device in devices:
        device_lower = device.lower()
        if "iphone" in device_lower:
            platforms.add("iOS")
        elif "ipad" in device_lower:
            platforms.add("iPadOS")
        elif "mac" in device_lower:
            platforms.add("macOS")
        elif "watch" in device_lower:
            platforms.add("watchOS")
        elif "tv" in device_lower:
            platforms.add("tvOS")
    
    # 排序保持一致性
    order = ["iOS", "iPadOS", "macOS", "watchOS", "tvOS"]
    return [p for p in order if p in platforms]


def generate_product_md(app_info: dict, status: str = "released", custom_slug: str = None) -> str:
    """生成产品 Markdown 文件"""
    app_id = str(app_info["trackId"])
    name = app_info.get("trackName", "未知应用")
    slug = custom_slug or slugify(name)
    
    # 创建图片目录
    img_dir = STATIC_DIR / slug
    img_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"\n处理应用：{name} (ID: {app_id})")
    
    # 下载图标
    icon_url = app_info.get("artworkUrl512", app_info.get("artworkUrl100", ""))
    icon_path = f"/img/product/{slug}/icon.png"
    if icon_url:
        print(f"  下载图标...")
        download_image(icon_url, img_dir / "icon.png")
    
    # 下载截图（最多5张，优先 iPhone 截图，其次 iPad）
    screenshots = app_info.get("screenshotUrls", [])
    if not screenshots:
        screenshots = app_info.get("ipadScreenshotUrls", [])
    screenshots = screenshots[:5]
    screenshot_paths = []
    for i, url in enumerate(screenshots):
        print(f"  下载截图 {i + 1}/{len(screenshots)}...")
        filename = f"screenshot-{i + 1}.jpg"
        if download_image(url, img_dir / filename):
            screenshot_paths.append(f"/img/product/{slug}/{filename}")
    
    # 解析平台
    platforms = get_platform(app_info.get("supportedDevices", []))
    if not platforms:
        platforms = ["iOS"]  # 默认
    
    # 价格
    price = app_info.get("formattedPrice", "免费")
    if price == "Free" or app_info.get("price", 0) == 0:
        price = "免费"
    
    # 描述（取第一段或前100字）
    description = app_info.get("description", "")
    tagline = description.split("\n")[0][:100] if description else name
    if len(tagline) > 80:
        tagline = tagline[:77] + "..."
    
    # App Store 链接
    store_url = app_info.get("trackViewUrl", f"https://apps.apple.com/app/id{app_id}")
    
    # 生成 front matter
    md_content = f"""---
title: "{name}"
tagline: "{tagline}"
cover: "{icon_path}"
icon: "{icon_path}"
status: {status}
platform:
{chr(10).join(f'  - {p}' for p in platforms)}
version: "{app_info.get('version', '1.0.0')}"
price: "{price}"
download: "{store_url}"
appstore_id: "{app_id}"
date: {datetime.now().strftime('%Y-%m-%d')}
draft: false
---

## 关于 {name}

{description[:500] if description else '暂无描述'}

---

> 数据来源：App Store | 最后更新：{datetime.now().strftime('%Y-%m-%d')}
"""

    # 添加截图到 front matter
    if screenshot_paths:
        # 在 draft: false 之前插入 screenshots
        screenshots_yaml = "screenshots:\n" + "\n".join(f'  - "{p}"' for p in screenshot_paths)
        md_content = md_content.replace("draft: false", f"{screenshots_yaml}\ndraft: false")
    
    # 保存文件
    md_path = CONTENT_DIR / f"{slug}.md"
    CONTENT_DIR.mkdir(parents=True, exist_ok=True)
    
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_content)
    
    print(f"  已生成：{md_path}")
    return slug


def load_products_yaml() -> tuple:
    """加载 products.yaml 配置，返回 (apps, default_country)"""
    if not DATA_FILE.exists():
        print(f"错误：配置文件不存在 - {DATA_FILE}")
        return [], "cn"
    
    try:
        import yaml
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return data.get("apps", []) or [], data.get("default_country", "cn")
    except ImportError:
        # 简单解析 YAML（不依赖 pyyaml）
        apps = []
        default_country = "cn"
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            content = f.read()
        
        # 解析 default_country
        country_match = re.search(r'default_country:\s*(\w+)', content)
        if country_match:
            default_country = country_match.group(1)
        
        # 简单正则匹配 apps
        pattern = r'-\s*id:\s*["\']?(\d+)["\']?(?:.*?status:\s*(\w+))?(?:.*?slug:\s*(\w+))?(?:.*?country:\s*(\w+))?'
        for match in re.finditer(pattern, content, re.DOTALL):
            apps.append({
                "id": match.group(1),
                "status": match.group(2) or "released",
                "slug": match.group(3),
                "country": match.group(4)
            })
        return apps, default_country


def main():
    parser = argparse.ArgumentParser(description="从 App Store 获取应用信息并生成产品页面")
    parser.add_argument("app_id", nargs="?", help="App Store 应用 ID")
    parser.add_argument("--all", action="store_true", help="从 data/products.yaml 批量获取")
    parser.add_argument("--country", default="cn", help="国家/地区代码（默认：cn）")
    parser.add_argument("--status", default="released", help="应用状态（默认：released）")
    
    args = parser.parse_args()
    
    if args.all:
        # 批量模式
        apps, default_country = load_products_yaml()
        if not apps:
            print("products.yaml 中没有配置任何应用")
            return
        
        print(f"找到 {len(apps)} 个应用配置（默认地区：{default_country}）")
        for app in apps:
            # 优先使用单个应用配置的 country，否则使用默认值
            country = app.get("country") or default_country
            print(f"  → 获取 App ID {app['id']}（地区：{country}）")
            app_info = fetch_app_info(app["id"], country)
            if app_info:
                generate_product_md(
                    app_info,
                    status=app.get("status", "released"),
                    custom_slug=app.get("slug")
                )
    
    elif args.app_id:
        # 单个应用
        app_info = fetch_app_info(args.app_id, args.country)
        if app_info:
            generate_product_md(app_info, status=args.status)
    
    else:
        parser.print_help()
        print("\n示例：")
        print("  python scripts/fetch_appstore.py 414478124")
        print("  python scripts/fetch_appstore.py --all")


if __name__ == "__main__":
    main()
