/* 键盘快捷键 —— t 回顶 / j·k 跳标题 / b 目录 / ? 帮助
   在输入框内不拦截 */
(function () {
  'use strict';
  var hint = document.getElementById('shortcut-hint');
  var timer = null;

  function show(text) {
    if (!hint || !text) return;
    hint.textContent = text;
    hint.setAttribute('data-show', 'true');
    window.clearTimeout(timer);
    timer = window.setTimeout(function () { hint.setAttribute('data-show', 'false'); }, 1400);
  }

  function headings() {
    return Array.prototype.slice.call(document.querySelectorAll('#post-content h2, #post-content h3'));
  }

  function jump(dir) {
    var list = headings();
    if (!list.length) return;
    var offset = window.scrollY + window.innerHeight * 0.25;
    var target = null;
    if (dir > 0) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].getBoundingClientRect().top + window.scrollY > offset + 8) { target = list[i]; break; }
      }
    } else {
      for (var j = list.length - 1; j >= 0; j--) {
        if (list[j].getBoundingClientRect().top + window.scrollY < offset - 8) { target = list[j]; break; }
      }
    }
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      show(target.textContent.trim().slice(0, 18));
    }
  }

  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var el = document.activeElement;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;

    switch (e.key) {
      case 't':
      case 'T':
        window.scrollTo({ top: 0, behavior: 'smooth' });
        show('回到顶部');
        break;
      case 'j':
      case 'J':
        jump(1);
        break;
      case 'k':
      case 'K':
        jump(-1);
        break;
      case 'b':
      case 'B':
        var fab = document.getElementById('toc-fab');
        if (fab) { fab.click(); show('目录'); }
        break;
      case '?':
        show('t 回顶 · j/k 跳标题 · b 目录 · Esc 关闭');
        break;
      default:
        break;
    }
  });
})();
