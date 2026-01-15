#!/usr/bin/env python3
"""
WeChat Article Content Processor.

This script provides functions to:
- Upload images to WeChat servers (get mmbiz.qpic.cn URLs)
- Convert Markdown to WeChat-compatible HTML
- Replace image URLs in content with WeChat domain URLs

Note: Due to permission restrictions, this script does NOT publish to drafts.
      It only processes content and outputs the final HTML.

Authentication:
    Uses WECHAT_APP_ID and WECHAT_APP_SECRET environment variables.
    You can set them in a .env file in the project root.

Usage:
    # Process markdown file, output HTML with WeChat image URLs
    python wechat_api.py process --markdown /path/to/article.md

    # Process HTML file
    python wechat_api.py process --html /path/to/article.html

    # Output to file instead of stdout
    python wechat_api.py process --markdown /path/to/article.md --output result.html

    # Clear access token cache
    python wechat_api.py clear-cache

API Documentation:
    Base URL: https://api.weixin.qq.com/cgi-bin
    Authentication: access_token URL parameter
"""

import argparse
import json
import mimetypes
import os
import re
import sys
import time
from pathlib import Path
from typing import Optional
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

# API configuration
API_BASE_URL = "https://api.weixin.qq.com/cgi-bin"
TOKEN_CACHE_FILE = Path.home() / ".wechat_token_cache.json"


# =============================================================================
# Exception Classes
# =============================================================================

class WeChatAPIError(Exception):
    """WeChat API error with error code and message."""
    
    def __init__(self, errcode: int, errmsg: str):
        self.errcode = errcode
        self.errmsg = errmsg
        super().__init__(f"微信API错误 ({errcode}): {errmsg}")


# =============================================================================
# Environment and Configuration
# =============================================================================

def load_env_file(env_path: Optional[str] = None) -> None:
    """
    Load environment variables from .env file.

    Args:
        env_path: Optional path to .env file. If not provided, searches in
                  current directory and parent directories.
    """
    if env_path:
        env_file = Path(env_path)
    else:
        # Search for .env file in current and parent directories
        current = Path.cwd()
        env_file = None
        for _ in range(5):  # Search up to 5 levels
            candidate = current / ".env"
            if candidate.exists():
                env_file = candidate
                break
            current = current.parent

    if env_file and env_file.exists():
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    if key and value:
                        os.environ.setdefault(key, value)


def get_credentials() -> tuple[str, str]:
    """
    Get WeChat AppID and AppSecret from environment variables.

    Returns:
        Tuple of (appid, secret)

    Raises:
        SystemExit: If credentials are not found.
    """
    # Try to load from .env file first
    load_env_file()

    appid = os.environ.get("WECHAT_APP_ID")
    secret = os.environ.get("WECHAT_APP_SECRET")
    
    if not appid or not secret:
        print("Error: WECHAT_APP_ID and WECHAT_APP_SECRET environment variables required.", file=sys.stderr)
        print("Please set them in your .env file or environment.", file=sys.stderr)
        sys.exit(1)
    
    return appid, secret


# =============================================================================
# Access Token Management
# =============================================================================

