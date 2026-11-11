# 博客重构方案说明（2026-09）

> 方向：**A 视觉叙事 + B 沉浸式阅读**（用户确认），视觉调性：**强视觉冲击**
> 硬约束达成：文章数据零改动、URL 零变化、SEO 结构零破坏、全量 features 可配置开关。

---

## 一、重构前的诊断：体验平淡的原因

1. **首页是"等权列表"**：14 篇文章平铺，无视觉层级、无叙事入口，用户落地后没有"先看什么"的引导。
2. **零封面、零视觉记忆点**：全站无任何图像资产，纯文字列表缺乏辨识度。
3. **文章页工具链残缺**：TOC 仅 ≥1200px 显示（移动端无目录）、相关推荐仅 1 篇且常推空（related 配置缺失，26 篇里 4 篇无推荐）。
4. **CSS 架构低效**：8 个模板各自内联 `<style>`（单页 66.5KB），无法跨页缓存。
5. **无障碍基础缺失**：无 skip-link、focus 环不统一、aria 属性仅 132 处。

## 二、落地设计

### 方向 A：首页视觉叙事（新首页动线）

```
Hero 横幅（宣言 claim + 4 项数据统计 + 正在读/在写）
  → 首篇 Lead 大卡片（300px 程序化封面 + kicker + 摘要 + CTA）
  → 按主题读（标签 Top6 走廊，每主题 3 篇）
  → 更早以前（时间序余量 12 篇，自动去重）
```

- **程序化 SVG 封面**（`components/cover.html`）：零图片素材，按 `分类/标签 + 日期 mod 5` 从 5 色调色板取色，3 种几何母题 + 标题首字，支持 4 种宽高比。强视觉调性靠 `--accent: #c8402f` 强调色 + 深色封面块实现。
- **智能 taxonomy**：自动检测 categories 为空时降级用 tags ByCount（本站实际 58 个标签、0 个 categories）。

### 方向 B：沉浸式阅读层（文章页）

- **阅读进度条**：顶部 3px，`role=progressbar` + `aria-valuenow`，rAF 节流。
- **移动端目录抽屉**：Aa 浮动按钮（FAB）+ 抽屉 + 遮罩，≤1199px 生效，完整 aria。
- **阅读偏好面板**：字号 3 档 / 行距 3 档 / 栏宽 3 档，localStorage 持久化，`<head>` 内联预应用脚本防闪烁（FOUT）。
- **快捷键**：`t` 主题 / `,` 偏好 / `g` 目录，带提示浮层。
- **相关推荐升级**：新增 Hugo `related:` 配置（tags 100 / categories 80 / title 20，threshold 40），1 → 3 篇，标注推荐理由；推空时回退旧组件。

### 无障碍与性能

- skip-link、统一 focus-visible、`prefers-reduced-motion` 全局降级、`aria-pressed` 状态同步。
- CSS 从每页内联改为 **Concat → minify → fingerprint（SRI）外链**，永久缓存。
- JS 打包为单文件 `reader.min.js` defer 加载，5 个模块零依赖。

## 三、改动清单

### 新增（20 个文件）

| 文件 | 职责 |
|---|---|
| `assets/css/components/_a11y.scss` | skip-link / sr-only / focus-visible / reduced-motion |
| `assets/css/components/_home.scss` | Hero、lead-card、topics-grid、封面、进场动画 |
| `assets/css/components/_reader.scss` | 进度条、TOC 抽屉、偏好面板、next-read、打印样式 |
| `assets/css/components/_fiction.scss` | 小说章节标题 |
| `assets/css/legacy/_*.scss`（8 个） | 从 8 个模板内联 `<style>` 外迁（内容未改） |
| `assets/js/reader-progress.js` | 阅读进度条 |
| `assets/js/toc-drawer.js` | 移动端目录抽屉 |
| `assets/js/reading-prefs.js` | 阅读偏好（字号/行距/栏宽） |
| `assets/js/shortcuts.js` | 键盘快捷键 |
| `assets/js/reveal.js` | 滚动进场动画 |
| `layouts/_partials/home/hero.html` | Hero 横幅 |
| `layouts/_partials/home/lead.html` | 首篇大卡片 |
| `layouts/_partials/home/topics.html` | 主题走廊 |
| `layouts/_partials/components/cover.html` | 程序化 SVG 封面 |
| `layouts/_partials/components/first-term.html` | taxonomy 首项取值（兼容切片 / 标量字符串 / 空值） |
| `layouts/_partials/posts/reader-tools.html` | 进度条 + 偏好面板 + 快捷键提示 |
| `layouts/_partials/posts/toc-drawer.html` | 移动端目录抽屉 |
| `layouts/_partials/posts/next-read.html` | 相关推荐（3 篇 + 理由标注） |
| `layouts/_partials/scripts/reader.html` | reader JS 打包入口（按开关拼装） |

### 修改（22 个文件）

| 文件 | 改动 |
|---|---|
| `config/_default/params.yaml` | 新增 `features:` 开关块（见下）+ `home:` 文案 |
| `config/_default/config.yaml` | 新增 `related:` 配置 |
| `assets/css/utils/_variables.scss` | 强调色体系 / 圆角 / 阴影 / 动效时长变量 + dark mixin |
| `assets/css/main.scss` | 引入 legacy/* 与 4 个新组件 |
| `layouts/_partials/head/css.html` | 内联 `<style>` → 外链 + SRI |
| `layouts/_partials/head.html` | 阅读偏好预应用脚本 |
| `layouts/home.html` | 重写为 hero → lead → topics → rest 动线 |
| `layouts/posts/page.html` | 接入 reader-tools / cover / next-read / toc-drawer |
| `layouts/baseof.html` | skip-link + `<main id>` |
| `layouts/_partials/header.html` / `header-simple.html` / `footer.html` | h1 语义、aria-label |
| 其余（scripts.html、toc.html、action-menu、now-read-this、quick-actions、theme-toggle-js、back-to-top、taxonomy、fictions/*） | 内联样式外迁、aria 补齐、h1 补齐 |

### 功能开关（`params.yaml` → `features`）

```yaml
features:
  homeHero: true        # 首页 Hero
  topicCount: 6         # 主题走廊数量
  restCount: 12         # 更早以前条数
  postCover: true       # 程序化封面
  revealOnScroll: true  # 滚动进场
  reader:
    progress: true      # 阅读进度条
    tocDrawer: true     # 移动端目录抽屉
    preferences: true   # 阅读偏好面板
    shortcuts: true     # 快捷键
    related: 3          # 推荐篇数（0 = 回退旧组件）
```

任意一项置 `false` / `0` 即关闭对应能力，无需改代码。

## 四、回归验证结果

| 指标 | 重构前 | 重构后 |
|---|---|---|
| URL / sitemap | 137 页 / 10 条 | **零新增、零丢失** |
| 单页 HTML（平均） | 91.2 KB | **28.8 KB** |
| 首页 HTML | 94.7 KB | **45.3 KB** |
| 文章页 HTML | 109.5 KB | **59.5 KB** |
| CSS 形态 | 每页内联 66.5 KB | 外链 87.2 KB（gzip ~16 KB，跨页永久缓存） |
| aria 属性 | 132 | **1736** |
| 缺 h1 页面 | 40 | 11（均为 cards/rss/sponsor 等边缘页） |
| 相关推荐推空 | 4/26 篇 | 0（related 配置补齐） |

- 生产构建：`hugo --gc --minify` 通过，207 页 / 769ms；UnoCSS 672 utilities。
- 移动端 414/500px 截图验证：Hero、lead 卡片、封面、主题走廊渲染正常，无横向溢出（此前 414px 截图的"溢出"确认为 headless Chrome 最小窗口宽度伪影，基线版本同样表现）。
- 文章页抽查（如 `/posts/内耗是个小鬼/`）：进度条、TOC 抽屉、偏好面板、快捷键提示、post-cover、next-read 全部在位。

### 已修复的边界 Bug

`content/posts/weekly/intro.md` 使用**标量写法** `categories: 稻草人周刊`，而其余文章使用切片写法。原 `cover.html` 直接 `index . 0`，对字符串返回 `uint8`，`len` 抛错导致全站构建失败。

修复方式：新增 `components/first-term.html` 统一取值（按 `printf "%T"` 区分 string / 切片 / 空值），并在 `cover.html`、`home/lead.html`、`posts/page.html`（Umami category 字段）、`posts/next-read.html`（tags 规范化为切片）四处统一调用。修复后 `-D` 全量构建 146 页通过，该页正确渲染为 `category: '稻草人周刊'` 且与封面配色正常。

## 五、本地运行与验证方式

```bash
# 1. 构建 CSS（开发模式，watch 可用 build:uno）
npm run build:uno:prod

# 2. 本地预览（含草稿）
hugo server -D --watch

# 3. 生产构建 + 验证
npm run build:uno:prod && hugo --gc --minify -d public

# 4. 回归检查清单
#   - URL 对比：diff 两次构建产物的 find . -name "*.html" | sort
#   - sitemap 对比：diff sitemap.xml
#   - 元素抽查：grep -E 'reader-progress|toc-fab|next-read' public/posts/*/index.html
#   - 移动端：Chrome DevTools 模拟 414px / 500px 视口
#   - 无障碍：Lighthouse a11y 审计 + 键盘 Tab 走查（skip-link 应首个聚焦）
```

## 六、V2 改版：编辑部排版方向（2026-09-24）

首版上线后视觉审查发现「组件堆砌感」：高饱和 Hero 色块、四彩条主题卡、荧光黄高亮、仪表盘式统计、PPT 模板感封面纹理。V2 按 **editorial design** 原则重做：

| 位置 | V1（组件感） | V2（编辑部排版） |
|---|---|---|
| Hero | 朱红色块横幅 + 装饰圆 | 超大衬线宣言（clamp 1.9→2.9rem，`text-wrap: balance` 均衡断行）+ mono kicker「一个人的编辑部」 |
| 统计 | 三格边框仪表盘 | 无框编辑式大数字（serif 1.85rem tabular-nums）+ hairline 上下线 |
| 当前状态 | 图标药丸 × 3 行 | colophon 式单行文字流 |
| 特稿 | 阴影大卡片（左封面右文） | 无卡片：全宽 21:9 封面 + 大标题 + mono meta，hover 标题转 accent |
| 主题走廊 | 四色顶条卡片 × 2 列 | 编号目录（01/02 mono + serif 主题名 + 篇数），hairline 分隔 |
| 封面 | 斜线/同心圆几何纹理 | 排版封面：沉稳低饱和调色板 + 超大衬线首字（低透明）+ mono 刊名 + 细线书衣框 + `feTurbulence` 纸感噪点（id 按 md5 去重防冲突） |
| 正文高亮 | 荧光黄 `rgba(255,235,0,.5)` | 朱砂渐变下划标记（`accent-soft` 38% + box-decoration-break: clone） |
| TOC | 灰色 active | accent 色 active + 进度条 accent |
| 色彩 | 6 种无关色并存 | 墨色文字 + 单一朱砂强调 + hairline 灰阶；调色板降饱和（绛红/黛蓝/松绿/赭石/紫檀） |

**顺带修复**：移动端 ≤640px 站点标题溢出（1.75rem→1.35rem）；小屏「最近更新」标题换行；lead 封面统一 21:9（消除 SVG slice 裁切）；badge 移至右上与刊名错位。

新增配置：`home.kicker`（Hero 眉题文案）。涉及文件：`_variables.scss`（hairline/ink 变量 + 调色板）、`_home.scss`（重写）、`_markdown.scss`（mark）、`_header.scss`（小屏标题）、`hero.html` / `lead.html` / `topics.html` / `cover.html`（重写）、`home.html`（传 taxonomy 名）、`params.yaml`。



## 七、V3 改版：Bento 盒式 + 点线视觉语言（2026-09-30）

V2 的编辑部排版偏「平铺直叙」，缺乏空间节奏。V3 改用 **Bento Box** 布局理念 + **点与线** 的视觉语言重做首页：

### Bento 网格

- 首页容器加宽至 `--bento-width: 1080px`（仅首页，不影响文章页 850px），12 列 grid，统一 `--bento-gap: 12px` / `--bento-radius: 16px`。
- 盒子分工：宣言盒 `span 7×2`、统计盒 `span 5`、正在盒 `span 5`、特稿盒 `span 12`（内部分封面 40 / 文字 60 双栏）、主题盒 `span 4`、归档盒 `span 12`。
- 末行补齐规则：主题数为 3n+1 / 3n+2 时最后一个盒子自动拉宽吃掉剩余列，网格底部不留半空行；≤1000px 双列、≤700px 单列各自有对应补齐规则。

### 点线语言（全站复用的五件套）

| 元素 | 实现 | 用在哪 |
|---|---|---|
| 点阵场 | `radial-gradient` 1px 点阵 + `mask-image` 径向渐隐，独立元素不污染盒底色 | 宣言盒右下、特稿盒左上 |
| 四角 crop mark | 盒子 `::before/::after` 画左上/右下 L 形细线，hover 转 accent | 所有 bento-cell |
| 节点圆点 | 标签实心点（accent）/ 空心点（dot 描边）起头 | 编号、区块标题、正在列表 |
| 目录点线 | `.leader` 弹性 dotted 填充线，串起「标题……日期」 | 统计盒最近更新、主题文章列表 |
| 点状延长线 | 宣言盒底部 `repeat-x` 点阵线 | hero-rule |

### 新增 token（`_variables.scss`）

`--bento-gap/radius/pad(-lg)`、`--cell-bg(-solid)`、`--dot(-soft)`、`--dot-size`、`--rule(-strong)`，dark mode 全部同步。

### 涉及文件

- `_home.scss` 整体重写（Bento 系统 + 点线组件，保留 post-cover/reveal/recent）
- `home.html`（bento 容器包裹 hero+lead、归档盒）、`hero.html`（输出宣言/统计/正在三个盒子）、`lead.html`（Bento 主格）、`topics.html`（主题盒子化 + leader dots）

## 八、排版系统收敛（2026-09-30，V3.5）

量化诊断发现字体与边距「杂乱」的根因：字号 **40+ 种**近似裸值（.66/.68/.7/.72… 相邻差 0.02rem）、字距 14 种、行高 15 种、padding 30+ 种，且 **`--font-mono` 从未定义**（10 处使用全靠 fallback，不同系统渲染不一致）。

### 新增 token（`_variables.scss`）

| 类别 | 档位 |
|---|---|
| 字族 | `--font-serif`（霞鹜文楷，内容）/ `--font-sans`（苹方系，界面）/ `--font-mono`（SF Mono + PingFang 回退，编号日期） |
| 字号 | `--fs-2xs .72rem` → `--fs-2xl 1.75rem` 共 8 档 + `--fs-display` |
| 行高 | `--lh-flat 1` / `--lh-tight 1.35` / `--lh-snug 1.6` / `--lh-base 1.8` / `--lh-loose 2` |
| 字距 | `--ls-tight .015em` / `--ls-wide .04em` / `--ls-mid .08em` / `--ls-wider .16em` / `--ls-widest .24em` |
| 字重 | `--fw-normal 400` / `--fw-medium 500` / `--fw-bold 700` |
| 间距 | `--sp-1 .25rem` → `--sp-12 3rem` 共 9 档；`--bento-gap/pad` 全部改挂 `--sp-*` 与 `--radius-lg` |

### 收敛执行

- 脚本批量替换 **142 处**排版声明（font-size 76 / line-height 26 / letter-spacing 18 / font-weight 22），覆盖 13 个文件；`clamp()` 与 `#{…}` 插值内部受保护未误伤。
- 边距收敛 48 处（`--sp-*`），范围限定在重构新增的 4 个组件文件；`legacy/` 既有边距保持原样以控制布局回归风险。
- `body` 补显式 `font-size: var(--fs-base)` + `line-height: var(--lh-snug)`——此前完全缺失，UI 元素行距全靠浏览器默认，是界面行距不一的根因。
- 合理保留：markdown 内的 em 相对缩放（h1 3em、sup 70%）与第三方 littlefoot 的 px 配置不 token 化。

**结果**：scss 源文件中 font-size/letter-spacing/line-height/font-weight 裸值 40+/14/15/6 种 → **9/0/0/0**（剩余 9 处均为上述合理保留）。视觉回归：桌面首页、文章页、移动端截图确认无退化。

## 九、宽屏适配（2026-09-30，V3.6）

用 CDP 探针实测 1440 / 1680 / 1920 / 2560 四档视口，发现三处间距体系打架：

| 问题 | 实测（1440 → 2560） | 根因 |
|---|---|---|
| 页脚内缩 | 页头/内容 1080 → 1380，页脚恒定 **850** | footer 硬编码 `md:w-[var(--page-width)]`，与首页容器无关 |
| 内容区过窄 | 2560 下两侧各空 740px，内容仅占 **42%** | `--bento-width` 从未定义，靠 fallback 固定 1080 |
| 目录贴正文 | 正文右缘 1721、目录左缘 1725（间距 **4px**），目录右侧却空 595px | 目录 `right` 公式漏算正文 padding 与目录宽度 |

**修复方式**

1. **引入 `--shell-width` 外壳宽度**：默认 `--page-width`（文章页页脚与正文对齐），首页由 `body.is-home` 覆盖为 `--bento-width`。footer 改挂 `md:w-[var(--shell-width)]`，页头/内容/页脚三者边界统一。
2. **宽屏呼吸阶梯**（`_variables.scss`）：`--bento-width` 1080 → 1180（≥1440）→ 1280（≥1800）→ 1380（≥2200），同步放大 `--bento-gap`（12→14→16）、`--bento-pad-lg`（32→36→40→44）、`--page-margin-y`（5→5.5→6→7rem）；首页区块间距 40→48px，宣言字号上限 2.55→3rem。
3. **目录改为「正文+目录」整体居中**：新增 `--toc-w` / `--toc-gap`，文章页 `body.is-posts main` 右侧预留目录通道，目录 `right` 改按 `(100% - 正文 - 目录 - 间隙)/2` 计算（用 `100%` 而非 `100vw`，避免滚动条 15px 误差）。
4. 补齐间距阶梯缺档 `--sp-7 / --sp-9 / --sp-11`；`baseof.html` 的 `<body>` 输出 `is-home` / `is-posts` 作用域类。

**修复后实测**

| 视口 | 页头/内容/页脚 | 目录与正文 | 左右留白 |
|---|---|---|---|
| 1440 | 130–1310（三者一致） | 40px | 139 / 139 对称 |
| 1920 | 320–1600（三者一致） | 40px | 320 / 320 对称 |
| 2560 | 590–1970（三者一致） | 48px | 695 / 695 对称 |

临界宽度 1200 / 1280 / 1340 / 1400 全部无重叠；生产构建通过，sitemap 10 条零丢失。

## 十、V4 细节打磨（页头方印 / 列表边距 / 阅读页）

### 1. 页头 Logo 与站点标题（编辑部方印）
- 原 `<img src="/img/header.png">`（万圣节插画）替换为**内联 SVG 方印**：朱砂底（`--accent`）+ 站名前四字 2×2 刻字，颜色全走 CSS 变量，暗色模式自动适配；新增 `layouts/_partials/components/seal.html`，刻字可经 `params.zh.yaml → sealText` 配置。
- 站名去掉渐变文字填充，改为实色衬线（`--fs-2xl`），副标题改等宽小字 + 朱砂短线；品牌区底部加点状 hairline。
- 文章页 header-simple 同步挂 1.6rem 小印；印章保留 `view-transition-name: title-image`，跨页切换平滑过渡。
- 涉及：`_partials/header.html`、`_partials/header-simple.html`、`legacy/_header.scss`、`legacy/_header-simple.scss`。

### 2. 首页「更早以前」宽屏边距
- 根因：`_reset.scss` 元素级 `article { max-width: var(--page-width) }` 命中了列表里每一篇文章条目，在宽屏下形成左右各约 210px 悬空留白。
- 修复：`.cell-recent .posts-item { max-width: none }`，行撑满盒宽；摘要文本限宽 `42em` 保行长；行内元信息等宽小字化、标题提级、分隔线 hairline。
- 涉及：`components/_home.scss`、`_partials/items/post.html`（内联 padding 0.75→1.1rem）。

