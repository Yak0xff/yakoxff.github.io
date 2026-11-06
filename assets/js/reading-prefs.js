/* 阅读偏好面板 —— 字号 / 行距 / 栏宽，localStorage 持久化
   属性写在 <html> 上，样式由 _reader.scss 承接 */
(function () {
  'use strict';
  var KEY = 'yak:reading-prefs';
  var root = document.documentElement;
  var panel = document.getElementById('reader-prefs');
  var toggle = document.getElementById('prefs-toggle');

  var DEFAULTS = { fontSize: 'md', leading: 'normal', width: 'normal' };
  var VALID = {
    fontSize: ['sm', 'md', 'lg', 'xl'],
    leading: ['tight', 'normal', 'loose'],
    width: ['narrow', 'normal', 'wide']
  };

  function read() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return Object.assign({}, DEFAULTS);
      var parsed = JSON.parse(raw) || {};
      var out = Object.assign({}, DEFAULTS);
      Object.keys(DEFAULTS).forEach(function (k) {
        if (VALID[k].indexOf(parsed[k]) !== -1) out[k] = parsed[k];
      });
      return out;
    } catch (e) {
      return Object.assign({}, DEFAULTS);
    }
  }

  function apply(prefs) {
    Object.keys(prefs).forEach(function (k) {
      root.setAttribute('data-' + k.toLowerCase(), prefs[k]);
    });
    document.querySelectorAll('#reader-prefs [data-pref]').forEach(function (group) {
      var key = group.getAttribute('data-pref');
      group.querySelectorAll('button[data-value]').forEach(function (btn) {
        btn.setAttribute('aria-pressed', btn.getAttribute('data-value') === prefs[key] ? 'true' : 'false');
      });
    });
  }

  function save(prefs) {
    try { window.localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) { /* 隐私模式下忽略 */ }
  }

  var prefs = read();
  apply(prefs);

  if (!panel || !toggle) return;

  function setOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  toggle.addEventListener('click', function () {
    setOpen(panel.hidden);
  });

  panel.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-value]');
    if (!btn) return;
    var group = btn.closest('[data-pref]');
    if (!group) return;
    var key = group.getAttribute('data-pref');
    prefs[key] = btn.getAttribute('data-value');
    apply(prefs);
    save(prefs);
  });

  var reset = panel.querySelector('.pref-reset');
  if (reset) {
    reset.addEventListener('click', function () {
      prefs = Object.assign({}, DEFAULTS);
      apply(prefs);
      save(prefs);
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) { setOpen(false); toggle.focus(); }
  });
})();