def get_access_token(appid: str, secret: str, force_refresh: bool = False) -> str:
    """
    Get access_token with local caching.
    
    Token is valid for 2 hours, refreshed 5 minutes before expiry.

    Args:
        appid: WeChat AppID
        secret: WeChat AppSecret
        force_refresh: Force refresh token even if cached

    Returns:
        access_token string

    Raises:
        WeChatAPIError: If token request fails
    """
    # 1. Try to read from cache
    if not force_refresh and TOKEN_CACHE_FILE.exists():
        try:
            with open(TOKEN_CACHE_FILE, "r", encoding="utf-8") as f:
                cache = json.load(f)
                if cache.get("appid") == appid:
                    if cache.get("expires_at", 0) > time.time() + 300:  # 5 min buffer
                        return cache["access_token"]
        except (json.JSONDecodeError, KeyError):
            pass  # Cache invalid, will refresh

    # 2. Request new token
    url = (
        f"{API_BASE_URL}/token"
        f"?grant_type=client_credential&appid={appid}&secret={secret}"
    )
    
    try:
        with urlopen(url, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (HTTPError, URLError) as e:
        raise WeChatAPIError(-1, f"网络请求失败: {e}")

    if "access_token" not in data:
        errcode = data.get("errcode", -1)
        errmsg = data.get("errmsg", "未知错误")
        raise WeChatAPIError(errcode, errmsg)

    # 3. Cache token
    cache = {
        "appid": appid,
        "access_token": data["access_token"],
        "expires_at": time.time() + data.get("expires_in", 7200)
    }
    try:
        with open(TOKEN_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache, f)
    except OSError:
        pass  # Cache write failure is non-fatal

    return data["access_token"]


def clear_token_cache() -> None:
    """Clear the token cache file."""
    if TOKEN_CACHE_FILE.exists():
        try:
            TOKEN_CACHE_FILE.unlink()
        except OSError:
            pass


# =============================================================================
# Image Upload Functions
# =============================================================================

def upload_content_image(access_token: str, image_path: str) -> str:
    """
    Upload an image for article content, returns WeChat URL.
    
    This URL can be used directly in article HTML content.

    Args:
        access_token: Valid access token
        image_path: Local path to image file

    Returns:
        WeChat image URL (https://mmbiz.qpic.cn/...)

    Raises:
        WeChatAPIError: On upload failure
        FileNotFoundError: If image file not found
    """
    path = Path(image_path)
    if not path.exists():
        raise FileNotFoundError(f"图片文件不存在: {image_path}")

    url = f"{API_BASE_URL}/media/uploadimg?access_token={access_token}"

    # Read image data
    with open(path, "rb") as f:
        image_data = f.read()

    # Get filename and MIME type
    filename = path.name
    content_type = mimetypes.guess_type(str(path))[0] or "image/jpeg"

    # Build multipart/form-data body
    boundary = "----WeChatAPIBoundary" + str(int(time.time() * 1000))
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="media"; filename="{filename}"\r\n'
        f"Content-Type: {content_type}\r\n\r\n"
    ).encode("utf-8") + image_data + f"\r\n--{boundary}--\r\n".encode("utf-8")

    headers = {
        "Content-Type": f"multipart/form-data; boundary={boundary}",
    }

    try:
        request = Request(url, data=body, headers=headers, method="POST")
        with urlopen(request, timeout=120) as response:
            result = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError) as e:
        raise WeChatAPIError(-1, f"上传图片失败: {e}")

    if "url" not in result:
        errcode = result.get("errcode", -1)
        errmsg = result.get("errmsg", "上传失败")
        raise WeChatAPIError(errcode, errmsg)

    return result["url"]


def download_image(url: str, temp_dir: Path) -> str:
    """
    Download an external image to a temporary file.

    Args:
        url: External image URL
        temp_dir: Directory to save the downloaded image

    Returns:
        Path to the downloaded file

    Raises:
        WeChatAPIError: On download failure
    """
    try:
        request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urlopen(request, timeout=60) as response:
            # Determine filename from URL or content-type
            content_type = response.headers.get("Content-Type", "image/jpeg")
            ext = mimetypes.guess_extension(content_type.split(";")[0]) or ".jpg"
            filename = f"downloaded_{int(time.time() * 1000)}{ext}"
            filepath = temp_dir / filename
            
            with open(filepath, "wb") as f:
                f.write(response.read())
            
            return str(filepath)
    except (HTTPError, URLError) as e:
        raise WeChatAPIError(-1, f"下载图片失败 ({url}): {e}")


def replace_images_in_html(html: str, image_mappings: dict[str, str]) -> str:
    """
    Replace local/external image URLs in HTML with WeChat URLs.

    Args:
        html: Original HTML content
        image_mappings: Dict mapping original paths to WeChat URLs

    Returns:
        HTML with replaced image URLs
    """
    def replace_src(match):
        src = match.group(1)
        new_src = image_mappings.get(src, src)
        return f'src="{new_src}"'
    
    return re.sub(r'src="([^"]+)"', replace_src, html)