### 3. 阅读页体验
- **栏目 kicker**：标题上方新增「节点 + 等宽大写」栏目行（分类优先、回退 section），meta 行同步去掉分类药丸避免重复。
- **meta 行**：等宽小字，日期 · 时长靠左成组，Aa 设置按钮推到最右。
- **标签**：灰底药丸 → `#标签` 点状下划线 tag，hover 落朱砂。
- **章节节奏**：正文 h2 前置点状分隔线 + 朱砂节点；`hr` 实线改点状延长线；文末新增「完」小印（点线夹朱砂描边小方章）。
- **链接**：波浪线 → 细实线低对比，hover 落 accent。
- **「接下来读什么」卡片** → Bento 语言：`--cell-bg` 底 + hairline 边 + 四角 crop mark（hover 转 accent），推荐理由改节点等宽标签。
- 涉及：`layouts/posts/page.html`、`legacy/_post.scss`、`_markdown.scss`、`components/_reader.scss`。

### V4 验证
- 1920 / 2560 首页「更早以前」满行显示、无悬空留白；文章页 meta 成组、kicker/标题/点线正常。
- 500px 移动端页头纵向堆叠正常；暗色模式方印与全部 token 自动适配。
- 生产构建 `hugo --gc --minify` 通过（385ms，139 个 HTML），URL 结构零变化。

## 十一、回滚方案

- 全部改动尚未提交，`git checkout -- .` + 删除未跟踪文件即可完整回滚：

```bash
git stash -u          # 或 git checkout -- . && git clean -fd -- assets/js assets/css/components assets/css/legacy layouts/_partials/home layouts/_partials/components/cover.html layouts/_partials/posts/{reader-tools,toc-drawer,next-read}.html layouts/_partials/scripts/reader.html
```

- 细粒度回退：所有新能力由 `features` 开关控制，可在不改代码的前提下逐项关闭（等效回滚单个功能）；`related: 0` 自动回退旧推荐组件，`postCover: false` 恢复纯文字列表。
- 建议提交策略：分 3 个 commit（① CSS 外链架构 + legacy 外迁；② 方向 A 首页；③ 方向 B 阅读层），便于单独 revert。

## 十二、全站设计语言收敛（V5）

V1–V4 只覆盖了首页与阅读页，本次对全站页面做一致性审计并把漏网页面统一到
「Bento 盒 + 点线 + 排版 token」语言。

### 审计结论（改前）

| 页面 | 问题 | 处理 |
|---|---|---|
| /about/ | emoji 区块图标 + GitHub 绿色贡献图 + 300 行内联旧样式 | 重做 |
| /product/ 列表+详情 | 圆角白卡、灰底药丸状态、旧排版 | 重做 |
| /highlights/ | 内联硬编码荧光黄 rgba(251,191,36) 高亮条 | 修复 |
| /posts/ 归档 | 年份分组无点线语言、列表无 hover 节奏 | 重做 |
| /categories/ 总览 + tag 落地页 | 灰底药丸标签云、emoji 标题、SVG 图标按钮 | 重做 |
| /featured/ | `markdown-content` 未吃排版 token + 空态无提示 | 修复 |
| 章节阅读页 | 模板 h1 与正文 `## 章节名` 视觉重复 | 修复 |
| /fictions/、/sponsor/ 等 | 已符合或走 markdown-body，仅微调 | 保留 |

### 实施方式

- **新样式模块**：`components/_archive.scss`（归档/term/标签云/Pagefind/highlights）、
  `_product.scss`（应用列表/详情/lightbox）、`_about.scss`（关于页/朱砂点阵贡献图），
  三处内联 `<style>` 全部外迁，纳入 Pipes 缓存。
- **点线目录语言**：年份行 / tag 行 / 鸣谢行统一「标题 —— leader 点线 —— 日期」，
  hover 整行落朱砂；区块标题统一朱砂节点。
- **贡献图**：GitHub 绿阶 → 朱砂单色阶（`color-mix` 基于 `--accent`，暗色自动变体），
  JS 渲染逻辑保留。
- **状态徽章**：灰底药丸 → mono 小字 + 语义色点（released 绿 / beta-alpha 朱砂 / dev 灰）。
- **保留的交互**：term 页反转/隐藏周刊按钮（id 与 JS 绑定不变，仅换皮）、
  product lightbox（JS 原样，色板 token 化）、view-transition-name 全部保留。

### 验证

- 明/暗色、1440 宽截图全部通过；章节页重复标题消除。
- 生产构建 139 页 313ms，sitemap 10 条 URL 零增减；CSS 主包 118KB（gzip 约 17KB）。

## 十三、展字水印式站点标题（V6）

V4 把页头改成了「小方印 + 竖线 + 站名」的 App 图标式布局，与整站报刊语言脱节。
V6 最终落地为**展字水印式**（先后试做过报头式 Masthead 与大印刊名式，按用户选择
收敛到本方案）：

- **巨型水印为底**：站名四字以超大衬线字（clamp 5.5–12.5rem，`letter-spacing -0.04em`）
  居中铺满页头，填充不用实色而用**点阵**（`radial-gradient(var(--dot) …)` +
  `background-clip: text`）——把整站「点」的语言直接织进字形里，暗色随
  `--dot` 自动变体；`overflow: hidden` 让首尾字出画裁切，形成封面式展字。
- **刊名压其上**：主名（clamp 1.75–2.2rem）居中叠在水印中央，副题双短线夹持、
  刊语 mono 小注；站名按全角冒号自动拆主名 + 副题，`site.Title` 与 SEO 不动。
- **落款小印**：1.35rem 单字朱砂印（主名末字「生」）盖在刊名尾字右上；
  `view-transition-name: title-image` 保留，跨页过渡为小印 ↔ 文章页小印。
- **交互**：hover 页头时水印整体变淡（.8 → .55），刊名浮出；窄屏水印再降至 .6。
- **双规线**：2.5px 粗线 + 1px 细线（报纸头版语言）收束品牌区；
  导航点分隔、当前项落朱砂，均沿用。

改动文件：`layouts/_partials/header.html`（品牌区重写为 waterhead 结构）、
`assets/css/legacy/_header.scss`（水印 + 刊名样式，bighead/masthead 系类清除；
seal.html 的 `size="auto"` 分支保留备用）。
`header-simple`（文章页小页头）不变。

验证：明/暗色、500px 移动端截图全过（`.workbuddy/shots-v7/`）；
生产构建 472ms，sitemap 10 条 URL 零增减。

## 十四、其余 tab 页面同步收敛（V7）

页头改为展字水印式后，对导航可达的其余页面逐页截图审计，修复与统一。

### 审计结论

| 页面 | 问题 | 处理 |
|---|---|---|
| /xiake/（侠客/友链） | 页头横向溢出全屏、旧灰底圆角友链卡、无 kicker | 重构 |
| /sponsor/ | 页头同样溢出、无 kicker | 重构 |
| /fictions/ | 标题弱、连载徽章为旧灰底药丸 | 重构 |
| /categories/ | 缺 kicker | 补齐 |
| /highlights/ | 缺 kicker | 补齐 |
| /blank/ | 居中插画仍为万圣节 logo | 换朱砂方印 |
| /posts/ /about/ /product/ /featured/ | 已符合 | 保留 |
| /blogroll/ /links/ | 白屏/旧站 | 非问题：仅是 xiake 的 SEO alias（dev 指向生产域） |

### 关键修复

- **page.html 页头溢出根因**：header partial 位于 `<article>` 之外（main 直下），
  不受元素级 `article{max-width:850px}` 约束导致全宽。重写 page.html：
  header 移入 `.archive-page` 容器，统一「term-kicker + term-title + post-content」结构；
  kicker 走 `.Params.kicker`（xiake「友朋名录」/ sponsor「支持创作」）。
- **友链 shortcode**：去内联 `<style>`（shortcodes 与 _shortcodes 两份同步），
  新建 `components/_links.scss`——hairline 直角卡 + favicon + mono 域名 +
  hover 浮出 ↗ 箭头；补 `box-sizing: border-box`（缺失会让 padding 撑爆两列 flex 换行）。
- **fiction-status-badge**：灰底药丸 → mono 小字 + 语义色点（连载朱砂 / 完结墨色 / 暂停空心）。

### 验证

明/暗色、500px 移动端、CDP 布局探针（卡片 417px 两列）全过；
生产构建 207 页 467ms，sitemap 10 条 URL 零增减。

## 十五、本地 / 线上环境区分（V8）

### 问题

本地预览时很多链接会跳到线上站点，根因有三类：

1. **模板站内链接用了绝对 URL**（`.Permalink`/`absURL`）——列表项、章节导航、
   反向链接、书卡、页脚版权等，点击即跨域名；
2. **alias 跳转页**（/blogroll/ /links/ → /xiake/）的 meta refresh 指向生产域
   ——`hugo server` 默认 environment 是 production，`config/development/`
   的 `baseURL: http://localhost:1313/` 根本没被加载；
3. **本地判断只认 `localhost`**——用 127.0.0.1 访问时 Umami 照样请求线上统计。

### 修复

- **站内链接全部相对化**：7 处 `.Permalink` → `.RelPermalink`
  （post-item、book、backlinks、fictions 列表/章节、bookcard ×2、footer 版权）。
  canonical / og:url / JSON-LD / RSS 等 SEO 元数据保留绝对 URL（规范要求，不产生点击跳转）。
- **dev-server 脚本**：新增 `scripts/dev-server.sh`（`--environment development`
  显式激活 config/development，baseURL=localhost；`--renderToMemory` 见下）与
  `scripts/build-prod.sh`（对齐 CI 参数），package.json 加 `npm run dev` / `npm run build`。
- **服务端隔离第三方服务**：`head.html` 中 Umami 脚本仅 `not hugo.IsServer` 注入；
  giscus 评论区本地显示「仅在正式环境加载」；`/categories/` 的 Pagefind 搜索
  本地显示索引缺失提示（索引需生产构建后 pagefind 生成）。
- **JS 兜底**：Umami 两处 `hostname !== 'localhost'` 改为 isLocal 判定
  （覆盖 127.* / 0.0.0.0 / [::1] / *.local / file://）。
- **视觉区分**：本地预览右下角渲染「● 本地预览 | localhost:1313」呼吸点角标
  （`components/dev-badge` + `_devbadge.scss`，窄屏左移让位快捷按钮），
  浏览器标签 title 加 `[本地]` 前缀。

### 踩坑：server 与生产构建共用 public/

hugo 0.150 的 `hugo server` 默认 renderToDisk（日志 `Serving pages from disk`），
渲染结果写并服务于 `public/`——此时跑一次 `hugo` 生产构建会把预览内容整个覆盖
成 production 版本（表现为角标消失、alias 又指向线上）。
已在 dev-server.sh 加 `--renderToMemory` 根治：预览渲染进内存，与磁盘构建彻底隔离。

### 验证

- dev：title 带 [本地]、角标渲染、alias → localhost:1313、站内线上 href 计数 0；
- 跑生产构建后再次 curl 1313，dev 特征不变（隔离生效）；
- 生产（public/）：title 无前缀、无角标、giscus/Umami 正常注入、
  各页仅剩 canonical/og/RSS 绝对链接、sitemap 10 条 URL 零增减。

## 十六、跨页导航不位移 / 外壳宽度统一（V9）

### 问题：点「归档」后整页布局和位置都变了

CDP 量化探针（1440 视口）量出两个叠加原因：

| 页面 | body 类 | main 右内边距 | 页头 x / 宽 | 导航 x | 页脚 x / 宽 |
|---|---|---|---|---|---|
| 首页 | is-home | 0 | 130 / 1180 | 593 | 130 / 1180 |
| 归档 /posts/ | is-posts | **280px** | 155 / 850 | **453** | 155 / 850 |

1. **位置偏移（真 bug）**：`_toc.scss` 为文章页目录预留右通道的规则
   `body.is-posts main { padding-right: calc(var(--toc-w) + var(--toc-gap)) }`，
   误伤归档列表页——`/posts/` 是 section，`.Type` 同样是 `posts`，body 同样带 `is-posts`。
   结果 ≥1200px 视口下归档页整个被顶偏 140px（内容不居中、右侧空出大片无主留白）。
2. **布局跳变**：首页外壳 `--bento-width`（1080–1380px），归档 / 标签 / 分类等
   目录页外壳 `--page-width`（850px）——页头水印、双规线、页脚宽度全线收窄。

### 修复

- **body 类区分目录页 / 文章页**（`baseof.html`）：
  `{{ if ne .Kind "page" }}is-index{{ else }}is-single{{ end }}`。
  Kind 为 home / section / taxonomy / term 的都是目录页，单篇才是 `is-single`。
- **目录通道只给文章页**：`body.is-posts.is-single main`（原 `body.is-posts main`）。
- **外壳统一**：`_variables.scss` 新增 `body.is-index { --shell-width: min(var(--bento-width), 100%) }`；
  默认 `--shell-width` 同样加 `min()` 兜底——1024px 这类窄于外壳宽的视口
  下页脚不再顶出横向滚动条。
- **容器换挡到 Bento 宽**：`.archive-page`（归档 / 标签 / 分类 / 特辑 / 标记 / 侠客 / 赞助）、
  `.about-page`、`.fiction-list-page` → `--bento-width`；
  目录页内的长文用 `.archive-page .post-content { max-width: var(--page-width) }`
  收回到阅读行长（侠客友链卡仍是两列 417px）。
- **页脚外壳跟随容器**：`footer.html` 读 `.Scratch.Get "shellWidth"`，
  由 about / page / featured / highlights / fictions-list 五个布局显式声明 `bento`
  （这些页 Kind=page，拿不到 `body.is-index` 的变量），内联 `--shell-width` 覆盖。
- **根层裁掉横向溢出**：`_reset.scss` 的 `html { overflow-x: hidden; overflow-x: clip }`
  ——贴边的 hover tooltip、装饰 SVG 不再把页面撑出几像素横向滚动。

### 验证（CDP 探针，五档视口 500 / 800 / 1024 / 1440 / 1920）

- 12 个页面 × 5 档视口：无横向溢出（`scrollWidth == innerWidth`）；
- 首页 / 归档 / 关于 / 标签 / 分类 / 特辑 / 标记 / 侠客 / 赞助 / 虚构 / 应用
  **页头 x=130 宽=1180、导航 x=593、页脚 x=130 宽=1180，完全一致**（1440）；
  1920 下同为 x=320 / 1280；
- 单篇文章页维持原设计：`main` 仍保留目录通道，正文 850 居中、页脚 850 与正文对齐；
- 生产构建 207 页不变（475ms）。

## 十七、V10「一点」设计系统（深度重构）

### 诊断（重构前）

| 维度 | 问题 |
|---|---|
| 视觉风格 | 全站米色底 + 米色卡片 + 米色描边，三层同色相叠，整体发闷；点阵、角标、点线、红点四种装饰并用，都在表达「分隔」 |
| 布局结构 | 首页 Bento 五类盒子同色同重，首屏无视觉重心；站名只有 ~1.3rem |
| 信息层级 | 「更早以前」取的是主题区挑剩的文章，时间线断裂；元信息外露英文 `in posts` |
| 组件一致性 | 三套页头（首页水印页头 / 文章简版页头 / 右上浮动按钮）；页脚宽度随页面类型变化 |
| 交互 | 列表只有标题文字可点；无焦点指示；上下渐隐遮罩把正文首末行淡到 ~2:1 |
| 移动端 | 导航挤在页头第二行（13px、点按区 < 30px），切栏目要先滚回顶部；首屏只放得下一句宣言 |
| 可访问性 | 次级文字 3.4:1 不达标；归档页 h1 仅读屏可见 |

### 方案：纸 · 墨 · 朱，一个品牌原子

站名「一点记」→ 全站只有一个品牌原子：**朱砂点**。它同时是 logo、导航当前项、
列表悬停游标、阅读进度、焦点环、正文分隔（· · ·）与文末句点。其余全部交给纸与墨：
取消满屏卡片，用字号阶梯 + 粗细线建立层级。

- **配色**：`--paper #f4f1ea` / `--ink #16130f` / `--zhu #d9431f`（字用 `--zhu-ink #b8361a`）；
  次级文字三档 8.6 / 5.3:1；暗色为暖墨底 + 旧纸色字 + 提亮朱砂，全部实算 ≥ 4.5:1。
- **字体**：黑体立骨（标题，系统字体零下载）· 楷体说话（正文，霞鹜文楷）· 等宽记账（日期/编号/计数）。
- **字阶**：`--step--2 … --step-5` 流体 clamp（360→1440 线性），去掉按断点改字号。
- **骨架**：`--container 1200` / `--measure 700` / `--gutter clamp()`；顶栏、页面、页脚同一外壳。

### 主要改动

- **导航**：`site/topbar.html`（全站唯一顶栏，sticky + 毛玻璃，`aria-current` + 朱砂点）
  + `site/tabbar.html`（<768px 底部标签栏，64px、安全区适配）；阅读时下滑收起、上滑出现。
  旧 `header` / `header-simple` / `quick-actions` 留空壳。
- **首页**：刊头（站名 step-5 + 句末朱砂点入场动画）→ 头条 + 此刻 → 01 最近发表（严格时间序）
  → 02 按主题读（索引栏，不再一主题一盒）→ 翻阅全部。
- **条目**：`items/post.html` 整行可点三栏网格，栏目名中文化（分类 → 首个标签 → 中文栏目名）。
- **文章页**：黑体大标题；h2 等宽编号 01/02；引用朱砂竖线；hr → 「· · ·」；文末朱砂句点；
  阅读偏好字号重定 16/18/20/22px（旧「标准」=20px、「大」「特大」相同）。
- **列表页**：归档 / 检索补可见标题；年份条 sticky 吸顶；目录行整行可点 + 朱砂游标。
- **页脚**：刊语落款 + 站内 / 订阅 / 别处三栏 + 版权，外链改文字。
- **动效**：滚动进场错峰（`data-stagger`）、跨页转场（顶栏/标签栏 `view-transition-name` 常驻）、
  主题切换从按钮位置圆形扩散；全部尊重 `prefers-reduced-motion`；`prefers-contrast: more` 加深线条。
- 样式：新增 `assets/css/v10/` 八个模块，`main.scss` 最后导入；旧令牌经 `v10-map` 映射，存量页面自动换肤。

### 踩坑

- LibSass 会对普通属性里的 `clamp()` 求值（rem + vw 报错），须 `#{"clamp(...)"}` 插值；自定义属性不受影响。
- 暗色 mixin 中 `@include v10-map` 必须放在最前，否则映射里的浅色 `--mark-strong` 会覆盖暗色值（实测 2.78:1）。
- 旧 `_home.scss` 仍被 9 个模板引用不能删，与新首页同名的 `.now-item/.lead-desc/.lead-cta` 在 `.home` 作用域内中和。
- `width:100%` 的按钮缺 `border-box` 会撑宽移动端布局视口（整页被缩放，innerWidth 420 > 390）。

### 验证

- 对比度探针（遍历可见文字算 WCAG 比值）：首页 / 文章 / 归档 / 关于 × 明暗，失败 0；
- 360/390/768/1024/1920 × 6 页：无横向溢出；每页恰 1 个 h1；当前导航项 `aria-current` 正确；
- 交互：下滑 → `chrome-hidden`、标签栏移出视口；上滑恢复；主题切换 View Transition + `aria-pressed` 同步；
- 生产构建 207 页 / 139 个 HTML 路径 / sitemap 10 条，与重构前**零增减**。

## 十八、V10.1：导航精简 / 刊头涟漪场 / 关于页重做

### 1. 「虚构」移出主导航
`params.zh.yaml` 的 `nav` 去掉 `/fictions/`（顶栏与底部标签栏共用，自动变为 4 项）；
小说内容与 URL 不动，入口移到页脚「站内」第一项。首页刊头统计「章节」同步换成「万字」。

### 2. 首页刊头「一点入水」涟漪点阵场（`assets/js/field.js`）
- 概念：站名的那枚朱砂点像一滴墨落入水面——点阵铺满刊头，涟漪每 3.8s 从朱砂点扩散，
  波前经过的点变大、染朱、沿径向被推开；指针靠近点阵会聚亮；点击 / 轻触任意处激起新涟漪。
- 首次涟漪与朱砂点「点下」的入场动画对齐（约 0.9s 后），形成「落点 → 荡开」的因果。
- 单 canvas 约 1000 点；仅在刊头可见、标签页激活时跑 rAF；颜色读 `--ink/--zhu`，随主题切换。
- 遮罩以站名为心横向收在版心 60% 内，右侧刊语区保持干净。
- `prefers-reduced-motion`：只画一帧静态点阵（朱砂点周围一圈晕），不响应指针。

