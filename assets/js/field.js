/* =====================================================================
   首页刊头背景：「一点入水」涟漪点阵场
   ---------------------------------------------------------------------
   站名「一点」——那组点像一滴墨落进水面：
   · 点阵铺满刊头，涟漪从朱砂点周期性扩散，波前经过的点被点亮成朱砂色、
     并沿径向被轻轻推开（水波感）；
   · 指针靠近时点阵向光标处变大变亮（像光照进裂缝）；
   · 点击 / 轻触任意位置，从该处激起一圈新涟漪。
   性能：单 canvas、约 1000 个点；只在刊头可见且标签页激活时运行 rAF。
   无障碍：prefers-reduced-motion 时只画一帧静态点阵（朱砂点周围一圈晕），
          不响应指针，不自动扩散。颜色读取 CSS 变量，随明暗主题切换。
   ===================================================================== */
(function () {
  'use strict';
  var canvas = document.querySelector('[data-field]');
  if (!canvas || !canvas.getContext) return;
  var host = canvas.parentElement;
  var ctx = canvas.getContext('2d');
  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  var GAP = 22;              // 点距
  var CLEAR = 38;            // 波心留白半径：品牌点阵形状独占，不与涟漪点阵混成一片
  var SPEED = 240;           // 涟漪扩散速度 px/s
  var BAND = 26;             // 波前宽度
  var LIFE = 2.8;            // 涟漪寿命 s
  var AUTO = 3800;           // 自动涟漪间隔 ms

  var W = 0, H = 0, dots = [], ripples = [];
  var pointer = { x: -1e4, y: -1e4, on: false };
  var ink = [22, 19, 15], zhu = [217, 67, 31];
  var visible = true, raf = 0, lastAuto = 0, lastInput = 0, idleTimer = 0;

  function parseColor(v) {
    v = (v || '').trim();
    if (v.charAt(0) === '#') {
      if (v.length === 4) v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
      return [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16)];
    }
    var m = v.match(/[\d.]+/g);
    return m ? [+m[0], +m[1], +m[2]] : [0, 0, 0];
  }

  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    ink = parseColor(cs.getPropertyValue('--ink'));
    zhu = parseColor(cs.getPropertyValue('--zhu'));
  }

  // 涟漪源：刊头朱砂点的中心（相对 canvas）
  function origin() {
    var d = document.querySelector('.masthead-dot');
    var b = canvas.getBoundingClientRect();
    if (!d) return { x: W * 0.3, y: H * 0.6 };
    var a = d.getBoundingClientRect();
    return { x: a.left + a.width / 2 - b.left, y: a.top + a.height / 2 - b.top };
  }

  function resize() {
    var r = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dots = [];
    var ox = (W % GAP) / 2 + GAP / 2, oy = (H % GAP) / 2 + GAP / 2;
    var o = origin(), c2 = CLEAR * CLEAR;
    for (var y = oy; y < H; y += GAP) for (var x = ox; x < W; x += GAP) {
      var dx = x - o.x, dy = y - o.y;
      if (dx * dx + dy * dy < c2) continue;
      dots.push(x, y);
    }
    frame(performance.now());
  }

  function ripple(x, y, now) {
    ripples.push({ x: x, y: y, t: now || performance.now() });
    if (ripples.length > 5) ripples.shift();
    kick();
  }

  function frame(now) {
    ctx.clearRect(0, 0, W, H);
    var still = motionQuery.matches;
    var o = origin();
    ripples = ripples.filter(function (r) { return (now - r.t) / 1000 < LIFE; });

    for (var i = 0; i < dots.length; i += 2) {
      var x = dots[i], y = dots[i + 1];
      var e = 0, dx = 0, dy = 0;

      if (still) {
        // 静态：朱砂点周围一圈柔和的晕
        var dsx = x - o.x, dsy = y - o.y;
        var ds = Math.sqrt(dsx * dsx + dsy * dsy);
        e = Math.max(0, 1 - ds / 150) * 0.7;
      } else {
        for (var k = 0; k < ripples.length; k++) {
          var r = ripples[k];
          var age = (now - r.t) / 1000;
          var rx = x - r.x, ry = y - r.y;
          var d = Math.sqrt(rx * rx + ry * ry) || 1;
          var band = d - age * SPEED;
          var amp = Math.exp(-(band * band) / (2 * BAND * BAND)) * (1 - age / LIFE);
          if (amp > e) e = amp;
          // 波前把点沿径向推开一点，形成「水面起伏」
          var push = amp * 5;
          dx += (rx / d) * push; dy += (ry / d) * push;
        }
        if (pointer.on) {
          var pdx = x - pointer.x, pdy = y - pointer.y;
          var dp = Math.sqrt(pdx * pdx + pdy * pdy);
          var kp = Math.max(0, 1 - dp / 140);
          if (kp * kp > e) e = kp * kp;
        }
      }

      var t = Math.min(1, e * 1.5);
      var cr = ink[0] + (zhu[0] - ink[0]) * t;
      var cg = ink[1] + (zhu[1] - ink[1]) * t;
      var cb = ink[2] + (zhu[2] - ink[2]) * t;
      ctx.fillStyle = 'rgba(' + (cr | 0) + ',' + (cg | 0) + ',' + (cb | 0) + ',' + (0.2 + e * 0.8).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, 0.95 + e * 2.6, 0, 6.2832);
      ctx.fill();
    }
  }

  // 画面静止时用定时器排队下一次自动涟漪，不再空转 rAF
  function scheduleAuto() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      raf = 0;
      kick();
    }, AUTO);
  }

  function loop(now) {
    raf = 0;
    if (!visible || document.hidden || motionQuery.matches) return;

    if (now - lastAuto > AUTO) {
      var o = origin();
      ripples.push({ x: o.x, y: o.y, t: now });
      if (ripples.length > 5) ripples.shift();
      lastAuto = now;
    }

    frame(now);

    // 没有波纹、指针也停下来了：收工，最后一帧留在画布上，
    // 等下一次交互或自动涟漪再唤醒 —— 首页静止时 CPU 归零
    var busy = ripples.length > 0 || (pointer.on && now - lastInput < 600);
    if (busy) {
      raf = requestAnimationFrame(loop);
    } else {
      pointer.on = false;
      scheduleAuto();
    }
  }

  function kick() {
    clearTimeout(idleTimer);
    if (!raf && visible && !document.hidden && !motionQuery.matches) raf = requestAnimationFrame(loop);
  }

  // ---------- 事件 ----------
  host.addEventListener('pointermove', function (e) {
    var b = canvas.getBoundingClientRect();
    pointer.x = e.clientX - b.left; pointer.y = e.clientY - b.top; pointer.on = true;
    lastInput = performance.now();
    kick();
  }, { passive: true });
  host.addEventListener('pointerleave', function () { pointer.on = false; });
  host.addEventListener('pointerdown', function (e) {
    if (motionQuery.matches || e.target.closest('a,button')) return;
    var b = canvas.getBoundingClientRect();
    ripple(e.clientX - b.left, e.clientY - b.top);
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible) kick();
    }).observe(host);
  }
  document.addEventListener('visibilitychange', kick);
  if (motionQuery.addEventListener) motionQuery.addEventListener('change', function () { frame(performance.now()); kick(); });
  new MutationObserver(function () { readColors(); frame(performance.now()); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  var rt = 0;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 120); });

  readColors();
  resize();
  // 首次涟漪与朱砂点入场动画（240ms 延迟 + 900ms）对齐：点「落定」时水面荡开
  lastAuto = performance.now() - AUTO + 900;
  kick();
})();