# =============================================================================
# Content Processing Functions
# =============================================================================

def process_markdown(
    markdown_path: str,
    access_token: Optional[str] = None,
) -> dict:
    """
    Parse markdown file, upload images, and return processed HTML.
    
    Complete workflow:
    1. Parse markdown file to HTML
    2. Upload all images to WeChat servers
    3. Replace image URLs with WeChat domain URLs
    4. Return the processed HTML

    Args:
        markdown_path: Path to markdown file
        access_token: Optional pre-fetched access token

    Returns:
        Dictionary containing:
            - title: Article title
            - html: Processed HTML with WeChat image URLs
            - summary: Auto-extracted summary
            - images_uploaded: Number of images uploaded
    """
    # Import parse_markdown module
    script_dir = Path(__file__).parent
    sys.path.insert(0, str(script_dir))
    from parse_markdown import parse_markdown_file

    # 1. Get access token if not provided
    if not access_token:
        appid, secret = get_credentials()
        access_token = get_access_token(appid, secret)

    # 2. Parse markdown
    parsed = parse_markdown_file(markdown_path)
    
    print(f"解析文章: {parsed['title']}", file=sys.stderr)

    # 3. Collect all images and build mapping from original_src to absolute path
    all_images = parsed.get("all_images", [])
    src_to_path = {}  # original_src -> absolute path
    
    for img_info in all_images:
        original_src = img_info["original_src"]
        img_path = img_info["path"]
        if Path(img_path).exists():
            src_to_path[original_src] = img_path
        else:
            print(f"警告: 图片不存在: {img_path}", file=sys.stderr)

    # 4. Upload images and build mapping from original_src to wechat URL
    image_mappings = {}  # original_src -> wechat URL
    uploaded_count = 0
    
    for original_src, img_path in src_to_path.items():
        print(f"上传图片: {img_path}", file=sys.stderr)
        try:
            wechat_url = upload_content_image(access_token, img_path)
            image_mappings[original_src] = wechat_url
            uploaded_count += 1
        except WeChatAPIError as e:
            print(f"警告: 上传失败 ({img_path}): {e}", file=sys.stderr)

    # 5. Replace image URLs in HTML (using original_src as key)
    html = parsed["html"]
    for original_src, wechat_url in image_mappings.items():
        # Replace src="original_src" with src="wechat_url"
        html = html.replace(f'src="{original_src}"', f'src="{wechat_url}"')

    return {
        "success": True,
        "title": parsed["title"],
        "html": html,
        "summary": parsed.get("description", ""),
        "images_uploaded": uploaded_count,
        "cover_image_url": image_mappings.get(all_images[0]["original_src"], "") if all_images else "",
    }


