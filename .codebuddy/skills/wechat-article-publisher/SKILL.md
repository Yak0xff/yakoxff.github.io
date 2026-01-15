---
name: wechat-article-publisher
description: Process Markdown or HTML articles for WeChat Official Account publishing. Uploads images to WeChat servers and converts content to WeChat-compatible HTML. Use when user wants to prepare content for WeChat, or mentions "微信公众号文章", "发布到微信", "公众号排版", or wants help with WeChat article formatting. Outputs final HTML with WeChat image URLs that can be copied to WeChat editor.
---

# WeChat Article Publisher

Process Markdown or HTML content for WeChat Official Account publishing. Uploads images to WeChat servers and outputs WeChat-compatible HTML.

## What This Tool Does

✅ **Supported Features:**
- Upload images to WeChat servers, get `mmbiz.qpic.cn` domain URLs
- Convert Markdown to WeChat-compatible HTML
- Replace all image URLs with WeChat domain URLs
- Output final HTML ready for WeChat editor

❌ **Not Supported (due to permission restrictions):**
- Auto-publish to WeChat drafts (requires 认证订阅号 or 服务号)

## Prerequisites

- WECHAT_APP_ID and WECHAT_APP_SECRET environment variables set (from .env file)
- Python 3.9+
- WeChat Official Account (any type, for image upload API)

## Scripts

Located in `~/.codebuddy/skills/wechat-article-publisher/scripts/`:

### wechat_api.py
WeChat content processor for uploading images and converting content:
```bash
# Process markdown file, output HTML to stdout
python wechat_api.py process --markdown /path/to/article.md

# Process HTML file
python wechat_api.py process --html /path/to/article.html

# Output to file
python wechat_api.py process --markdown /path/to/article.md --output result.html

# Output full result as JSON
python wechat_api.py process --markdown /path/to/article.md --json

# Clear access token cache
python wechat_api.py clear-cache
```

### parse_markdown.py
Parse Markdown and extract structured data (optional, for advanced use):
```bash
python parse_markdown.py <markdown_file> [--output json|html]
```

## Workflow

**Strategy: "Process and Output"**

1. Load WECHAT_APP_ID and WECHAT_APP_SECRET from environment
2. Get access_token (with local file caching, valid for 2 hours)
3. Detect file format (Markdown or HTML) and parse accordingly
4. Upload all images to WeChat servers (get `mmbiz.qpic.cn` URLs)
5. Replace image URLs in content with WeChat domain URLs
6. Output the processed HTML

**Supported File Formats:**
- `.md` files → Parsed as Markdown, converted to HTML, images uploaded
- `.html` files → Images uploaded, content preserved

## Step-by-Step Guide

### Step 1: Check Environment Variables

Before any operation, verify the credentials are available:

```bash
# Check if .env file exists and contains required variables
cat .env | grep WECHAT_APP_ID
cat .env | grep WECHAT_APP_SECRET
```

If not set, remind user to:
1. Copy `.env.example` to `.env`
2. Set `WECHAT_APP_ID` and `WECHAT_APP_SECRET` values
3. Get credentials from WeChat Official Account admin panel (设置与开发 → 基本配置)

### Step 2: Process Article

**For Markdown files:**
```bash
python ~/.claude/skills/wechat-article-publisher/scripts/wechat_api.py process \
  --markdown /path/to/article.md \
  --output result.html
```

**For HTML files:**
```bash
python ~/.claude/skills/wechat-article-publisher/scripts/wechat_api.py process \
  --html /path/to/article.html \
  --output result.html
```

**Get JSON result with metadata:**
```bash
python ~/.claude/skills/wechat-article-publisher/scripts/wechat_api.py process \
  --markdown /path/to/article.md \
  --json
```

Output example (JSON mode):
```json
{
  "success": true,
  "title": "文章标题",
  "html": "<p>处理后的HTML内容，图片URL已替换为微信域名...</p>",
  "summary": "文章摘要",
  "images_uploaded": 3,
  "cover_image_url": "https://mmbiz.qpic.cn/..."
}
```

### Step 3: Use the Output

After processing:
1. Copy the HTML content
2. Open WeChat Official Account editor (mp.weixin.qq.com)
3. Create new article
4. Paste the HTML content (or use "导入Word/网页" feature)
5. Review formatting and publish

## API Reference

### Authentication

Official API uses access_token obtained via appid + secret:
```
GET https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=APPID&secret=SECRET
```

The script automatically handles token caching (2-hour validity).

### Upload Content Image

```
POST https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=ACCESS_TOKEN
Content-Type: multipart/form-data
```

Returns WeChat domain URL (`https://mmbiz.qpic.cn/...`) for use in article content.

### Error Codes

