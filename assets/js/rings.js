/* =====================================================================
   关于页「写作年轮」
   ---------------------------------------------------------------------
   把每一天排在一条阿基米德螺线上：一圈 = 一年（从正上方 1 月 1 日起，
   顺时针走完 12 个月），由内向外一年一圈，最外端是今天。
   写过文章的日子是朱砂点（可点击 / 键盘聚焦，直达那天的文章），
   其余日子是极淡的墨点——空白本身也是记录。
   数据：#rings-data（Hugo 生成的 { "YYYY-MM-DD": [{t, u}] }）
   动效：点沿螺线依次浮现（CSS --d 延迟）；reduced-motion 时直接呈现。
   ===================================================================== */
(function () {
  'use strict';
  var host = document.querySelector('[data-rings]');
  var dataEl = document.getElementById('rings-data');
  if (!host || !dataEl) return;

  var data = {};
  try { data = JSON.parse(dataEl.textContent) || {}; } catch (e) { return; }
  var keys = Object.keys(data).sort();
  if (!keys.length) return;

  var NS = 'http://www.w3.org/2000/svg';
  var SIZE = 600, C = SIZE / 2, R0 = 62, RMAX = 262;
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var firstYear = +keys[0].slice(0, 4);
  var years = today.getFullYear() - firstYear + 1;
  var GAP = (RMAX - R0) / years;

  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function polar(r, frac) {
    var a = -Math.PI / 2 + frac * Math.PI * 2;
    return [C + r * Math.cos(a), C + r * Math.sin(a)];
  }
  function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }

  var svg = el('svg', { viewBox: '0 0 ' + SIZE + ' ' + SIZE, class: 'rings-svg', role: 'group',
    'aria-label': '写作年轮：每一圈代表一年，朱砂点是写下文章的日子' });

  // 月份辐线 + 刻度
  var grid = el('g', { class: 'rings-grid', 'aria-hidden': 'true' }, svg);
  for (var m = 0; m < 12; m++) {
    var f = new Date(2001, m, 1) - new Date(2001, 0, 1);
    var frac = f / (365 * 864e5);
    var p1 = polar(R0 - 10, frac), p2 = polar(RMAX + 8, frac), pl = polar(RMAX + 24, frac);
    el('line', { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1] }, grid);
    var t = el('text', { x: pl[0], y: pl[1], class: 'rings-month' }, grid);
    t.textContent = pad(m + 1);
  }

  // 年份标注：放在每圈起点（正上方）与下一圈之间的空隙里
  for (var yi = 0; yi < years; yi++) {
    var ty = el('text', { x: C + 7, y: C - (R0 + yi * GAP + GAP * 0.5) + 4, class: 'rings-year' }, grid);
    ty.textContent = firstYear + yi;
  }

  // 日子
  var days = el('g', { class: 'rings-days', 'aria-hidden': 'true' }, svg);
  var posts = el('g', { class: 'rings-posts' }, svg);
  var d = new Date(firstYear, 0, 1), i = 0, lit = 0, last = null;
  while (d <= today) {
    var y = d.getFullYear();
    var doy = Math.round((d - new Date(y, 0, 1)) / 864e5);
    var fr = doy / (isLeap(y) ? 366 : 365);
    var r = R0 + ((y - firstYear) + fr) * GAP;
    var pt = polar(r, fr);
    var key = ymd(d);
    var list = data[key];
    var delay = (i * 1.1).toFixed(0) + 'ms';
    if (list) {
      var a = el('a', { href: list[0].u, class: 'ring-post', 'data-key': key }, posts);
      a.setAttribute('aria-label', key + '：' + list.map(function (x) { return x.t; }).join('；'));
      el('circle', { cx: pt[0].toFixed(1), cy: pt[1].toFixed(1), r: (3.4 + Math.min(list.length - 1, 2) * 1.3).toFixed(1),
        style: '--d:' + delay }, a);
      lit++;
      last = pt;
    } else {
      el('circle', { cx: pt[0].toFixed(1), cy: pt[1].toFixed(1), r: 1.15, style: '--d:' + delay }, days);
    }
    if (d.getTime() === today.getTime()) {
      var now = el('g', { class: 'rings-today', 'aria-hidden': 'true' }, svg);
      el('circle', { cx: pt[0], cy: pt[1], r: 9, class: 'rings-today-halo' }, now);
      el('circle', { cx: pt[0], cy: pt[1], r: 3.2 }, now);
    }
    d.setDate(d.getDate() + 1); i++;
  }

  // 圆心：总篇数
  var core = el('g', { class: 'rings-core', 'aria-hidden': 'true' }, svg);
  el('circle', { cx: C, cy: C, r: R0 - 18 }, core);
  var n = el('text', { x: C, y: C + 6, class: 'rings-core-num' }, core);
  var total = 0; keys.forEach(function (k) { total += data[k].length; });
  n.textContent = total;
  var lab = el('text', { x: C, y: C + 24, class: 'rings-core-label' }, core);
  lab.textContent = '篇';

  host.appendChild(svg);
  host.style.setProperty('--ring-total', i);

  // ---------- 悬停 / 聚焦卡片 ----------
  var tip = document.createElement('div');
  tip.className = 'rings-tip';
  tip.setAttribute('role', 'status');
  host.appendChild(tip);

  function show(a) {
    var list = data[a.getAttribute('data-key')] || [];
    var c = a.querySelector('circle').getBoundingClientRect();
    var h = host.getBoundingClientRect();
    tip.innerHTML = '';
    var dt = document.createElement('p'); dt.className = 'rings-tip-date'; dt.textContent = a.getAttribute('data-key').replace(/-/g, '.');
    tip.appendChild(dt);
    list.forEach(function (x) { var p = document.createElement('p'); p.className = 'rings-tip-title'; p.textContent = x.t; tip.appendChild(p); });
    var x = c.left + c.width / 2 - h.left, yy = c.top - h.top;
    tip.style.left = Math.max(90, Math.min(h.width - 90, x)) + 'px';
    tip.style.top = yy + 'px';
    tip.classList.add('is-on');
  }
  function hide() { tip.classList.remove('is-on'); }
  posts.addEventListener('pointerover', function (e) { var a = e.target.closest('.ring-post'); if (a) show(a); });
  posts.addEventListener('pointerout', hide);
  posts.addEventListener('focusin', function (e) { var a = e.target.closest('.ring-post'); if (a) show(a); });
  posts.addEventListener('focusout', hide);

  // 进场：进入视口才开始浮现
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { host.classList.add('is-drawn'); io.disconnect(); }
    }, { threshold: 0.2 });
    io.observe(host);
  } else {
    host.classList.add('is-drawn');
  }
})();