### 3. 关于页完整重做（`layouts/about.html` + `v10/_about.scss` + `assets/js/rings.js`）
| 区块 | 设计 |
|---|---|
| 首屏 | 宣言按首个逗号拆成「引子 + 主句」，主句黑体大字 + 马克笔划线扫入；方印「盖章」落款（放大倾斜 → 回弹）；文章 / 万字 / 写作日 / 主题四格数字 |
| 写作年轮 | 所有日子排在阿基米德螺线上，一圈一年（正上方为 1 月 1 日、顺时针），由内向外；写作日为朱砂点（`<a>`，可聚焦、悬停显示日期与标题、点击直达），今天有呼吸光环，圆心是总篇数 |
| 01 此刻 | 图标圆环 + 等宽标签 + 黑体值，宽屏两列；悬停图标填朱 |
| 02 版权页 | 把「鸣谢」写成一本书的版权页：著者、字体、印制（Hugo 版本）、检索、评论、统计、图标来源、设计灵感（取自 about.yaml credits）、版次（首篇月份）、印次（=文章数）、定价（CC BY-SA）；原致谢文字保留在页底 |
| 03 在别处 | RSS + footerExternalLinks，黑体大字行，悬停朱砂淡底从左扫入 |

旧热力图脚本与 `about-*` 盒子已下线（旧 `components/_about.scss` 仍导入但不再命中）。

### 踩坑
- LibSass 会对插值后的字符串**再求值**：`#{"minmax(min(100%, 340px), 1fr)"}` 依旧报 px/% 不兼容，只能改写法；
- 方印样式原在 `legacy/_header.scss`，页头下线后印章退化成黑块 → 迁入 `v10/_base.scss`，并去掉 `view-transition-name`（同页两枚印会重名，导致转场失效）；
- `<mark>` 需显式 `background-color: transparent`，否则透出浏览器默认亮黄；
- hugo server 编译失败后会卡在失败状态，独立 `hugo -d /tmp/x` 验证通过后重启即可。

### 验证
360 / 390 / 768 / 1440 / 1920 下首页与关于页无横向溢出；对比度明暗均 0 失败；
年轮 1406 个日点、19 个朱砂点 = 19 个写作日；生产构建 207 页、139 个 HTML 路径与 sitemap 零差异。

## 十九、V10.2：方印下线 →「一点」笔墨标记

- **概念**：站名「一点记」拆写——一笔横画「一」+ 一枚朱砂「、」= **一点**。
  横画墨色、点为朱砂，正好是全站「纸·墨·朱」三色的缩影，也与首页「一点入水」涟漪同一母题。
- **组件**：`layouts/_partials/components/mark.html`（参数 `id` 同页唯一、`size` 宽度、`play: load|view`）。
  横画为手绘填充路径：起笔重按（厚 16）→ 行笔提细上扬（9）→ 收笔顿住回锋；
  `feTurbulence + feDisplacementMap` 做宣纸洇墨的毛边。
- **动画三拍**：遮罩 scaleX 运笔写出横画（750ms，起慢收快）→ 朱砂点从上方落下压扁回弹 → 点落处荡开一圈涟漪；
  悬停时点再弹一次、再荡一圈；`play:"view"` 进入视口才书写（ui-js 加 `.is-in`）；reduced-motion 直接呈现终态。
- **使用处**：关于页署名（7.5rem，延迟 0.9s 书写，名字在点落定后浮现）、版权页社标（4.5rem，压在底部双线正中，
  底色按 45% 拆成 surface / paper 两色把双线「断开」）、空白页（8rem）。
- `components/seal.html` 改为兼容壳（转调 mark）；方印样式从 `v10/_base.scss` 移除，替换为 `.mk` 组件样式。
- 验证：三页 360/390/1440 无溢出、同页 mask/filter id 唯一、关于页明暗对比度 0 失败；生产 207 页 / sitemap 零差异，产物中无 `.seal`。

## 二十、V10.3：文章阅读页完整重做 ——「一章书页 · 一点为引」

| 部分 | 重构前 | 重构后 |
|---|---|---|
| 扉页 | 左对齐眉题 + 标题 + 一行灰色元信息 + 标签 | 居中章首页：两侧短线夹眉题（可点到分类/标签页）→ 黑体特大标题从纸面浮出 → 楷体导语 → 账页（写于/篇幅/阅读/章节/Aa）→ 墨线自中向两侧写出、中间落朱砂点 |
| 正文 | 统一楷体，h2 上方 01 编号 | 首字下沉；中文两端对齐（窄屏左齐）；宽屏 h2 编号悬挂左页边 + 朱砂短线；作者自带序号（「二、」「第三章」「3.」）自动识别不再叠号；引文朱砂「」悬挂；列表圆点为朱砂「一点」；图片外扩出血 960px；表格横向滚动；代码块描边 |
| 读程 | 顶部进度条 + 仅 toc:true 时右侧目录（26 篇只有 23 篇开） | 所有 ≥2 章的文章自动生成右页边「点线目录」：每章一个点，**按章节在全文中的真实位置排布**；朱砂珠随读下行、读过线段变墨；当前章名常显、悬停整条浮现；读完正文自动退场 |
| 移动端 | 右下「目录」悬浮钮 + 抽屉 | 底部黑色胶囊：进度环 +「04 / 10 · 当前章」，随标签栏收起而下沉；点开为原生 `<dialog>` 目录面板（焦点圈定、Esc、遮罩关闭），含「回到顶部 / 阅读设置」 |
| 微交互 | — | 选中 4–300 字浮出「复制摘句 / 分享」（触屏放到选区下方）；标题悬停出现「#」一键复制本节链接 |
| 落款 | 「完」+ 点线 + 灰色评论/赞助图标 | 「一点」笔墨标记进入视口书写 →「全文完」→ 字数 / 预计 / **此次实际用时** → 标签胶囊 → 操作条（评论 / 复制链接 / 系统分享 / 请喝杯茶，内联 SVG）→ 上一篇·下一篇（按日期判新旧）→ 接下来读什么三栏 |
| 阅读设置 | 右下浮层 | 账页内 Aa 圆钮触发；面板改为顶栏下方（窄屏在底部），分段按钮墨色选中；「栏宽」只作用于正文栏，扉页保持宽版 |

- 文件：`layouts/posts/page.html`（重写）、`_partials/posts/action-menu.html`（重写，ID 不变）、`next-read.html`（标题换新语言）、
  新增 `assets/js/reading.js`（约 9KB，fingerprint + SRI）、`assets/css/v10/_reading.scss`（作用域 `.rd`，小说章节页 / 应用详情不受影响）。
- 兼容：`#toc-fab` 由胶囊承担，快捷键 b 照常；`#prefs-toggle` `#reader-prefs` `#comments-*` `#post-content` 不变；
  Pagefind 标题元数据、日期排序权重、Umami 阅读埋点保留。旧 `posts/toc`、`toc-drawer`、`back-to-top` 不再在文章页调用（文件保留）。
- 验证：4 篇（含周刊、带表格）× 360/390/768/1280/1920 无横向溢出、单 h1；明暗对比度 0 失败；
  摘句条、章节锚、读完用时、读完退场、标记书写均实测；生产 207 页 / sitemap 零差异。

### 19.1 补完：读程 / 摘句 / 落款（审计后修正）

| 处 | 问题 | 修正 |
|---|---|---|
| 读程 | 窄屏 / 中屏顶部进度条与胶囊进度环同时显示，违背「读程只保留一处」 | 脚本就绪加 `html.rd-ready`，顶部进度条隐藏；无 JS 时仍保留进度条兜底 |
| 读程 | 栏宽设为「宽」时点线目录被隐藏，但胶囊也被 `rd-has-rail` 隐藏 → 宽屏无任何读程 | 胶囊仅在 `rd-has-rail:not([data-width="wide"])` 时隐藏，由胶囊接替 |
| 读程 | `--rd-measure` 定义在 `.rd` 上，挂在 body 下的点线目录读不到，栏宽切换后目录位置不跟随 | 变量提到 `:root` / `html[data-width]`；窄 / 标准栏宽下目录与正文间距均为 72px |
| 读程 · 摘句 | 隐藏态只靠 opacity:0，链接 / 按钮仍可被 Tab 聚焦（实测 2 个） | 隐藏态加 `visibility:hidden`（带过渡），实测 0 个 |
| 摘句 | 无键盘关闭方式；暗色悬停色 `html.dark` 写死，系统暗色不生效 | Esc 关闭；悬停改 `color-mix(var(--paper) 16%)`，两种暗色一致 |
| 落款 | 「此次用时」按打开页面起算，切走标签页也计入 | 只累计页面可见时长（visibilitychange），模拟切走 30 分钟 + 阅读 2 分钟 → 显示 2 分钟 |
| 落款 | 评论按钮无展开状态，读屏无法得知评论区是否打开 | `aria-expanded` 与评论区显隐同步（与 Aa 阅读设置按钮一致） |

验证：4 篇 × 360/390/768/1280/1920 无溢出、单 h1、读程恰好一处；明暗对比度 0 失败；生产 207 页 / sitemap 零差异。

## 二十一、V10.4：性能收敛与资源清理

设计定稿之后回头清账：把「每页都在付，但其实没用上」的资源一次性摘掉。

### 20.1 清掉的东西

| 对象 | 情况 | 处理 |
|---|---|---|
| `static/img/how-to-articulate/venv/` | 误提交进静态目录的 Python 虚拟环境，1195 个文件 / 16MB，全部会被发布到线上 | 删除（纯垃圾，无任何引用） |
| `assets/css/components/_littlefoot.scss` + `static/js/littlefoot.js` + 初始化脚本 | 全站没有一处脚注（`[^1]`），却每页加载 10.8KB 脚本 + 5.5KB 样式 | 全部删除 |
| `static/css/uno.css`、根目录 `uno.css` | 与 `assets/css/uno.css`（真正的打包源）重复的两份历史副本 | 删除 |
| `assets/css/legacy/{_footer,_header,_header-simple,_quick-actions}.scss` | 对应模板早被顶栏 / 新页脚取代，导入早已移除 | 删除 |
| `assets/css/components/_about.scss` | 旧版关于页（Bento / 贡献图）样式，现行关于页已全部改用 `ab-` 前缀 | 删除（6.5KB） |
| `layouts/_partials/scripts/action-menu-js.html` | 内联 4.5KB × 每个文章页，其中一大段是 `location.host === 'www.geedea.pro'` 的点赞逻辑 —— 本站永远不成立 | 重写为 `assets/js/action-menu.js`（0.9KB，外链 + SRI），只在有操作条的页面加载；顺手补上 `aria-expanded` 同步 |
| `static/graph.html`、`static/css/uno.css`、`.hugo_build.lock` | 无引用 / 空锁文件 | 删除 |
| Aplayer 样式与初始化 | 全站 0 篇使用 aplayer 短代码，12KB CSS 却跟着主样式包发给每页 | 改由 `HasShortcode "aplayer"` 控制，无使用即零成本 |

### 20.2 字体：从「6 个族 · 630KB CSS」到「2 个文件 · 自托管」

原方案从 jsdelivr 拉 `lxgw-wenkai-webfont` 的 `style.css`，它 `@import` 了 6 个子样式表
（regular / light / bold × 常规 / 等宽），合计 582 条 `@font-face`、≈630KB CSS。
实际全站只用到 `LXGW WenKai` 一个字族的 400 与粗体两个档位。

- `scripts/build-font-subset.sh`：扫全站（content / layouts / i18n / data / config）得到 3125 个字符，
  用 `pyftsubset` 裁成 `lxgw-wenkai-regular.woff2` 与 `lxgw-wenkai-medium.woff2`（各 ≈683KB），
  放在 `static/fonts/`，`@font-face` 写在 `assets/css/_fonts.scss` 并随主样式包下发 —— 浏览器只需 1 个 CSS、1~2 个 woff2。
- 粗体：官方 1.330 之后不再单独发布 Bold（且那份 Bold.ttf 缺 cmap，无法子集化），改用同版本 Medium 承载
  `font-weight: 500 700`。两档 hhea / OS/2 度量完全一致（upem 1000、928/-256、1032/285），混排不跳行，
  也不会出现浏览器合成假粗体。
- 校验：拿构建产物里所有页面的文本字符逐个比 cmap，只缺 emoji（本就该由系统 emoji 字体接住）。
- 新文章若出现子集外的生僻字，重跑脚本即可（回退时是系统宋体，不会出现方块）。

### 20.3 图片：无损压缩 + 真实宽高

- `scripts/optimize-images.py`：PNG 走 `oxipng -o4 --strip safe`、JPG 走 `jpegtran -optimize`，
  逐张解码比对 RGBA 像素，有任何差异就跳过。32 张图 12.8MB → 10.5MB（最大一张 3.1MB → 2.1MB），像素逐张比对与改动前完全一致。
- 同时把每张图的宽高写进 `data/imgmeta.json`，`_markup/render-image.html` 据此输出 `width` / `height`
  （静态站渲染期拿不到 `static/` 下图片尺寸），图片位置在下载完成前就占好，正文不再被顶下去。

### 20.4 按页粒度加载

| 资源 | 之前 | 现在 |
|---|---|---|
| 阅读层脚本包 | 全站一个包（读程 / 目录 / 偏好 / 快捷键 / 进场） | 拆成 `reader-page`（文章内页）与 `reader-list`（其余页面，只剩 0.6KB 的进场动画） |
| 评论脚本 | 内联在每个 `.File` 页面 | 外链，仅随文末操作条出现 |
| aplayer | CSS 进主包、初始化脚本每页内联 | 都随短代码按需 |
| 首页涟漪场 | 可见即持续 rAF | 无波纹且指针静止 600ms 后停表，只留最后一帧；下一次交互或自动涟漪（定时器）再唤醒 |
| 字体预热 | 6 个 CSS 请求到第三方 | 0 次外部请求；`dns-prefetch` 只留 giscus 与 umami |

另外给 `static/_headers` 补了缓存策略：带指纹的 `/css/main.min.*`、`/js/*.min.*` 永久 immutable，
字体 7 天、图片 30 天，HTML 每次回源校验。

### 20.5 实测

| 指标 | 改动前 | 改动后 |
|---|---|---|
| 构建产物 | 33.6MB / 1422 文件 | 17.5MB / 348 文件 |
| 首页请求数 | 12（其中 7 个来自字体 CDN） | 5 |
| 首页 CSS | 198KB | 171KB |
| 首页 HTML | 34.2KB | 32.8KB |
| 字体请求 | 6 个 CSS（≈630KB）+ N 个 woff2 分片 | 1 个 woff2（683KB），永久缓存 |
| 列表页 JS | 5.6KB（读程全套） | 0.6KB |
| 文章页 CLS | 图片无尺寸 | 0.001（图片有宽高占位） |

验证：138 个页面控制台 0 报错；文章页读程 / 偏好面板 / 目录通道 / 评论展开 / 摘句弹层实测正常；
关于页、首页、文章页在 390 / 1400 宽度、明暗两色下版式无变化。

---

## 二十二、V10.5：站名收敛为「一点」+ 由点组成的形状（2026-11-09）

> 前面章节里出现的「一点记」是当时的站名，作为历史记录原样保留。

### 22.1 起因

「记」是品类后缀，可站里同时有随笔、小说连载和应用，一个「记」字反而说不清这是什么；而 V10 之后整套视觉的品牌原子本来就叫「一点」，名字比符号多一个字。

另一头，V10 起全站只有**一枚实心圆点**：logo、导航当前项、列表游标、进度珠、焦点环、刊头句点都是它。同一个点复用到底，换个栏目看不出任何区别，信息量太低。

### 22.2 点的两种形态

保留单点做小标记，**新增一组点做形状**：5×5 网格，按栏目重排，顶栏 logo 与首页刊头句点用它。

| 栏目 | 形状 | 点数 | 落点 |
|---|---|---|---|
| 首页 | 圆 | 21 | 顶栏 + 刊头句点 |
| 归档 / 随笔 | 方 | 16 | 顶栏 |
| 应用（含 `type: web`） | 三角 | 17 | 顶栏 |
| 虚构 | 弧 | 11 | 顶栏 |
| 关于 / 标记 / 标签等 | 十字 | 9 | 顶栏 |

- `layouts/_partials/components/dot-shape.html`：坐标是格心（0.5~4.5），`r=0.32`，颜色 `currentColor` → `--zhu`。纯 SVG，无 JS、无额外请求，明暗主题自动跟随；`.shape` 可显式覆盖栏目推断。
- `assets/css/v10/_dot-shape.scss`：只管尺寸与 reduced-motion。调用处各给一个 `--dot-shape-size`（顶栏 20px，刊头 `.38em` 跟着 h1 缩放）。
- **涟漪场的波心要留白**：首版把点阵形状直接放进刊头后，明暗两色下它都和 `field.js` 静态晕圈的朱砂网格点糊成一团（截图实测）。`field.js` 的 `resize()` 现在按 `CLEAR = 38` 跳过波心半径内的网格点，形状独占这块，涟漪从它外圈荡开——反而更贴「一点入水」的原意。`origin()` 仍取 `.masthead-dot` 的包围盒中心，锚点没动。
- 眉题前那枚 `.v-dot` 只有 `0.42em`，5×5 点阵在这个尺寸会糊，继续用实心圆；文末「一 + 、」笔墨标记是手写落款，属于另一套语言，不动。

### 22.3 名字与图标

站名**只有一处是活的**：`config/_default/languages.yaml` 的 `title`。改一行即传导到 `<title>`、og/twitter title、RSS 标题、顶栏品牌名、首页 `<h1>` 和 `aria-label`。顺手删掉 `params.zh.yaml` 的 `sealText`——方印 V10.2 下线后已无任何模板引用。

| 资源 | 之前 | 现在 |
|---|---|---|
| `favicon.ico` | 15.4KB 旧图标 | 5.1KB，四档尺寸（16/32/48/64）；另加手写 `favicon.svg` 508B，墨底 + 一枚朱砂大点 + 八枚小点组成的环 |
| `apple-touch-icon.png` | 旧图 | 同款重画，180×180 / 5.8KB |
| `img/header.png`（og:image） | 88KB 万圣节骷髅插画（Happy Halloween），和站点毫无关系 | 44KB，1200×630 纸底「一点」+ 朱砂点阵圆 + 右侧四个淡色形状（方 / 三角 / 弧 / 十字）+ 底部一排小点 |
| head 引用 | 只有 `<link rel="icon" href="/favicon.ico">` | SVG 作 `rel="icon"`、ICO 作 `rel="alternate icon"`、再加 apple-touch-icon；`og:image:type` 由 `image/jpeg` 改成实际的 `image/png` |

`head/siteinfo.html` 的 `og:image:type` 之前一直写 jpeg，而文件本来就是 PNG，这处一并修正。

### 22.4 验证

- 干净生产构建通过：207 页 / 334 文件；`data-dot-shape` 在首页 `circle`×2、归档 `square`、应用 `triangle`、虚构 `arc`、关于/标签 `cross`，全部符合映射。
- 明暗两色 1440×846 首页截图重拍（README 的 `screenshot.png` / `screenshot-dark.png`，oxipng 后各约 104KB）；波心留白后点阵形状与涟漪网格分离清楚。
- 8 类页面控制台检查：7 页 0 报错；`/xiake/` 有 5 条 Google favicon 服务的 404（友链站点失效，属既有问题，与本次改动无关）。
- 首页请求仍是 6 个。图标声明踩过一个坑：两条并列 `<link rel="icon">` 会让 Chrome 把 SVG 和 ICO **都**下回来（实测 2 请求 / 6KB）；把 ICO 改成 `rel="alternate icon"` 后只剩 1 请求 / 5KB（浏览器取 ICO），SVG 文件保留作矢量源。`favicon` 体积 15.4KB → 5.1KB。
- 没动 URL、域名、目录结构、文章正文、色板令牌，也没改前文任何历史章节。

---

## 二十三、V10.6：「此刻」从侧栏卡片改成通栏状态公报（2026-11-09）

### 23.1 判断：形式合适，但不能整页照搬

给了一张公报 / colophon 风格的参考页：世界地图 + BUREAUX + READING / WRITING / SHIPPING / CODING 四行状态 + 日期框 + `SET IN` 排印说明。

