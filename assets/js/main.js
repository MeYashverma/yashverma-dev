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
    'linking github + pageview telemetry ........ live',
    'compiling shader: domain-warped fbm field  [ok]',
    'rendering portfolio ...................... ready'
  ];

  function runPreloader(done) {
    var pct = document.getElementById('preloaderPct');
    var fill = document.getElementById('preloaderFill');
    var log = document.getElementById('preloaderLog');
    var el = document.getElementById('preloader');
    if (!el) { done(); return; }

    var seenBoot = false;
    try { seenBoot = sessionStorage.getItem('yv_boot_seen') === '1'; } catch (e) {}
    var coarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    var quickBoot = reducedMotion || coarsePointer || seenBoot;
    var bootDuration = quickBoot ? 760 : 1700;
    var lineDelay = quickBoot ? 55 : 150;
    var finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      try { sessionStorage.setItem('yv_boot_seen', '1'); } catch (e) {}
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
        }, i * lineDelay);
      });
    }

    // Progress bar/percentage is a plain CSS transition on width, not a
    // GSAP tween — same reasoning as the dismiss animation above: it must
    // keep moving even if the JS thread is momentarily starved (heavy
    // shader compile, big layout pass, etc. on lower-end hardware).
    if (fill) {
      fill.style.transition = 'width ' + (bootDuration / 1000) + 's cubic-bezier(.16,1,.3,1)';
      // Force a reflow so the transition reliably triggers from 0%.
      // eslint-disable-next-line no-unused-expressions
      fill.offsetWidth;
      fill.style.width = '100%';
    }
    if (pct) {
      var pctStart = Date.now();
      var pctDuration = bootDuration;
      var pctRaf = function () {
        var t = Math.min(1, (Date.now() - pctStart) / pctDuration);
        pct.textContent = Math.round(t * 100);
        if (t < 1 && !finished) requestAnimationFrame(pctRaf);
      };
      requestAnimationFrame(pctRaf);
    }
    setTimeout(finish, bootDuration + 50);

    // Absolute safety net: never let the preloader block the page for more
    // than 2.6s even if something above misbehaves.
    setTimeout(finish, 2600);
  }

  /* ------------------------------------------------------------ */
  /* Smooth scroll (Lenis) wired to ScrollTrigger + rAF             */
  /* ------------------------------------------------------------ */
  var lenis = null;
  function initSmoothScroll() {
    var coarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    // Native scrolling is faster and more reliable in iOS/Android browsers;
    // Lenis remains a desktop enhancement rather than taking over touch input.
    if (!hasLenis || reducedMotion || coarsePointer || window.innerWidth < 900) return;
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
    if (!hasGSAP || !hasScrollTrigger || reducedMotion) return;

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

    gsap.utils.toArray('.shipped-card:not(.shipped-card--loading), .journey-item').forEach(function (el, i) {
      gsap.fromTo(el, { opacity: 0, y: 22 }, {
        opacity: 1, y: 0, duration: 0.65, ease: 'power3.out', delay: (i % 3) * 0.05,
        scrollTrigger: { trigger: el, start: 'top 94%' }
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

    gsap.utils.toArray('.gallery-photo').forEach(function (el, i) {
      gsap.fromTo(el, { opacity: 0, y: 24 }, {
        opacity: 1, y: 0, duration: 0.65, ease: 'power3.out', delay: (i % 4) * 0.05,
        scrollTrigger: { trigger: el, start: 'top 95%' }
      });
    });

    gsap.utils.toArray('.gallery-sky, .gallery-cert').forEach(function (el) {
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
    // Dynamic values (such as the real visitor counter) do not carry
    // data-count and must not be overwritten by the decorative count-up.
    var nums = document.querySelectorAll('.stat__num[data-count]');
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
  /* About — live age                                               */
  /* Completed calendar years are calculated against the birthday  */
  /* in India, then the days + HH:MM:SS since the latest birthday   */
  /* tick in real time. This avoids a hard-coded age going stale.    */
  /* ------------------------------------------------------------ */
  function initLiveAge() {
    var root = document.getElementById('liveAge');
    var yearsEl = document.getElementById('liveAgeYears');
    var daysEl = document.getElementById('liveAgeDays');
    var clockEl = document.getElementById('liveAgeClock');
    var totalDaysEl = document.getElementById('liveAgeTotalDays');
    if (!root || !yearsEl || !daysEl || !clockEl) return;

    var BIRTH_YEAR = 2005;
    var BIRTH_TS = Date.parse('2005-01-08T00:00:00+05:30');
    var DAY_MS = 86400000;

    function yearInKolkata(date) {
      try {
        return parseInt(new Intl.DateTimeFormat('en', {
          timeZone: 'Asia/Kolkata', year: 'numeric'
        }).format(date), 10);
      } catch (err) {
        return date.getUTCFullYear();
      }
    }

    function birthdayTimestamp(year) {
      return Date.parse(String(year) + '-01-08T00:00:00+05:30');
    }

    function two(n) { return String(n).padStart(2, '0'); }

    function updateAge() {
      var now = Date.now();
      var anniversaryYear = yearInKolkata(new Date(now));
      var anniversary = birthdayTimestamp(anniversaryYear);
      if (now < anniversary) {
        anniversaryYear -= 1;
        anniversary = birthdayTimestamp(anniversaryYear);
      }

      var years = anniversaryYear - BIRTH_YEAR;
      var sinceBirthday = Math.max(0, now - anniversary);
      var days = Math.floor(sinceBirthday / DAY_MS);
      var remainder = sinceBirthday - (days * DAY_MS);
      var hours = Math.floor(remainder / 3600000);
      remainder -= hours * 3600000;
      var minutes = Math.floor(remainder / 60000);
      var seconds = Math.floor((remainder - minutes * 60000) / 1000);
      var totalDays = Math.floor((now - BIRTH_TS) / DAY_MS);

      yearsEl.textContent = String(years);
      daysEl.textContent = String(days).padStart(3, '0');
      clockEl.textContent = two(hours) + ':' + two(minutes) + ':' + two(seconds);
      if (totalDaysEl) totalDaysEl.textContent = totalDays.toLocaleString('en-IN') + ' days lived';
      root.setAttribute('aria-label',
        'Age: ' + years + ' years, ' + days + ' days, ' + hours + ' hours, ' +
        minutes + ' minutes and ' + seconds + ' seconds. Born 8 January 2005.');
    }

    updateAge();
    setInterval(updateAge, 1000);
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
    initLiveAge();
    initAnchorLinks();
    initMagnetic();
    initTextScramble();
    initTilt();
    initAboutPortrait();
    initGallerySwap();
    initHeroPortrait();
    initCommandPalette();
    initScrollSpy();
    initArtsFocus();

    if (hasScrollTrigger) {
      setTimeout(function () { ScrollTrigger.refresh(); }, 300);
    }
  }

  /* ----------------------------------------------------------
     About portrait — three static render modes (halftone,
     ASCII, photo). No auto-cycle, no scan-lines, no HUD —
     just three clickable tabs that fade between renders.
     ---------------------------------------------------------- */
  function initAboutPortrait() {
    var wrap = document.getElementById('aboutPortrait');
    if (!wrap) return;
    var tabs = wrap.querySelectorAll('.about__portrait-tab');
    if (!tabs.length) return;

    function setMode(mode) {
      wrap.dataset.mode = mode;
      tabs.forEach(function (t) {
        t.classList.toggle('is-active', t.dataset.mode === mode);
      });
    }

    tabs.forEach(function (t) {
      t.addEventListener('click', function () { setMode(t.dataset.mode); });
    });
  }

  /* ----------------------------------------------------------
     Gallery photo swap — same-location pose pairs cross-fade
     silently on a long cadence (4-6s per card, staggered so
     they never flip in lockstep). Pauses on hover so people
     can actually study a shot, and pauses when the card is
     off-screen so we don't waste cycles / battery.
     ---------------------------------------------------------- */
  function initGallerySwap() {
    var groups = document.querySelectorAll('[data-swap]');
    if (!groups.length) return;
    var saveData = navigator.connection && navigator.connection.saveData;
    var compactTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 760;
    // Keep the first frame static on constrained mobile connections: this
    // avoids timers and prevents browsers from decoding every alternate shot.
    if (saveData || compactTouch) return;

    groups.forEach(function (g) {
      // Secondary frames keep their URLs in data-src so mobile browsers do
      // not download a stack of invisible alternates they will never rotate.
      g.querySelectorAll('img[data-src]').forEach(function (img) {
        var deferredSet = img.getAttribute('data-srcset');
        var deferredSizes = img.getAttribute('data-sizes');
        if (deferredSet) img.srcset = deferredSet;
        if (deferredSizes) img.sizes = deferredSizes;
        img.src = img.getAttribute('data-src');
        img.removeAttribute('data-src');
        img.removeAttribute('data-srcset');
        img.removeAttribute('data-sizes');
      });
      var frames = g.querySelectorAll('.gallery-photo__frame');
      if (frames.length < 2) return;

      var i = 0;
      var interval = parseInt(g.dataset.swap, 10) || 4500;
      var offset = 400 + Math.round(Math.random() * 1800);
      var timer = null;
      var paused = false;
      var visible = true;

      function tick() {
        if (paused || !visible) return;
        frames[i].classList.remove('is-visible');
        i = (i + 1) % frames.length;
        frames[i].classList.add('is-visible');
      }

      function start() {
        if (timer) return;
        timer = setInterval(tick, interval);
      }
      function stop() {
        if (!timer) return;
        clearInterval(timer);
        timer = null;
      }

      g.addEventListener('mouseenter', function () { paused = true; stop(); });
      g.addEventListener('mouseleave', function () { paused = false; start(); });

      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            visible = e.isIntersecting;
            if (visible) start(); else stop();
          });
        }, { threshold: 0.15 });
        io.observe(g);
      }

      setTimeout(start, offset);
    });
  }

  /* ----------------------------------------------------------
     Hero portrait — live canvas dot-matrix render of the real
     photo. Reads pixel luminance from the source <img> and
     paints a grid of lime dots (larger = darker), reacts to
     the mouse pointer with a soft ripple, and gently breathes
     when idle. No labels, no chrome — it's just an image,
     rendered a different way.
     ---------------------------------------------------------- */
  function initHeroPortrait() {
    var canvas = document.getElementById('heroPortraitCanvas');
    var srcImg = document.getElementById('heroPortraitSrc');
    if (!canvas || !srcImg) return;

    var portrait = canvas.parentElement;
    var saveData = navigator.connection && navigator.connection.saveData;
    var compactTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 760;
    if (saveData || compactTouch) {
      if (portrait) portrait.classList.add('is-static');
      return;
    }

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var accent = '#d9ff3f';
    var GRID = 8;               // spacing between dots in CSS px (denser = crisper face)
    var DOT_MAX = 4.0;          // largest dot radius
    var luminance = null;       // sampled Float32Array of grayscale (0..1) values

    // Off-screen sampling canvas — small resolution so the luminance grid
    // is fast to read and we don't get sub-pixel jitter as the layout
    // resizes.
    var sample = document.createElement('canvas');
    var sctx = sample.getContext('2d');

    var mouse = { x: -9999, y: -9999, hovering: false };
    var t0 = performance.now();
    var lastPaint = 0;
    var cols = 0, rows = 0, w = 0, h = 0;

    function resize() {
      var rect = canvas.parentElement.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(160, Math.floor(rect.width));
      h = Math.max(160, Math.floor(rect.height));
      canvas.width  = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width  = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      cols = Math.floor(w / GRID);
      rows = Math.floor(h / GRID);
      sample.width  = cols;
      sample.height = rows;

      if (srcImg.complete && srcImg.naturalWidth) sampleImage();
    }

    // Cover-fit the source image into the sample canvas, then read pixels
    // and store a Float32Array of luminance values (one per grid cell).
    function sampleImage() {
      if (!cols || !rows) return;
      var iw = srcImg.naturalWidth;
      var ih = srcImg.naturalHeight;
      if (!iw || !ih) return;

      var scale = Math.max(cols / iw, rows / ih);
      var dw = iw * scale;
      var dh = ih * scale;
      var dx = (cols - dw) / 2;
      var dy = (rows - dh) / 2;

      sctx.clearRect(0, 0, cols, rows);
      sctx.drawImage(srcImg, dx, dy, dw, dh);

      try {
        var data = sctx.getImageData(0, 0, cols, rows).data;
        var lum = new Float32Array(cols * rows);
        for (var i = 0, p = 0; i < lum.length; i++, p += 4) {
          // Standard Rec. 709 luminance.
          lum[i] = (0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]) / 255;
        }
        luminance = lum;
      } catch (e) {
        // Cross-origin taint — unlikely because we host the image ourselves,
        // but if it happens we'll just paint a soft placeholder pattern.
        luminance = null;
      }
    }

    function paint(now) {
      if (!luminance) return requestAnimationFrame(paint);

      var elapsed = (now - t0) / 1000;
      // Global breathing scale (very subtle — no more than ±1.5%).
      var breathe = reduced ? 1 : 1 + Math.sin(elapsed * 0.9) * 0.012;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = accent;

      var mx = mouse.x, my = mouse.y;
      var influence = mouse.hovering ? 140 : 0;

      // Source is bright-subject-on-black, so a HIGH luminance value =
      // subject pixel → big lime dot. Very dark cells (background) get
      // no dot at all, keeping the frame visually clean.
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var l = luminance[r * cols + c];
          if (l < 0.08) continue;                       // pure black bg → skip

          // Punchy contrast curve — pulls midtones toward the highlights
          // so the face reads unmistakably even at small canvas sizes.
          var base = Math.pow(l, 0.75);

          var x = c * GRID + GRID / 2;
          var y = r * GRID + GRID / 2;

          // Mouse push — dots grow slightly and shift AWAY from the pointer
          // (like a soft magnetic field). Effect fades with distance.
          var mfx = 0, mfy = 0, mBoost = 0;
          if (influence) {
            var dx = x - mx, dy = y - my;
            var d2 = dx * dx + dy * dy;
            var infR = influence * 2;
            if (d2 < infR * infR) {
              var d = Math.sqrt(d2) || 1;
              var pull = Math.max(0, 1 - d / infR);
              mBoost = pull * 0.7;
              mfx = (dx / d) * pull * 7;
              mfy = (dy / d) * pull * 7;
            }
          }

          var rad = Math.min(DOT_MAX, base * DOT_MAX * breathe + mBoost);
          if (rad < 0.4) continue;

          ctx.globalAlpha = Math.min(1, 0.35 + base * 0.75);
          ctx.beginPath();
          ctx.arc(x + mfx, y + mfy, rad, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      requestAnimationFrame(paint);
    }

    // Wire up interaction
    canvas.addEventListener('mousemove', function (e) {
      var r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
      mouse.hovering = true;
    });
    canvas.addEventListener('mouseleave', function () {
      mouse.hovering = false;
      mouse.x = mouse.y = -9999;
    });

    // Sample once the source image is ready, then start paint loop
    function ready() { sampleImage(); requestAnimationFrame(paint); }
    if (srcImg.complete && srcImg.naturalWidth) ready();
    else srcImg.addEventListener('load', ready);

    resize();
    window.addEventListener('resize', function () {
      // Throttle resize sampling — expensive on rapid drags.
      clearTimeout(resize._t);
      resize._t = setTimeout(resize, 120);
    });
  }

  /* ----------------------------------------------------------
     Command palette — ⌘K / ctrl+K anywhere on the page.
     Fuzzy-filters through sections + external links, arrow-key
     nav, Enter to open. All items are declared here in a small
     manifest so it's easy to keep in sync with the site's IA.
     ---------------------------------------------------------- */
  function initCommandPalette() {
    var root  = document.getElementById('cmdk');
    var input = document.getElementById('cmdkInput');
    var list  = document.getElementById('cmdkList');
    if (!root || !input || !list) return;

    var MANIFEST = [
      { g: 'Sections',   t: 'Hero',             d: 'Top of the page',              h: '#top',     k: 'H' },
      { g: 'Sections',   t: 'Recently Shipped', d: 'Automatic public GitHub feed', h: '#shipped', k: '↻' },
      { g: 'Sections',   t: 'Work',             d: 'Selected daemon widgets',      h: '#work',    k: '1' },
      { g: 'Sections',   t: 'Lab',              d: 'Experiments & hobby',          h: '#lab',     k: '2' },
      { g: 'Sections',   t: 'Arts',             d: 'Digital art gallery',          h: '#arts',    k: '3' },
      { g: 'Sections',   t: 'Journey',          d: 'Experience and education',     h: '#journey', k: '4' },
      { g: 'Sections',   t: 'About',            d: 'Who I am',                     h: '#about',   k: '5' },
      { g: 'Sections',   t: 'Gallery',          d: 'Off-screen photos',            h: '#gallery', k: '6' },
      { g: 'Sections',   t: 'Contact',          d: 'Get in touch',                 h: '#contact', k: '7' },
      { g: 'External',   t: 'GitHub',       d: '@MeYashverma',            h: 'https://github.com/MeYashverma',                            ext: true, ico: '↗' },
      { g: 'External',   t: 'Instagram',    d: '@yashardcore',            h: 'https://instagram.com/yashardcore',                         ext: true, ico: '↗' },
      { g: 'External',   t: 'Twitter / X',  d: '@me_yashverma',           h: 'https://twitter.com/me_yashverma',                          ext: true, ico: '↗' },
      { g: 'External',   t: 'YouTube',      d: '@me_yashverma',           h: 'https://www.youtube.com/@me_yashverma',                     ext: true, ico: '↗' },
      { g: 'External',   t: 'Twitch',       d: '@me_yashvema',            h: 'https://twitch.tv/me_yashvema',                             ext: true, ico: '↗' },
      { g: 'External',   t: 'Spotify',      d: 'The_Berlin',              h: 'https://open.spotify.com/user/31xz5ux4pziergil5hsla5pzss4y', ext: true, ico: '↗' },
      { g: 'External',   t: 'Last.fm',      d: 'The_Berlin',              h: 'https://www.last.fm/user/The_Berlin',                       ext: true, ico: '↗' },
      { g: 'External',   t: 'Discord',      d: 'yashylash',               h: 'https://discord.com/users/848100520509308989',              ext: true, ico: '↗' },
      { g: 'External',   t: 'AetherOS',     d: 'Live demo · try the OS',  h: 'https://meyashverma.github.io/AetherOS-Prod/',                              ext: true, ico: '↗' },
      { g: 'External',   t: 'Google Cloud', d: 'Skills profile · Gold',   h: 'https://www.skills.google/public_profiles/a8a49bbd-9ef0-46d9-b3bd-ea25d115b90b', ext: true, ico: '↗' },
      { g: 'Actions',    t: 'Send email',   d: '1yash2verma3@gmail.com',  h: 'mailto:1yash2verma3@gmail.com',                              ico: '✉' },
      { g: 'Actions',    t: 'Copy email',   d: '1yash2verma3@gmail.com',  action: 'copy-email',                                            ico: '⎘' }
    ];

    var active = 0;
    var filtered = MANIFEST.slice();

    function iconFor(item) {
      if (item.ico) return item.ico;
      if (item.k)   return item.k;
      return '·';
    }

    function render() {
      list.innerHTML = '';
      if (!filtered.length) {
        list.innerHTML = '<li class="cmdk__empty">Nothing matches. Try another query.</li>';
        return;
      }
      var lastGroup = null;
      filtered.forEach(function (item, i) {
        if (item.g !== lastGroup) {
          var g = document.createElement('li');
          g.className = 'cmdk__group-label';
          g.textContent = item.g;
          list.appendChild(g);
          lastGroup = item.g;
        }
        var li = document.createElement('li');
        li.className = 'cmdk__item' + (i === active ? ' is-active' : '');
        li.setAttribute('role', 'option');
        li.dataset.idx = i;
        li.innerHTML =
          '<span class="cmdk__item-icon">' + iconFor(item) + '</span>' +
          '<span class="cmdk__item-body">' +
          '<span class="cmdk__item-title">' + item.t + '</span>' +
          '<span class="cmdk__item-desc">' + (item.d || '') + '</span>' +
          '</span>' +
          '<span class="cmdk__item-kbd">' + (item.ext ? '↗' : '↵') + '</span>';
        li.addEventListener('click', function () { active = i; execute(); });
        li.addEventListener('mousemove', function () {
          if (active !== i) { active = i; render(); }
        });
        list.appendChild(li);
      });
      var el = list.querySelector('.cmdk__item.is-active');
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    }

    // Very small fuzzy: substring across title + desc + group.
    function filter(q) {
      q = (q || '').trim().toLowerCase();
      if (!q) return MANIFEST.slice();
      return MANIFEST.filter(function (it) {
        var hay = (it.t + ' ' + (it.d || '') + ' ' + it.g).toLowerCase();
        // Every space-separated token must be present.
        return q.split(/\s+/).every(function (tok) { return hay.indexOf(tok) !== -1; });
      });
    }

    function execute() {
      var item = filtered[active];
      if (!item) return;
      close();
      if (item.action === 'copy-email') {
        var email = '1yash2verma3@gmail.com';
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(email).catch(function () {});
        }
        // Poor-man's toast via scrollspy label so it's on-brand.
        var sp = document.getElementById('scrollSpyLabel');
        if (sp) { var old = sp.textContent; sp.textContent = 'copied → ' + email; setTimeout(function () { sp.textContent = old; }, 1400); }
        return;
      }
      if (item.ext) window.open(item.h, '_blank', 'noopener');
      else if (item.h) window.location.hash = item.h.replace(/^#/, '#');
    }

    function open() {
      root.classList.add('is-open');
      root.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      active = 0;
      filtered = MANIFEST.slice();
      input.value = '';
      render();
      setTimeout(function () { input.focus(); }, 20);
    }
    function close() {
      root.classList.remove('is-open');
      root.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    document.addEventListener('keydown', function (e) {
      var isK  = e.key && e.key.toLowerCase() === 'k';
      var meta = e.metaKey || e.ctrlKey;
      if (isK && meta) { e.preventDefault(); root.classList.contains('is-open') ? close() : open(); return; }
      if (e.key === '/' && document.activeElement && document.activeElement.tagName !== 'INPUT' && !root.classList.contains('is-open')) {
        e.preventDefault(); open(); return;
      }
      if (!root.classList.contains('is-open')) return;
      if (e.key === 'Escape')     { e.preventDefault(); close(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(filtered.length - 1, active + 1); render(); }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); active = Math.max(0, active - 1); render(); }
      else if (e.key === 'Enter')     { e.preventDefault(); execute(); }
    });

    input.addEventListener('input', function () {
      filtered = filter(input.value);
      active = 0;
      render();
    });
    root.querySelector('.cmdk__scrim').addEventListener('click', close);
  }

  /* ----------------------------------------------------------
     Terminal-style scroll spy — a fixed bottom-left mono chip
     that tracks which section you're currently viewing. Doubles
     as a discoverability hint for the ⌘K palette.
     ---------------------------------------------------------- */
  function initScrollSpy() {
    var chip  = document.getElementById('scrollSpy');
    var label = document.getElementById('scrollSpyLabel');
    if (!chip || !label) return;

    var sections = [
      { id: 'hero',    name: 'hero'    },
      { id: 'shipped', name: 'shipped' },
      { id: 'work',    name: 'work'    },
      { id: 'lab',     name: 'lab'     },
      { id: 'arts',    name: 'arts'    },
      { id: 'journey', name: 'journey' },
      { id: 'about',   name: 'about'   },
      { id: 'gallery', name: 'gallery' },
      { id: 'contact', name: 'contact' }
    ];
    var current = 'hero';

    function update() {
      // Show the chip only once you've scrolled past the fold, so it
      // doesn't fight the hero for attention.
      var scrolled = window.scrollY > (window.innerHeight * 0.6);
      chip.classList.toggle('is-visible', scrolled);

      // Find the section whose top-boundary is closest to (but before) the
      // vertical viewport center.
      var pivot = window.scrollY + window.innerHeight * 0.35;
      var best = current;
      for (var i = 0; i < sections.length; i++) {
        var el = document.getElementById(sections[i].id);
        if (!el) continue;
        var top = el.getBoundingClientRect().top + window.scrollY;
        if (top <= pivot) best = sections[i].name;
      }
      if (best !== current) {
        current = best;
        label.textContent = 'yv.sys/' + current;
      }
    }

    var raf = null;
    window.addEventListener('scroll', function () {
      if (raf) return;
      raf = requestAnimationFrame(function () { raf = null; update(); });
    }, { passive: true });
    update();

    // Clicking the chip opens the palette — free discoverability.
    chip.style.pointerEvents = 'auto';
    chip.addEventListener('click', function () {
      var e = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true });
      document.dispatchEvent(e);
    });
    chip.style.cursor = 'pointer';
  }

  /* ----------------------------------------------------------
     Arts focus mode — hovering any card dims all siblings and
     brings the hovered one to full colour. Uses a class on the
     grid so we can drive the dim state from CSS.
     ---------------------------------------------------------- */
  function initArtsFocus() {
    var grid = document.getElementById('artsGrid');
    if (!grid) return;
    var cards = grid.querySelectorAll('.arts-card');
    if (!cards.length) return;

    grid.addEventListener('mouseenter', function () { grid.classList.add('is-focusing'); }, true);
    grid.addEventListener('mouseleave', function () { grid.classList.remove('is-focusing'); });

    cards.forEach(function (c) {
      c.addEventListener('mouseenter', function () {
        cards.forEach(function (x) { x.classList.remove('is-focused'); });
        c.classList.add('is-focused');
      });
    });
    grid.addEventListener('mouseleave', function () {
      cards.forEach(function (x) { x.classList.remove('is-focused'); });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      runPreloader(boot);
    });
  } else {
    runPreloader(boot);
  }
})();
