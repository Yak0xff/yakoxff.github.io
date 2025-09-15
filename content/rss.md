---
date: 2025-05-06 11:12:12
title: RSS
aliases:
  - /cards/my-rss-url/
  - /cards/rss/
---

你可以通过 RSS 订阅本博客。用[这个链接](/index.xml)订阅本站的所有更新。

```
{{ .Site.BaseURL }}index.xml
```

你也可以单独订阅某一些更新。

```
仅订阅文章更新（包括周刊）
{{ .Site.BaseURL }}posts/index.xml
仅订阅周刊更新
{{ .Site.BaseURL }}categories/稻草人周刊/index.xml
```

```
仅订阅某一系列（如「人类恶疾」）
{{ .Site.BaseURL }}categories/人类恶疾/index.xml
仅订阅某一标签（如「心理学」）
{{ .Site.BaseURL }}tags/心理学/index.xml
```

如果你感兴趣，也可以订阅更新频率更低的英文博客（包括在 `/index.xml` 的更新中了）

```
{{ .Site.BaseURL }}en/index.xml
```
