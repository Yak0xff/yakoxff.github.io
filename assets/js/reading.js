/* =====================================================================
   阅读页交互层（V10.3）——「一点为引」
   ---------------------------------------------------------------------
   1. 点线目录（≥1280 右页边）：每个 h2 一个点，位置 = 章节在全文中的
      真实相对位置（长章节之间点距就大）；朱砂珠随阅读下行，读过的线段
      变墨色；当前章节标题常显，其余悬停 / 聚焦显示。
   2. 读程胶囊（<1280 底部）：进度环 + 「02 / 05 · 当前章」，点开目录面板。
      面板用原生 <dialog>：自带焦点圈定、Esc 关闭、背景遮罩。
      胶囊 id="toc-fab"，键盘快捷键 b 沿用。
   3. 摘句：选中正文 4–300 字，浮出「复制摘句 / 分享」。
   4. 章节锚：h2/h3 末尾「#」按钮，一键复制该节链接。
   5. 落款：读到文末时显示本次实际用时；复制链接 / 系统分享。
   全部为渐进增强：无 JS 时正文完整可读；reduced-motion 下滚动不做平滑。
   ===================================================================== */
(function () {
  'use strict';
  var prose = document.getElementById('post-content');
  if (!prose) return;

  var doc = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var titleEl = document.querySelector('.rd-title');
  var pageTitle = titleEl ? titleEl.textContent.trim() : document.title;
  doc.classList.add('rd-ready');

  // 实际阅读时长：只累计标签页可见的时间，切走不计
  var readMs = 0, since = document.hidden ? 0 : Date.now();
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (since) readMs += Date.now() - since; since = 0; }
    else since = Date.now();
  });
  function readMinutes() { return Math.max(1, Math.round((readMs + (since ? Date.now() - since : 0)) / 60000)); }

  function h(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function scrollToEl(el) {
    var y = el.getBoundingClientRect().top + window.scrollY - (parseFloat(getComputedStyle(doc).getPropertyValue('--topbar-h')) || 64) - 16;
    window.scrollTo({ top: y, behavior: reduce.matches ? 'auto' : 'smooth' });
  }

  // ---------- 提示条 ----------
  var toast = h('div', 'rd-toast');
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(toast);
  var toastTimer = 0;
  function say(msg) {
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-on'); }, 1800);
  }
  function copy(text, okMsg) {
    var done = function () { say(okMsg || '已复制'); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else { fallback(); }
    function fallback() {
      var ta = h('textarea'); ta.value = text; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { say('复制失败，请手动选择'); }
      ta.remove();
    }
  }
  function baseURL() { return location.origin + location.pathname; }

  // ---------- 章节 ----------
  var heads = Array.prototype.slice.call(prose.querySelectorAll('h2, h3'));
  heads.forEach(function (el, i) { if (!el.id) el.id = 'sec-' + (i + 1); });
  var h2s = heads.filter(function (el) { return el.tagName === 'H2'; });

  // 作者已自带序号的标题（「二、」「第三章」「3.」「Part 2」）不再叠加 01/02，
  // 避免出现「06 六、……」这样的双重编号
  var SELF_NO = /^\s*(第?[一二三四五六七八九十百零〇两\d]+[章节部篇]?[、.．:：\s]|\d+[.)）]|part\s*\d+|chapter\s*\d+)/i;
  h2s.forEach(function (el) { if (SELF_NO.test(el.textContent)) el.classList.add('rd-selfno'); });

  // 章节锚按钮
  heads.forEach(function (el) {
    var b = h('button', 'rd-anchor', '#');
    b.type = 'button';
    b.setAttribute('aria-label', '复制本节链接：' + el.textContent.trim());
    b.addEventListener('click', function () {
      history.replaceState(null, '', '#' + el.id);
      copy(baseURL() + '#' + el.id, '已复制本节链接');
    });
    el.appendChild(b);
  });
  function headText(el) {
    var c = el.cloneNode(true);
    var a = c.querySelector('.rd-anchor'); if (a) a.remove();
    return c.textContent.trim();
  }

  // ---------- 1. 点线目录 ----------
  var rail = null, railDots = [], bead = null, fill = null;
  if (h2s.length >= 2) {
    rail = h('nav', 'rd-rail');
    rail.setAttribute('aria-label', '章节导航');
    var line = h('span', 'rd-rail-line'); line.setAttribute('aria-hidden', 'true');
    fill = h('span', 'rd-rail-fill'); line.appendChild(fill);
    bead = h('span', 'rd-rail-bead'); bead.setAttribute('aria-hidden', 'true');
    var ol = h('ol', 'rd-rail-list');
    h2s.forEach(function (el, i) {
      var li = h('li', 'rd-rail-item');
      var a = h('a', 'rd-rail-link');
      a.href = '#' + el.id;
      a.appendChild(h('span', 'rd-rail-dot'));
      var lab = h('span', 'rd-rail-label');
      if (!el.classList.contains('rd-selfno')) lab.appendChild(h('span', 'rd-rail-no num', pad(i + 1)));
      lab.appendChild(document.createTextNode(headText(el)));
      a.appendChild(lab);
      a.addEventListener('click', function (e) { e.preventDefault(); scrollToEl(el); history.replaceState(null, '', '#' + el.id); });
      li.appendChild(a);
      ol.appendChild(li);
      railDots.push(li);
    });
    rail.appendChild(line); rail.appendChild(bead); rail.appendChild(ol);
    document.body.appendChild(rail);
    doc.classList.add('rd-has-rail');
  }

  // ---------- 2. 读程胶囊 + 目录面板 ----------
  var pill = h('button', 'rd-pill');
  pill.type = 'button';
  pill.id = 'toc-fab';
  pill.setAttribute('aria-haspopup', 'dialog');
  pill.innerHTML =
    '<svg class="rd-pill-ring" viewBox="0 0 36 36" aria-hidden="true">' +
    '<circle cx="18" cy="18" r="15" class="rd-pill-track"/>' +
    '<circle cx="18" cy="18" r="15" class="rd-pill-arc" pathLength="100"/></svg>' +
    '<span class="rd-pill-text"><span class="rd-pill-no num"></span><span class="rd-pill-cur"></span></span>';
  var pillNo = pill.querySelector('.rd-pill-no');
  var pillCur = pill.querySelector('.rd-pill-cur');
  var arc = pill.querySelector('.rd-pill-arc');
  document.body.appendChild(pill);

  var sheet = null, sheetLinks = [];
  if (heads.length) {
    sheet = h('dialog', 'rd-sheet');
    sheet.setAttribute('aria-labelledby', 'rd-sheet-title');
    var head = h('div', 'rd-sheet-head');
    var st = h('p', 'rd-sheet-title', '目录'); st.id = 'rd-sheet-title';
    var close = h('button', 'rd-sheet-close'); close.type = 'button';
    close.setAttribute('aria-label', '关闭目录');
    close.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
    close.addEventListener('click', function () { sheet.close(); });
    head.appendChild(st); head.appendChild(close);
    var nav = h('nav', 'rd-sheet-body');
    nav.setAttribute('aria-label', '文章目录');
    var list = h('ol', 'rd-sheet-list');
    var n2 = 0;
    heads.forEach(function (el) {
      var isH2 = el.tagName === 'H2';
      if (isH2) n2++;
      var li = h('li', isH2 ? 'is-h2' : 'is-h3');
      var a = h('a');
      a.href = '#' + el.id;
      if (isH2 && !el.classList.contains('rd-selfno')) a.appendChild(h('span', 'rd-sheet-no num', pad(n2)));
      a.appendChild(h('span', 'rd-sheet-text', headText(el)));
      a.addEventListener('click', function (e) {
        e.preventDefault(); sheet.close();
        setTimeout(function () { scrollToEl(el); el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }, 60);
      });
      li.appendChild(a); list.appendChild(li); sheetLinks.push({ a: a, el: el });
    });
    nav.appendChild(list);
    var foot = h('div', 'rd-sheet-foot');
    var top = h('button', 'rd-sheet-btn', '↑ 回到顶部'); top.type = 'button';
    top.addEventListener('click', function () { sheet.close(); window.scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' }); });
    foot.appendChild(top);
    var prefs = document.getElementById('prefs-toggle');
    if (prefs) {
      var pb = h('button', 'rd-sheet-btn', 'Aa 阅读设置'); pb.type = 'button';
      pb.addEventListener('click', function () { sheet.close(); prefs.click(); });
      foot.appendChild(pb);
    }
    sheet.appendChild(head); sheet.appendChild(nav); sheet.appendChild(foot);
    // 点遮罩关闭
    sheet.addEventListener('click', function (e) { if (e.target === sheet) sheet.close(); });
    sheet.addEventListener('close', function () { pill.setAttribute('aria-expanded', 'false'); });
    document.body.appendChild(sheet);
    pill.setAttribute('aria-label', '打开目录');
    pill.addEventListener('click', function () {
      if (typeof sheet.showModal !== 'function') { scrollToEl(heads[0]); return; }
      sheet.showModal(); pill.setAttribute('aria-expanded', 'true');
      var cur = list.querySelector('[aria-current]');
      if (cur) cur.scrollIntoView({ block: 'center' });
    });
  } else {
    pill.setAttribute('aria-label', '回到顶部');
    pillCur.textContent = '回到顶部';
    pill.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' }); });
  }

  // ---------- 读程计算 ----------
  var geo = { top: 0, height: 1, marks: [] };
  function measure() {
    var r = prose.getBoundingClientRect();
    geo.top = r.top + window.scrollY;
    geo.height = Math.max(1, prose.offsetHeight);
    geo.marks = h2s.map(function (el) { return (el.getBoundingClientRect().top + window.scrollY - geo.top) / geo.height; });
    railDots.forEach(function (li, i) { li.style.setProperty('--at', (geo.marks[i] * 100).toFixed(2) + '%'); });
    update();
  }

  var lastActive = -2, ticking = false;
  function update() {
    ticking = false;
    var vh = window.innerHeight;
    var read = (window.scrollY + vh * 0.35 - geo.top) / geo.height;
    var p = Math.max(0, Math.min(1, read));
    // 读完判定：正文底部进入视口
    var endP = Math.max(0, Math.min(1, (window.scrollY + vh - geo.top) / geo.height));
    if (endP >= 1) p = Math.max(p, 1);

    doc.style.setProperty('--rd-p', p.toFixed(4));
    if (arc) arc.style.strokeDashoffset = (100 - p * 100).toFixed(1);

    var active = -1;
    for (var i = 0; i < geo.marks.length; i++) { if (read >= geo.marks[i] - 0.002) active = i; }
    if (active !== lastActive) {
      lastActive = active;
      railDots.forEach(function (li, j) {
        li.classList.toggle('is-past', j < active);
        li.classList.toggle('is-active', j === active);
        var a = li.firstChild;
        if (j === active) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
      });
      var label = '';
      if (h2s.length) {
        label = active >= 0 ? headText(h2s[active]) : '开篇';
        pillNo.textContent = (active >= 0 ? pad(active + 1) : '00') + ' / ' + pad(h2s.length);
      } else if (heads.length) {
        pillNo.textContent = ''; label = '目录';
      }
      if (heads.length) pillCur.textContent = label;
      sheetLinks.forEach(function (s) {
        if (h2s[active] === s.el) s.a.setAttribute('aria-current', 'location'); else s.a.removeAttribute('aria-current');
      });
    }
    // 扉页还在视野里时不显示胶囊 / 目录，避免与标题抢注意力
    doc.classList.toggle('rd-in-body', window.scrollY + vh * 0.5 > geo.top);
    // 读过正文末尾：读程组件退场，把文末落款与页脚让出来
    doc.classList.toggle('rd-past-body', window.scrollY + vh * 0.6 > geo.top + geo.height);
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  var rt = 0;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(measure, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  window.addEventListener('load', measure);
  if ('ResizeObserver' in window) new ResizeObserver(function () { clearTimeout(rt); rt = setTimeout(measure, 120); }).observe(prose);
  measure();

  // ---------- 3. 摘句 ----------
  var quote = h('div', 'rd-quote');
  quote.setAttribute('role', 'toolbar');
  quote.setAttribute('aria-label', '摘句');
  var qCopy = h('button', 'rd-quote-btn', '复制摘句'); qCopy.type = 'button';
  quote.appendChild(qCopy);
  var qShare = null;
  if (navigator.share) {
    qShare = h('button', 'rd-quote-btn', '分享'); qShare.type = 'button';
    quote.appendChild(qShare);
  }
  document.body.appendChild(quote);
  var picked = '';

  function hideQuote() { quote.classList.remove('is-on'); }
  function showQuote() {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) { hideQuote(); return; }
    var range = sel.getRangeAt(0);
    if (!prose.contains(range.commonAncestorContainer)) { hideQuote(); return; }
    var text = sel.toString().replace(/\s+/g, ' ').trim();
    if (text.length < 4 || text.length > 300) { hideQuote(); return; }
    picked = text;
    var r = range.getBoundingClientRect();
    var touch = matchMedia('(pointer: coarse)').matches;
    var qw = quote.offsetWidth || 160;
    var x = Math.max(12, Math.min(window.innerWidth - qw - 12, r.left + r.width / 2 - qw / 2));
    // 触屏：系统选择菜单在上方，摘句条放到选区下方
    var y = touch ? r.bottom + 12 : r.top - 48;
    if (y < 72) y = r.bottom + 12;
    quote.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
    quote.classList.add('is-on');
  }
  var selTimer = 0;
  document.addEventListener('selectionchange', function () { clearTimeout(selTimer); selTimer = setTimeout(showQuote, 220); });
  window.addEventListener('scroll', hideQuote, { passive: true });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && quote.classList.contains('is-on')) hideQuote();
  });
  quote.addEventListener('mousedown', function (e) { e.preventDefault(); });
  qCopy.addEventListener('click', function () {
    copy('「' + picked + '」\n——《' + pageTitle + '》 ' + baseURL(), '摘句已复制');
    hideQuote();
  });
  if (qShare) qShare.addEventListener('click', function () {
    navigator.share({ title: pageTitle, text: '「' + picked + '」', url: baseURL() }).catch(function () {});
    hideQuote();
  });

  // ---------- 5. 落款 ----------
  var fin = document.querySelector('[data-rd-fin]');
  var spent = document.querySelector('[data-rd-spent]');
  if (fin && spent && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      var min = readMinutes();
      spent.textContent = '· 此次用时 ' + min + ' 分钟';
      spent.hidden = false;
      fin.classList.add('is-in');
      io.disconnect();
    }, { threshold: 0.5 });
    io.observe(fin);
  }

  // 评论按钮：与阅读设置按钮一致，用 aria-expanded 播报展开状态
  var cToggle = document.getElementById('comments-toggle');
  var cSection = document.getElementById('comments-section');
  if (cToggle && cSection) {
    var syncC = function () { cToggle.setAttribute('aria-expanded', cSection.classList.contains('hidden') ? 'false' : 'true'); };
    new MutationObserver(syncC).observe(cSection, { attributes: true, attributeFilter: ['class'] });
    syncC();
  }

  var copyBtn = document.querySelector('[data-rd-copy]');
  if (copyBtn) {
    var label = copyBtn.querySelector('[data-rd-copy-label]');
    copyBtn.addEventListener('click', function () {
      copy(baseURL(), '链接已复制');
      if (label) {
        label.textContent = '已复制 ✓';
        copyBtn.classList.add('is-done');
        setTimeout(function () { label.textContent = '复制链接'; copyBtn.classList.remove('is-done'); }, 1800);
      }
    });
  }
  var shareBtn = document.querySelector('[data-rd-share]');
  if (shareBtn && navigator.share) {
    shareBtn.hidden = false;
    shareBtn.addEventListener('click', function () {
      navigator.share({ title: pageTitle, url: baseURL() }).catch(function () {});
    });
  }
})();
