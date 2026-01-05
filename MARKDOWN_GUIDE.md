# 不成熟养成计划 - Markdown 语法指南

本指南基于现有博客文章分析，总结了该Hugo博客支持的所有Markdown语法和特殊功能。

## 📝 Front Matter（文章头部信息）

每篇文章都必须以YAML格式的Front Matter开头：

### 基础配置
```yaml
---
title: 文章标题
date: 2025-01-09T11:00:00+08:00  # 或简化格式：2025-01-09
description: 文章描述，用于SEO和摘要
draft: false  # true表示草稿，不会发布
toc: true     # 是否显示目录
---
```

### 分类和标签
```yaml
---
categories: 
  - 分类名称
  # 或单个分类
categories: 分类名称

tags:
  - 标签1
  - 标签2
  - 标签3
---
```

### 高级配置
```yaml
---
slug: custom-url-slug        # 自定义URL路径
aliases:                     # 重定向别名
  - /posts/old-url/
  - /posts/another-old-url/
comments:                    # 静态评论（从其他平台迁移）
  - name: 评论者名字
    content: 评论内容<br/>支持HTML
    date: 2025-01-09
    source: 来源平台
---
```

## 🎨 基础Markdown语法

### 标题
```markdown
# 一级标题
## 二级标题
### 三级标题
#### 四级标题
##### 五级标题
###### 六级标题
```

### 文本格式
```markdown
**粗体文本**
*斜体文本*
~~删除线文本~~
`行内代码`
```

### 链接和引用
```markdown
[链接文本](https://example.com)
[内部链接](/posts/文章路径/)

> 引用文本
> 可以多行
```

### 列表
```markdown
- 无序列表项1
- 无序列表项2
  - 嵌套列表项

1. 有序列表项1
2. 有序列表项2
   1. 嵌套有序列表
```

## 🖼️ 图片和媒体

### 基础图片语法
```markdown
![图片描述](https://image.example.com/image.jpg)
![本地图片](/img/local-image.jpg)
```

### 带标题的图片
```markdown
![图片描述](https://image.example.com/image.jpg "图片标题")
```

### 图片示例（来自实际文章）
```markdown
![](https://image.guhub.cn/blog/2024/notion-library.jpg)
![Pinterest 上的 Anthropomorphic Arts](https://image.guhub.cn/uPic/2025/03/image-20250324112319902.png "Pinterest 上的 Anthropomorphic Arts")
```

## 💻 代码块

### 行内代码
```markdown
使用 `npm install` 安装依赖
```

### 代码块
````markdown
```javascript
function hello() {
    console.log("Hello World!");
}
```

```bash
npm install
npm run dev
```

```yaml
title: 示例配置
description: 这是一个配置示例
```
````

### HTML代码块示例
````markdown
```html
<div class="time-chart-container">
    <div class="time-chart-wrapper">
        <div class="time-icon">☀️</div>
        <div class="time-chart-bar dark:invert">
            <div class="time-segment" style="width: 25%">
                早晨
            </div>
        </div>
        <div class="time-icon">🌙</div>
    </div>
</div>
```
````

## 🎯 Hugo Shortcodes（短代码）

该博客支持多种自定义短代码：

### 引用卡片
```markdown
{{< quotecard >}}
这是一个引用卡片的内容
{{</ quotecard >}}

{{< quotecard rotate="-2" >}}
带有旋转角度的引用卡片
{{</ quotecard >}}

{{< quotecard rotate="1" >}}
另一个旋转角度的引用卡片
{{</ quotecard >}}
```

### 图片画廊
```markdown
{{< gallery >}}
![图片1](https://example.com/image1.jpg)
![图片2](https://example.com/image2.jpg)
![图片3](https://example.com/image3.jpg)
{{</ gallery >}}
```

### 链接卡片
```markdown
{{< link type="podcast" title="播客标题" link="https://example.com" image="https://example.com/image.jpg" >}}

{{< link type="website" title="网站标题" link="https://example.com" image="https://example.com/image.jpg" >}}
```

### 最近文章
```markdown
{{< recent-posts >}}
```

### 右对齐文本
```markdown
{{< right "右对齐的文本内容" >}}
{{< right "——《[书名](链接)》作者描述" >}}
```

### 提示框/警告框
```markdown
{{< callout "提示内容" "🔔" >}}
{{< callout "警告内容" "⚠️" >}}
{{< callout "信息内容" "💡" >}}
```

