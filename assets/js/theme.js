/**
 * Chroma Engine — runtime theme swapping, the overdrive easter egg, and the
 * developer-console signature. Everything degrades silently: with storage
 * blocked the theme simply resets to acid on the next visit, and with the
 * dock missing the keyboard/cmd-k paths still work.
 *
 * Public contract (used by main.js, background.js and the command palette):
 *   - dispatches `yv:theme`  { detail: { name, accent, rgb:[r,g,b] } }
 *   - listens for `yv:theme-next` / `yv:theme-set` (detail.name) /
 *     `yv:overdrive-toggle`
 */
(function () {
  'use strict';

  var THEMES = [
    { name: 'acid',    label: 'Acid lime — default', accent: '#d9ff3f', rgb: [217, 255, 63] },
    { name: 'ember',   label: 'Ember orange',        accent: '#ff7a3d', rgb: [255, 122, 61] },
    { name: 'aqua',    label: 'Aqua cyan',           accent: '#3ee6ff', rgb: [62, 230, 255] },
    { name: 'violet',  label: 'Ultraviolet',         accent: '#c98bff', rgb: [201, 139, 255] },
    { name: 'crimson', label: 'Crimson signal',      accent: '#ff4d6d', rgb: [255, 77, 109] }
  ];
  var THEME_KEY = 'yv_chroma_theme';
  var OVERDRIVE_KEY = 'yv_overdrive_session';

  function readSavedTheme() {
    try {
      var saved = localStorage.getItem(THEME_KEY);
      for (var i = 0; i < THEMES.length; i++) if (THEMES[i].name === saved) return saved;
    } catch (e) {}
    return 'acid';
  }

  function saveTheme(name) {
    try { localStorage.setItem(THEME_KEY, name); } catch (e) {}
  }

  function themeByName(name) {
    for (var i = 0; i < THEMES.length; i++) if (THEMES[i].name === name) return THEMES[i];
    return THEMES[0];
  }

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'acid';
  }

  function paintTheme(name, announce) {
    var theme = themeByName(name);
    var root = document.documentElement;

    root.classList.add('theme-anim');
    if (theme.name === 'acid') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme.name);
    saveTheme(theme.name);

    // Keep the OS/browser chrome colour honest with the active theme.
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim() || '#050506');

    // The dot-matrix portrait and the WebGL field listen for this.
    document.dispatchEvent(new CustomEvent('yv:theme', {
      detail: { name: theme.name, accent: theme.accent, rgb: theme.rgb }
    }));

    markDock();
    setTimeout(function () { root.classList.remove('theme-anim'); }, 520);

    if (announce) toast('Theme → <b>' + theme.label.split(' — ')[0] + '</b> · press T to keep cycling');
  }

  function nextTheme() {
    var i = THEMES.map(function (t) { return t.name; }).indexOf(currentTheme());
    paintTheme(THEMES[(i + 1) % THEMES.length].name, true);
  }

  /* ------------------------------------------------------------
     Theme dock — fixed colour rail. Built in JS so the palette is
     the single source of truth; no markup to keep in sync.
     ------------------------------------------------------------ */
  function markDock() {
    var dots = document.querySelectorAll('.theme-dock__dot');
    if (!dots.length) return;
    dots.forEach(function (dot) {
      dot.classList.toggle('is-active', dot.getAttribute('data-theme-name') === currentTheme());
    });
  }

  function initDock() {
    if (document.querySelector('.theme-dock')) return;
    var dock = document.createElement('div');
    dock.className = 'theme-dock';
    dock.setAttribute('role', 'group');
    dock.setAttribute('aria-label', 'Colour theme');

    THEMES.forEach(function (theme) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'theme-dock__dot';
      dot.style.setProperty('--dot', theme.accent);
      dot.setAttribute('data-theme-name', theme.name);
      dot.setAttribute('data-tip', theme.label.split(' — ')[0]);
      dot.setAttribute('aria-label', 'Theme: ' + theme.label);
      dot.setAttribute('data-cursor', 'text');
      dot.setAttribute('data-cursor-text', theme.name.toUpperCase());
      dot.addEventListener('click', function () { paintTheme(theme.name, true); });
      dock.appendChild(dot);
    });

    var divider = document.createElement('span');
    divider.className = 'theme-dock__divider';
    dock.appendChild(divider);

    var key = document.createElement('button');
    key.type = 'button';
    key.className = 'theme-dock__key';
    key.textContent = '⚡';
    key.setAttribute('data-tip', 'Overdrive');
    key.setAttribute('aria-label', 'Toggle overdrive mode');
    key.setAttribute('data-cursor', 'text');
    key.setAttribute('data-cursor-text', '⚡');
    key.addEventListener('click', toggleOverdrive);
    dock.appendChild(key);

    document.body.appendChild(dock);
    markDock();
  }

  /* ------------------------------------------------------------
     Toast — one reusable mono pill for theme + overdrive events.
     ------------------------------------------------------------ */
  var toastTimer = null;
  function toast(html) {
    var el = document.querySelector('.od-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'od-toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.innerHTML = html;
    requestAnimationFrame(function () { el.classList.add('is-visible'); });
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-visible'); }, 2600);
  }

  /* ------------------------------------------------------------
     Overdrive — CRT arcade mode. Session-scoped so it stays a
     per-visit treat instead of a permanent setting.
     ------------------------------------------------------------ */
  function setOverdrive(on, silent) {
    document.body.classList.toggle('overdrive', on);
    try { sessionStorage.setItem(OVERDRIVE_KEY, on ? '1' : '0'); } catch (e) {}
    if (!silent) {
      toast(on
        ? '<b>⚡ OVERDRIVE ENGAGED</b> · system limits removed · same combo to stand down'
        : '<b>Overdrive disengaged</b> · back to standard operating parameters');
    }
  }

  function toggleOverdrive() {
    setOverdrive(!document.body.classList.contains('overdrive'));
  }

  function restoreOverdrive() {
    var on = false;
    try { on = sessionStorage.getItem(OVERDRIVE_KEY) === '1'; } catch (e) {}
    if (on) setOverdrive(true, true);
  }

  var KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  var konamiPos = 0;
  function trackKonami(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === KONAMI[konamiPos]) {
      konamiPos++;
      if (konamiPos === KONAMI.length) {
        konamiPos = 0;
        toggleOverdrive();
      }
    } else {
      konamiPos = key === KONAMI[0] ? 1 : 0;
    }
  }

  /* ------------------------------------------------------------
     Keyboard: T cycles the theme. Skips real typing contexts the
     same way the ⌘K palette does.
     ------------------------------------------------------------ */
  function trackKeys(e) {
    var tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key && e.key.toLowerCase() === 't') nextTheme();
  }

  /* ------------------------------------------------------------
     Console signature — the site greets the people who open
     DevTools, because those are exactly the people who will ask
     "how did you make this?".
     ------------------------------------------------------------ */
  function signConsole() {
    if (!window.console || !console.log) return;
    var accent = themeByName(readSavedTheme()).accent;
    var big = 'font-family:monospace;font-size:20px;font-weight:700;color:' + accent + ';text-shadow:0 0 12px ' + accent + ';';
    var dim = 'font-family:monospace;font-size:11px;color:#9a9aa2;';
    var ok = 'font-family:monospace;font-size:11px;color:' + accent + ';';
    try {
      console.log('%cYASHVERMA.SYS%c — you found the engine room', big, dim);
      console.log('%c→ press T to re-theme the whole site', ok);
      console.log('%c→ try the konami code: ↑ ↑ ↓ ↓ ← → ← → B A', ok);
      console.log('%c→ every project card in "Repo Radar" syncs itself from the GitHub API', dim);
      console.log('%c→ source: https://github.com/MeYashverma/yashverma-dev', dim);
    } catch (e) {}
  }

  document.addEventListener('yv:theme-next', function () { nextTheme(); });
  document.addEventListener('yv:theme-set', function (e) {
    if (e.detail && e.detail.name) paintTheme(e.detail.name, true);
  });
  document.addEventListener('yv:overdrive-toggle', toggleOverdrive);
  document.addEventListener('keydown', trackKonami);
  document.addEventListener('keydown', trackKeys);

  function init() {
    // data-theme was already applied pre-paint by the inline boot script in
    // <head>; here we only sync canvases and rebuild the UI.
    paintTheme(readSavedTheme(), false);
    initDock();
    restoreOverdrive();
    signConsole();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