def process_html(
    html_path: str,
    access_token: Optional[str] = None,
) -> dict:
    """
    Parse HTML file, upload images, and return processed HTML.

    Args:
        html_path: Path to HTML file
        access_token: Optional pre-fetched access token

    Returns:
        Dictionary containing:
            - title: Article title
            - html: Processed HTML with WeChat image URLs
            - images_uploaded: Number of images uploaded
    """
    path = Path(html_path)
    if not path.exists():
        raise FileNotFoundError(f"文件不存在: {html_path}")

    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Extract title
    title = "Untitled"
    title_match = re.search(r"<title[^>]*>([^<]+)</title>", content, re.IGNORECASE)
    if title_match:
        title = title_match.group(1).strip()[:64]
    else:
        h1_match = re.search(r"<h1[^>]*>([^<]+)</h1>", content, re.IGNORECASE)
        if h1_match:
            title = h1_match.group(1).strip()[:64]

    # Extract body content
    body_match = re.search(r"<body[^>]*>(.*?)</body>", content, re.IGNORECASE | re.DOTALL)
    if body_match:
        html_content = body_match.group(1).strip()
    else:
        html_content = re.sub(r"<html[^>]*>|</html>", "", content, flags=re.IGNORECASE)
        html_content = re.sub(r"<head[^>]*>.*?</head>", "", html_content, flags=re.IGNORECASE | re.DOTALL)
        html_content = re.sub(r"<!DOCTYPE[^>]*>", "", html_content, flags=re.IGNORECASE)
        html_content = html_content.strip()

    # Get access token if not provided
    if not access_token:
        appid, secret = get_credentials()
        access_token = get_access_token(appid, secret)

    # Find all images and upload
    image_mappings = {}
    uploaded_count = 0
    temp_dir = Path("/tmp/wechat_images")
    temp_dir.mkdir(exist_ok=True)

    for match in re.finditer(r'<img[^>]+src=["\']([^"\']+)["\']', html_content, re.IGNORECASE):
        src = match.group(1)
        
        # Skip already processed URLs and data URIs
        if src.startswith("https://mmbiz.qpic.cn") or src.startswith("data:"):
            continue
        
        if src in image_mappings:
            continue
        
        try:
            if src.startswith(("http://", "https://")):
                # External URL - download first
                print(f"下载图片: {src}", file=sys.stderr)
                local_path = download_image(src, temp_dir)
                print(f"上传图片: {local_path}", file=sys.stderr)
                wechat_url = upload_content_image(access_token, local_path)
                image_mappings[src] = wechat_url
                uploaded_count += 1
                # Clean up temp file
                Path(local_path).unlink(missing_ok=True)
            else:
                # Local path
                img_path = path.parent / src
                if img_path.exists():
                    print(f"上传图片: {img_path}", file=sys.stderr)
                    wechat_url = upload_content_image(access_token, str(img_path.absolute()))
                    image_mappings[src] = wechat_url
                    uploaded_count += 1
                else:
                    print(f"警告: 图片不存在: {img_path}", file=sys.stderr)
        except WeChatAPIError as e:
            print(f"警告: 图片处理失败 ({src}): {e}", file=sys.stderr)

    # Replace image URLs
    if image_mappings:
        html_content = replace_images_in_html(html_content, image_mappings)

    return {
        "success": True,
        "title": title,
        "html": html_content,
        "images_uploaded": uploaded_count,
    }


# =============================================================================
# CLI Main Entry
# =============================================================================

def main():
    """Main entry point for CLI."""
    parser = argparse.ArgumentParser(
        description="WeChat Article Content Processor - Upload images and convert content to WeChat-compatible HTML"
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Process command
    process_parser = subparsers.add_parser(
        "process",
        help="Process article content: upload images and output WeChat-compatible HTML"
    )
    process_parser.add_argument(
        "--markdown",
        help="Path to markdown file"
    )
    process_parser.add_argument(
        "--html",
        help="Path to HTML file"
    )
    process_parser.add_argument(
        "--output", "-o",
        help="Output file path (default: stdout)"
    )
    process_parser.add_argument(
        "--json",
        action="store_true",
        help="Output full result as JSON instead of just HTML"
    )

    # Clear cache command
    subparsers.add_parser(
        "clear-cache",
        help="Clear access token cache"
    )

    args = parser.parse_args()

    try:
        if args.command == "process":
            if args.markdown:
                result = process_markdown(args.markdown)
            elif args.html:
                result = process_html(args.html)
            else:
                print("Error: Either --markdown or --html is required", file=sys.stderr)
                sys.exit(1)
            
            # Output result
            if args.json:
                output = json.dumps(result, ensure_ascii=False, indent=2)
            else:
                output = result["html"]
            
            if args.output:
                with open(args.output, "w", encoding="utf-8") as f:
                    f.write(output)
                print(f"已保存到: {args.output}", file=sys.stderr)
                print(f"标题: {result['title']}", file=sys.stderr)
                print(f"已上传图片: {result['images_uploaded']} 张", file=sys.stderr)
            else:
                print(output)

        elif args.command == "clear-cache":
            clear_token_cache()
            print("Token cache cleared.")

    except WeChatAPIError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
