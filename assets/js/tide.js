/* =====================================================================
   刊头右侧「潮汐之境」点云球（V10.7）
   ---------------------------------------------------------------------
   原型：DOT / WORLD · TIDAL ARCHIPELAGO ——「群岛从海面缓慢生长，
   每一次触碰，都是一场小小的潮汐」。这里把 34000 点的可拖拽宇宙
   精简成 2000 点单 canvas 装饰：Fibonacci 球面布点 + 多层 value noise
   定陆地 / 海岸，缓慢自转，入场时点从下往上逐批浮现，点击荡开两圈潮汐。

   性能：30fps 节流，仅在可见且标签页激活时跑 rAF；reduced-motion 下
   只画一帧静止终态。颜色读取 CSS 变量，随明暗主题切换。
   ===================================================================== */
(function () {
  'use strict';
  var canvas = document.querySelector('[data-tide]');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var TAU = Math.PI * 2;
  var W = 0, H = 0, R = 0, cx = 0, cy = 0, dpr = 1;
  var ink = '#16130f', zhu = '#d9431f', faint = '#8a8378';
  var points = [], ripples = [];
  var yaw = -.45, tilt = .28, reveal = .12, last = 0, lastDraw = 0, raf = 0, seen = true;

  /* 2D value noise：替代原型里 shared/dots.js 的 dotUtil.vnoise */
  function hash2(i, j) {
    var n = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  }
  function noise2(x, y) {
    var i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    var a = hash2(i, j), b = hash2(i + 1, j), c = hash2(i, j + 1), d = hash2(i + 1, j + 1);
    var top = a + (b - a) * fx, bot = c + (d - c) * fx;
    return top + (bot - top) * fy;
  }
  function fieldNoise(x, y, z, s) {
    return noise2(x * 2.1 + s, y * 2.1 + z * 1.4) * .58
         + noise2(z * 3.8 + s * .7, x * 3.8 - y * 1.3) * .29
         + noise2(x * 9 + z * 3, y * 9 + s) * .13;
  }

  function build() {
    points = [];
    var N = 2000, s = 148 * .071;
    for (var i = 0; i < N; i++) {
      var y = 1 - (i + .5) / N * 2;
      var rr = Math.sqrt(Math.max(0, 1 - y * y));
      var a = i * 2.399963229728653;
      var x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      var n = fieldNoise(x, y, z, s);
      points.push({
        x: x, y: y, z: z,
        h: Math.max(0, n - .52) * .6,
        land: n > .52,
        coast: Math.abs(n - .52) < .016,
        high: n > .66,
        grain: hash2(i, 14)
      });
    }
  }

  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    ink = cs.getPropertyValue('--ink').trim() || ink;
    zhu = cs.getPropertyValue('--zhu').trim() || zhu;
    faint = cs.getPropertyValue('--ink-3').trim() || faint;
  }

  function resize() {
    var r = canvas.getBoundingClientRect();
    if (!r.width) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = W * .5; cy = H * .5; R = Math.min(W, H) * .38;
    draw(performance.now());
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    var c = Math.cos(yaw), s = Math.sin(yaw), ct = Math.cos(tilt), st = Math.sin(tilt);
    var bins = [[], [], [], []];          /* 海 / 陆 / 岸 / 高地 */
    var grow = -1 + 2 * reveal;
    for (var i = 0; i < points.length; i++) {
      var p = points[i];
      if (p.y > grow) continue;          /* 群岛从「海面」以下往上长 */
      var xx = p.x * c + p.z * s, zz = p.z * c - p.x * s;
      var Y = p.y * ct - zz * st, Z = p.y * st + zz * ct;
      if (Z < .02) continue;             /* 只画朝向我们的半球 */
      /* 陆地整片保留、海面留白，群岛才会从点阵里浮出来 */
      if (p.grain > (p.land ? .95 : .7)) continue;
      var rad = p.h || Math.sin(p.x * 22 + p.z * 9 + now * .001) * .002;
      var bin = p.coast ? 2 : p.land ? (p.high ? 3 : 1) : 0;
      var size = Math.max(.42, (.45 + Z * .55) * (W / 168));
      size *= bin === 2 ? 1.3 : bin === 1 ? 1.15 : bin === 3 ? 1.1 : .98;
      bins[bin].push(cx + xx * (1 + rad) * R, cy - Y * (1 + rad) * R, size);
    }
    var colors = [faint, zhu, zhu, ink];
    var alphas = [.3, .8, 1, .7];
    for (var b = 0; b < 4; b++) {
      var arr = bins[b];
      if (!arr.length) continue;
      ctx.fillStyle = colors[b];
      ctx.globalAlpha = alphas[b];
      ctx.beginPath();
      for (var k = 0; k < arr.length; k += 3) {
        ctx.moveTo(arr[k] + arr[k + 2], arr[k + 1]);
        ctx.arc(arr[k], arr[k + 1], arr[k + 2], 0, TAU);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    /* 球面轮廓 + 一条扁椭圆轨道，对应原型 guides() / orbit() 的余韵 */
    ctx.fillStyle = faint;
    ctx.globalAlpha = .18; ctx.beginPath();
    for (var a = 0; a < TAU; a += TAU / 150) {
      var ox = cx + Math.cos(a) * R, oy = cy + Math.sin(a) * R;
      ctx.moveTo(ox + .45, oy); ctx.arc(ox, oy, .45, 0, TAU);
    }
    ctx.fill();
    ctx.globalAlpha = .12; ctx.beginPath();
    for (var a2 = 0; a2 < TAU; a2 += TAU / 170) {
      var tx = cx + Math.cos(a2) * R * 1.34, ty = cy + Math.sin(a2) * R * .34;
      ctx.moveTo(tx + .5, ty); ctx.arc(tx, ty, .5, 0, TAU);
    }
    ctx.fill();
    ctx.globalAlpha = 1;

    /* 每一次触碰，都是一场小小的潮汐 */
    for (var q = 0; q < ripples.length; q++) {
      var pl = ripples[q], age = (now - pl.t) / 1000;
      if (age > 2.2) continue;
      var fade = Math.max(0, 1 - age / 2.2);
      ctx.strokeStyle = zhu; ctx.lineWidth = 1;
      for (var ring = 0; ring < 2; ring++) {
        var r = Math.max(0, age * R * .58 - ring * 11);
        if (!r) continue;
        ctx.globalAlpha = fade * (ring ? .22 : .5);
        ctx.beginPath();
        ctx.ellipse(pl.x, pl.y, r, r * .72, 0, 0, TAU);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  function loop(now) {
    raf = 0;
    if (document.hidden || !seen) return;
    var dt = Math.min(.05, (now - last) / 1000);
    last = now;
    if (now - lastDraw < 32) { raf = requestAnimationFrame(loop); return; }
    lastDraw = now;
    yaw += dt * .1;
    if (reveal < 1) reveal = Math.min(1, reveal + dt * .8);
    ripples = ripples.filter(function (p) { return (now - p.t) / 1000 < 2.2; });
    draw(now);
    raf = requestAnimationFrame(loop);
  }
  function start() {
    if (raf || motion.matches) return;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

  canvas.addEventListener('pointerdown', function (e) {
    if (motion.matches) return;
    var r = canvas.getBoundingClientRect();
    ripples.push({ x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() });
    if (!raf) start();
  });
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (es) {
      seen = es[0].isIntersecting;
      seen ? start() : stop();
    }, { threshold: 0 }).observe(canvas);
  }
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 120); });
  if (window.MutationObserver) {
    new MutationObserver(function () { readColors(); draw(performance.now()); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }
  if (motion.addEventListener) {
    motion.addEventListener('change', function (e) {
      if (e.matches) { stop(); reveal = 1; draw(performance.now()); }
      else { reveal = .12; start(); }
    });
  }

  readColors();
  build();
  if (motion.matches) reveal = 1;
  resize();
  if (!motion.matches) start();
})();
