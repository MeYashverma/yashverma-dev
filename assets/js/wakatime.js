/**
 * WakaTime panel — the "what was I actually typing" half of the pulse.
 *
 * No API keys ship in the browser. Two supported data paths, checked in
 * order:
 *
 *   1. assets/data/wakatime.json — built daily by .github/workflows/
 *      data-sync.yml using the WAKATIME_API_KEY repository secret. Zero key
 *      exposure, zero rate limits. (Setup: add the secret, done.)
 *   2. SHARE_EMBEDS below — public share URLs from wakatime.com/share. Paste
 *      them in and the panel renders those charts instead, no key needed.
 *
 * With neither configured the panel simply stays hidden — visitors never
 * see a broken widget.
 */
(function () {
  'use strict';

  // Optional no-key mode: paste public share SVG URLs from
  // https://wakatime.com/share (e.g. "https://wakatime.com/share/@you/abc.svg")
  var SHARE_EMBEDS = [];
  // Optional footer link, e.g. "https://wakatime.com/@yourname"
  var PROFILE_URL = '';

  var SNAPSHOT_URL = 'assets/data/wakatime.json';

  function fetchJson(url, timeout) {
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, timeout || 8000) : null;
    var opts = { cache: 'no-store' };
    if (controller) opts.signal = controller.signal;
    return fetch(url, opts).then(function (response) {
      if (timer) clearTimeout(timer);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    }).catch(function (error) {
      if (timer) clearTimeout(timer);
      throw error;
    });
  }

  function hoursMinutes(seconds) {
    seconds = Math.max(0, Math.round(seconds || 0));
    var h = Math.floor(seconds / 3600);
    var m = Math.round((seconds % 3600) / 60);
    if (h === 0) return m + 'm';
    return h + 'h ' + String(m).padStart(2, '0') + 'm';
  }

  function barRow(name, percent) {
    return '<li class="waka-lang">' +
      '<span class="waka-lang__name">' + name + '</span>' +
      '<span class="waka-lang__track"><i style="width:' + Math.min(100, Math.max(0, percent)) + '%"></i></span>' +
      '<span class="waka-lang__pct">' + (Math.round(percent * 10) / 10) + '%</span>' +
      '</li>';
  }

  function chip(text) {
    return '<span class="waka-chip">' + text + '</span>';
  }

  function renderData(data) {
    var body = document.getElementById('wakaBody');
    if (!body) return false;
    if (!data || typeof data.totalSeconds !== 'number') return false;

    var langs = (Array.isArray(data.languages) ? data.languages : []).slice(0, 5);
    var editors = (Array.isArray(data.editors) ? data.editors : []).slice(0, 1);
    var oses = (Array.isArray(data.operatingSystems) ? data.operatingSystems : []).slice(0, 1);
    var chips = editors.concat(oses).map(function (x) { return chip(x.name); }).join('');

    body.innerHTML =
      '<div class="waka-main">' +
        '<span class="waka-main__label">This week in the editor</span>' +
        '<strong class="waka-main__time">' + hoursMinutes(data.totalSeconds) + '</strong>' +
        '<span class="waka-main__avg">≈ ' + hoursMinutes(data.dailyAverageSeconds) + ' / day</span>' +
        '<span class="waka-main__chips">' + chips + '</span>' +
      '</div>' +
      '<ul class="waka-langs">' +
        (langs.map(function (l) { return barRow(l.name, l.percent || 0); }).join('') ||
          '<li class="waka-lang__empty">No language breakdown yet.</li>') +
      '</ul>';

    var synced = document.getElementById('wakaSynced');
    if (synced && data.syncedAt) {
      var d = new Date(data.syncedAt);
      synced.textContent = 'WakaTime snapshot · ' + d.toLocaleDateString('en', { day: '2-digit', month: 'short' });
    }
    return true;
  }

  function renderEmbeds() {
    var body = document.getElementById('wakaBody');
    if (!body || !SHARE_EMBEDS.length) return false;
    body.innerHTML = '<div class="waka-embeds">' + SHARE_EMBEDS.map(function (url) {
      return '<img src="' + url + '" alt="WakaTime coding activity chart" loading="lazy" decoding="async">';
    }).join('') + '</div>';
    return true;
  }

  function reveal() {
    var panel = document.getElementById('wakaPanel');
    if (!panel) return;
    panel.hidden = false;

    var foot = document.getElementById('wakaFoot');
    if (foot && PROFILE_URL) {
      foot.innerHTML = '<a href="' + PROFILE_URL + '" target="_blank" rel="noopener" data-cursor="text" data-cursor-text="↗">Full WakaTime dashboard ↗</a>';
    }
    if (typeof window.__yvEnhance === 'function') window.__yvEnhance(panel);
  }

  function boot() {
    if (!document.getElementById('wakaPanel') || typeof fetch !== 'function') return;

    fetchJson(SNAPSHOT_URL, 7000).then(function (data) {
      if (renderData(data)) reveal();
      else if (renderEmbeds()) reveal();
      // Otherwise: stays hidden by design.
    }).catch(function () {
      // No snapshot on disk — the no-key embed path is the fallback.
      if (renderEmbeds()) reveal();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
