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