| | 契合 | 冲突 |
|---|---|---|
| 版式 | 纸底、细线、大留白、字距、「左标签 + 右内容」与 V10 同源，也和首页文章列表「左日期 + 右标题」同构 | 参考图是**整页** dispatch；博客首页第一任务是找文章，整页照搬会把文章入口挤到第三屏 |
| 内容 | 状态流能带时间、产出、节奏，比「正在喝 茉莉飘雪」耐看 | 旧内容写死在 `data/about.yaml`，形式升级了内容照样两周就过期 |
| 细节 | 蓝色小点可直接换成朱砂点；`SET IN` 那行排印说明很贴 V10 | 世界地图 / BUREAUX 是别人的身份叙事；冷蓝 + Newsreader/Inter 与朱砂 + 霞鹜文楷打架 |

结论：**保留刊头、头条和「最近发表」，只替换「此刻」区块**。世界地图与 BUREAUX 不搬。

### 23.2 改动

- **数据**：`data/about.yaml` 拆出独立的 `dispatch` 段，只放在读 / 在写两行的 `text` / `note` / `link`。关于页的「正在读 / 听 / 做 / 喝」读的是同一文件里的 `currently`，两条数据各管各的，改一边不动另一边。
- **模板**：`home/now.html` 从 `<aside class="now">` 重写为 `<section class="dispatch">`。初版曾把它移出 `.front` 双栏、放在头条与「最近发表」之间，`.front` 一度改成单列；23.6 已按反馈收回右栏、恢复 `8fr / 4fr` 栅格。
- **样式**：新增 `v10/_dispatch.scss`（细线、等宽标签、日期框、柱图、窄屏收英文）；删掉 `v10/_home.scss` 里失效的 `.now / .now-pulse / .now-list / .now-item` 及其响应式与中和规则。`components/_home.scss` 的同名旧规则仍被关于 / 应用 / 精选页使用，未动。
- **本地化**：蓝色小点 → 朱砂点，右下角复用 `components/dot-shape` 的点阵圆，`SET IN` 那行改写成站内三套字体（霞鹜文楷 / 系统黑体 / 等宽）。

### 23.3 自动统计口径

| 行 | 算什么 | 怎么算 |
|---|---|---|
| 在发 | 全站篇数 / 总字数 / 最近更新 | `where site.RegularPages "Section" "posts"` 的长度、`WordCount` 求和、按 `Date` 倒序取第一篇 |
| 在码 | 近 12 个月按月发文柱图 + 静默判断 | `now.Year*12 + now.Month` 与每篇文章的年月做差，落在 0~11 就累加到对应桶；柱高按最大值归一，0 值留 6% 底线并压到 26% 透明度；最近 3 个月全 0 写「静默中」 |

**为什么是 12 个月不是 7 周**：站点最后更新停在 2026.02，7 周窗口里一篇都没有，柱图会是一根空线。拉到 12 个月才看得出「2 月密集、之后静默」的真实节奏——数据不假造，形状也就有了。

### 23.4 两个实测才发现的坑

1. 柱图里 0 值柱和高柱同色，看上去像「一根柱 + 一条下划线」。给每根柱加 `--bar-o`（0 值 0.26 / 有值 0.85）并把柱图与文字的间距拉到 `.9rem` 后才分得清。
2. **字体请求从 1 个变 2 个**：标题里的 `§` 用 `--font-read`，却继承了 `.dispatch-title` 的 `font-weight: 600`，于是把 medium 那份 682KB woff2 也拉了下来，首页首访流量直接翻倍。给 `.dispatch-sigil` 压回 `font-weight: 400` 后恢复 1 请求 / 683KB。

### 23.5 验证

- 干净生产构建：207 页 / 334 文件 / 17.34 MiB。首页 HTML 33.5 → 35.9KB（gzip 11.8KB），CSS 168 → 169KB（gzip 30KB），仍是 6 个请求，CLS 0.0001。
- 自动统计实测：在发「24 篇 · 7.1 万字 · 最近 02.17 更新」；在码「静默中 · 近 12 个月 20 篇」，柱图 12 根。与刊头的数据口径一致。
- 1440 明暗两色 + 390 窄屏截图：700px 以下英文标签收起、四行改上下结构，日期框 / 柱图 / 点阵落款都无溢出。
- 首页、归档、关于、标签四页控制台 0 报错；关于页 `currently` 未受影响。

### 23.6 修订：收回右栏，字号降一档

初版把公报做成独立通栏 section，反馈是「位置能否还是在原来的位置」「字体还过大了」。确实两处都过了：通栏虽然不是整页照搬，但仍占掉一整行，把「最近发表」往下推了约 150–200px；`--step-2` 的内容字号拿到右栏里，分量直逼左栏头条。

- **位置**：`home.html` 把 `partial "home/now"` 放回 `.front` 内，`.front` 恢复 `8fr / 4fr` 栅格与 `clamp()` 列间距；`.dispatch` 改 `align-self: start` + 左边框（沿用原来 `.now` 侧栏的位置语言），去掉通栏版的 `margin-top` / `border-top`。头条标题顺势回到两行。
- **字号**：`.dispatch-text` 由 `--step-2` 压回 `--step-0`（正是原侧栏 `dd` 的字号），标题 `--step--1 → --step--2`，日期框与注脚同步缩小；四行从「左标签 + 右内容」改成「标签一行、内容一行」，行距与虚线间距一起收紧。
- **窄栏细节**：柱图原本跟在「近 12 个月 20 篇」后面，被挤成一个小突起 → 改 `flex: 0 0 100%` 独占一行，柱宽 3→4px、高 .85→1rem；底部 `SET IN` 说明从 `--step--2` 提回 `--step--1` 才读得清；点阵落款 22→16px。
- **响应式**：`860px` 以下 `.front` 收成单列时，`.dispatch` 换上边框、四行排成 2×2 压缩高度；`700px` 以下再回单列并隐藏英文标签。
- **没动的部分**：`data/about.yaml` 的 `dispatch`、自动统计口径、`§` 的 `font-weight: 400`（避免多下 682KB 字体）、关于页的 `currently`，全部保持。

复验：字体请求仍是 1 个 / 683KB，首页 6 请求、CLS 0.0002；HTML 35.9KB（gzip 11.8KB）、CSS 169.3KB（gzip 30KB），与通栏版体积基本一致——位置与字号是纯布局调整，没增加传输成本。1440 明暗 + 390 窄屏截图通过，首页与关于页控制台 0 报错。

---

## 二十四、V10.7：头条降档、刊头去重复数字 + 点阵动效、主题补三栏（2026-11-09）

### 24.1 三条反馈

1. 最新文章的标题过大 → `.lead-title` 从 `--step-4`（最大 3.7rem）降到 `--step-3`（最大 2.6rem），字号阶梯注释同步改成「站名 step-5 > 头条 step-3」。
2. 「此刻 → 在发」已经写了 `24 篇 · 7.1 万字`，刊头右侧又有一组「文章 24 / 主题 63 / 万字 7.1」，两处同数重复 → 摘掉整个 `.masthead-stats`。空出来的位置按反馈**保留刊语、加一个点阵动效图像**，没有选「最近一篇入口」或「纯留白」；效果最终指定用桌面 `Publisher/world` 里的「潮汐之境」。
3. 底部「按主题读」只有 2 栏 → 补齐到 3 栏。

### 24.2 主题只有 2 栏的根因

不是 `features.topicCount: 6` 没生效。`home.html` 挑主题文章时带了一条 `not (in used .RelPermalink)`，而 `used` 已被头条 + 「最近发表」12 篇占掉 13 篇；剩下的文章只够填满「随笔」「认知」，后面四个主题的 `$picked` 为空，被 `if $picked` 整栏过滤。

改法：

- 两轮挑选——先取没用过的，不足 3 篇再回补已出现过的文章（只避开头条，免得主题区第一篇又是最醒目那篇）。按主题读本来就是索引式导航，少量重复可接受。
- 各主题不再往 `used` 里追加自己用掉的文章，避免越往后越难凑。
- `topicCount` 由 6 改成 3；`.topic-grid` 本来就是 `repeat(3, ...)`，正好一行三栏。

实测：随笔（7 篇）/ 认知（5 篇）/ 心智模型（4 篇），每栏各 3 篇，无空白栏。

### 24.3 刊头右侧：「潮汐之境」点云球

先做过一版五形状轮换的纯 CSS 点阵（`dot-morph`），用户看过参考后指定换成桌面 `Publisher/world` 里 *DOT / WORLD · TIDAL ARCHIPELAGO* 的效果——「群岛从海面缓慢生长，每一次触碰，都是一场小小的潮汐」。那一版随即删掉。

原型是 34000 点、可拖拽、带场景切换的生成式宇宙，依赖 `shared/dots.js` 的 `dotUtil.vnoise` 与 `Field`。整段搬进 160px 的刊头角落显然不合适，所以提炼了它的算法内核重写：

- `assets/js/tide.js`：2000 点 Fibonacci 球面分布（黄金角 2.399963…）+ 自写的 2D value noise 三层叠加，阈值 0.52 分陆地 / 海洋、0.016 带宽划海岸线。只画朝向观察者的半球，四类点（海 / 陆 / 岸 / 高地）分桶批量 `arc` 填充。
- 动效：`yaw` 缓慢自转；`reveal` 让点按原始 y 从下往上逐批浮现（群岛生长）；`pointerdown` 记录坐标，画两圈随时间扩散的扁椭圆潮汐。另有一圈球面轮廓点和一条扁椭圆轨道，对应原型的 `guides()` / `orbit()`。
- **本地化**：不用原型的深墨绿底 + 青绿调色板，改读 `--ink` / `--zhu` / `--ink-3`——纸底上是淡墨海面与朱砂群岛，暗色自动跟随。主题切换用 `MutationObserver` 监听 `html.class` 重读颜色重绘。
- **性能**：30fps 节流，`IntersectionObserver` + `visibilitychange` 双重停表，`prefers-reduced-motion` 下只画一帧静止终态、不跑 rAF、不响应点击。与首页 `field.js` 的涟漪场并存但互不干扰（一个在水面、一个在右侧）。
- 位置：`components/tide.html` + `v10/_tide.scss`，刊语下方右对齐，`clamp(128px, 12vw, 168px)`。

调参记录：首版陆地阈值 0.54、海面点全保留，结果整颗球发灰、朱砂只剩几道细弧。实测噪声分布（median 0.455 / p75 0.569）后把阈值降到 0.52、海面点按 grain 只留 70%、陆地点整片保留并放大提亮，群岛才从点阵里浮出来。

实测（CDP 像素签名采样）：正常动效下 t0/t1/t2 三帧不同（自转 + 生长），点击后签名变化（潮汐），`reduced-motion` 下三帧完全一致；控制台 0 报错。

### 24.4 验证

- 干净生产构建：207 页 / 334 文件 / 17.35 MiB。首页 HTML 35.9 → 40.8KB（gzip 11.8 → 13.5KB，多的是内联 `tide.js` 与第三栏主题），CSS 169.3 → 169.2KB（gzip 30.0KB）。点云球换来的是一段脚本而不是额外请求，请求数没变。
- 字体请求仍是 1 个 / 683KB（`§` 的 400 字重没动），首页 6 请求、CLS 0.0001；首页 / 关于 / 归档三页控制台 0 报错。
- 1440 明暗两色 + 390 窄屏截图通过；主题区三栏一行（随笔 / 认知 / 心智模型，各 3 篇），无空白或溢出。

---

## 二十五、V10.8：阅读页改宽版 + 标题降档 + 目录常显（2026-11-09）

### 25.1 三条反馈与真实状态

「阅读页现在是窄屏的布局」——查下来外壳 `article.post-article.rd` **本来就是**首页同宽 `calc(var(--container) + var(--gutter) * 2)` = 1200px；窄的是里面的正文 `.rd-body`（`--measure` 700px）和扉页 `.rd-head`（980px），再加上右侧目录只露点、章节名要 hover 才浮现，整体看着像移动端排版。

三条诉求：宽度改成和首页一致、标题字体小一些、右侧目录文字一直显示。

### 25.2 宽度：默认宽版 + 仅在目录出现时预留

| 项 | 改前 | 改后 |
|---|---|---|
| `--rd-measure`（正文） | `var(--measure)` = 700px | 980px 上限；≥1100px 时 `min(980px, 100vw - 26rem)` |
| `.rd-head`（扉页） | 980px | `var(--container)` = 1200px |
| `--rd-wide`（图片出血） | `min(960px, …)` | `min(1200px, …)` |
| 偏好三档 | 窄 600 / 标准 700 / 宽 860 | 窄 700 / 标准 980 / 宽 1200（宽档仍隐藏目录、由胶囊接替） |

`100vw - 26rem` 与 rail 宽度的算式互为补数：正文居中时 `50vw - rd-measure/2` 恒为 13rem，扣掉与正文的 1.5rem 间距和 1.5rem 页边留白，右侧稳定留出 160px 给常显文字。`min()` / `calc()` 用 `#{""}` 插值输出，避开 LibSass 对混合单位求值（V10.3 记过的坑）。

**踩坑**：首版把 `min(980px, 100vw - 30rem)` 直接挂在 `:root` 上，所有视口都给目录预留。结果 390px 视口算出负值、`.rd-body` 被压到 0 宽（正文整段消失）；900px 视口下目录本来就被媒体查询隐藏，却仍为它留位，正文只剩 420px，比改前还窄。改成「默认固定上限、`@media (min-width: 1100px)` 才按视口预留」后修复——`max-width` 不强制宽度，窄屏自然收缩到父容器。

### 25.3 标题与目录

- `.rd-title`： `clamp(2.15rem, 1.25rem + 3.6vw, 4.5rem)` → `clamp(1.9rem, 1.4rem + 2.2vw, 3.1rem)`，1440px 实测 72px → 49.6px，不再跟刊头「一点」抢视觉。
- `.rd-rail-label`：`opacity: 0` / `translateX(-4px)` → `opacity: .82` + `color: var(--ink-2)`，章节名常显；当前章仍是 `--ink` + 600 字重 + 朱砂点，hover 整条时统一提到 `opacity: 1`。删掉了「hover 时把未读项压淡到 `--ink-3`」那条——常显之后再压淡没有意义。
- rail 显示阈值 `1280px → 1100px`；定位改成 `--rail-left: calc(50% + var(--rd-measure)/2 + 1.5rem)`，宽度 `calc(50vw - var(--rd-measure)/2 - 3rem)`、`max-width: 240px`。

### 25.4 验证

多视口 CDP 实测（`rd-mid` / `rd-dark` / `rd-mobile` 截图）：

| 视口 | 正文 | 扉页 | 目录 | 与正文 |
|---|---|---|---|---|
| 1600 | 980px | 1200px | 240px 常显 | 间隙 24px |
| 1440 | 980px | 1200px | 182px 常显（9 章） | 间隙 24px |
| 1280 | 864px | 1200px | 160px 常显 | 间隙 24px |
| 1100 | 684px | 1028px | 160px 常显 | 间隙 24px |
| 900 | 838px | 838px | 隐藏，走胶囊 | — |
| 390 | 352px | 352px | 隐藏，走胶囊 | — |

- 章节名在明暗两色下都可读，过长时 ellipsis 截断（原有行为），当前章朱砂加粗醒目。
- 三档偏好实测：窄 700 / 标准 980 / 宽 1200；宽档目录 `display: none`、胶囊 `flex`，与既有逻辑一致。
- 文章页与首页控制台 0 报错；CSS 169.2 → 169.4KB（gzip 30.1KB），首页不受影响（改动只在 `_reading.scss` 的 `.rd` 作用域与 `--rd-measure`）。

---

## 二十六、V10.9：关于页此刻同步、应用栏目下线、标记进主导航（2026-11-09）

> 前面章节里出现的 `/product/`、`_product.scss` 等是当时的状态，作为历史记录保留。

### 26.1 三条反馈

1. 关于页的「此刻」还挂着旧的 `currently`（正在读 / 听 / 做 / 喝 / 看，五条各带一段内联 SVG），而首页早已换成 `dispatch`（在读 / 在写手写 + 在发 / 在码自动算）。两处口径不一致，旧数据写完就过期。
2. 去掉「应用」Tab，并移除所有数据。
3. 把「标记」加进主导航，按数据格式展示。

### 26.2 关于页此刻

- 删 `data/about.yaml` 的 `currently` 整段（5 条含内联 SVG），连同过期已久的「网站图标来源」鸣谢组（现在 favicon 是自绘点阵，不再来自 Icons8 / Freepik）。
- `about.html` 的「此刻」改读同一份 `dispatch`：在读 / 在写两条手写，在发 / 在码在模板里按与 `home/now.html` 相同的口径自动统计（全站篇数、总字数、最近更新、近 12 个月篇数、静默判断）。实测两页输出一致：`24 篇 · 7.1 万字 · 最近 02.17 更新` / `静默中 · 近 12 个月 20 篇`。
- 视觉沿用 `.ab-now` 两列网格，圆形图标换成等宽编号 `01`–`04`（`.ab-now-icon` 加 `--font-num`），不再有手写图标数据。

### 26.3 应用栏目下线

`git rm` 共 26 个文件：

| 类别 | 内容 |
|---|---|
| 内容 | `content/product/`（4 篇）、`data/products.yaml` |
| 图片 | `static/img/product/`（10 张，1.2MB）、`static/img/neural-archive/`（5 张，**2.3MB**） |
| 模板 | `layouts/product/`（2）、`layouts/web/`（1） |
| 样式 | `components/_product.scss`、`_web.scss`、`_archive.scss` 里下线的 `.highlight-*` 段 |
| 脚本 | `scripts/fetch_appstore.py` |

`static/img/neural-archive/` 是额外查出来的：Neural Archive 应用页删掉后，那 5 张截图全站已无引用，却一直留在仓库里，比 product 图还大。

引用清理：`params.zh.yaml` 导航、`config.yaml` 的 `permalinks.web`、底部标签栏图标映射、`dot-shape` 的形状映射、`items/post` 的栏目名、`main.scss` 两条 import、`_pages.scss` 里 `article.product-page / product-detail` 选择器、`data/imgmeta.json` 里 15 个失效条目（顺手把 `/img/header.png` 的旧尺寸 446×429 修正为实际的 1200×630）。

### 26.4 标记进主导航 + 数据入库

- 主导航第二项由「应用」换成「标记」`/highlights/`，页脚「站内」里重复的「标记」删掉；底部标签栏换成书签图标，路由同步。
- **线上空壳的根因**：`data/highlights.json` 一直在 `.gitignore` 里，CI 构建时文件缺失，Hugo 静默跳过，`/highlights/` 只剩一个空壳（README 已知限制记过）。这次从 `.gitignore` 放行并入库，线上不再依赖本地脚本。
- `layouts/highlights.html` 重做：弃用 Bento 外壳 + 荧光黄渐变高亮条，改 `v-page-head`（眉题 / 标题 / 统计）+ `hl-groups`。按 `data/highlights.json` 的原始结构 `[{title, url, highlights:[{text, link}]}]` 一组一篇文章：等宽编号、细线分节、来源链接、句数、朱砂点项目符号，摘句链接保留 `#:~:text=` 跳回原文。新增 `v10/_highlights.scss`。
- `dot-shape` 的 triangle 从「应用」改派给「标记」。`/highlights/` 是独立页面、`.Section` 为空，所以除了 `$section` 还加了 `hasPrefix $path "/highlights"` 判断，否则会落回默认十字（实测发现并修正）。

### 26.5 验证

- 干净生产构建：207 → **203 页**，334 → **315 文件**，17.35 → **13.76 MiB**（少 3.59 MiB，主要是图片）；CSS 169.4 → **152.9KB**（gzip 30.1 → 27.7KB）。
- 顶栏 `首页 / 归档 / 标记 / 关于`，底部标签栏同四路由且「标记」高亮；`/product/`、`/web/` 产物目录不再生成；全库配置 / 模板 / 样式里无 product 残留。
- 标记页实测 8 组 / 36 句，形状 `triangle`；明暗两色与 390px 窄屏截图通过。
- 关于页此刻 4 行，无 `currently` / 内联 SVG 残留，数值与首页一致。
- 首页 / 标记 / 关于 / 归档四页控制台 0 报错；首页仍 6 请求、字体 1 个 / 683KB、CLS 0.0001。
- README 的栏目表、目录结构、应用章节、部署说明、性能基线、已知限制同步；REFACTOR 追加本节（共 26 节）。

---

## 二十七、V10.10：关于页换成 GitHub 公开主页快照（2026-11-09）

