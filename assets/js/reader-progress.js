/* 顶部阅读进度条 —— 无依赖，rAF 节流 */
(function () {
  'use strict';
  var bar = document.querySelector('.reader-progress-bar');
  if (!bar) return;

  var ticking = false;

  function update() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - doc.clientHeight;
    var ratio = max > 0 ? Math.min(1, Math.max(0, doc.scrollTop / max)) : 0;
    bar.style.width = (ratio * 100).toFixed(2) + '%';
    bar.setAttribute('aria-valuenow', Math.round(ratio * 100));
    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(update);
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
})();
