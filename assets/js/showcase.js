/* ==========================================================================
   个人主页动效 —— 零依赖手写实现
   包含：开场进度、自定义光标、粒子背景（鼠标排斥 + 双击炸开）、
        打字机、滚动出现、能力雷达、数字滚动、光斑/倾斜卡片、磁性按钮、视差
   全部尊重 prefers-reduced-motion，并在标签页隐藏时暂停动画
   ========================================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  /* =========================================================
     1. 开场动画（每个会话只放一次，约 0.9 秒）
     ========================================================= */
  (function boot() {
    var el = $('#sjBoot');
    if (!el) return;
    var bar = $('#sjBootBar');
    var log = $('#sjBootLog');
    var seen = false;
    try { seen = sessionStorage.getItem('sj-booted') === '1'; } catch (e) { seen = false; }

    if (seen || reduced) { el.classList.add('gone'); return; }

    var steps = [
      [0, 'loading assets…'],
      [26, 'building particle field…'],
      [55, 'loading pid dataset (18 cases)…'],
      [80, 'rendering charts…'],
      [100, 'ready.']
    ];
    var t0 = performance.now();
    var i = 0;
    (function tick(now) {
      var p = clamp((now - t0) / 900 * 100, 0, 100);
      bar.style.width = p.toFixed(1) + '%';
      while (i < steps.length && p >= steps[i][0]) { log.textContent = steps[i][1]; i++; }
      if (p < 100) requestAnimationFrame(tick);
      else {
        setTimeout(function () {
          el.classList.add('gone');
          try { sessionStorage.setItem('sj-booted', '1'); } catch (e) { /* ignore */ }
        }, 180);
      }
    })(t0);
  })();

  /* =========================================================
     2. 自定义光标
     ========================================================= */
  (function cursor() {
    if (!fine || reduced) return;
    var ring = $('#sjRing'), dot = $('#sjDot');
    if (!ring || !dot) return;
    document.body.classList.add('has-cur');

    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var rx = mx, ry = my, shown = false;

    window.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
      if (!shown) { shown = true; ring.style.opacity = '1'; dot.style.opacity = '1'; }
    }, { passive: true });

    document.addEventListener('mouseleave', function () { ring.style.opacity = '0'; dot.style.opacity = '0'; });

    (function loop() {
      rx = lerp(rx, mx, 0.18);
      ry = lerp(ry, my, 0.18);
      ring.style.transform = 'translate3d(' + rx.toFixed(2) + 'px,' + ry.toFixed(2) + 'px,0)';
      requestAnimationFrame(loop);
    })();

    document.addEventListener('mouseover', function (e) {
      var t = e.target;
      var hot = t.closest && t.closest('a, button, [data-magnet], [data-spot]');
      ring.classList.toggle('hot', !!hot);
    });
    document.addEventListener('mousedown', function () { ring.style.scale = '0.82'; });
    document.addEventListener('mouseup', function () { ring.style.scale = '1'; });
  })();

  /* =========================================================
     3. 粒子背景
     ========================================================= */
  (function particles() {
    var cv = $('#sjCanvas');
    if (!cv || reduced) return;
    var ctx = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, parts = [], bursts = [];
    var mouse = { x: -9999, y: -9999 };
    var parallax = { x: 0, y: 0 };
    var LINK = 132, REPEL = 150;

    function resize() {
      w = window.innerWidth; h = window.innerHeight;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      cv.style.width = w + 'px'; cv.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var target = clamp(Math.round((w * h) / 20000), 26, 110);
      parts = [];
      for (var i = 0; i < target; i++) {
        parts.push({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.28, vy: (Math.random() - 0.5) * 0.28,
          r: 0.9 + Math.random() * 1.6
        });
      }
    }
    resize();
    window.addEventListener('resize', resize);

    window.addEventListener('mousemove', function (e) {
      mouse.x = e.clientX; mouse.y = e.clientY;
      parallax.x = (e.clientX / window.innerWidth - 0.5) * 14;
      parallax.y = (e.clientY / window.innerHeight - 0.5) * 10;
    }, { passive: true });
    window.addEventListener('mouseout', function () { mouse.x = mouse.y = -9999; });

    // 双击炸开
    window.addEventListener('dblclick', function (e) {
      for (var i = 0; i < 26; i++) {
        var a = Math.random() * Math.PI * 2, s = 1.6 + Math.random() * 3.4;
        bursts.push({
          x: e.clientX, y: e.clientY,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: 1, r: 1.2 + Math.random() * 2.2
        });
      }
    });

    var hidden = false;
    document.addEventListener('visibilitychange', function () { hidden = document.hidden; });

    function frame() {
      if (!hidden) {
        ctx.clearRect(0, 0, w, h);
        var i, j, p, q, dx, dy, d;

        for (i = 0; i < parts.length; i++) {
          p = parts[i];
          p.x += p.vx; p.y += p.vy;
          if (p.x < -20) p.x = w + 20; if (p.x > w + 20) p.x = -20;
          if (p.y < -20) p.y = h + 20; if (p.y > h + 20) p.y = -20;

          dx = p.x - mouse.x; dy = p.y - mouse.y;
          d = Math.hypot(dx, dy);
          if (d < REPEL && d > 0.01) {
            var f = (REPEL - d) / REPEL * 0.9;
            p.x += (dx / d) * f; p.y += (dy / d) * f;
          }
        }

        // 连线
        for (i = 0; i < parts.length; i++) {
          p = parts[i];
          for (j = i + 1; j < parts.length; j++) {
            q = parts[j];
            dx = p.x - q.x; dy = p.y - q.y;
            if (Math.abs(dx) > LINK || Math.abs(dy) > LINK) continue;
            d = Math.hypot(dx, dy);
            if (d < LINK) {
              ctx.strokeStyle = 'rgba(77,208,225,' + ((1 - d / LINK) * 0.22).toFixed(3) + ')';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(p.x + parallax.x, p.y + parallax.y);
              ctx.lineTo(q.x + parallax.x, q.y + parallax.y);
              ctx.stroke();
            }
          }
        }

        // 粒子
        for (i = 0; i < parts.length; i++) {
          p = parts[i];
          var near = Math.hypot(p.x - mouse.x, p.y - mouse.y) < REPEL;
          ctx.fillStyle = near ? 'rgba(230,57,70,.85)' : 'rgba(180,205,220,.5)';
          ctx.beginPath();
          ctx.arc(p.x + parallax.x, p.y + parallax.y, p.r, 0, 6.2832);
          ctx.fill();
        }

        // 爆炸粒子
        for (i = bursts.length - 1; i >= 0; i--) {
          var b = bursts[i];
          b.x += b.vx; b.y += b.vy;
          b.vx *= 0.965; b.vy = b.vy * 0.965 + 0.045;
          b.life -= 0.018;
          if (b.life <= 0) { bursts.splice(i, 1); continue; }
          ctx.fillStyle = 'rgba(255,183,3,' + b.life.toFixed(3) + ')';
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r * b.life + 0.4, 0, 6.2832);
          ctx.fill();
        }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();

  /* =========================================================
     4. 打字机（跟随中英文切换）
     ========================================================= */
  (function typewriter() {
    var el = $('#sjType');
    if (!el) return;
    var LINES = {
      zh: [
        '从零自学嵌入式的大一学生',
        '把每个参数都用真实数据讲清楚',
        '能写控制，也看得懂板子',
        '目标：BNGU 战队 电控组 / 电路组'
      ],
      en: [
        'A freshman teaching himself embedded systems from zero',
        'Explaining every control parameter with real data',
        'Comfortable in control code and in circuit reasoning',
        'Goal: BNGU RoboMaster — control & electronics'
      ]
    };
    var lang = document.documentElement.getAttribute('data-lang') === 'en' ? 'en' : 'zh';
    var li = 0, ci = 0, deleting = false;
    var timer = null;

    if (reduced) { el.textContent = LINES[lang][0]; return; }

    function step() {
      var list = LINES[lang];
      var line = list[li % list.length];
      if (!deleting) {
        ci++;
        el.textContent = line.slice(0, ci);
        if (ci >= line.length) { deleting = true; return schedule(1500); }
        return schedule(52 + Math.random() * 34);
      }
      ci--;
      el.textContent = line.slice(0, Math.max(0, ci));
      if (ci <= 0) { deleting = false; li++; return schedule(320); }
      return schedule(24);
    }
    function schedule(ms) { clearTimeout(timer); timer = setTimeout(step, ms); }

    schedule(420);

    new MutationObserver(function () {
      var next = document.documentElement.getAttribute('data-lang') === 'en' ? 'en' : 'zh';
      if (next === lang) return;
      lang = next; li = 0; ci = 0; deleting = false;
      el.textContent = '';
      schedule(160);
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-lang'] });
  })();

  /* =========================================================
     5. 滚动出现 / 进度条 / 能力条 / 数字滚动
     ========================================================= */
  (function scrollStuff() {
    var bar = $('#sjProgress');
    function onScroll() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
      if (bar) bar.style.width = (p * 100).toFixed(2) + '%';
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (!('IntersectionObserver' in window)) {
      $$('.sj-rv').forEach(function (el) { el.classList.add('in'); });
      $$('.sj-bar-l i').forEach(function (i) { i.style.width = (i.closest('.sj-bar').dataset.v || 0) + '%'; });
      $$('[data-count]').forEach(function (b) { b.textContent = b.dataset.count + (b.dataset.suffix || ''); });
      return;
    }

    // 逐个出现（同组内错开）
    var io = new IntersectionObserver(function (list) {
      list.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var sibs = Array.prototype.slice.call(el.parentNode.children).filter(function (n) { return n.classList.contains('sj-rv'); });
        var k = Math.max(0, sibs.indexOf(el));
        el.style.transitionDelay = Math.min(k * 90, 480) + 'ms';
        el.classList.add('in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    $$('.sj-rv').forEach(function (el) { io.observe(el); });

    // 能力条
    var ioBar = new IntersectionObserver(function (list) {
      list.forEach(function (en) {
        if (!en.isIntersecting) return;
        $$('.sj-bar', en.target).forEach(function (b, idx) {
          var fill = $('.sj-bar-l i', b);
          setTimeout(function () { fill.style.width = (b.dataset.v || 0) + '%'; }, idx * 120);
        });
        ioBar.unobserve(en.target);
      });
    }, { threshold: 0.2 });
    var bars = $('.sj-bars');
    if (bars) ioBar.observe(bars);

    // 数字滚动
    var ioNum = new IntersectionObserver(function (list) {
      list.forEach(function (en) {
        if (!en.isIntersecting) return;
        var target = parseInt(en.target.dataset.count, 10) || 0;
        var suffix = en.target.dataset.suffix || '';
        var t0 = performance.now(), dur = 1200;
        (function run(now) {
          var p = clamp((now - t0) / dur, 0, 1);
          var e = 1 - Math.pow(1 - p, 3);
          en.target.textContent = Math.round(target * e) + suffix;
          if (p < 1) requestAnimationFrame(run);
        })(t0);
        ioNum.unobserve(en.target);
      });
    }, { threshold: 0.4 });
    $$('[data-count]').forEach(function (b) { ioNum.observe(b); });
  })();

  /* =========================================================
     6. 能力雷达图（SVG 手绘 + 鼠标微反应）
     ========================================================= */
  (function radar() {
    var svg = $('#sjRadar');
    if (!svg) return;
    var labels = (svg.dataset.labels || '').split('|');
    var values = (svg.dataset.values || '').split('|').map(Number);
    var n = Math.min(labels.length, values.length);
    var CX = 170, CY = 176, R = 112, RINGS = 4;
    var NS = 'http://www.w3.org/2000/svg';

    function pt(i, r) {
      var a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      return [CX + Math.cos(a) * r, CY + Math.sin(a) * r];
    }
    function el(name, attrs) {
      var e = document.createElementNS(NS, name);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      return e;
    }

    // 网格
    for (var r = 1; r <= RINGS; r++) {
      var d = [];
      for (var i = 0; i < n; i++) { var p = pt(i, (R * r) / RINGS); d.push(p[0].toFixed(1) + ',' + p[1].toFixed(1)); }
      svg.appendChild(el('polygon', {
        points: d.join(' '), fill: 'none',
        stroke: r === RINGS ? 'rgba(77,208,225,.35)' : 'rgba(45,58,77,.85)', 'stroke-width': 1
      }));
    }
    // 轴 + 标签
    for (i = 0; i < n; i++) {
      var e2 = pt(i, R);
      svg.appendChild(el('line', { x1: CX, y1: CY, x2: e2[0], y2: e2[1], stroke: 'rgba(45,58,77,.9)', 'stroke-width': 1 }));
      var lp = pt(i, R + 26);
      var anchor = Math.abs(lp[0] - CX) < 12 ? 'middle' : (lp[0] > CX ? 'start' : 'end');
      var t = el('text', { x: lp[0], y: lp[1] + 3.5, 'text-anchor': anchor });
      t.textContent = labels[i];
      svg.appendChild(t);
    }

    // 数值多边形
    var poly = el('polygon', {
      points: '', fill: 'rgba(230,57,70,.22)', stroke: '#e63946', 'stroke-width': 2,
      'stroke-linejoin': 'round'
    });
    svg.appendChild(poly);
    var dots = [];
    for (i = 0; i < n; i++) {
      var c = el('circle', { r: 3.4, fill: '#e63946', stroke: '#05070a', 'stroke-width': 1.5 });
      svg.appendChild(c); dots.push(c);
    }
    var g = el('g', {});
    // 把多边形与点放到网格之上（已是 append 顺序，无需再动）

    function pointsFor(scale) {
      var out = [], k;
      for (k = 0; k < n; k++) {
        var rad = (R * (values[k] / 100)) * scale;
        var p = pt(k, Math.max(rad, 1.5));
        out.push(p[0].toFixed(1) + ',' + p[1].toFixed(1));
      }
      return out.join(' ');
    }
    function dotsFor(scale) {
      for (var k = 0; k < n; k++) {
        var rad = (R * (values[k] / 100)) * scale;
        var p = pt(k, Math.max(rad, 1.5));
        dots[k].setAttribute('cx', p[0].toFixed(1));
        dots[k].setAttribute('cy', p[1].toFixed(1));
      }
    }

    function animate(from, to, dur, done) {
      var t0 = performance.now();
      (function run(now) {
        var p = clamp((now - t0) / dur, 0, 1);
        var e = 1 - Math.pow(1 - p, 3);
        var s = lerp(from, to, e);
        poly.setAttribute('points', pointsFor(s));
        dotsFor(s);
        if (p < 1) requestAnimationFrame(run); else if (done) done();
      })(t0);
    }

    if (reduced) { poly.setAttribute('points', pointsFor(1)); dotsFor(1); }
    else if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (list) {
        list.forEach(function (en) {
          if (!en.isIntersecting) return;
          animate(0, 1, 1100);
          io.unobserve(en.target);
        });
      }, { threshold: 0.3 });
      io.observe(svg);
    } else { poly.setAttribute('points', pointsFor(1)); dotsFor(1); }

    // 鼠标靠近时轻微旋转
    if (!reduced && fine) {
      var wrap = svg.closest('.sj-radar-wrap') || svg;
      var cur = 0, target = 0, tx = 0, ty = 0, ctx2 = 0, cty = 0;
      wrap.addEventListener('mousemove', function (e) {
        var r = wrap.getBoundingClientRect();
        target = ((e.clientX - r.left) / r.width - 0.5) * 12;
        tx = ((e.clientX - r.left) / r.width - 0.5) * 6;
        ty = ((e.clientY - r.top) / r.height - 0.5) * 6;
      });
      wrap.addEventListener('mouseleave', function () { target = 0; tx = 0; ty = 0; });
      (function spin() {
        cur = lerp(cur, target, 0.07);
        ctx2 = lerp(ctx2, tx, 0.07);
        cty = lerp(cty, ty, 0.07);
        svg.style.transform = 'rotate(' + cur.toFixed(2) + 'deg) translate(' + ctx2.toFixed(1) + 'px,' + cty.toFixed(1) + 'px)';
        requestAnimationFrame(spin);
      })();
    }
  })();

  /* =========================================================
     7. 光斑跟随 + 卡片倾斜 + 磁性按钮 + Hero 视差
     ========================================================= */
  (function interactions() {
    if (reduced) return;

    $$('[data-spot]').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });

    if (fine) {
      $$('[data-tilt]').forEach(function (el) {
        el.addEventListener('mousemove', function (e) {
          var r = el.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - 0.5;
          var py = (e.clientY - r.top) / r.height - 0.5;
          el.style.transform = 'perspective(900px) rotateY(' + (px * 7).toFixed(2) + 'deg) rotateX(' + (-py * 7).toFixed(2) + 'deg) translateY(-3px)';
        });
        el.addEventListener('mouseleave', function () { el.style.transform = ''; });
      });

      $$('[data-magnet]').forEach(function (el) {
        el.addEventListener('mousemove', function (e) {
          var r = el.getBoundingClientRect();
          var dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
          var dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
          el.style.transform = 'translate(' + (dx * 5).toFixed(2) + 'px,' + (dy * 5 - 1).toFixed(2) + 'px)';
        });
        el.addEventListener('mouseleave', function () { el.style.transform = ''; });
      });

      var layers = $$('#sjParallax [data-depth]');
      if (layers.length) {
        window.addEventListener('mousemove', function (e) {
          var cx = e.clientX / window.innerWidth - 0.5;
          var cy = e.clientY / window.innerHeight - 0.5;
          layers.forEach(function (l) {
            var d = parseFloat(l.dataset.depth) || 1;
            l.style.transform = 'translate3d(' + (-cx * d * 12).toFixed(2) + 'px,' + (-cy * d * 8).toFixed(2) + 'px,0)';
          });
        }, { passive: true });
      }
    }
  })();
})();
