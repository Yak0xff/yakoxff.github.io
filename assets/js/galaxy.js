/* =====================================================================
   刊头右侧「夜航星海」星盘（V10.17）
   ---------------------------------------------------------------------
   原型：DOT / WORLD · THE INFINITE GARDEN（scene 2）——「远处的星辰，
   也是微小的点。在无限之中，留下一次温柔的回响」。把 22000 点的
   可拖拽星系精简成 1800 点单 canvas 装饰：四条对数旋臂 + 高斯抖动
   + 噪声扰动布点，盘面倾斜投影，内快外慢的差速自转、逐颗闪烁，
   入场时星点由内向外亮起，点击荡开两圈椭圆脉冲（原型 ripple()）。

   配色不用原型的青绿沙色调，改读 --ink / --zhu / --ink-3：
   纸底上是淡墨星尘与朱砂亮星，暗色主题自动跟随。
   与 tide.js 同构的性能控制：30fps 节流、仅可见且标签页激活时跑
   rAF、reduced-motion 下只画一帧静止终态、主题切换重读颜色。
   ===================================================================== */
(function () {
  'use strict';
  var canvas = document.querySelector('[data-galaxy]');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var TAU = Math.PI * 2;
  var W = 0, H = 0, R = 0, cx = 0, cy = 0, dpr = 1;
  var ink = '#16130f', zhu = '#d9431f', faint = '#8a8378';
  var stars = [], ripples = [];
  var time = 0, reveal = .08, tilt = .5, yaw = -.35;
  var last = 0, lastDraw = 0, raf = 0, seen = true;

  /* 2D value noise：与 tide.js 同一套，替代原型 shared/dots.js 的 dotUtil */
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

  function build() {
    stars = [];
    var N = 1800, seed = 148;
    var arms = [0, 1.38, 3.47, 5.19];
    var winds = [4.1, 4.55, 3.85, 4.7];
    for (var i = 0; i < N; i++) {
      var id = i + seed;
      var u = hash2(id, 2.1), v = hash2(id, 5.7), q = hash2(id, 9.2);
      var arm = Math.floor(hash2(id, 17.4) * 4);
      var gauss = Math.sqrt(-2 * Math.log(Math.max(.0001, hash2(id, 24.8)))) * Math.cos(v * TAU);
      var r = Math.max(.008, Math.pow(u, .68) * 1.22 + gauss * (.025 + u * .05));
      /* 点数只有原型的 1/12，角度抖动同步收窄，四条旋臂才不会被散开 */
      var angle = arms[arm] + r * winds[arm] + gauss * (.13 + r * .18);
      var dust = hash2(id, 31.6) > .88;     /* 12% 散作背景星尘 */
      if (dust) angle = v * TAU;
      var x = Math.cos(angle) * r, z = Math.sin(angle) * r;
      var off = seed * .019;
      x += (noise2(x * 3.1 + off, z * 3.1) - .5) * .22 * r;
      z += (noise2(x * 3.1, z * 3.1 + off + 7) - .5) * .22 * r;
      stars.push({
        r: Math.hypot(x, z),
        y: (q - .5) * (.08 + (1 - u) * .12),
        angle: Math.atan2(z, x),
        n: u, rnd: q, dust: dust
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
    cx = W * .5; cy = H * .5; R = Math.min(W, H) * .42;
    draw(performance.now());
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    var spin = time * .08, ct = Math.cos(tilt), st = Math.sin(tilt);
    var c = Math.cos(yaw), s = Math.sin(yaw);
    var reach = reveal * 1.3;

    /* 星系核：一点淡朱砂晕，让旋臂有中心可依 */
    var core = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * .3);
    core.addColorStop(0, zhu);
    core.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = .08;
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(cx, cy, R * .3, 0, TAU); ctx.fill();

    /* 四类星 × 亮/暗两档 = 8 批，保持批量 arc 填充的性能 */
    var bins = [];
    for (var k = 0; k < 8; k++) bins.push([]);
    for (var i = 0; i < stars.length; i++) {
      var p = stars[i];
      if (p.r > reach) continue;                   /* 入场：由内向外亮起 */
      var a = p.angle - spin / (p.r + .4);         /* 内快外慢的差速自转 */
      var x = Math.cos(a) * p.r, z = Math.sin(a) * p.r;
      var xx = x * c + z * s, zz = z * c - x * s;
      var Y = p.y * ct - zz * st;
      var depth = p.y * st + zz * ct;
      var shimmer = .78 + Math.sin(time * .9 + p.rnd * TAU) * .16;
      var color = p.r < .09 ? 3 : p.dust ? 0 : (p.n < .22 || p.rnd > .86) ? 2 : 1;
      var tier = (shimmer > .82 && depth > -.15) ? 1 : 0;
      var size = Math.max(.4, (.42 + p.rnd * .6 + (1 - p.n) * .18) * (W / 168));
      size *= color === 3 ? 1.25 : color === 2 ? 1.1 : .95;
      bins[color * 2 + tier].push(cx + xx * R, cy - Y * R, size);
    }
    var colors = [faint, ink, zhu, zhu];
    var alphas = [.3, .68, .85, .95];
    for (var b = 0; b < 8; b++) {
      var arr = bins[b];
      if (!arr.length) continue;
      ctx.fillStyle = colors[b >> 1];
      ctx.globalAlpha = alphas[b >> 1] * (b & 1 ? 1 : .55);
      ctx.beginPath();
      for (var j = 0; j < arr.length; j += 3) {
        ctx.moveTo(arr[j] + arr[j + 2], arr[j + 1]);
        ctx.arc(arr[j], arr[j + 1], arr[j + 2], 0, TAU);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    /* 盘面外缘：一圈极淡的点线，对应原型 guides() / orbit() 的余韵 */
    ctx.fillStyle = faint;
    ctx.globalAlpha = .13;
    ctx.beginPath();
    for (var t = 0; t < TAU; t += TAU / 150) {
      var ox = cx + Math.cos(t) * R * 1.16, oy = cy + Math.sin(t) * R * st * 1.16;
      ctx.moveTo(ox + .45, oy); ctx.arc(ox, oy, .45, 0, TAU);
    }
    ctx.fill();

    /* 每一次触碰，都是一次温柔的回响 */
    for (var q = 0; q < ripples.length; q++) {
      var pl = ripples[q], age = (now - pl.t) / 1000;
      if (age > 2.4) continue;
      var fade = Math.max(0, 1 - age / 2.4);
      ctx.strokeStyle = zhu; ctx.lineWidth = 1;
      for (var ring = 0; ring < 2; ring++) {
        var rr = Math.max(0, age * R * .62 - ring * 10);
        if (!rr) continue;
        ctx.globalAlpha = fade * (ring ? .22 : .5);
        ctx.beginPath();
        ctx.ellipse(pl.x, pl.y, rr, rr * st, 0, 0, TAU);
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
    time += dt;
    tilt = .5 + Math.sin(time * .12) * .04;       /* 宇宙在缓慢呼吸 */
    if (reveal < 1) reveal = Math.min(1, reveal + dt * .55);
    ripples = ripples.filter(function (p) { return (now - p.t) / 1000 < 2.4; });
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
      else { reveal = .08; start(); }
    });
  }

  readColors();
  build();
  if (motion.matches) reveal = 1;
  resize();
  if (!motion.matches) start();
})();
