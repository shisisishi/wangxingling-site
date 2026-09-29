/* 极简站点脚本：语言切换 + 滚动出现动画。无依赖、无框架。 */
(function () {
  'use strict';

  /* ---------- 语言切换 ---------- */
  var KEY = 'wxl-lang';
  var root = document.documentElement;

  function setLang(lang, persist) {
    root.setAttribute('data-lang', lang);
    root.setAttribute('lang', lang === 'en' ? 'en' : 'zh-CN');
    var btn = document.querySelector('.lang-btn');
    if (btn) btn.textContent = lang === 'en' ? '中文' : 'EN';
    if (persist) {
      try { localStorage.setItem(KEY, lang); } catch (e) { /* 隐私模式下忽略 */ }
    }
  }

  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { saved = null; }
  var initial = saved || ((navigator.language || '').toLowerCase().indexOf('zh') === 0 ? 'zh' : 'zh');
  setLang(initial, false);

  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest && ev.target.closest('.lang-btn');
    if (!btn) return;
    ev.preventDefault();
    setLang(root.getAttribute('data-lang') === 'en' ? 'zh' : 'en', true);
  });

  /* ---------- 滚动出现动画 ---------- */
  var items = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (!('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 导航当前区块高亮 ---------- */
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav-links a[href^="#"]'));
  if (links.length && 'IntersectionObserver' in window) {
    var map = {};
    links.forEach(function (a) {
      var t = document.querySelector(a.getAttribute('href'));
      if (t) map[t.id] = a;
    });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var a = map[en.target.id];
        if (!a) return;
        if (en.isIntersecting) {
          links.forEach(function (x) { x.style.color = ''; x.style.background = ''; });
          a.style.color = '#fff';
          a.style.background = 'var(--panel-2)';
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { spy.observe(document.getElementById(id)); });
  }

  /* ---------- 年份 ---------- */
  var y = document.querySelectorAll('[data-year]');
  y.forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