### 音频播放器
```markdown
{{< aplayer name="歌曲名" artist="艺术家" url="音频文件链接" cover="封面图片链接" >}}
```

### 书籍卡片
```markdown
{{< book title="书名" cover="封面图片链接" rating="⭐️⭐️⭐️" >}}
书籍描述内容
{{</ book >}}

{{< bookcard "书名" >}}
```

### 通用卡片
```markdown
{{< card "卡片标题" >}}
```

### 统计信息
```markdown
{{< postcount >}}  <!-- 显示文章总数 -->
{{< wordcount >}}  <!-- 显示总字数 -->
```

## 📊 表格

```markdown
| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 内容1 | 内容2 | 内容3 |
| 内容4 | 内容5 | 内容6 |

# 对齐方式
| 左对齐 | 居中 | 右对齐 |
|:-------|:----:|-------:|
| 内容   | 内容 | 内容   |
```

## 🔗 内部链接

### 文章链接
```markdown
[文章标题](/posts/文章文件名/)
[上次博客重建](/posts/新时代独立博客走弯路式搭建的最佳实践/)
```

### 分类和标签链接
```markdown
[分类页面](/categories/分类名/)
[标签页面](/tags/标签名/)
```

### 其他页面链接
```markdown
[关于页面](/about/)

[图谱页面](/graph/)
```

## 📝 特殊格式

### 脚注
```markdown
这是一个脚注示例[^1]。

[^1]: 这是脚注的内容。
```

### 任务列表
```markdown
- [x] 已完成的任务
- [ ] 未完成的任务
- [ ] 另一个未完成的任务
```

### 分隔线
```markdown
---
```

### 换行
```markdown
这是第一行  
这是第二行（行末两个空格实现换行）

或者空一行实现段落分隔
```

## 🎨 HTML支持

该博客支持在Markdown中使用HTML：

### 基础HTML
```html
<div class="custom-class">
    自定义内容
</div>

<span style="color: red;">红色文字</span>

<br/> <!-- 换行 -->
```

### 复杂HTML结构
```html
<div class="flex flex-wrap gap-4">
    <div class="item">项目1</div>
    <div class="item">项目2</div>
</div>
```

## 📖 实际示例

### 完整文章示例
```markdown
---
title: 我的第一篇博客文章
date: 2025-01-09T15:30:00+08:00
description: 这是我在不成熟养成计划博客上的第一篇文章
categories: 
  - 随想
tags:
  - 博客
  - 成长
  - 写作
toc: true
draft: false
---

## 开始写作

欢迎来到我的博客！这是我的第一篇文章。

### 为什么开始写博客

写博客有很多好处：

- **记录思考**：帮助整理思路
- **分享经验**：与他人交流学习
- **提升表达**：锻炼写作能力

{{< quotecard >}}
成长是一个不断试错的过程，不成熟恰恰是成长的必经之路。
{{</ quotecard >}}

### 我的写作计划

我计划每周至少写一篇文章，内容包括：

1. 个人思考和感悟
2. 技术学习笔记  
3. 读书心得分享
4. 生活经验总结

![我的工作台](https://example.com/workspace.jpg "整洁的工作环境")

### 代码分享

这是一个简单的JavaScript函数：

```javascript
function greet(name) {
    return `你好，${name}！欢迎来到不成熟养成计划！`;
}

console.log(greet("朋友"));
```

### 结语

希望通过写作来记录成长的每一步，也期待与读者的交流！

---

*感谢阅读，期待你的反馈！*
```

## 🔧 写作建议

### 文件命名
- 使用有意义的文件名：`我的第一篇文章.md`
- 避免特殊字符，可以使用中文
- 日期可以在Front Matter中指定

### 图片管理
- 建议使用图床服务存储图片
- 本地图片放在 `static/img/` 目录下
- 图片文件名使用英文，避免中文路径问题

### SEO优化
- 设置合适的 `title` 和 `description`
- 使用相关的 `tags` 和 `categories`
- 内容中适当使用关键词

### 可读性
- 合理使用标题层级
- 适当添加目录（`toc: true`）
- 使用列表和引用增强可读性
- 代码块要指定语言类型

这个指南涵盖了该博客支持的所有主要Markdown语法和特性。你可以参考这些示例来创建自己的文章！