> 本节内容已由 V10.11 完整撤下，仅作为过程记录保留，不代表当前状态。

### 27.1 两条反馈

1. 去掉关于页里的「此刻」。
2. 从 GitHub 上找一些有意义、有意思的内容展示出来。

### 27.2 数据从哪来、挑了什么

`https://api.github.com/users/Yak0xff` 直接撞 403：`API rate limit exceeded for 43.132.141.14`（共享出口 IP），本机也没装 `gh` CLI。改读公开主页 HTML，拿到 profile README 与 5 个 Pinned 仓库，整理成一份静态快照：

- **人**：Yak（Yak0xff），Xi'an Shaanxi，bio「好好学习，天天向上」，主页指向本站。
- **一句话**：profile README 里的 `I build small things that feel good, move smoothly, and make sense in real life.`，配 `Product-minded builder • Mobile • UX • Motion` 与技术栈 `Flutter · SwiftUI · React Native · Android · iOS`。
- **四个仓库**（按 star 排）：`ChatMessageTableViewController`（Objective-C，295★ / 56 forks，像 iMessage 的聊天界面）、`AnimatedPaths`（Swift，37★，用 `CAShapeLayer.strokeEnd` 让 CGPath 自己画出来）、`CoreML-Practice-with-SwiftUI`（Swift，14★）、`Card-List-with-SwiftUI`（Swift，7★）。合计 353 星。
- fork 来的 `Machine-Learning-with-Python` 不计入——不是自己做的东西。

有意思的地方不是数字，是那条线：从聊天界面到路径绘制动画，再到 CoreML 和 SwiftUI，一直在做手机上「摸得到、动得顺」的东西；`AnimatedPaths` 和这个站的「一点入水」「潮汐之境」其实是同一件事的不同年纪。所以区块里只如实引用 profile README 的原话与仓库数据，不额外加评论。

**为什么不自动刷新**：GitHub API 有速率限制，静态站也不该在运行时请求外部接口。`data/github.yaml` 存一份人工核对过的快照，带 `asOf: 2026-11-09`；star / fork 变了手工改 YAML，页面里的合计数由模板现算。

### 27.3 删除与替换

- `about.html`：删掉「此刻」整个 section，以及只服务于它的四个统计变量（`$latest` / `$thisMonth` / `$yearPosts` / `$recent3`）。章节编号 `01 / 02 / 03` 不变，`01` 换成「在 GitHub 上」——引语 + tagline/地点、四行仓库（等宽编号、名称、描述、语言、star/fork）、底部技术栈与快照说明，右侧给 `@Yak0xff →` 外链。
- `v10/_about.scss`：删 `.ab-now-*` 整段（含呼吸点、两列网格、圆形编号）与两条响应式规则，换成 `.ab-gh-*`；窄屏仓库行改两列、元信息落到第二列。
- `data/about.yaml`：`dispatch` 保留但注释改成「只服务首页」——首页 `home/now.html` 仍读它，关于页不再引用。
- 新增 `data/github.yaml`。

### 27.4 验证

- 干净生产构建 203 页；关于页产物无 `ab-now` 残留，章节编号仍为 `01 / 02 / 03`，4 个仓库名、353 星、快照日期全部正确渲染；首页「此刻」不受影响。
- 1440 明暗两色 + 390px 窄屏截图通过：引语换行、长仓库名不溢出、元信息不与描述打架。
- 关于 / 首页 / 标记三页控制台 0 报错。
- README 的栏目表、目录结构、独立页面说明、「维护此刻状态」小节同步，新增「维护 GitHub 快照」说明数据来源与更新方式；REFACTOR 追加本节（共 27 节）。

---

## 二十八、V10.11：撤下 GitHub 区块（2026-11-09）

上一节加的「在 GitHub 上」上线后反馈价值很低，完整移除：不保留入口、不留空区块、不留数据文件。

| 文件 | 处理 |
|---|---|
| `data/github.yaml` | 删除（`git rm`） |
| `layouts/about.html` | 删「在 GitHub 上」整个 section 与 `site.Data.github` 引用；章节编号重排为 `01 版权页 / 02 在别处`，顶部注释回到三件事的原始措辞 |
| `assets/css/v10/_about.scss` | 删 `.ab-gh-*` 整段与两条响应式规则，段落编号同步（含一次重复注释的清理） |
| `README.md` | 删「维护 GitHub 快照」小节，清掉栏目表、目录结构、独立页面说明里的 `github.yaml` 引用 |

关于页回到 V10.1 起就有的三块：宣言 + 写作年轮、版权页、在别处。首页「此刻 · DISPATCH」与其它栏目不受影响，`data/about.yaml` 的 `dispatch` 仍只服务首页。

验证：干净生产构建 203 页；关于页产物无 `ab-gh` / `site.Data.github` 残留，`01 / 02` 编号连续；明暗两色与控制台检查通过。第二十七节作为过程记录保留，README 节数同步为 28。

---

## 二十九、V10.12：关于页中间补一张点阵动效插页（2026-11-09）

### 29.1 空在哪、放什么

「此刻」和「在 GitHub 上」先后撤下后，写作年轮 / 统计行与「01 版权页」之间空出约 300px；版权页卡片只有 600px 宽居中，两侧也偏空。用户想放点好玩的，并给了 `https://dot-matrix-4gz.pages.dev/` 作参考。

那个站是 **DOT / MOTION**：近黑底的点阵动效实验室，有「点阵世界 / 点阵物件 / 点阵声音」三张 FIELD NOTE、一块鼠标能搅动点阵的主舞台、动效库（FADE / TYPEWRITER / INTERLACE / NOISE FLOW / UNFOLD）与 A/B 比较实验室。和「一点」的点阵语言同源。

给了三个方向（可玩的点阵小舞台 / 六种动效卡片墙 / 轻量链接展台），用户选了 **C 轻量链接展台**——不做互动。

### 29.2 实现

- `about.html` 在写作年轮 section 之后插入 `<aside class="ab-play">`，**不占章节编号**：版权页仍是 `01`、在别处仍是 `02`。用 `<aside>` 是把它当书里的一张插页，而不是新章节。
- 左侧：淡朱砂细圆环 + 一个 5×5 点阵圆，直接复用 `components/dot-shape.html`（`shape="circle"`），不给站点新增第二套点阵定义。
- 右侧：`FIELD NOTE · 点阵动效` 眉题、`DOT / MOTION` 标题、一句介绍、五个动效名 pill、`.v-button` 外链（带 `target="_blank" rel="noopener"` 与 sr-only 新窗口提示）。
- **零新增资源**：没有 JS、没有 canvas、没有外部请求、没有数据文件；文案硬编码在模板里，和「在别处」那几条链接的做法一致。
- `v10/_about.scss` 新增 `.ab-play-*` 段（上下细线、左右两栏、标签 pill），窄屏改为竖排、图形居中。

### 29.3 验证

- 干净生产构建 203 页；关于页产物有 5 个动效标签与外链，章节编号仍为 `01 / 02`，点阵形状为 `cross`（顶栏）+ `circle`（插页）。
- 1440 明暗两色 + 390px 窄屏截图通过：插页正好落进原来的空白，图形与文字不挤、标签换行正常、按钮不溢出。
- 关于 / 首页控制台 0 报错；about HTML 29.2KB（gzip 10.7KB），CSS 152.8KB（gzip 27.6KB），基本无增量。
- README 栏目表、独立页面说明、「维护此刻状态」小节同步，节数 28 → 29。

---

## 三十、V10.13：插页图形改用目标站官方预览图（2026-11-09）

### 30.1 反馈与调研

上一节自绘的「淡环 + 5×5 点阵圆」效果太弱，用户要求不要自己画，直接引用目标站的资源。

用 CDP 把 `https://dot-matrix-4gz.pages.dev/` 的运行时 DOM 与资源表拉出来看：页面里 **没有 `<img>`、没有背景图、没有 favicon link**，13 个 canvas（heroCanvas / stageCanvas / labA / labB …）全是动态绘制；`performance.getEntriesByType('resource')` 里只有两份 CSS。唯一可直接引用的静态资源是 og:image —— `https://dot-matrix-4gz.pages.dev/preview.png`（1200×630，黑底上由点组成的「点阵动效」四个大字，上方是三张 FIELD NOTE 卡片）。

### 30.2 外链实测失败，改本地副本

先按字面写成 `<img src="https://dot-matrix-4gz.pages.dev/preview.png">`，headless Chrome 实测**图片没加载出来**，展台左侧只剩一个空框（跨域图片请求在这条网络路径上不通；生产环境的用户网络、防盗链策略同样不可控）。

于是改为把这张官方图存一份到 `static/img/dot-motion-preview.png`，`oxipng -o4 --strip safe` 后 100KB → **58KB**。内容仍完全来自目标站、不是本站重画，但不再依赖对方站点在线；来源 URL 写在模板注释、README 与本节里。图片本身包在 `<a>` 里可点，带 `width` / `height`（CLS 实测 0）、`loading="lazy"`、描述性 alt 与 sr-only 新窗口提示。

### 30.3 版面调整

- 左侧从 148px 的圆形点阵（环 + 圆）换成 `clamp(200px, 24vw, 300px)` 的 1200:630 缩略图，细边框 + 圆角 + `object-fit: cover`，hover 时边框转朱砂。
- 删 `.ab-play-ring` / `.ab-play-mark` 规则；展台仍是左右两栏、不占章节编号，版权页 `01` / 在别处 `02` 不变。
- 黑底预览图在纸色页面上形成一块明确的深色插画，比自绘的点阵圆有分量；暗色主题下靠细边框与图内的深灰卡片区分。

### 30.4 验证

- 干净生产构建 203 页 / **316 文件 / 13.81 MiB**（+1 文件、+58KB）；关于页产物无自绘点阵残留，改引 `/img/dot-motion-preview.png`。
- 1440 明暗两色 + 390px 窄屏截图：预览图都正常显示、比例与边框无误、不与文字挤在一起。
- 关于 / 首页控制台 0 报错；关于页图片请求 1 个 / 57KB，CLS 0。
- README 栏目/目录结构、独立页面说明与性能基线同步，节数 29 → 30。

### 30.5 后续微调：左图固定尺寸并放大（同日）

用户反馈 `clamp(200px, 24vw, 300px)` 的缩略图太小、尺寸不该随视口浮动，要求图片铺满且不变形。

- `.ab-play-figure` 改成固定 `width: 400px` + `aspect-ratio: 1200 / 630`（即 210px 高），`max-width: 100%` 只在窄屏兜底防溢出。
- `img` 改成 `position: absolute; inset: 0; width/height: 100%; object-fit: cover`，与容器完全绑定——铺满、不留白、保持原图比例。
- `.ab-play-inner` 上限 900 → 1040px，给放大后的左图留足右侧空间。
- 竖排断点从 600px 提到 900px：否则 700px 左右视口下固定 400px 的图会把右栏挤到 200px 出头。

多视口 CDP 实测：1600 / 1440 / 1100 / 700 下容器恒为 402×212、图片渲染 400×210（`object-fit: cover`、原图 1200×630、均已加载）；390px 下受 `max-width` 兜底为 354×187，比例仍是 1.90，不变形。明暗两色 + 700 + 390 截图通过，关于 / 首页控制台 0 报错。

### 30.6 再去一轮：清掉多余横线、让图片撑满区块高度（同日）

用户仍不满意，两点很具体：图片还是太小、要尽量占据这个高度；以及「为什么还多了几条横线」。

**横线来源**：截图里那四条线分别是 `.ab-hero` 的下边框（粗墨线）、`.ab-play` 自己加的 `border-top` / `border-bottom` 两条细线、版权页 `.v-section-head` 的上边框（粗墨线）。V10 的设计语言里「粗墨线是唯一的强分隔」，插页又叠了两条细线才显得杂乱。去掉 `.ab-play` 的 border 与上下 padding，只留较小的 margin；前后各一条粗线，回到原本的节奏。

**图片占满高度**：宽度 400 → **560px**（按 1200:630 得 294px 高），`.ab-play-inner` 上限 1040 → 1140px 给右侧留空间。没有 padding 之后，插页高度直接由图片决定，右侧文字垂直居中，图片上下不再留白；仍是 `position: absolute; inset: 0; object-fit: cover`，铺满且不变形。窄屏由 `max-width: 100%` 等比兜底。

多视口 CDP 实测：1600 / 1440 / 1100 / 700 下图片恒为 560×294（原图 1200×630、`cover`、已加载）；390px 为 352×185。明暗两色 + 700 + 390 截图里只剩两条粗墨线，关于 / 首页控制台 0 报错。

---

## 三十一、V10.14：移除设计灵感、关于页分隔线收细（2026-11-09）

### 31.1 两条反馈

1. 移除现有的「设计灵感」部分。
2. 保留下来的分割线太粗、颜色不友好。

### 31.2 删掉的内容

「设计灵感」在版权页里占两块：`data/about.yaml` 的 `credits`（渲染成「设计灵感 | endtimes.dev · Hero Patterns · 極客死亡計劃」一行），以及卡片底部那段「特别致谢 極客死亡計劃 / Eltrec」——两者内容高度重合，都是主题灵感致谢。一并删掉：

- `data/about.yaml` 删整个 `credits` 段；
- `about.html` 删 `range $about.credits` 循环与 `.ab-colophon-thanks` 段落；
- `_about.scss` 删随之失效的 `.ab-sep` / `.ab-colophon-thanks` 规则（后者还自带一条 `border-top`，删掉也少一条线）。

版权页卡片仍有著者 / 字体 / 印制 / 检索 / 评论 / 统计 / 版次 / 印次 / 定价九行，没有变空。

### 31.3 线的粗细与颜色

问题出在 `--line-ink`：明色是纯墨 `#16130f`、暗色是纯白 `#efe9df`，关于页用它画了 `2px` 的首屏下边框与 `.v-section-head` 上边框，还有版权页卡片上下 `3px double`——暗色下尤其刺眼。

改成 `1px solid var(--line-2)`（明/暗分别是 `rgba(22,19,15,.24)` / `rgba(239,233,223,.24)`）：

- `.ab-hero` 的 `border-bottom`；
- 新增 `.ab .v-section-head { border-top: 1px solid var(--line-2) }`，**只在关于页覆盖**全局 `2px` 规则，不动首页 / 归档等其它页面；
- `.ab-colophon` 上下 `3px double` → `1px solid`。

「在别处」列表原有的 `1px dotted --line-2` 本来就是柔和线，未动。

### 31.4 验证

- 干净生产构建 203 页；关于页产物无「设计灵感」「特别致谢」「endtimes.dev」残留，CSS 无 `.ab-colophon-thanks`。
- CDP computed style 实测（暗色）：关于页 `.v-section-head` = `1px / rgba(239,233,223,.24)`，首页仍是 `2px / rgb(239,233,223)`——覆盖作用域正确，无副作用。
- 1440 明暗两色长图：所有横线变成细而柔的线，版权页卡片删掉两块内容后仍完整协调；关于 / 首页控制台 0 报错。
- README 的 data 目录说明、独立页面说明与节数（30 → 31）同步。

---

## 三十二、V10.15：全站分隔线统一（2026-11-09）

### 32.1 反馈

上一节只在关于页收细了线，用户指出「项目中还有很多地方是这条刺眼的线，需要全部处理成新的样式」。

### 32.2 全站清单

`--line-ink` 明色是纯墨 `#16130f`、暗色是纯白 `#efe9df`，被 8 处 `2px solid` 分隔线引用：

| 文件 | 位置 |
|---|---|
| `v10/_base.scss` | `.v-section-head` 上边线（全站区块标题） |
| `v10/_home.scss` | `.masthead-dateline` 刊头顶线 |
| `v10/_pages.scss` | 归档 `.section-head` 上边线、`.archive-year-head` sticky 年份条下边线 |
| `v10/_footer.scss` | 页脚顶部线 |
| `v10/_reading.scss` | 表格 `th` 下边线、`.rd-pager` 上下篇导航上边线 |
| `v10/_dispatch.scss` | 此刻公报中屏上边线 |

另外两处旧组件的 `2px` 横线（`_markdown.scss` 表格 thead、`components/_fiction.scss` 章节标题）颜色虽被 v10 覆盖成淡色，宽度仍不一致，一并统一。

### 32.3 做法

- 8 处 `2px solid var(--line-ink)` → `1px solid var(--line-2)`（明/暗各 24% 半透明）。
- 两处旧组件的 `2px` 横线同样改 `1px solid var(--line-2)`。
- `--line-ink` 令牌先改成 `var(--line-2)` 过渡，确认编译产物里 `var(--line-ink)` 引用数为 0 后**删除定义**——避免以后再有人写出纯墨/纯白强线。
- 删掉上一节在 `_about.scss` 加的 `.ab .v-section-head` 局部覆盖（全局已统一，不需要重复规则）。
- **保留**：引用块的 `2px` 朱砂竖线、正文朱砂 `3px` 竖线、TOC 的透明竖线——这些是竖向强调装饰，不是横向分隔线。

### 32.4 验证

- 编译产物：`border-top/bottom: 2px solid` 残留 **0**，`3px double` 残留 **0**，`var(--line-ink)` 引用 **0**，`1px solid var(--line-2)` 共 25 处。
- 首页 / 归档 / 标签 / 文章页 / 关于页的暗色截图 + 首页明色截图：刊头线、区块标题线、年份条、页脚线、表头线全部是细柔线，层级仍清楚；删掉废弃令牌后线没有意外消失。
- 5 个页面控制台 0 报错；README 设计章节新增「分隔线」条目、独立页面说明与节数（31 → 32）同步。

---

## 三十三、V10.16：品牌点回归实心纯色（2026-11-10）

### 33.1 反馈

「一点后面的那个点，采用实心纯色图案」——即首页刊头「一点」句末那枚点，不要再由小点组成的形状。

### 33.2 改动

V10.5 起有三处通过 `components/dot-shape.html` 输出 5×5 点阵形状（按栏目重排成圆 / 方 / 三角 / 弧 / 十字）：顶栏 `.brand-dot`、刊头 `.masthead-dot`、此刻公报落款 `.dispatch-mark`。同一个品牌原子不该一部分实心、一部分点阵，三处一起换：

| 位置 | 原来 | 现在 |
|---|---|---|
| 顶栏品牌点 | 点阵形状 20px | 实心朱砂圆 14px |
| 刊头句点 | 点阵形状 `.38em` | 实心朱砂圆 `.19em`（跟 h1 缩放） |
| 此刻落款 | 点阵圆 16px | 实心朱砂圆 8px |

样式回到 `width / height / border-radius: 50% / background: var(--zhu)`，颜色仍由令牌控制、明暗自动跟随；刊头的入场 `v-dot-in` 缩放动画保留。

`dot-shape.html` 与 `v10/_dot-shape.scss` **保留但当前无引用**（文件头注明备用），不删：以后想恢复某个位置的点阵形状，把对应 `span` 换回 partial 调用即可。

`field.js` 的 `origin()` 仍读 `.masthead-dot` 的包围盒中心作涟漪波心，锚点 class 没变；`CLEAR = 38` 的波心留白对实心圆依然合适，不用改 JS。

### 33.3 验证

- 干净生产构建 203 页；首页产物 `data-dot-shape` / `.dot-shape` 引用为 0，三处均为实心 `span`。
- CDP 实测：`.masthead-dot` 20×20px，波心坐标 `(260, 394)` 有效；4.2s 后 canvas 像素签名变化，涟漪场仍在跑（换点没有打断动效）。
- 1440 明暗两色 + 390px 窄屏截图：顶栏与刊头都是清晰的实心朱砂圆，位置、大小、留白正常。
- 首页 / 关于 / 标记 / 归档四页控制台 0 报错。
- README 删掉已失效的形状映射表，改写品牌点段落，节数 32 → 33；REFACTOR 追加本节。

---

## 三十四、V10.17：刊头右侧补「夜航星海」星盘（2026-11-10）

### 34.1 反馈与参考

「在之前增加的潮汐之境的后面，再增加夜航星海动效」。

参考源还在项目里：`.workbuddy/ref/world/world.js` 的 `scenes` 数组有三个场景——scene 0 *潮汐之境 / TIDAL ARCHIPELAGO*（V10.7 已搬）、scene 1 *风起沙丘*、scene 2 ***夜航星海 / THE INFINITE GARDEN***：「远处的星辰，也是微小的点。在无限之中，留下一次温柔的回响」，tag 是「星尘 · 旋臂 · 引力」。

