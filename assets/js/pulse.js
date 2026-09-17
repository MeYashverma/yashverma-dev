/**
 * Commit Pulse — the GitHub contribution heatmap section.
 *
 * Data: the public, CORS-enabled contributions mirror at
 * github-contributions-api.jogruber.de (read-only, no token). Layered like
 * the Repo Radar: fresh localStorage cache → live API → daily Actions-built
 * snapshot (assets/data/pulse.json) → stale cache → graceful note.
 *
 * Rendering is fully theme-aware: cell levels are alphas of --accent-rgb, so
 * the Chroma Engine re-tints the whole graph on every theme swap.
 */
(function () {
  'use strict';

  var GITHUB_USER = 'MeYashverma';
  var API_URL = 'https://github-contributions-api.jogruber.de/v4/' + GITHUB_USER + '?y=last';
  var SNAPSHOT_URL = 'assets/data/pulse.json';
  var CACHE_KEY = 'yv_commit_pulse_v1';
  var CACHE_MS = 6 * 60 * 60 * 1000;

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function fetchJson(url, timeout) {
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, timeout || 9000) : null;
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

  function dayKey(date) {
    return date.getUTCFullYear() + '-' +
      String(date.getUTCMonth() + 1).padStart(2, '0') + '-' +
      String(date.getUTCDate()).padStart(2, '0');
  }

  function parseDay(key) {
    var parts = String(key).split('-').map(Number);
    return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  }

  function prettyDate(key) {
    var d = parseDay(key);
    return DAYS[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
  }

  /* Streak math — all UTC so a visitor's timezone can't shift the answer. */
  function streaks(contributions) {
    var counts = {};
    var keys = [];
    contributions.forEach(function (c) {
      counts[c.date] = c.count;
      keys.push(c.date);
    });
    if (!keys.length) return { current: 0, longest: 0, bestDay: null, bestCount: 0 };

    keys.sort();
    var first = parseDay(keys[0]);
    var last = parseDay(keys[keys.length - 1]);

    var longest = 0, run = 0, bestDay = null, bestCount = 0;
    for (var d = new Date(first); d <= last; d.setUTCDate(d.getUTCDate() + 1)) {
      var k = dayKey(d);
      var c = counts[k] || 0;
      if (c > 0) { run++; if (run > longest) longest = run; } else { run = 0; }
      if (c > bestCount) { bestCount = c; bestDay = k; }
    }

    // GitHub convention: a streak is alive if the silence so far is just today.
    var current = 0;
    var cursor = new Date(last);
    if ((counts[dayKey(cursor)] || 0) === 0) cursor.setUTCDate(cursor.getUTCDate() - 1);
    while (cursor >= first && (counts[dayKey(cursor)] || 0) > 0) {
      current++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    return { current: current, longest: longest, bestDay: bestDay, bestCount: bestCount };
  }

  function setStatus(text) {
    var el = document.getElementById('pulseStatus');
    if (el) el.textContent = text;
  }

  function statCell(label, value, sub) {
    return '<div class="pulse-stat"><span>' + label + '</span><strong>' + value +
      '</strong><small>' + (sub || '') + '</small></div>';
  }

  function render(payload, source) {
    var grid = document.getElementById('pulseGrid');
    var monthsRow = document.getElementById('pulseMonths');
    var statsRow = document.getElementById('pulseStats');
    var readout = document.getElementById('pulseReadout');
    if (!grid) return;

    var contributions = (payload && Array.isArray(payload.contributions)) ? payload.contributions : [];
    if (!contributions.length) {
      grid.innerHTML = '<p class="pulse__offline">Contribution data is unreachable right now — GitHub itself is the source of truth: ' +
        '<a href="https://github.com/' + GITHUB_USER + '" target="_blank" rel="noopener">@' + GITHUB_USER + ' ↗</a></p>';
      setStatus('Contribution mirror offline');
      return;
    }

    /* ---- cells ---- */
    grid.innerHTML = '';
    monthsRow.innerHTML = '';
    var total = 0;
    contributions.forEach(function (c) { total += c.count; });

    contributions.forEach(function (c) {
      var cell = document.createElement('span');
      cell.className = 'pulse-cell';
      cell.setAttribute('data-level', Math.max(0, Math.min(4, c.level || 0)));
      cell.setAttribute('data-date', c.date);
      cell.setAttribute('data-count', c.count);
      var plural = c.count === 1 ? 'contribution' : 'contributions';
      cell.setAttribute('title', c.count + ' ' + plural + ' · ' + prettyDate(c.date));
      cell.setAttribute('aria-label', c.count + ' ' + plural + ' on ' + c.date);
      grid.appendChild(cell);
    });

    /* ---- month labels: label the week-column that contains the 1st,
       the same convention GitHub's own contribution graph uses ---- */
    var lastMonth = -1;
    contributions.forEach(function (c, i) {
      var month = parseDay(c.date).getUTCMonth();
      if (month !== lastMonth) {
        var label = document.createElement('span');
        label.textContent = MONTHS[month];
        label.style.setProperty('--week', Math.floor(i / 7));
        monthsRow.appendChild(label);
        lastMonth = month;
      }
    });

    /* ---- stats ---- */
    var s = streaks(contributions);
    if (statsRow) {
      statsRow.innerHTML =
        statCell('Contributions', total.toLocaleString('en-IN'), 'last 12 months') +
        statCell('Current streak', s.current + (s.current === 1 ? ' day' : ' days'), s.current > 0 ? 'alive right now' : 'restart pending') +
        statCell('Longest streak', s.longest + (s.longest === 1 ? ' day' : ' days'), 'past 12 months') +
        statCell('Best day', s.bestCount, s.bestDay ? prettyDate(s.bestDay) : '');
    }

    /* ---- hover readout ---- */
    if (readout && !grid.__readoutBound) {
      grid.__readoutBound = true;
      grid.addEventListener('mouseover', function (e) {
        var cell = e.target.closest ? e.target.closest('.pulse-cell') : null;
        if (!cell) return;
        var count = cell.getAttribute('data-count');
        readout.textContent = count + (count === '1' ? ' contribution' : ' contributions') +
          ' · ' + prettyDate(cell.getAttribute('data-date'));
      });
      grid.addEventListener('mouseleave', function () {
        readout.textContent = 'hover a square — every one is a real day of work';
      });
    }

    setStatus(source === 'live'
      ? 'Live · synced just now'
      : source === 'snapshot'
        ? 'Daily Actions snapshot'
        : 'Cached locally · refreshes every 6h');
  }

  /* ------------------------------------------------------------ */
  function readCache() {
    try {
      var parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (!parsed || !Array.isArray(parsed.contributions)) return null;
      return parsed;
    } catch (e) { return null; }
  }

  function writeCache(payload) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(payload)); } catch (e) {}
  }

  function normalizeApi(data) {
    if (!data || !Array.isArray(data.contributions)) throw new Error('Bad payload');
    return { timestamp: Date.now(), contributions: data.contributions };
  }

  function boot() {
    if (!document.getElementById('pulseGrid') || typeof fetch !== 'function') return;

    var cached = readCache();
    if (cached) render(cached, 'cache');
    if (cached && Date.now() - cached.timestamp < CACHE_MS) return;

    fetchJson(API_URL, 9000).then(function (data) {
      var payload = normalizeApi(data);
      writeCache(payload);
      render(payload, 'live');
    }).catch(function () {
      fetchJson(SNAPSHOT_URL, 7000).then(function (data) {
        var payload = normalizeApi(data);
        render(payload, 'snapshot');
      }).catch(function () {
        if (cached) render(cached, 'cache');
        else render(null, 'none');
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
