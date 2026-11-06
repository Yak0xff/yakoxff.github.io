/* 滚动进场 —— 支持 prefers-reduced-motion（减少动效时直接显示） */
(function () {
  'use strict';
  var targets = document.querySelectorAll('.reveal');
  if (!targets.length) return;

  document.documentElement.classList.add('js-reveal');

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('is-visible'); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });

  targets.forEach(function (el) { io.observe(el); });
})();