给了三种放置方式（同一画布切场景 / 紧随其后并排两颗 / 另开大区块），用户选 **B 紧随其后并排两颗**，接受首屏变满。

### 34.2 实现

新增 `assets/js/galaxy.js` + `components/galaxy.html` + `v10/_galaxy.scss`，沿用 `tide.js` 的同构骨架：

- **布点**：把原型 22000 点精简到 1800 点。`galaxyPoint()` 的四条对数旋臂（`arms = [0, 1.38, 3.47, 5.19]`、`winds = [4.1, 4.55, 3.85, 4.7]`）+ Box–Muller 高斯抖动 + 2D value noise 扰动，12% 的点散作随机角度的背景星尘；盘面 y 很薄，天然是扁平星系。
- **投影与动效**：倾斜 `tilt = .5` 的盘面投影（扁椭圆），`angle - time * .08 / (r + .4)` 做内快外慢的差速自转；每颗星 `sin(time*.9 + rnd*TAU)` 闪烁；`tilt` 再叠一层 `.04` 的慢正弦「呼吸」；入场 `reveal` 让星点由内向外亮起；`pointerdown` 画两圈扩散椭圆（原型 `ripple()` 的余韵）。
- **本地化**：不用原型 `palettes[2]` 的青绿沙色调，四类星读 `--ink-3` / `--ink` / `--zhu`，中心一颗淡朱砂径向晕；为保持批量 `arc` 填充的性能，按「4 色 × 亮/暗」分 8 批，闪烁与前后深度并进亮度档，而不是逐点改 `globalAlpha`。
- **性能与无障碍**：与 tide 完全同构——30fps 节流、仅可见且标签页激活时跑 rAF、`IntersectionObserver` + `visibilitychange` 停表、`MutationObserver` 监听主题切换重读颜色、reduced-motion 只画一帧且不吃点击。脚本随首页内联，零额外请求。
- 两颗球用 `.masthead-orbs` 包一层：桌面竖排右对齐，**≤860px 改并排**（各 `clamp(108px, 32vw, 140px)`）——首版窄屏竖排会把刊语下方拉出近 300px 空白，实测后改的。

调参：原型参数给 22000 点用，1800 点下角度抖动 `gauss*(.22+r*.32)` 会把旋臂散成一团；收成 `(.13+r*.18)`、背景星尘 20%→12%、核心半径 `.12`→`.09`、中心晕 alpha `.1`→`.08` 后，四条旋臂与朱砂亮核才分得开。

### 34.3 验证

- 干净生产构建 203 页 / 316 文件 / 13.76 MiB；首页两个 canvas（`data-tide` / `data-galaxy`）与内联脚本都在，静态请求数不变。
- CDP 像素签名三帧采样：潮汐 `true`、星海 `true`、涟漪场 `true`（三者各自在动）；点击星海中心后签名变化（回响生效）；`prefers-reduced-motion` 下三个 canvas 三帧完全一致。
- 1440 明暗两色 + 390px 窄屏截图：桌面两颗竖排、窄屏并排，都不溢出、不压标题；朱砂与墨点在明暗下层次清楚。
- 首页 / 关于 / 标记 / 归档四页控制台 0 报错；首页 Document 1req/43KB、LCP 84ms、CLS 0.0001；HTML 40.6 → 42.4KB（gzip 13.4 → 14.7KB），CSS 152.8 → 153.2KB，基本无增量。
- README 首页明暗截图重拍；设计章节「刊头右侧」、目录结构、性能基线、节数（33 → 34）同步。

### 34.4 后续修正：两颗改水平并排（同日）

用户看到桌面竖排后明确「需要水平排列……潮汐之境向左侧移动，右侧增加星盘」——上一步把「在后面」理解成 DOM / 视觉上的纵向顺序，实际要的是同一行左右相邻。

- `.masthead-orbs` 改为**全视口** `display: flex; justify-content: flex-end; align-items: flex-start; gap: clamp(.75rem, 2vw, 1.5rem)`；两颗 `margin: 0`，尺寸仍是各 `clamp(128px, 12vw, 168px)`。整体靠栏目右侧，潮汐自然左移约 190px，星盘落在它右侧。
- 删掉桌面竖排用的 `.tide { margin: 0 0 0 auto }`、`.galaxy` 顶部 margin，以及「只在 ≤860px 才启用 flex」的媒体查询；窄屏只保留等比缩小到 `clamp(108px, 32vw, 140px)`。
- 右栏是 `5fr`（1440 视口约 470px），两颗 168px + gap 约 360px 放得下；刊头高度从约 350px 回落到 168px，首屏更紧凑，「最新」与状态公报不受影响。

验证：1440 明暗 + 390px 窄屏截图确认两颗水平并排、潮汐在左星海在右、无重叠溢出；三块 canvas 仍各自在动、点击回响与 reduced-motion 静止不变；首页 / 关于 / 归档控制台 0 报错，CLS 0.0001。README 首页明暗截图重拍，设计章节「刊头右侧」同步。

---

## 三十五、V10.18：头条标题不换行、阅读页扉页收线放大（2026-11-10）

### 35.1 两条反馈

1. 首页「最新」标题换行有问题，右侧明明还有位置。
2. 阅读页标题部分的设计也需要优化。

### 35.2 首页头条：balance 提前折行 + 字号差 7.5%

`.lead-title` 原本 `text-wrap: balance`，它会主动把断点提前来「配平」两行，于是第一行「2026：在加速的时代，」没填满就换行，右栏看着空一大片。先换 `pretty`，第一行填满后第二行却只剩「行者」两个孤字，反而更差——说明问题不只是折行策略，是**宽度根本差一点**。

CDP 实测（1440 视口）：容器 762px、字号 41.6px、标题单行文字宽 807px，一行放下需要 38.5px。把字号改成 `calc(var(--step-3) * .9)`（1440 → 37.4px，仍挂在字号令牌上、不自造数值），配合 `pretty`：

| 视口 | 容器 | 字号 | 文字宽 | 行数 |
|---|---|---|---|---|
| 1440 | 762 | 37.4 | 726 | **1** |
| 1280 | 766 | 36.0 | 698 | **1** |
| 1100 | 656 | 33.8 | 656 | **1** |

三个宽度都一行显示，字号只收了 10%，头条气势基本不变。

### 35.3 阅读页扉页：去碎线、放大标题

截图从上到下是「眉题短线 → 标题 → 摘要 → 账页格子 → 2px 墨线 + 朱砂点」，问题有三：标题被 `max-width: 15em` 锁住偏小、`balance` 同样提前配平；账页 5 格的 `border-left` 制造四五条竖线；`.rd-rule` 的 `2px solid var(--ink)` 是上一轮刚全站废弃的纯墨粗线，还与眉题的「短线 + 字 + 短线」语言重复。

- `.rd-title`：字号上限 `3.1rem → 3.4rem`、`line-height 1.12 → 1.16`、`balance → pretty`。**先把 `15em` 放宽到 `18em` 时反而更糟**——放大后的标题折成「长行 + 故事」两个孤字；索性去掉行宽限制（`max-width: 100%`，扉页本身有 1200px），标题才一行完整展开。
- `.rd-ledger`：删掉 `> div + div` 的竖线，改 `column-gap: .35rem` 靠留白分组；padding 略收。
- `.rd-rule i`：`2px var(--ink)` → `1px var(--line-2)`，朱砂点与入场动画保留，只把线收进全站统一的细柔线。

### 35.4 验证

- 干净生产构建 203 页；首页头条标题 1100 / 1280 / 1440 三档均 1 行，阅读页标题在 1440 明暗两色均 1 行、390px 窄屏折成语义自然的两行且无孤字、不溢出。
- 阅读页账页去掉竖线后仍上下各一条细线框住，Aa 按钮位置正常；扉页底部朱砂点保留、线不再刺眼。
- 首页 / 阅读页 / 关于页控制台 0 报错。README 首页明暗截图重拍，设计章节「阅读页」与节数（34 → 35）同步。

---

## 三十六、V10.19：首页增补、扉页精简、侠客下线、虚构书页（2026-11-10）

### 36.1 四条反馈

1. 首页「最新」只有一篇，底部再补两篇，只显示标题与必要信息、不显示摘要，样式自定。
2. 阅读页顶部只显示标题、不显示简介，其它信息占空间过多，标题字号也太大。
3. 去除整个「侠客」的定义和数据。
4. 首页增加一个展示虚构内容与必要信息的 section，要有「小说的感觉」，样式自定。

### 36.2 首页：两篇次条 + 虚构书页

- **次条**：`home.html` 取时间序第 2、3 篇（`$leadMore := first 2 (after 1 $sorted)`），先记进 `used`，「最近发表」不再重复它们。`.front` 左栏包一层 `.front-main`（`align-items: start` 防止右栏「此刻」被拉伸），新 partial `home/lead-more.html` 只渲染标题 + 日期 / 阅读时长 + 箭头，细线分隔，无摘要。≤600px 时元信息落到标题下一行。
- **虚构书页**：新 partial `home/fictions.html` + `v10/_fictions.scss`，放在「按主题读」之后、底部按钮之前，编号 `03`。两部连载各一张书页卡片：卷号 + 状态印（已完结 / 连载中）+ 霞鹜文楷书名 + 两行截断简介 + 最近三章的**点线目录**（leader + 日期）+「共 N 章 · 读全书」。数据全部来自 `site.GetPage "section" "fictions"` 的 `.Sections` 与各章 front matter，不另建数据文件、不加载 JS；≤860px 竖排。
- 踩坑：模板注释里写 `content/fictions/*/_index.md`，`*/` 会让 Hugo 报 `comment ends before closing delimiter`；改成「content/fictions 下各部的 _index.md」。

### 36.3 阅读页扉页精简

- 模板删掉 `$lede` 变量与 `.rd-lede` 简介整块，CSS 里对应样式一并删。
- 标题字号回调：`clamp(2rem, 1.5rem+2.4vw, 3.4rem)` → `clamp(1.65rem, 1.25rem+1.5vw, 2.4rem)`（1440 下 38.4px），比 V10.8 原版还收一档；行宽仍不锁、仍用 `pretty`。
- 整体收紧：`.rd-head` 顶部 padding `clamp(1rem,3vw,3.5rem)` → `clamp(.5rem,1.5vw,1.75rem)`，标题 margin `1.1rem → .7rem`，账页 margin-top `2.25rem → 1.1rem`、内边距 `.8rem 1.1rem → .45rem .85rem`，`.rd-rule` 宽度 `15rem → 11rem`、margin-top `2.5rem → 1.25rem`。正文明显更早出现。

### 36.4 侠客整体下线

`git rm`： `content/xiake.md`（含 `/cards/links/` `/links/` `/blogroll/` 三个别名）、`assets/css/components/_links.scss`、`layouts/_shortcodes/link.html` 与历史副本 `layouts/shortcodes/link.html`、`static/img/default-favicon.svg`；另删未被跟踪的 `data/externallinks.json`。配置/文档清掉 `params.zh.yaml` 页脚「侠客」、`main.scss` 的 `_links` import、`.gitignore` 的 externallinks 行、`MARKDOWN_GUIDE.md` 的链接卡片段、README 的栏目表/目录/独立页面/已知限制四处，以及 CSS 注释里的三处提及。REFACTOR 历史章节保留。`_markup/render-link.html` 的 `.external-link` 与 Umami 的同名事件是外链渲染，不是友链，未动。

产物：`/xiake/`、`/blogroll/` 均 404，`/fictions/` 200；首页无 `xiake` / `侠客` 残留。

### 36.5 验证

- 干净生产构建 **202 页 / 311 文件 / 13.73 MiB**（侠客页 + 3 别名 + 友链图下线，少 5 个文件）；首页 HTML 42.4 → 47.0KB（gzip 14.7 → 16.0KB），CSS 152.8 → 154.3KB。
- 首页产物：次条 2 篇、虚构卡片 2 张各 3 章目录、章节编号 `01 / 02 / 03`、书名与状态正确；阅读页产物无 `rd-lede`。
- 1440 明暗两色 + 390px 窄屏截图：次条细线清爽不重复摘要、虚构书页有书卷气且不溢出、扉页紧凑但仍有呼吸感；首页 / 阅读页 / 虚构 / 关于 / 归档五页控制台 0 报错。
- README 首页明暗截图重拍，设计章节、性能基线与节数（35 → 36）同步。

### 36.6 后续微调：账页横铺一行（同日）

用户反馈「写于、篇幅、阅读、章节这部分采用横铺的方式，且整体小一些，不要占据过多空间」。截图里账页仍是「标签在上、值在下」两行，还被上下两条 1px 线夹着，是扉页里最后一块占地方的元素。

- `.rd-ledger`：`> div` 从 `flex-direction: column` 改成 `row` + `align-items: baseline`，每项变成「写于 2026年2月17日 早上」这样一行；`border-top/bottom`、padding 全部去掉，改 `column-gap: clamp(.9rem, 2vw, 1.75rem)` + `row-gap: .3rem` 分组；`dt` / `dd` / `.post-date` 统一降到 `--step--2`，`dt` 换等宽字族并收字距。
- `.rd-aa`：44px → 32px，字号 `.95rem → .8rem`；`.rd-ledger-tool` 补 `align-items: center`（它是 inline-grid，不能跟其它项 baseline 对齐）。
- `.rd-rule` 上边距 `1.25rem → 1rem`，正文再近一点。
- **窄屏旧规则冲突**：`@media (max-width: 767px)` 里原有一段「账页压成一行流、去掉标签」的规则，用 sr-only 藏掉 `dt` 并加回 `.7rem` padding，导致 390px 下只剩一串值。改成只收紧 `gap: .25rem .7rem`、Aa 30px、`rd-rule` 1rem，标签保留、允许换行。

验证：1440 明暗两色账页只剩一行、无框线、Aa 明显收小，标题到正文的距离进一步缩短；390px 窄屏标签与值都可见、换行正常不溢出；首页 / 文章页 / 归档三页控制台 0 报错。README 阅读页条目同步。

---

## 三十七、V10.21：整站分享体验与 SEO 图文收口（2026-11-10）

### 37.1 反馈

「优化一些整站的分享体验，以及分享的一些图文设置，以便更好的 SEO」。盘点后发现四个真问题，不只是「补几个 meta」。

### 37.2 结构化数据本来是坏的

`head/siteinfo.html` 旧版 JSON-LD 是手拼字符串，问题叠在一起：全站（含首页 / 归档 / 关于）都标 `BlogPosting`；`keywords` 的 `range` 每项后都带逗号，生成 `["a","b",]` 这类**非法 JSON**，整段结构化数据会被搜索引擎丢弃；`mainEntityOfPage.@id` 永远指向首页；`@context` 用 `http://schema.org`；`author` / `publisher` 是裸字符串；`dateModified` 直接复用 `.Date`。

重写为 Hugo `dict` + `jsonify | safeJS`，按页面类型分流：

| 页面 | @type | 关键字段 |
|---|---|---|
| 首页 | `WebSite` | name / url / description / author / publisher / image |
| 带栏目的文章页 | `BlogPosting` | headline、image、datePublished / dateModified、mainEntityOfPage（**当前页 URL**）、articleSection、keywords、wordCount |
| 关于 / 标记等独立页 | `WebPage` | isPartOf → WebSite |
| 归档 / 标签等列表 | `CollectionPage` | isPartOf → WebSite |

`og:type` 同步按这个分流（只有真文章才是 `article`），并补 `article:published_time` / `modified_time` / `section` / `tag`。

### 37.3 分享图文与 meta

- **标题**：非首页统一 `标题 · 一点`，分享出去能认出站点；`og:title` / `twitter:title` 仍用纯标题。
- **描述**：文章按 `Params.description → .Description → .Summary → 站点描述` 优先链取，`plainify` 后 `truncate 160`，避免自动摘要被腰斩。
- **分享图**：旧逻辑从正文抓第一张 `<img>` 当 OG 图，尺寸 / 比例不可控；且无论什么图都硬标 `1200×630 / image/png`。现在只用显式指定的 `og_image` / `banner`，否则统一用默认卡；宽高与类型**只在默认卡时输出**。补 `og:image:alt` / `twitter:image:alt`。
- **其它标准字段**：`og:site_name`、`og:locale=zh_CN`、明暗两套 `theme-color`、`name=robots`（含 `max-image-preview:large`，让抓取器愿意出大图卡片）；`twitter:card` 全站改 `summary_large_image`（旧版首页是 `summary`，没有大图）。
- **默认分享卡重画**：旧 `img/header.png` 还停留在 V10.5 的点阵形状与旧标语「向死而生」，和现在「实心朱砂点 + 纸墨」对不上。新增 `scripts/gen-og-image.py`（Pillow + 系统字体）生成 1200×630 卡片：域名 / 黑体「一点」+ 实心朱砂点 / 当前主张 / 分类信息，oxipng 后 20.5KB（旧图 44KB）。脚本入库，改标语可复现。
- **配置清理**：`params.yaml` 里 `favicon` 被定义两次，后者 `/favicon.png` 根本不存在；删掉重复项，站点描述也改成与「一点」品牌一致的文案。

### 37.4 robots 与桌面分享

- `static/robots.txt` 末尾是 `User-agent: * / Disallow: /` —— 所有未列名的爬虫（含微信 / QQ / 知乎 / 小红书的分享预览抓取）全被挡在门外，og 卡片根本抓不到。改成 `Allow: /`，并补 LinkedInBot / Slackbot / WhatsApp / Weibo / Sogou / 360Spider / PetalBot / Applebot 等预览 UA；AI 爬虫仍单独拦。
- `assets/js/reading.js`：旧版「分享」按钮只在 `navigator.share` 存在时显示，桌面基本看不到；摘句工具条的「分享」同理。现在两者桌面也显示，触屏走系统分享，桌面降级为复制一段「《标题》 + 摘要 + 链接」的分享文案（新增 `pageDesc()` / `shareCard()` / `systemShare()`），按钮文案与 toast 都有反馈。

### 37.5 验证

- 干净生产构建 202 页；首页 / 文章页 / 归档页 / 关于页 / 标记页五类 JSON-LD 全部 `json.loads` 通过，类型分别为 WebSite / BlogPosting / CollectionPage / WebPage / WebPage，`og:type` 一致。
- `node --check` 通过；CDP 实测桌面 `hasShare=true` 但 `pointer: coarse=false` 时走降级：点击后按钮变「文案已复制 ✓」、toast「分享文案已复制」，摘句工具条有 2 个按钮。
- 首页 / 文章页 / 关于页 / 归档页控制台 0 报错；`robots.txt` 默认放行、Sitemap 指向正确；分享图 1200×630。
- README 新增「分享与 SEO」条目、更新生成物说明与节数（36 → 37）。

### 36.7 后续修正：阅读页标题宽度（同日，V10.22）

用户指出「阅读页标题的宽度问题很大，注意细节啊」——截图里长标题（*Dan Koe：从亚马逊卖家到「一人公司」教父——数字时代个体创业者的进化轨迹*）第一行顶到右侧点线目录，第二行只剩「化轨迹」三个字。

根因在 V10.19：为了让放大后的标题一行放得下，把 `.rd-title` 的 `max-width` 从 `15em` 一路放到 `100%`，等于按**扉页全宽 1200px** 排字；但正文栏是 `--rd-measure`（≥1100px 时为 `min(980px, 100vw - 26rem)`，已经为右侧目录留出通道），两者差了 220px。短标题看不出来，长标题就越界 + 折出孤字尾行。

- `max-width` 改为 `#{"min(var(--rd-measure), 100%)"}`：标题盒子与正文栏**同宽同左右边界**，窄屏仍自动收缩。`min()` 必须插值输出，否则 LibSass 会对混合单位求值报错。
- `text-wrap: pretty → balance`：中文 `pretty` 不保证不出现孤字（实测就是「化轨迹」）；扉页标题是居中排版，`balance` 把长标题配成长度接近的两行，短标题仍是一行，不会像首页左对齐标题那样显得右侧空。

CDP 三档实测（长标题）：

| 视口 | 标题宽 | 正文宽 | 左右边界差 | 距目录 | 行数 |
|---|---|---|---|---|---|
| 1440 | 980 | 980 | 0 | 24px | 2 |
| 1280 | 864 | 864 | 0 | 24px | 2 |
| 1100 | 684 | 684 | 0 | 24px | 2 |

短标题（22 字）1440 下仍 1 行；390px 窄屏长标题折成三行且各行长度接近，无孤字、不溢出。首页 / 长标题文章 / 短标题文章 / 归档四页控制台 0 报错。README 阅读页条目同步。

