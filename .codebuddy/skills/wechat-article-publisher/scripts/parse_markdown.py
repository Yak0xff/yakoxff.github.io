#!/usr/bin/env python3
"""
Parse Markdown for WeChat Official Account article publishing.

Extracts:
- Title (from frontmatter or first H1/H2)
- Cover image (first image)
- Content images with their original paths
- HTML content with images preserved

Usage:
    python parse_markdown.py <markdown_file> [--output json|html]
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path


def strip_yaml_frontmatter(content: str) -> tuple[dict, str]:
    """Strip YAML front matter from markdown content.
    
    Returns:
        (frontmatter_dict, content_without_frontmatter)
    """
    frontmatter = {}
    
    # Check if content starts with ---
    if content.strip().startswith('---'):
        lines = content.split('\n')
        in_frontmatter = False
        frontmatter_lines = []
        content_start_idx = 0
        
        for idx, line in enumerate(lines):
            stripped = line.strip()
            if stripped == '---':
                if not in_frontmatter:
                    in_frontmatter = True
                    continue
                else:
                    # End of frontmatter
                    content_start_idx = idx + 1
                    break
            if in_frontmatter:
                frontmatter_lines.append(line)
        
        # Parse simple YAML (key: value)
        for line in frontmatter_lines:
            if ':' in line and not line.strip().startswith('-'):
                key, _, value = line.partition(':')
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and value:
                    frontmatter[key] = value
        
        # Return content after frontmatter
        content = '\n'.join(lines[content_start_idx:])
    
    return frontmatter, content


def extract_images(markdown: str, base_path: Path) -> list[dict]:
    """Extract all images from markdown with their paths.
    
    Returns:
        List of image info dicts with 'original_src' and 'path' (resolved absolute path)
    """
    images = []
    img_pattern = re.compile(r'!\[([^\]]*)\]\(([^)]+)\)')
    
    for match in img_pattern.finditer(markdown):
        alt_text = match.group(1)
        img_src = match.group(2)
        
        # Resolve path
        if os.path.isabs(img_src):
            full_path = img_src
        else:
            full_path = str(base_path / img_src)
        
        images.append({
            "original_src": img_src,
            "path": full_path,
            "alt": alt_text
        })
    
    return images


def markdown_to_html(markdown: str) -> str:
    """Convert markdown to HTML for WeChat article publishing.
    
    Images are preserved and converted to <img> tags.
    """
    html = markdown
    
    # Process code blocks first
    def convert_code_block(match):
        lang = match.group(1) or ''
        code_content = match.group(2)
        lines = code_content.strip().split('\n')
        formatted = '<br>'.join(line.replace(' ', '&nbsp;') for line in lines)
        return f'<pre style="background:#f5f5f5;padding:15px;border-radius:5px;overflow-x:auto;font-family:monospace;font-size:14px;line-height:1.5;">{formatted}</pre>'
    
    html = re.sub(r'```(\w*)\n(.*?)```', convert_code_block, html, flags=re.DOTALL)
    
    # Images - convert to img tags with styling
    def convert_image(match):
        alt_text = match.group(1)
        src = match.group(2)
        return f'<img src="{src}" alt="{alt_text}" style="max-width:100%;display:block;margin:20px auto;">'
    
    html = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', convert_image, html)
    
    # Headers
    html = re.sub(r'^## (.+)$', r'<h2 style="font-size:20px;font-weight:bold;margin:25px 0 15px;border-bottom:1px solid #eee;padding-bottom:10px;">\1</h2>', html, flags=re.MULTILINE)
    html = re.sub(r'^### (.+)$', r'<h3 style="font-size:18px;font-weight:bold;margin:20px 0 10px;">\1</h3>', html, flags=re.MULTILINE)
    
    # Horizontal rule
    html = re.sub(r'^---+$', r'<hr style="border:none;border-top:1px solid #ddd;margin:30px 0;">', html, flags=re.MULTILINE)
    
    # Bold
    html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html)
    
    # Italic
    html = re.sub(r'\*([^*]+)\*', r'<em>\1</em>', html)
    
    # Links
    html = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2" style="color:#576b95;">\1</a>', html)
    
    # Blockquotes
    html = re.sub(r'^> (.+)$', r'<blockquote style="border-left:4px solid #ddd;padding-left:15px;color:#666;margin:15px 0;">\1</blockquote>', html, flags=re.MULTILINE)
    
    # Unordered lists
    html = re.sub(r'^- (.+)$', r'<li style="margin:5px 0;">\1</li>', html, flags=re.MULTILINE)
    
    # Ordered lists
    html = re.sub(r'^\d+\. (.+)$', r'<li style="margin:5px 0;">\1</li>', html, flags=re.MULTILINE)
    
    # Wrap consecutive <li> in <ul>
    html = re.sub(r'((?:<li[^>]*>.*?</li>\n?)+)', r'<ul style="padding-left:20px;margin:15px 0;">\1</ul>', html)
    
    # Paragraphs - split by double newlines
    parts = html.split('\n\n')
    processed_parts = []
    
    for part in parts:
        part = part.strip()
        if not part:
            continue
        # Skip if already a block element
        if part.startswith(('<h2', '<h3', '<blockquote', '<ul', '<ol', '<pre', '<hr', '<img')):
            processed_parts.append(part)
        else:
            # Wrap in paragraph, convert single newlines to <br>
            part = part.replace('\n', '<br>')
            processed_parts.append(f'<p style="margin:15px 0;line-height:1.8;text-align:justify;">{part}</p>')
    
    return ''.join(processed_parts)


def parse_markdown_file(filepath: str) -> dict:
    """Parse a markdown file and return structured data."""
    path = Path(filepath)
    base_path = path.parent

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Strip YAML front matter first
    frontmatter, content = strip_yaml_frontmatter(content)
    
    # Use title from frontmatter if available
    title = frontmatter.get('title', 'Untitled')
    description = frontmatter.get('description', '')
    
    # Extract all images
    images = extract_images(content, base_path)
    
    # Convert to HTML (with images preserved)
    html = markdown_to_html(content)
    
    # Cover image is the first image
    cover_image = images[0]["path"] if images else None
    
    return {
        "title": title,
        "description": description,
        "cover_image": cover_image,
        "all_images": images,  # All images with original_src and resolved path
        "html": html,
        "source_file": str(path.absolute())
    }


def main():
    parser = argparse.ArgumentParser(description='Parse Markdown for WeChat article publishing')
    parser.add_argument('file', help='Markdown file to parse')
    parser.add_argument('--output', choices=['json', 'html'], default='json',
                       help='Output format (default: json)')
    parser.add_argument('--html-only', action='store_true',
                       help='Output only HTML content')

    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(f"Error: File not found: {args.file}", file=sys.stderr)
        sys.exit(1)

    result = parse_markdown_file(args.file)

    if args.html_only:
        print(result['html'])
    elif args.output == 'json':
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(result['html'])


if __name__ == '__main__':
    main()