| Code | Description |
|------|-------------|
| -1 | 系统繁忙，稍后重试 |
| 40001 | access_token 无效或过期 |
| 40014 | access_token 过期 |
| 45009 | 调用超过频率限制（每日 2000 次）|

## Critical Rules

1. **Process only, no auto-publish** - Output HTML for manual use
2. **Check credentials first** - Fail fast if not configured
3. **Handle token refresh** - Script auto-caches and refreshes tokens
4. **Handle errors gracefully** - Show clear error messages with error codes
5. **All images must be uploaded** - WeChat only accepts its own domain URLs

## Supported Formats

### Markdown Files (.md)
- H1 header (# ) → Article title
- H2/H3 headers (##, ###) → Section headers
- Bold (**text**)
- Italic (*text*)
- Links [text](url)
- Blockquotes (> )
- Code blocks (``` ... ```)
- Lists (- or 1.)
- Images ![alt](url) → Auto-uploaded to WeChat

### HTML Files (.html)
- `<title>` or `<h1>` → Article title
- All HTML formatting preserved (styles, tables, etc.)
- `<img>` tags → Images auto-uploaded to WeChat
- Supports inline styles and rich formatting

**Image Processing:**
- Local images: Read and upload to WeChat
- External URLs: Download first, then upload to WeChat
- All image URLs in final output are WeChat domain (`mmbiz.qpic.cn`)

## Example Flow

### Markdown File
User: "把 ~/articles/ai-tools.md 处理成公众号格式"

```bash
# Step 1: Verify credentials
cat .env | grep WECHAT_APP_ID

# Step 2: Process
python ~/.claude/skills/wechat-article-publisher/scripts/wechat_api.py process \
  --markdown ~/articles/ai-tools.md \
  --output ~/articles/ai-tools-wechat.html

# Step 3: Report
# "已处理完成！上传了 3 张图片。HTML已保存到 ~/articles/ai-tools-wechat.html"
# "请复制内容到微信公众号编辑器中发布。"
```

### HTML File
User: "把这个HTML文章处理成公众号格式：~/articles/newsletter.html"

```bash
# Step 1: Verify credentials
cat .env | grep WECHAT_APP_ID

# Step 2: Process
python ~/.claude/skills/wechat-article-publisher/scripts/wechat_api.py process \
  --html ~/articles/newsletter.html \
  --output ~/articles/newsletter-wechat.html

# Step 3: Report
# "已处理完成！HTML格式已保留，图片已上传到微信服务器。"
# "请复制内容到微信公众号编辑器中发布。"
```

## Error Handling

### Credentials Not Found
```
Error: WECHAT_APP_ID environment variable not set.
```
**Solution**: Ask user to set up `.env` file with AppID and AppSecret from WeChat admin panel.

### Invalid Credentials
```
微信API错误 (40001): invalid credential
```
**Solution**: Check AppID and AppSecret are correct in `.env` file.

### Token Expired
```
微信API错误 (40014): access_token 过期
```
**Solution**: Run `python wechat_api.py clear-cache` to clear cached token, then retry.

### Rate Limit Exceeded
```
微信API错误 (45009): reach max api daily quota limit
```
**Solution**: Wait until next day. Daily limit is 2000 calls.

## Best Practices

### Why process locally instead of direct publish?

1. **Permission**: Draft API requires 认证订阅号 or 服务号, but image upload works for all
2. **Control**: User can review and edit before publishing
3. **Flexibility**: Same HTML can be used for multiple platforms

### Content Guidelines

1. **Images**: Must be uploaded first; external URLs not allowed in WeChat
2. **Title**: Keep under 64 characters
3. **Use the output**: Copy HTML to WeChat editor or use "导入" feature

### Token Management

The script automatically:
- Caches access_token in `~/.wechat_token_cache.json`
- Checks token validity before use
- Refreshes token when expired

To manually clear cache:
```bash
python wechat_api.py clear-cache
```

## Troubleshooting

### Q: How do I get AppID and AppSecret?
A: Login to WeChat Official Account admin panel (mp.weixin.qq.com), go to 设置与开发 → 基本配置.

### Q: Images not uploading?
A: Check if the image file exists and is a valid image format (jpg, png, gif).

### Q: How to use the output HTML?
A: 
1. Open mp.weixin.qq.com
2. Create new article
3. Click "导入" → "导入网页内容" or directly paste HTML in source mode
4. Review and publish

### Q: Token keeps expiring?
A: Token is valid for 2 hours and auto-refreshed. If issues persist, run `clear-cache` command and check credentials.

## Official API Documentation

- Get Access Token: https://developers.weixin.qq.com/doc/offiaccount/Basic_Information/Get_access_token.html
- Upload Image: https://developers.weixin.qq.com/doc/offiaccount/Asset_Management/Add_Permanent_Assets.html
