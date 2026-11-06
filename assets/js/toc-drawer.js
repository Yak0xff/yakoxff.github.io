/* 移动端目录抽屉 —— 打开/关闭、ESC、点击遮罩、滚动高亮 aria-current */
(function () {
  'use strict';
  var drawer = document.getElementById('toc-drawer');
  var fab = document.getElementById('toc-fab');
  var backdrop = document.getElementById('toc-backdrop');
  if (!drawer || !fab) return;

  var closeBtn = drawer.querySelector('.toc-drawer-close');
  var links = Array.prototype.slice.call(drawer.querySelectorAll('a[href^="#"]'));

  function isOpen() {
    return drawer.getAttribute('data-open') === 'true';
  }

  function open() {
    drawer.setAttribute('data-open', 'true');
    drawer.removeAttribute('aria-hidden');
    fab.setAttribute('aria-expanded', 'true');
    if (backdrop) backdrop.setAttribute('data-open', 'true');
    if (closeBtn) closeBtn.focus();
  }

  function close(returnFocus) {
    drawer.setAttribute('data-open', 'false');
    drawer.setAttribute('aria-hidden', 'true');
    fab.setAttribute('aria-expanded', 'false');
    if (backdrop) backdrop.setAttribute('data-open', 'false');
    if (returnFocus) fab.focus();
  }

  fab.addEventListener('click', function () {
    isOpen() ? close(true) : open();
  });

  if (closeBtn) closeBtn.addEventListener('click', function () { close(true); });
  if (backdrop) backdrop.addEventListener('click', function () { close(true); });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) close(true);
  });

  links.forEach(function (a) {
    a.addEventListener('click', function () { close(false); });
  });

  /* 滚动时同步高亮当前小节 */
  var headings = links
    .map(function (a) { return document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1))); })
    .filter(Boolean);
  if (!headings.length) return;

  var ticking = false;
  function sync() {
    var offset = window.innerHeight * 0.25;
    var activeIdx = 0;
    for (var i = 0; i < headings.length; i++) {
      if (headings[i].getBoundingClientRect().top <= offset) activeIdx = i; else break;
    }
    links.forEach(function (a, i) {
      if (i === activeIdx) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { window.requestAnimationFrame(sync); ticking = true; }
  }, { passive: true });
  sync();
})();