---

## 三十八、V10.23：正文渲染与 markdown 排版重做（2026-11-10）

### 38.1 反馈与方向

「文章内容的渲染色值、文字样式、markdown 内容渲染整体优化一下，目前没有设计感，阅读也不好，没有吸引力」。给了三个字体方向让选，用户明确「**整体使用霞鹜文楷，已经在项目中了**」——不换字体、不引新字族，把力气放在字距、色值层次、强调方式与 markdown 元素上。

### 38.2 诊断：四个叠加的问题

1. **字距被拉伸**：`.rd .rd-prose > p, li` 用 `text-align: justify` + `text-justify: inter-character`，中文逐字拉伸，行长一致但字距忽宽忽窄，是「阅读不好」的主因。
2. **朱砂滥用**：`strong { color: var(--mark-strong) }`（明色暗朱 / 暗色亮粉）让整段强调句都是红字，满屏重点等于没有重点。
3. **楷体发虚**：正文继承旧 `.markdown-body` 的字号与行高，霞鹜文楷笔画细、灰度高，小字号下显得平、没精神。
4. **两套样式打架**：`_markdown.scss` 是旧版全局样式，会给阅读页正文漏进「行内代码前后加反引号」「链接前插站点 favicon」「代码块右侧竖排语言标签」「表头旧底色」等装饰；`_reading.scss` 只覆盖了其中一部分。

### 38.3 做法

重写 `.rd .rd-prose` 整段（保留 h2 宽屏编号悬挂等外部规则）：

- **基础**：`font-family: var(--font-read)`（霞鹜文楷，项目自带）、`font-size: 1.125rem`、`line-height: 1.85`、`letter-spacing: .012em`、`p` 段距 `1.05em`；`text-align: left` / `text-justify: auto` / `hyphens: none`，彻底取消逐字拉伸。
- **色值与强调**：正文 `--ink-1`、标题 `--ink`、引文 `--ink-2`、图注 `--ink-3` 四级；朱砂只留在 h2 编号、h3 小圆点、列表圆点、首字下沉、引用细线、分隔线中点、链接 hover。`strong` 改 `--ink` + 700 字重 + 淡 `--zhu-wash` 底线；`em` 用 `text-emphasis: filled dot` 中文着重号（比斜体更贴合楷体）。
- **层级**：h2 加 `1px --line-2` 下压细线、上留白 2.8em；h3 加一枚 `.3em` 朱砂圆点；首字下沉改用楷体 + `--zhu-ink` 朱砂，作为开篇记忆点。
- **markdown 元素**：引用块改淡 `--surface` 底 + `1px --zhu-line` 左线 + 悬挂「」；代码块改 `--paper-2` 底 + `1px --line-2` 细线、等宽；行内代码去掉反引号；表格表头改 `--step--2` 朱砂小字、去旧底色；`hr` 改成「一条细线 + 正中一枚朱砂点」（`::before` 线 / `::after` 点，用 `--paper` 盖住线心）。
- **清理污染**：在 `.rd .rd-prose` 内显式 reset `a::before`、`:not(pre) > code::before/::after`、`pre > code::before`、`thead`，不动 `_markdown.scss` 全局（其它页面仍用旧样式）。顺手删掉 reduced-motion 段里指向已下线 `.rd-lede` 的死规则；窄屏引文另收内边距与行距。

### 38.4 验证

- 干净生产构建 202 页 / 311 文件 / 13.82 MiB，CSS 154.3 → 155.7KB（gzip 27.9 → 28.2KB）。
- CDP computed：390 / 1440 两档下 `p` / `li` / `blockquote p` 均为 `text-align: left`、`text-justify: auto`、`word-spacing: 0`，正文 `LXGW WenKai`、行高 33.3px；注入全元素片段后确认行内代码反引号 `none`、链接图标 `display:none`、代码块竖排标签 `none`、`em` 着重号 `dot`、表头背景透明、`hr` 中点为 `·`。
- 1440 明暗两色实文（长文 / 含表格引用的文章）+ 390px 窄屏截图：字距自然、朱砂强调克制、h2 编号与细线、引用块、表格、列表、分隔线层次清楚；首页 / 两篇文章 / 关于页控制台 0 报错。
- README 新增「正文排版」条目、性能基线与节数（37 → 38）同步。

### 38.5 后续修正：引用块去掉折角引号（同日，V10.24）

用户截图反馈引用块渲染不好看：左上角一个红色直角折角，引文文字被推到偏右，整块发灰。

根因是 V10.23 把旧 `_markdown.scss` 的弯引号 `“` 改成了 `「` —— U+300C 在横排楷体里就是一个直角折角，像半个框；同时为这个绝对定位字符留了 `padding-left: 2.6em`，文字因此偏右、左右留白失衡。旧样式还留着 `position:absolute / left:.5em / font-size:2.4em` 等属性，新规则必须显式覆盖干净。

- **撤掉引号字符**：`::before` 改成 `content: ""` 的 7px 实心朱砂圆点，`left:-3px` 让圆心压在 1px 朱砂细线上，成为「线头一点」，呼应品牌原子；旧版的 absolute / 字号 / 颜色全部显式覆盖。
- **留白与字色**：`padding: 1.15em 1.6em 1.2em`（左右对称，不再是 2.6em 左侧），字号 `1.05 → 1.1em`，行距 `1.9 → 1.85`，字色 `--ink-2 → --ink-1`（暗色下更清楚）；窄屏 padding 同步改左右对称。
- **嵌套引用**：`blockquote blockquote::before { content: none }`，不再重复线头圆点；内层细线改 `--line-2`、字号收回 .94em。

验证：CDP 实测外层 `::before` 为 `""` / 7×7px / 朱砂 / absolute，内层为 `none`，外层 padding `19.8px 23.76px`、左线 `1px rgba(217,67,31,.35)`；1440 明暗 + 390px 窄屏截图确认折角消失、文字不再偏右、线头圆点可见；首页 / 文章 / 关于三页控制台 0 报错。README「正文排版」条目同步。

---

## 三十九、V10.25：Twitter Card 一直是旧图的根因与收口（2026-11-10）

### 39.1 现象

用户反馈「现在的 twitter card 还是旧的图」，截图是一张黑底骷髅插画，既不是 V10.21 重画的新卡，也不是旧版 `header.png`（纸色底 + 点阵形状）。

### 39.2 诊断：不是模板没部署

抓线上 `https://yakoxff.pages.dev/` 核对，V10.21 的 head 已经生效：`og:image` / `twitter:image` 都指向 `/img/header.png`，`og:image:alt` 是「一点 · 独立写作」，`twitter:card` 是 `summary_large_image`。所以问题不在 meta。

真正原因是两层缓存叠加：

1. **X 的卡片按 URL 长期缓存**。图片地址从始至终是同一个 `/img/header.png`，即使文件内容与 meta 全换了，X 不会为已缓存的 URL 重新抓取，会一直展示它第一次抓到的图（那张骷髅插画很可能来自更早版本的页面内图片）。
2. **`static/_headers` 给 `/img/*` 设了 `max-age=2592000`（30 天）**。线上响应头实测是 `public, max-age=0, must-revalidate, public, max-age=2592000` 两个值合并，CDN 与抓取器也会拿旧文件。

### 39.3 做法：换 URL + 脱离长缓存目录

- 分享图改名并挪到 **`static/share/og-card-v2.png`**，URL 变成 `/share/og-card-v2.png`。新 URL 对 X 而言是全新资源，必须重新抓；版本号写在文件名里，以后换卡片递增 v3 / v4 即可。
- `params.yaml` 的 `default_og_image` 同步改指新路径；`scripts/gen-og-image.py` 的输出路径、docstring 与用法同步（生成内容与旧 `header.png` 像素一致，只是换了地址）。
- `/share/` **不匹配 `/img/*` 规则**，只受全站兜底 `max-age=0, must-revalidate`；另在 `_headers` 显式补一条 `/share/*` 同名规则并写明原因，避免以后被误加长缓存。
- 旧 `/img/header.png` **保留不删**：`components/logo.html` 仍以它为默认值（虽已无模板引用），且旧分享链接不该变成 404。

### 39.4 验证与仍需注意的 X 侧缓存

- 干净构建 202 页 / 312 文件 / 13.84 MiB；首页、文章页、归档页、关于页四类页面的 `og:image` 与 `twitter:image` 全部指向 `https://yakoxff.pages.dev/share/og-card-v2.png`；`og:image:width/height/type` 仍正确输出；`public/share/og-card-v2.png` 1200×630 / 21KB，`public/_headers` 含 `/share/*` 规则。
- **工程侧只能保证新抓取拿到新卡**：已发布旧推文的卡片由 X 缓存并转存，不会回源更新。要立刻验证，用带查询参数的新链接（如 `https://yakoxff.pages.dev/?v=2`）发一条测试推文，或登录 X 的 Card Validator 重新抓取该 URL；之后正常分享首页链接即可。

- README「分享与 SEO」、目录结构、生成物说明、性能基线（311 → 312 文件）与节数同步。

---

## 四十、重生第一篇：把三十九节记录写成一篇文章（2026-11-10）

### 40.1 需求与方向

「完整整理输出一篇设计优化文章，作为当前站点重生的开始，不仅仅要讲清楚底层设计逻辑，还要配有图等有意思的内容」。给了两组方向让用户选，结果：**题眼 C 编年**（按 V10 → V10.25 逐轮复盘，每轮一个具体场景 + 一组前后数据）、**形态 A 站点长文 + 混合配图**。

### 40.2 文章

`content/posts/付印之前：三十九道红笔.md`，约 5500 字，`date: 2026-11-10`，因此发布后自动成为首页头条——正好是「重生第一篇」的位置。

- 主线用「**付印前的校样 / 红笔**」贯穿全篇（标题、第一张待付印的纸、第一道红笔、划掉的一半、印版上的尺寸、结尾那张还没被分享过的卡片）。
- 慢起点：开篇只写两张并排的截图、来回滑动的手指、一杯早上倒的凉水，200 字内不抛概念；结尾停在画面上，不总结。
- 具体名词承载抽象逻辑：762 / 807 / 41.6 → 37.4px、22000 → 1800 点、350 → 168px、44 → 32px、980 / 864 / 684、7px 线头圆点、30 天缓存、312 个文件。判断句一律压在段尾，后面不再解释。
- 底层设计逻辑单列一节，拆成**令牌 / 网格 / 内容 / 缓存**四层，每层给变量、数值或代码；另附一张 13 行编年表（轮次 / 那天的画面 / 改动 / 前后数字）。
- 顺手修了两处阅读瑕疵：开篇「11 月 10 日」改汉字「十一月十日」，避免 `::first-letter` 把「11」切成一枚放大的「1」；编年表「新图 200」补成「HTTP 200」。

### 40.3 配图（`static/img/rebirth/`，共 10 张）

| 类型 | 文件 | 说明 |
|---|---|---|
| 生成插画 | `01-cover.webp`、`10-night.webp` | 纸 + 红铅笔 + 一枚实心朱砂点；深夜台灯、校样与那杯凉水。无文字，转 WebP 后 64KB / 23KB |
| 手绘 SVG | `02-system.svg`、`03-orbs.svg`、`04-title-width.svg`、`08-layers.svg`、`09-timeline.svg` | 色卡字阶网格、两球摆法、762 与 807、四层规矩、V10 → V10.25 时间轴 |
| 真实前后对比 | `05-head-before-after.webp`、`06-prose-before-after.webp`、`07-quote-before-after.webp` | 扉页、正文、引用块；同一篇文章同一裁切区域，上下排布 + 朱砂点标签 |

对比图用 Pillow 拼图脚本生成，生成插画用 ImageGen（两张，约 10–20 额度，已提前告知）。全部图片总量约 670KB。

### 40.4 验证

- 干净生产构建 **211 页 / 331 文件 / 14.4 MiB**（新增文章页、4 个新标签页与 10 张图）；首页 HTML 47.3KB / gzip 15.9KB。
- 文章内 10 张图引用全部有产物；5 张 SVG 通过 XML 解析；CDP 实测 9 张即时加载、最后一张 `08-layers.svg` 因懒加载时序需滚到视口，滚入后正常得到 1200×520（浏览器直接打开该文件亦无 parsererror）。
- 1440 明暗两色分段截图：题图、SVG 中文与数字、前后对比、编年表、结尾「全文完」均正常；页面共 9 个 h2、1 张表格、约 5500 字。
- 首页 / 文章页 / 归档 / 关于四页控制台 0 报错；README 首页明暗截图重拍（头条换成新文章）。
- README 新增「重生第一篇」条目、性能基线与节数（39 → 40）同步。

---

## 四十一、V10.26：点线目录等距靠右，宽图不再压住章节名（2026-11-10）

### 41.1 反馈与根因

用户截图：文章里的宽图（外扩出血）盖住了右侧点线目录，章节名与图片叠在一起。要求「去掉右侧的章节之间的距离」，并让目录「整体靠右一些」。

两处原因叠在一起：

1. **点距按内容长度分布**。`reading.js` 的 `measure()` 会把每个 h2 在全文中的真实相对位置写进 `--at`，`.rd-rail-item` 按它绝对定位；长章节之间就被拉出 100px 上下的空档，短章节挤在一起，目录在垂直方向铺得很开。
2. **图片右缘越过了目录左缘**。`--rd-wide` 是 `min(1200px, 100vw - 3rem)`，1440 视口下宽图居中后右缘到 1320px；而 `.rd-rail` 的 `--rail-gap` 只有 `1.5rem`，左缘在 1234px —— 必然重叠 86px。单纯把目录右移解决不了：要完全避开 1320px，通道得压到约 100px，章节名放不下。

### 41.2 做法

- **点等距**：`.rd-rail-list` 改 `display:flex; flex-direction:column; justify-content:space-between`，`.rd-rail-item` 从 `position:absolute + top:var(--at)` 改成 `position:relative`，条目在目录高度内均匀铺排。`measure()` 不再设置 `--at`，但 `geo.marks` 保留——`update()` 判断当前章仍要按章节真实位置。
- **目录右移**：`--rail-gap: 1.5rem → 2.5rem`，1440 视口下左缘 1234 → 1250px，宽度 166px，右缘 1416px 仍留 24px 页边。
- **图片避让**：新增 `@media (min-width:1100px)` 规则，仅在 `html.rd-has-rail:not([data-width="wide"])` 时把 `p:has(> img:only-child)` 与 `figure` 的宽度收成 `calc(100% + 1rem)`、`margin-left: -.5rem`——右缘只到正文栏右缘 + 8px，与目录之间留 32px。窄屏（<1100px）目录隐藏，仍保留原来的双侧大出血；栏宽设为「宽」时目录本就不显示，也不限制图片。

### 41.3 验证

CDP 四档视口实测（长文含 1200×620 的宽图）：

| 视口 | 目录左缘 | 图片右缘 | 间隙 | 点距最大差 |
|---|---|---|---|---|
| 1440 | 1250 | 1218 | **32px** | 1px |
| 1280 | 1112 | 1080 | **32px** | 1px |
| 1100 | 932 | 900 | **32px** | 1px |
| 390 | 隐藏 | — | — | — |

九个点间距 `[68,67,68,67,68,67,68,67]`，误差 1px；390px 下目录 `display:none`、图片回到正文宽。`node --check` 通过，1440 明暗两色视口截图确认宽图与章节名之间留出干净间隙，首页 / 文章 / 归档 / 关于四页控制台 0 报错。README 阅读页条目与节数（40 → 41）同步。

### 41.5 后续修正：章节完全紧挨成一簇（同日，V10.27）

用户明确「『去掉章节之间的距离』是想要它们完全紧挨成一簇（而不是等距铺开）」。V10.26 做成了 flex `space-between` 等距，方向理解偏了，这轮改成真正的一簇。

- `.rd-rail` 在 ≥1100px 时由 `display:block` 改成 `display:flex; align-items:center`；`.rd-rail-list` 从 `absolute + inset:0 + space-between` 改成 `position:relative; width:100%; flex-column; gap:0`。九条 `min-height:26px` 的条目紧挨成 234px 的一簇，垂直居中。
- **进度线必须跟着缩短**：否则 `.rd-rail-line` 仍铺满 566px 的目录高度、朱砂珠按 `--rd-p` 跑到列表外。`measure()` 里量出 `ol.offsetHeight` 写到 `--rail-cluster-h`；`.rd-rail-line` 用 `height: var(--rail-cluster-h)` + `top:50%` 居中，`.rd-rail-bead` 的 `top` 改为 `calc(50% - h/2 + var(--rd-p) * h)`（SCSS 插值输出，避开 LibSass 对混合单位求值）。`.rd-rail-fill` 仍按 `var(--rd-p) * 100%` 相对缩短后的线。
- 只改排布，不动 V10.26 的靠右距离与图片避让规则。

验证：CDP 实测条目间距全为 26px（误差 0）、簇高 234px、线高 234px 且 `lineTop === listTop`、朱砂珠在线内、`--rail-cluster-h: 234px`；1440 / 1280 / 1100 三档图片与目录仍稳定留 32px，390px 目录隐藏；明暗两色视口截图、四页控制台 0 报错。README 阅读页条目同步。

---

## 四十二、V10.28：Cloudflare Pages 访问慢的诊断与四项收口（2026-11-10）

### 42.1 诊断

用户反馈「部署在 Cloudflare Pages 上，访问很慢，对比同类型站点也没这么慢」。所有测量都在同一个本机代理（`127.0.0.1:49389`）与同一个无头 Chrome 下做对照。

| 场景 | TTFB | load | 传输 |
|---|---|---|---|
| 本地同源（屏蔽第三方） | 20ms | 174ms 完成 | 1.57MB |
| 线上，含第三方 | 5020ms | 41s 仍 `interactive` | 只 31KB |
| 线上，屏蔽 Umami + giscus | 2268ms | 6929ms 完成 | 1.43MB |
| 参照 `gohugo.io` | 1920ms | 3725ms 完成 | 265KB |
| 参照 `www.cloudflare.com`（curl） | 620ms | — | — |

curl 三次：TLS 1.68 / 3.10 / 3.94s，TTFB 2.75 / 3.73 / 4.80s，一次 30s 超时只传 2729B；绕过代理直连 3/3 超时。`cf-ray` 本站落 **LAX**，同代理 `www.cloudflare.com` 落 **HKG**。HTML Brotli 正常。

**结论：代码本身不慢（本地 174ms），慢在三层叠加**——① `*.pages.dev` 链路（LAX + 跨境丢包）② HTML `max-age=0, must-revalidate` 每次回源 ③ 首屏两个 woff2 共 1.37MB（占 96%）+ Umami 动态脚本挂起拖住 `load`（`script.defer` 对动态插入的脚本不生效）。

### 42.2 四项改动

1. **HTML 缓存头**：`static/_headers` 的 `/*` 兜底从 `public, max-age=0, must-revalidate` 改为 `public, max-age=0, s-maxage=300, stale-while-revalidate=86400`——浏览器仍每次校验，CDN 可缓存 5 分钟并后台刷新；Pages 部署会主动 purge，新文章仍立即可见。`/share/*` 的 `must-revalidate` 保留。注释移到规则块外，避免被 `_headers` 解析器当成 header。
2. **Umami 延迟挂载**：`head/umami.html` 里 `defer = true` 改 `async = true`，去掉立即 `appendChild`，改为 `window.load` 之后（或 `readyState === 'complete'` 时）才 `mountUmami()`；`umamiTrack` / 滚动与点击跟踪逻辑不变。产物里 `mountUmami` 与 `window.addEventListener("load"...)` 均在。
3. **字体**：`_fonts.scss` 只保留一个 `@font-face`，`font-weight: 100 900` 覆盖全部字重（加粗由浏览器合成），删掉 `lxgw-wenkai-medium.woff2`；head 加 `<link rel=preload as=font ... crossorigin>`，`font-display: swap` 保持。`scripts/build-font-subset.sh` 同步改为只生成 Regular。用 `uv` 临时装 `fonttools 4.68 + brotli` 重跑裁剪脚本，字符集 3111（汉字 2911），补齐了新文章带来的 5 个缺字（丘搁敛斩矮），产物 681KB。
4. **大图转 WebP**：`static/img` 下 ≥100KB 的 PNG/JPG 共 9 张转 quality 82 WebP，同步替换 4 个 Markdown 的引用；零引用的 `mindmap-original-4k.png`（2.1MB）直接删除。`settings.png` 1103→80KB、`reader-view.png` 518→90KB、`WeChat.png` 227→28KB。转换后引用 0 失效，剩余最大 PNG 仅 94KB。

