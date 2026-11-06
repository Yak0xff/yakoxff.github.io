/**
 * 文末操作条：评论展开/收起 + 评论数
 * ---------------------------------------------------------------
 * 只做两件事，其余（复制 / 分享）由 reading.js 接管：
 *   1. #comments-toggle 展开 #comments-section（带进出场动画，同步 aria-expanded）
 *   2. 监听 giscus iframe 的 postMessage，把总评论数写进 #comment-count
 *
 * 原脚本里还有一段指向 www.geedea.pro 的点赞逻辑（organ farm），
 * 本站从未满足该 host 判断，属于完全不会执行的死代码，已移除。
 */
(function () {
  function initComments() {
    var toggle = document.getElementById('comments-toggle');
    var section = document.getElementById('comments-section');
    if (!toggle || !section) return;

    function setExpanded(open) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    toggle.addEventListener('click', function () {
      var isHidden = section.classList.contains('hidden');
      section.classList.remove('hidden', 'animate-slide-out-up', 'animate-slide-in-down');

      if (isHidden) {
        section.classList.add('animate-slide-in-down');
        setExpanded(true);
        return;
      }

      section.classList.add('animate-slide-out-up');
      setExpanded(false);
      setTimeout(function () {
        // 用户中途又点开时不要再补上 hidden
        if (!section.classList.contains('animate-slide-in-down')) {
          section.classList.add('hidden');
        }
      }, 200);
    });
  }

  function initCommentCount() {
    var el = document.getElementById('comment-count');
    if (!el) return;

    window.addEventListener('message', function (event) {
      if (event.origin !== 'https://giscus.app') return;
      var data = event.data && event.data.giscus;
      if (!data) return;

      var discussion = data.discussion;
      var total = discussion
        ? (discussion.totalCommentCount || 0) + (discussion.totalReplyCount || 0)
        : 0;
      el.textContent = String(total);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initComments();
    initCommentCount();
  });
})();
