/**
 * Main interaction layer: preloader, smooth scroll (Lenis), custom cursor,
 * GSAP reveal/scroll animations, nav behaviour, lab filters, work-item
 * hover previews, misc small widgets (clock, counters, marquee tie-in).
 *
 * Every feature is guarded so a missing library / reduced-motion preference
 * degrades gracefully instead of breaking the page.
 */
(function () {
  'use strict';

  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = typeof gsap !== 'undefined';
  var hasScrollTrigger = hasGSAP && typeof ScrollTrigger !== 'undefined';
  var hasLenis = typeof Lenis !== 'undefined';

  if (hasGSAP && hasScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  document.documentElement.classList.toggle('no-motion', !!reducedMotion);

  /* ------------------------------------------------------------ */
  /* Preloader — a fake boot log, typed line by line, using real   */
  /* stack/repo facts rather than generic "Loading..." filler.     */
  /* ------------------------------------------------------------ */
  var BOOT_LINES = [
    'yashverma.sys — cold boot',
    'mounting /dev/github-actions as primary compute  [ok]',
    'checking free-tier quota ................ 0 / \u221e  [ok]',
    'spawning daemons: lyrically, vinyl.fm, waifu-widget  [ok]',
    'linking discord widget api ............... 200 OK',
    'linking lanyard + last.fm .................. live',
    'compiling shader: domain-warped fbm field  [ok]',
    'rendering portfolio ...................... ready'
  ];

  function runPreloader(done) {
    var pct = document.getElementById('preloaderPct');
    var fill = document.getElementById('preloaderFill');
    var log = document.getElementById('preloaderLog');
    var el = document.getElementById('preloader');
    if (!el) { done(); return; }

    var finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      // CSS-transition-driven dismiss (not a GSAP/rAF tween) so this can
      // never visually hang even if the main thread is under heavy load —
      // the compositor drives the transition independently of JS ticking.
      el.style.transition = 'transform .7s cubic-bezier(.65,0,.35,1)';
      el.style.transform = 'translateY(-100%)';
      var cleaned = false;
      function cleanup() {
        if (cleaned) return;
        cleaned = true;
        el.style.display = 'none';
        done();
      }
      el.addEventListener('transitionend', cleanup, { once: true });
      // Belt-and-braces: if transitionend never fires for any reason
      // (reduced-motion stripping transitions, etc.), don't block forever.
      setTimeout(cleanup, 900);
    }

    // Type out the boot log, one line every ~150ms, independent of GSAP
    // (plain timeouts) so it still runs even if GSAP failed to load.
    if (log) {
      BOOT_LINES.forEach(function (text, i) {
        setTimeout(function () {
          var line = document.createElement('div');
          line.className = 'preloader__log-line';
          var okIdx = text.lastIndexOf('[ok]');
          if (okIdx !== -1) {
            line.textContent = text.slice(0, okIdx);
            var okSpan = document.createElement('span');
            okSpan.className = 'ok';
            okSpan.textContent = '[ok]';
            line.appendChild(okSpan);
          } else {
            line.textContent = text;
          }
          log.appendChild(line);
          // Keep only the last few lines visible (terminal scroll-off feel).
          while (log.children.length > 6) log.removeChild(log.firstChild);
        }, i * 150);
      });
    }

    // Progress bar/percentage is a plain CSS transition on width, not a
    // GSAP tween — same reasoning as the dismiss animation above: it must
    // keep moving even if the JS thread is momentarily starved (heavy
    // shader compile, big layout pass, etc. on lower-end hardware).
    if (fill) {
      fill.style.transition = 'width 1.7s cubic-bezier(.16,1,.3,1)';
      // Force a reflow so the transition reliably triggers from 0%.
      // eslint-disable-next-line no-unused-expressions
      fill.offsetWidth;
      fill.style.width = '100%';
    }
    if (pct) {
      var pctStart = Date.now();
      var pctDuration = 1700;
      var pctRaf = function () {
        var t = Math.min(1, (Date.now() - pctStart) / pctDuration);
        pct.textContent = Math.round(t * 100);
        if (t < 1 && !finished) requestAnimationFrame(pctRaf);
      };
      requestAnimationFrame(pctRaf);
    }
    setTimeout(finish, 1750);

    // Absolute safety net: never let the preloader block the page for more
    // than 3.5s even if something above misbehaves.
    setTimeout(finish, 3500);
  }

  /* ------------------------------------------------------------ */
  /* Smooth scroll (Lenis) wired to ScrollTrigger + rAF             */
  /* ------------------------------------------------------------ */
  var lenis = null;
  function initSmoothScroll() {
    if (!hasLenis || reducedMotion) return;
    lenis = new Lenis({
      duration: 1.1,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true
    });
    lenis.on('scroll', function () {
      if (hasScrollTrigger) ScrollTrigger.update();
    });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  /* ------------------------------------------------------------ */
  /* Custom cursor                                                  */
  /* ------------------------------------------------------------ */
  function initCursor() {
    var cursor = document.getElementById('cursor');
    var dot = document.getElementById('cursorDot');
    var ring = document.getElementById('cursorRing');
    if (!cursor || !dot || !ring || window.matchMedia('(hover: none)').matches) return;

    var pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    var ringPos = { x: pos.x, y: pos.y };
    var label = null;

    window.addEventListener('pointermove', function (e) {
      pos.x = e.clientX; pos.y = e.clientY;
      dot.style.transform = 'translate(' + pos.x + 'px,' + pos.y + 'px)';
    });

    function loop() {
      ringPos.x += (pos.x - ringPos.x) * 0.18;
      ringPos.y += (pos.y - ringPos.y) * 0.18;
      ring.style.transform = 'translate(' + ringPos.x + 'px,' + ringPos.y + 'px)';
      requestAnimationFrame(loop);
    }
    loop();

    var interactiveEls = document.querySelectorAll('[data-cursor], a, button');
    interactiveEls.forEach(function (el) {
      el.addEventListener('mouseenter', function () {
        var mode = el.getAttribute('data-cursor');
        if (mode === 'view') {
          cursor.classList.add('is-view');
        } else {
          cursor.classList.add('is-active');
          var text = el.getAttribute('data-cursor-text');
          if (text) {
            if (!label) {
              label = document.createElement('span');
              ring.appendChild(label);
            }
            label.textContent = text;
          }
        }
      });
      el.addEventListener('mouseleave', function () {
        cursor.classList.remove('is-active', 'is-view');
      });
    });
  }

  /* ------------------------------------------------------------ */
  /* Magnetic buttons — elements pull toward the cursor within a    */
  /* radius, then spring back on mouseleave. Desktop/hover only.    */
  /* ------------------------------------------------------------ */
  function initMagnetic() {
    if (window.matchMedia('(hover: none)').matches) return;
    var els = document.querySelectorAll('[data-magnetic]');
    if (!els.length) return;

    els.forEach(function (el) {
      var strength = parseFloat(el.getAttribute('data-magnetic')) || 0.35;

      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var relX = e.clientX - (r.left + r.width / 2);
        var relY = e.clientY - (r.top + r.height / 2);
        if (hasGSAP) {
          gsap.to(el, { x: relX * strength, y: relY * strength, duration: 0.5, ease: 'power3.out' });
        } else {
          el.style.transform = 'translate(' + (relX * strength) + 'px,' + (relY * strength) + 'px)';
        }
      });

      el.addEventListener('mouseleave', function () {
        if (hasGSAP) {
          gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
        } else {
          el.style.transform = 'translate(0,0)';
        }
      });
    });
  }

  /* ------------------------------------------------------------ */
  /* Text scramble — hover an element with data-scramble and its    */
  /* text characters shuffle through random glyphs before settling  */
  /* back on the real text. Used on nav links / section titles.     */
  /* ------------------------------------------------------------ */
  var SCRAMBLE_CHARS = '!<>-_\\/[]{}—=+*^?#________';

  function scrambleText(el) {
    if (el.__scrambling) return;
    var original = el.getAttribute('data-scramble-text') || el.textContent;
    el.setAttribute('data-scramble-text', original);
    el.__scrambling = true;

    var frame = 0;
    var totalFrames = 14;
    var revealAt = original.split('').map(function (_, i) {
      return Math.floor((i / original.length) * totalFrames * 0.6) + Math.floor(Math.random() * (totalFrames * 0.3));
    });

    function tick() {
      var out = '';
      for (var i = 0; i < original.length; i++) {
        var ch = original[i];
        if (ch === ' ' || ch === '\u00A0') { out += ch; continue; }
        if (frame >= revealAt[i]) {
          out += ch;
        } else {
          out += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }
      }
      el.textContent = out;
      frame++;
      if (frame <= totalFrames) {
        requestAnimationFrame(function () { setTimeout(tick, 22); });
      } else {
        el.textContent = original;
        el.__scrambling = false;
      }
    }
    tick();
  }

  function initTextScramble() {
    if (window.matchMedia('(hover: none)').matches) return;
    var els = document.querySelectorAll('[data-scramble]');
    els.forEach(function (el) {
      el.addEventListener('mouseenter', function () { scrambleText(el); });
    });
  }

  /* ------------------------------------------------------------ */
  /* 3D tilt — cards rotate slightly toward the cursor within their */
  /* own bounds, with a glossy highlight following the pointer.     */
  /* ------------------------------------------------------------ */
  function initTilt() {
    if (window.matchMedia('(hover: none)').matches) return;
    var els = document.querySelectorAll('[data-tilt]');
    if (!els.length) return;

    els.forEach(function (el) {
      var maxTilt = 7;
      el.style.transformStyle = 'preserve-3d';

      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        var rx = (0.5 - py) * maxTilt * 2;
        var ry = (px - 0.5) * maxTilt * 2;

        if (hasGSAP) {
          gsap.to(el, {
            rotateX: rx, rotateY: ry, duration: 0.4, ease: 'power2.out',
            transformPerspective: 700
          });
        } else {
          el.style.transform = 'perspective(700px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
        }

        el.style.setProperty('--tilt-x', (px * 100) + '%');
        el.style.setProperty('--tilt-y', (py * 100) + '%');
      });

      el.addEventListener('mouseleave', function () {
        if (hasGSAP) {
          gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.6, ease: 'power3.out' });
        } else {
          el.style.transform = 'none';
        }
      });
    });
  }

  /* ------------------------------------------------------------ */
  /* Nav: hide on scroll down, show on scroll up + live clock       */
  /* ------------------------------------------------------------ */
  function initNav() {
    var nav = document.getElementById('siteNav');
    if (!nav) return;
    var lastY = window.scrollY;
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      if (y > lastY && y > 200) nav.classList.add('nav--hidden');
      else nav.classList.remove('nav--hidden');
      lastY = y;
    }, { passive: true });

    var clockEl = document.getElementById('navClock');
    if (clockEl) {
      function tick() {
        var d = new Date();
        var opts = { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
        try {
          clockEl.textContent = d.toLocaleTimeString('en-GB', opts) + ' IST';
        } catch (e) {
          clockEl.textContent = d.toLocaleTimeString();
        }
      }
      tick();
      setInterval(tick, 1000);
    }
  }

  /* ------------------------------------------------------------ */
  /* Mobile menu overlay                                            */
  /* ------------------------------------------------------------ */
  function initMenu() {
    var btn = document.getElementById('menuBtn');
    var overlay = document.getElementById('menuOverlay');
    if (!btn || !overlay) return;
    btn.addEventListener('click', function () {
      var open = overlay.classList.toggle('is-open');
      btn.classList.toggle('is-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    overlay.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        overlay.classList.remove('is-open');
        btn.classList.remove('is-open');
        document.body.style.overflow = '';
      });
    });
  }

  /* ------------------------------------------------------------ */
  /* Hero title reveal + marquee-linked scroll parallax             */
  /* ------------------------------------------------------------ */
  function initHeroReveal() {
    if (!hasGSAP) return;
    var words = document.querySelectorAll('.reveal-word');
    gsap.set(words, { yPercent: 110, opacity: 0 });
    gsap.to(words, {
      yPercent: 0, opacity: 1, duration: 1.1, ease: 'power4.out',
      stagger: 0.06, delay: 0.15
    });

    gsap.fromTo('.hero__eyebrow', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.8, delay: 0.1 });
    gsap.fromTo('.hero__sub', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.9, delay: 0.5 });
    gsap.fromTo('.hero__cta', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.9, delay: 0.65 });
  }

  /* ------------------------------------------------------------ */
  /* Generic scroll reveals for section heads / cards                */
  /* ------------------------------------------------------------ */
  function initScrollReveals() {
    if (!hasGSAP || !hasScrollTrigger) return;

    gsap.utils.toArray('.section-head').forEach(function (el) {
      gsap.fromTo(el.children, { opacity: 0, y: 30 }, {
        opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08,
        scrollTrigger: { trigger: el, start: 'top 85%' }
      });
    });

    gsap.utils.toArray('.work-card').forEach(function (el, i) {
      gsap.fromTo(el, { opacity: 0, y: 24 }, {
        opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', delay: (i % 3) * 0.06,
        scrollTrigger: { trigger: el, start: 'top 92%' }
      });
    });

    gsap.utils.toArray('.lab-card').forEach(function (el) {
      gsap.fromTo(el, { opacity: 0, y: 20 }, {
        opacity: 1, y: 0, duration: 0.6, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 95%' }
      });
    });

    gsap.utils.toArray('.arts-card').forEach(function (el) {
      gsap.fromTo(el, { opacity: 0, y: 20, scale: 0.97 }, {
        opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 95%' }
      });
    });

    gsap.utils.toArray('.favorite').forEach(function (el) {
      gsap.fromTo(el, { opacity: 0, y: 20 }, {
        opacity: 1, y: 0, duration: 0.6, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 95%' }
      });
    });

    gsap.utils.toArray('.stat').forEach(function (el) {
      gsap.fromTo(el, { opacity: 0, y: 20 }, {
        opacity: 1, y: 0, duration: 0.6, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 95%' }
      });
    });

    gsap.fromTo('.about__media', { opacity: 0, y: 30 }, {
      opacity: 1, y: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: '.about__media', start: 'top 85%' }
    });
  }

  /* ------------------------------------------------------------ */
  /* Animated counters for the stats strip                          */
  /* ------------------------------------------------------------ */
  function initCounters() {
    var nums = document.querySelectorAll('.stat__num');
    if (!nums.length) return;

    function animateCount(el) {
      var target = parseFloat(el.getAttribute('data-count')) || 0;
      var suffix = el.getAttribute('data-suffix') || '';
      if (!hasGSAP) { el.textContent = target + suffix; return; }
      var obj = { v: 0 };
      gsap.to(obj, {
        v: target, duration: 1.4, ease: 'power2.out',
        onUpdate: function () { el.textContent = Math.round(obj.v) + suffix; }
      });
    }

    if (hasScrollTrigger) {
      nums.forEach(function (el) {
        ScrollTrigger.create({
          trigger: el, start: 'top 90%', once: true,
          onEnter: function () { animateCount(el); }
        });
      });
    } else {
      nums.forEach(animateCount);
    }
  }


  /* ------------------------------------------------------------ */
  /* Lab filter buttons                                              */
  /* ------------------------------------------------------------ */
  function initLabFilters() {
    var filters = document.getElementById('labFilters');
    var grid = document.getElementById('labGrid');
    if (!filters || !grid) return;

    var buttons = filters.querySelectorAll('.lab__filter');
    var cards = grid.querySelectorAll('.lab-card');

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        buttons.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        var filter = btn.getAttribute('data-filter');
        cards.forEach(function (card) {
          var match = filter === 'all' || card.getAttribute('data-cat') === filter;
          card.classList.toggle('is-hidden', !match);
        });
      });
    });
  }

  /* ------------------------------------------------------------ */
  /* Arts gallery lightbox                                           */
  /* ------------------------------------------------------------ */
  function initLightbox() {
    var grid = document.getElementById('artsGrid');
    var lightbox = document.getElementById('lightbox');
    var lightboxImg = document.getElementById('lightboxImg');
    var lightboxCaption = document.getElementById('lightboxCaption');
    var closeBtn = document.getElementById('lightboxClose');
    var prevBtn = document.getElementById('lightboxPrev');
    var nextBtn = document.getElementById('lightboxNext');
    if (!grid || !lightbox || !lightboxImg) return;

    var currentIndex = -1;

    function visibleCards() {
      // Only cycle through cards that pass the active arts filter.
      return Array.prototype.slice.call(grid.querySelectorAll('.arts-card'))
        .filter(function (c) { return !c.classList.contains('is-hidden'); });
    }

    function renderAt(index) {
      var cards = visibleCards();
      if (!cards.length) return;
      currentIndex = (index + cards.length) % cards.length;
      var card = cards[currentIndex];
      var img = card.querySelector('img');
      var title = card.querySelector('.arts-card__title');
      var meta = card.querySelector('.arts-card__meta');
      if (!img) return;
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt || '';
      if (lightboxCaption) {
        lightboxCaption.textContent = (title ? title.textContent : '') +
          (meta ? '  —  ' + meta.textContent : '');
      }
    }

    function open(index) {
      renderAt(index);
      lightbox.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      lightbox.classList.remove('is-open');
      document.body.style.overflow = '';
    }
    function next() { renderAt(currentIndex + 1); }
    function prev() { renderAt(currentIndex - 1); }

    grid.addEventListener('click', function (e) {
      var card = e.target.closest('.arts-card');
      if (!card) return;
      var cards = visibleCards();
      var idx = cards.indexOf(card);
      if (idx === -1) return;
      open(idx);
    });

    if (closeBtn) closeBtn.addEventListener('click', close);
    if (nextBtn) nextBtn.addEventListener('click', function (e) { e.stopPropagation(); next(); });
    if (prevBtn) prevBtn.addEventListener('click', function (e) { e.stopPropagation(); prev(); });
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) close();
    });
    document.addEventListener('keydown', function (e) {
      if (!lightbox.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    });
  }

  /* ------------------------------------------------------------ */
  /* Arts filter buttons (mirrors the Lab filter pattern)            */
  /* ------------------------------------------------------------ */
  function initArtsFilters() {
    var filters = document.getElementById('artsFilters');
    var grid = document.getElementById('artsGrid');
    if (!filters || !grid) return;

    var buttons = filters.querySelectorAll('.arts__filter');
    var cards = grid.querySelectorAll('.arts-card');

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        buttons.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        var filter = btn.getAttribute('data-filter');
        cards.forEach(function (card) {
          var match = filter === 'all' || card.getAttribute('data-cat') === filter;
          card.classList.toggle('is-hidden', !match);
        });
        if (hasScrollTrigger) ScrollTrigger.refresh();
      });
    });
  }

  /* ------------------------------------------------------------ */
  /* Contact email copy-to-clipboard                                 */
  /* ------------------------------------------------------------ */
  function initEmailCopy() {
    var link = document.getElementById('contactEmail');
    if (!link) return;
    link.addEventListener('click', function (e) {
      var email = link.textContent.trim();
      if (navigator.clipboard && window.isSecureContext) {
        e.preventDefault();
        navigator.clipboard.writeText(email).then(function () {
          var original = link.textContent;
          link.textContent = 'Copied — ' + email;
          setTimeout(function () { link.textContent = original; }, 1600);
        }).catch(function () {
          window.location.href = 'mailto:' + email;
        });
      }
    });
  }

  /* ------------------------------------------------------------ */
  /* Back to top                                                     */
  /* ------------------------------------------------------------ */
  function initBackToTop() {
    var btn = document.getElementById('backToTop');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (lenis) lenis.scrollTo(0, { duration: 1.4 });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ------------------------------------------------------------ */
  /* Footer year                                                     */
  /* ------------------------------------------------------------ */
  function initYear() {
    var y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
  }

  /* ------------------------------------------------------------ */
  /* Anchor nav links smooth-scroll (works even without Lenis)      */
  /* ------------------------------------------------------------ */
  function initAnchorLinks() {
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (!id || id === '#') return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        if (lenis) lenis.scrollTo(target, { duration: 1.2 });
        else target.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  /* ------------------------------------------------------------ */
  /* Boot sequence                                                   */
  /* ------------------------------------------------------------ */
  function boot() {
    initSmoothScroll();
    initCursor();
    initNav();
    initMenu();
    initHeroReveal();
    initScrollReveals();
    initCounters();
    initLabFilters();
    initLightbox();
    initArtsFilters();
    initEmailCopy();
    initBackToTop();
    initYear();
    initAnchorLinks();
    initMagnetic();
    initTextScramble();
    initTilt();

    if (hasScrollTrigger) {
      setTimeout(function () { ScrollTrigger.refresh(); }, 300);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      runPreloader(boot);
    });
  } else {
    runPreloader(boot);
  }
})();