### 42.3 验证

- 构建 211 页 / **329 文件 / 9.05 MiB**（原 331 文件 / 14.37 MiB，少 5.3 MiB / 37%）；字体目录只剩 681KB 一个文件。
- 本地同 Chrome 首屏传输 **1.57MB → 868KB**，TTFB 28ms、`load` 148ms；**不屏蔽第三方时 `load` 也在 153ms 完成**（此前会一直停在 `interactive`），证明 Umami 不再拖住页面。
- 明暗截图：首页刊语、标题层级、文章页楷体与 `strong` 合成加粗均清晰，WebP 图片正常；首页 / 文章 / 归档 / 关于四页控制台 0 报错。
- README 字体章节、部署段、性能基线、节数（41 → 42）同步。

### 42.4 仍需用户决策的部分

链路层（⑤）未动：`*.pages.dev` 落 LAX 与国内跨境质量不是仓库能改的，要绑自定义域名或换国内 CDN。另外顺带发现 CSP 的 `script-src` 只有 `'self'`，外部 `cloud.umami.is` 可能被拦截、统计未必生效；本轮只解决它拖慢页面的问题，未擅自放宽安全策略。

---

## 四十三、V10.29：去掉自托管字体，正文改用系统宋体（2026-11-10）

### 43.1 选型

用户问「去掉自定义字体、采用系统自带字体，哪种比较好」。先查了 `--font-read` 的影响面（全站约 20 处：base、阅读页、首页刊语、此刻栏、虚构书页、页脚、标记页、关于页等），再用浏览器 canvas 实测本机可用字族：`Songti SC` / `STSong` / `Kaiti SC` / `STKaiti` / `PingFang SC` / `STHeiti` 可用，`SimSun` / `Microsoft YaHei` / `Noto Serif CJK SC` 不在 macOS 本机（属 Windows / Linux 侧）。

给了四种同段正文的并排样张：A 宋体、B 系统楷体、C 系统黑体、D 标题黑体 + 正文宋体。用户选 **A 宋体优先**。

理由：中文印刷正文的标准字体就是宋体，横细竖粗、有顿笔，在「纸墨朱砂 / 书页」的版式里最接近原先的楷体气质；系统楷体（B）虽在 macOS 上几乎无差别，但 Windows 的 KaiTi 笔画细、长文吃力；黑体（C）最清晰却会把站点变成现代网页感。

### 43.2 字体栈与取舍

```css
--font-read: "Songti SC", "STSong", "Noto Serif CJK SC",
             "Source Han Serif SC", "Microsoft YaHei", sans-serif;
```

**刻意跳过 `SimSun`**：Windows 的中易宋体在 18px 下发虚、有锯齿，让它落到微软雅黑更可读。代价是各平台字形不再一致——这本来就是自托管字体当初要解决的问题，去掉它就得接受：

| 平台 | 实际落点 |
|---|---|
| macOS / iOS | Songti SC（CDP `CSS.getPlatformFontsForNode` 实测） |
| Windows | Microsoft YaHei |
| Android / Linux | Noto Serif CJK SC，或最终 sans |

### 43.3 改动清单

- `_tokens.scss` 的 `--font-read` 换成上面的宋体栈，注释改「黑体立骨，宋体行文，等宽记账」；`utils/_variables.scss` 的 `--font-serif` 同步；`layouts/fictions/section.html` 里硬编码的 `"LXGW WenKai"` 一并换掉。
- **删除**：`assets/css/_fonts.scss`（及 `main.scss` 的 `@import "fonts"`）、`static/fonts/lxgw-wenkai-regular.woff2`、`scripts/build-font-subset.sh`、`head.html` 的字体 `preload`、`static/_headers` 的 `/fonts/*` 缓存规则。
- **同步文案**：`head/css.html`、`_fictions.scss`、`_reading.scss`、`_dispatch.scss` 的过时注释，`layouts/about.html` 的「字　体」一行；编年长文《付印之前》在编年表后补一句「字体文件被拿走、正文换上系统宋体」，保留上文对当时楷体的历史描述。
- README 字体章节重写（含四角色字体栈与跳过 SimSun 的原因）、许可里删掉 SIL OFL、依赖表与维护命令表删掉字体工具、性能基线、节数（42 → 43）同步。

### 43.4 验证

- 构建 211 页 / **328 文件 / 8.38 MiB**（再省 681KB）；产物无 woff2、CSS 无 `@font-face`、HTML 无 preload、`_headers` 无 fonts 规则。
- CDP 实测 computed `font-family` 为宋体栈、`CSS.getPlatformFontsForNode` 返回 **`Songti SC`**，确认真的落到系统宋体而非回退。
- 本地同浏览器首屏传输 **868KB → 170KB**（4 个资源，TTFB 76ms、`load` 234ms）；明暗截图宋体正文的顿笔、行距、加粗强调与标题层级均协调；首页 / 文章 / 归档 / 关于四页控制台 0 报错。
- 首屏传输三轮变化：1.57MB（初始）→ 868KB（V10.28）→ 170KB（V10.29）。

---

## 四十四、V10.30：相关 OG 图同步（2026-11-10）

用户指出「相关 og 图也需要更新」。全站只有一张默认分享卡（content 里无 `og_image` / `banner` 覆盖），`static/share/og-card-v2.png` 是 V10.25 生成的，主张与底部分类文字仍用黑体；V10.29 全站正文改系统宋体后，卡片跟站点「黑体立骨、宋体行文、等宽记账」的分工对不上了。

- `scripts/gen-og-image.py`：新增 `SONG = /System/Library/Fonts/Supplemental/Songti.ttc`、`SONG_INDEX = 4`（`STSong Regular`）；主张「写下来，就是在时间里刻下坐标。」与底部「独立写作 · 技术 / 思考 / 生活」/ 署名改宋体，大字「一点」保持系统黑体，域名仍等宽。构图、色值、留白不动。
- **按 V10.25 定下的规矩递增 URL**：输出改 `og-card-v3.png`，`params.yaml` 的 `default_og_image` 同步。只换文件内容不换地址，X 会继续用缓存的旧卡。v2 与更早的 `img/header.png` 保留，旧分享链接不裂。
- README 分享与 SEO 条目、目录结构、生成物说明、性能基线（328 → 329 文件）与节数（43 → 44）同步。

验证：新卡 1200×630 / 20.4KB，视觉确认宋体顿笔无缺字、黑体大字与朱砂点保留；构建后四类页面的 `og:image` / `twitter:image` 均指向 v3，`og:image:width/height/type` 仍由 `$isDefaultImage` 正确输出，`/share/*` 的 `max-age=0, must-revalidate` 规则未变。

---

## 四十五、V10.31：分享卡大字也换宋体并升 v4（2026-11-10）

### 45.1 反馈

用户看了 v3 后问「为什么文字『一点』没有发生字体变更」。原因是 V10.30 把卡片里的「一点」当**标题**处理：站点 `--font-display` 一直是系统黑体，V10.29 切换的只是正文角色 `--font-read`，所以那次只换了主张与底部分类，大字一个像素未动。

这个判断符合站点分工，但卡片是对外形象，最显眼的两个字没变会让人觉得没改完。于是出了两版预览：宋体 Bold（大字与标语同族、顿笔连贯、分量够）与宋体 Regular（「一」横过细，与「点」的方框和朱砂点失衡）。用户选 **Bold**。

### 45.2 改动

- `scripts/gen-og-image.py`：`big` 从 `Hiragino Sans GB` 黑体改成 `Songti.ttc` 的 `Songti SC Bold`（index 1）；加 `SONG_BOLD_INDEX` 常量，删掉已无引用的 `HEI`。大字、标语、底部分类至此全部宋体，域名仍等宽；构图、色值、朱砂点位置（由 `textbbox` 自适应）不变。
- **再次递增 URL**：输出 `og-card-v4.png`，`params.yaml` 的 `default_og_image` 同步。沿用 v3 地址 X 会继续用缓存里的黑体大字卡，改了等于没改。v2 / v3 / `img/header.png` 全部保留兼容旧链接。
- README 分享与 SEO 条目、目录结构、生成物说明、性能基线（329 → 330 文件）与节数（44 → 45）同步。

### 45.3 验证

- 新卡 1200×630 / 21.1KB，与预览图逐像素一致；宋体大字的三角顿笔与横细竖粗清楚，无缺字。
- 构建后首页 / 文章 / 归档 / 关于四类页面的 `og:image` 与 `twitter:image` 均指向 v4，`og:image:width/height/type` 仍由 `$isDefaultImage` 正确输出；`/share/*` 短缓存规则未变。
- 线上复查 `og:image` 与 v4 图片可访问性。

---

## 四十六、品牌长文《一笔，一枚点》（2026-11-10）

### 46.1 需求与素材

用户「写一篇为什么我们最终定义为『一点』，并给出底层思考」。题眼已给定，直接写。素材全部来自项目真实记录，没有编品牌故事：

- 命名史：V4 万圣节插画 → 朱砂方印；V10「一点记」+ 全站一枚朱砂点；V10.2 方印下线改「一笔横画 + 一枚朱砂『、』」（起笔厚 16、行笔 9、`feTurbulence` 洇墨、750ms 三拍动画）；V10.5 去掉「记」、新增 5×5 点阵按栏目变形（圆 21 / 方 16 / 三角 17 / 弧 11 / 十字 9 点，`CLEAR=38` 给涟漪让路）；V10.16 三处回归实心圆（14px / `.19em` / 8px）。
- 底层：V10.5 记的理由是「『记』是品类后缀，站里同时有随笔、小说连载和应用」；V10.16 的判断是「同一个品牌原子不该有两种形态」。
- 今天的收敛：V10.29 系统宋体、V10.31 分享卡整体宋体、V10.28 首屏 1.57MB → 170KB、V10.25~31 分享卡 v2 → v4。

### 46.2 文章

`content/posts/一笔，一枚点：为什么最后叫「一点」.md`，约 4100 字，`date: 2026-11-10T19:50:00+08:00`（带时分，压过同日的《付印之前》成为首页头条）。

主线是「**从一点量出去**」：开篇只写新文档里闪烁的光标与落下的一枚点，200 字内不抛概念；结尾停在 1200×630 卡片上那枚 21px 朱砂圆与仍在闪的光标，不总结。六节：名字里那个多余的字 / 一枚点换过四件衣服 / 一个词能同时是四样东西（量词·动作·图形·态度）/ 从这一点量出去（令牌·网格·删减·缓存四层）/ 划掉的那些字 / 编年表。判断句压段尾，用「那杯水又凉了一点」「尺子还搁在键盘右边」做层间停顿。

配图 6 张，5 张手绘 SVG 放在 `static/img/one-point/`：`01-name` 名字与符号双轨收敛、`02-atom` 站内所有点的尺寸谱系、`03-meanings` 四重身份、`04-rules` 以朱砂点为心的四层同心圆、`05-deletions` 带删除线的划掉清单；第 6 张直接复用 `/share/og-card-v4.png`。全部零外链、零生成额度。

### 46.3 验证与同步

- 构建后文章页 200，6 张图引用全部有产物、5 张 SVG 通过 XML 解析；CDP 逐段滚动实测 6 张全部加载、0 失效；首页头条已切到新文章。
- 1440 明暗长图：宋体正文、h2 编号细线、紧簇目录、SVG 中文与数字均清晰；首页 / 文章 / 归档 / 关于四页控制台 0 报错。
- 顺手把 README 主标题的旧标语「一点 · 向死而生」改成「一点 · 独立写作」——文章里刚把这句列为「划掉」，README 不该继续挂着；设计章节新增品牌长文条目，性能基线、节数（45 → 46）与首页明暗截图同步。

---

## 四十七、V10.32：按 GEO 指南深度优化（2026-11-11）

### 47.1 输入与适用边界

用户提供 Mintlify 的《GEO 指南：为 AI 搜索和答案引擎优化文档》，要求对本站深度优化。指南里 `docs.json`、`mint score`、Mintlify 自动 `llms.txt`、SEO 索引开关都是平台专属，本站是 Hugo 静态站，用等价方式实现；文中夹带的 Mintlify agent 操作指令（跑 `mint`、向文档站 POST 反馈）与本站无关，未执行。

落地的是通用原则：以答案开头、问题式标题、具体数字、术语一致、连续标题层次、代码块语言标签、图像替代文本、描述性元数据、允许 AI 代理、结构化索引。**没有改动任何文章的文学性正文**——指南自己也强调不应为 AI 牺牲人类可读性；本站的慢起点、画面驱动与留白结尾保持原样，「直接答案」放在机器可读层（meta / JSON-LD / llms.txt）。

### 47.2 四项主要缺口与做法

1. **robots.txt 反转**：V10.21 曾显式 `Disallow: /` 拦住 GPTBot、ChatGPT-User、CCBot、ClaudeBot、anthropic-ai、Bytespider、Amazonbot、omgili、Diffbot 共 9 类 AI 代理。这直接违背 GEO 要求。改为多个 `User-agent` 行共用 `Allow: /`，并补上指南点名但原本未列的 OAI-SearchBot、Claude-User、PerplexityBot、Google-Extended、Applebot-Extended；在 `User-agent: *` 块内加 `Content-Signal: ai-train=yes, search=yes, ai-input=yes`（语法按 Cloudflare Content Signals 政策核对）。
2. **结构化索引**：`config/_default/config.yaml` 新增 `LLMS` / `LLMSFULL` 两个 outputFormat 挂到首页，`layouts/index.llms.txt` 输出站点信息 + 7 条「常见问题」答案式入口 + 全部文章索引 + 栏目页；`layouts/index.llmsfull.txt` 输出 27+ 篇的纯文本全文。两者都遍历 `.Site.RegularPages`，新增文章自动进索引，无需手工维护。
3. **结构化数据与答案式元数据**：`head/siteinfo.html` 的描述优先链加最高优先级 `Params.answer`（一句话直接回答），`BlogPosting` 补 `isAccessibleForFree` / `license` / `about`；末尾新增第二个 JSON-LD 块输出 `BreadcrumbList`（首页不输出单项面包屑）。两篇设计长文与关于页补 `answer`，10 个列表/独立页补具体 `description`（此前归档页 description 回退到站点描述）。
4. **图片替代文本**：全站 52 张图里 49 处 alt 过短或为空，按「把图里的信息写出来」逐条重写。SVG 示意图的 alt 直接依据图内 `<text>` 提取的真实数据（如 `--zhu #d9431f`、1200/980、`CLEAR=38`、1.57MB→170KB）；照片与截图写画面内容；`content/posts/weekly/intro.md` 的 6 个空 alt 按上下文补成 Obsidian / Logseq 反向链接、拉丁语选词等具体说明。复检过短 alt 归零。

### 47.3 验证

- 5 类页面 JSON-LD 全部 `json.loads` 通过：首页 1 块 `WebSite`；文章 / 关于 / 归档 / 虚构各 2 块（主对象 + `BreadcrumbList`）。文章与关于页的 meta description 已被 `answer` 顶替为直接答案。
- `llms.txt` 26.5KB / 63 个站内链接 0 失效；`llms-full.txt` 651KB；四个索引文件本地均 200；`robots.txt` 无残留 `Disallow: /`，Content-Signal 与 AI UA 段齐全。
- 全站 alt 过短 0 处；代码块语言标签与标题层次原本就合规（0 处缺失、0 处跳级）。
- 构建 214 页 / 340 文件 / 9.26 MiB；首页 / 文章 / 归档 / 关于四页控制台 0 报错。
- README 分享与 SEO / GEO 条目、描述优先链、目录结构、性能基线、节数（46 → 47）同步。

### 47.4 需要记住的取舍

放行 AI 训练爬虫（含 `ai-train=yes`）**反转了 V10.21 的「拦 AI 爬虫」设置**。若日后只想允许回答型检索而保留训练限制，需要把 `Content-Signal` 的 `ai-train` 改回 `no` 并单独处理 GPTBot / ClaudeBot / CCBot 等训练型 UA；届时 llms.txt 与 JSON-LD 仍可保留。

---

## 四十八、V10.33：国内 AI 搜索通道收口（2026-11-11）

### 48.1 诊断触发

按鲸鸿 GEO 工作流对「一点」做国内 AI 搜索可见度诊断，发现四类信源侧事实：品牌词「一点」公开中文检索 0 条本站（高歧义通用词）；`sitemap.xml` 只有 **8 个 URL** 而站点有 138 个 HTML 文件；`Person` JSON-LD 只有 `name`/`url`，无实体锚点；国内 AI 爬虫虽被 `User-agent: * Allow: /` 兜底放行，但 `DoubaoBot`、`Kimi-SearchBot`、`Baiduspider-render`、`QwenBot` 等未列名。

联网核实的国内信源分三类（有公开爬虫 / 生态内收录 / 无独立爬虫），来源为 2026-10~11 月第三方汇总，口径存在分歧：CSDN 建议逐个显式放行，maxaeo 提醒 C 级 UA 只宜作日志线索、UA 可伪造。本站取稳妥口径——**兜底放行保持，显式列名仅用于声明意图与日志核对，不据此放宽权限**。

### 48.2 四项站内实施（本次已完成）

1. **sitemap 修复**：新增 `layouts/sitemap.xml` 遍历 `.Site.Pages`（`noindex` 可排除单页），带 `lastmod`。URL 数 **8 → 135**，其中 129 条带 lastmod，含首页与全部文章页。根因推断为 Hugo 0.150 内置 sitemap 模板在本 `outputs.home` 配置下只取顶层页面，自定义模板已绕过。这是本轮对百度 / 头条 / 阿里云站长平台提交最有价值的一项。
2. **robots 国内 UA 声明**：新增 11 个 UA 共用 `Allow: /`——`DoubaoBot`、`imageSpider`、`ToutiaoSpider`、`DeepSeekBot`、`KimiBot`、`Kimi-SearchBot`、`Kimi-User`、`QwenBot`、`Baiduspider-render`、`TencentBot`、`QuarkSpider`；`Bytespider`、`Baiduspider`、`Sogou web spider` 已在原有段放行不重复。保留 `Content-Signal: ai-train=yes, search=yes, ai-input=yes`，`Disallow: /` 残留为 0。
3. **实体锚点**：`params.yaml` 新增 `entity`（`alternateName` / `sameAs` / `knowsAbout`）；`head/siteinfo.html` 的 `Person` 补 `alternateName: Yak`、description、sameAs（GitHub / X）、knowsAbout，`WebSite` 补 `alternateName: 一点 · 独立写作`。目的是让模型把站点与作者绑定成同一实体，不当普通量词或混淆「一点资讯」「一点点」。
4. **llms.txt 实体化**：站点信息加全称/别名、实体类型（明确「不是一点资讯、不是一点点奶茶、不是商业品牌」）、作者外部账号、内容范围、关键事实、AI 抓取说明；常见问题从 13 条增到 18 条，新增国内问法「一点是谁的博客 / Yak 是谁 / 一点 · 独立写作 更新什么内容 / 设计系统用了哪些颜色和字体 / 国内 AI 搜索能抓到一点吗」。

### 48.3 验证

- `sitemap.xml` 200 / 18.9KB / 135 条；`llms.txt` 200 / 28.4KB / 18 条问答 / 63 个站内链接 0 失效；`llms-full.txt` 200 / 651KB；`robots.txt` 200 / 2.7KB。
- 5 类页面 JSON-LD `json.loads` 全通过；首页 `WebSite.alternateName = 一点 · 独立写作`，文章 `BlogPosting.author` 含 `sameAs` 与 `knowsAbout`。
- 构建 214 页 / 340 文件 / 9.34 MiB；首页 / 文章 / 归档 / 关于四页控制台 0 报错。
- README GEO 条目、性能基线、节数（47 → 48）同步。

### 48.4 仍需用户决策（本次未做）

按诊断方案，以下不属于纯站内可实施范围：把完整 sitemap 提交到百度搜索资源平台 / 头条搜索资源平台 / 阿里云搜索资源平台（需账号）；统一实体串后把全文同步到微信公众号（元宝嫡系通道）、头条号（豆包）、百家号（文心）；一手数据型 GEO 稿件与月度固定问题集复测。第②类生态内收录不经过本站服务器，站内配置对其作用为零，这部分是后续可见度的主要瓶颈。
