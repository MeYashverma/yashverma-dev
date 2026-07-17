/**
 * Public activity widgets — automatic GitHub "Recently Shipped" feed and a
 * persistent page-view counter. Both fail quietly: neither can block the
 * page, and the last successful GitHub payload is cached in localStorage.
 */
(function () {
  'use strict';

  var GITHUB_USER = 'MeYashverma';
  var GITHUB_CACHE_KEY = 'yv_recently_shipped_v1';
  var GITHUB_CACHE_MS = 30 * 60 * 1000;
  // This is a fresh, versioned public bucket. The original counter had
  // accumulated an invalid negative value, so its history is intentionally not
  // carried forward. This remains a lightweight public signal, not analytics.
  var VISITOR_KEY = 'yashverma_dev_portfolio_pageviews_v2';
  var VISITOR_CACHE_KEY = 'yv_last_pageview_count_v2';
  var VISITOR_HIT_DAY_KEY = 'yv_pageview_hit_day_v2';
  var COUNTER_BASE = 'https://countapi.mileshilliard.com/api/v1';

  function fetchJson(url, options, timeout) {
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, timeout || 8000) : null;
    var opts = options || {};
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

  function relativeTime(value) {
    var date = new Date(value);
    if (isNaN(date.getTime())) return 'recently';
    var seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
    if (seconds < 60) return seconds + 's ago';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
    return date.toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function compactRepo(fullName) {
    return String(fullName || '').replace(/^MeYashverma\//i, '') || 'repository';
  }

  function iconMarkup(type) {
    if (type === 'release') {
      return '<svg viewBox="0 0 24 24"><path d="m12 2 3 6 7 .9-5 4.7 1.4 6.9L12 17l-6.4 3.5L7 13.6 2 8.9 9 8Z"/></svg>';
    }
    if (type === 'repo') {
      return '<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5Z"/><path d="M8 7h8M8 11h6M4 19.5V5.5"/></svg>';
    }
    return '<svg viewBox="0 0 24 24"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M6 9v4a5 5 0 0 0 5 5h4M18 15V9a3 3 0 0 0-3-3h-2"/></svg>';
  }

  function renderShipped(items, cached) {
    var feed = document.getElementById('shippedFeed');
    var status = document.getElementById('shippedStatus');
    if (!feed) return;
    feed.innerHTML = '';

    if (!items || !items.length) {
      var empty = document.createElement('li');
      empty.className = 'shipped-card shipped-card--empty';
      empty.textContent = 'No public shipping activity is available right now.';
      feed.appendChild(empty);
      if (status) status.textContent = 'GitHub feed unavailable';
      return;
    }

    items.slice(0, 6).forEach(function (item, index) {
      var li = document.createElement('li');
      li.className = 'shipped-card';
      li.style.setProperty('--ship-index', index);

      var link = document.createElement('a');
      link.href = item.url || ('https://github.com/' + item.repo);
      link.target = '_blank';
      link.rel = 'noopener';
      link.setAttribute('aria-label', item.title + ' in ' + compactRepo(item.repo));

      var top = document.createElement('span');
      top.className = 'shipped-card__top';
      var icon = document.createElement('span');
      icon.className = 'shipped-card__icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = iconMarkup(item.type);
      var kind = document.createElement('span');
      kind.className = 'shipped-card__kind';
      kind.textContent = item.type === 'release' ? 'Release' : item.type === 'repo' ? 'Repository' : 'Commit';
      var when = document.createElement('time');
      when.dateTime = item.date || '';
      when.textContent = relativeTime(item.date);
      top.appendChild(icon);
      top.appendChild(kind);
      top.appendChild(when);

      var title = document.createElement('strong');
      title.className = 'shipped-card__title';
      title.textContent = item.title || 'Repository updated';

      var bottom = document.createElement('span');
      bottom.className = 'shipped-card__bottom';
      var repo = document.createElement('span');
      repo.textContent = compactRepo(item.repo);
      var sha = document.createElement('code');
      sha.textContent = item.sha ? item.sha.slice(0, 7) : 'public';
      bottom.appendChild(repo);
      bottom.appendChild(sha);

      link.appendChild(top);
      link.appendChild(title);
      link.appendChild(bottom);
      li.appendChild(link);
      feed.appendChild(li);
    });

    if (status) status.textContent = cached
      ? 'Cached locally · refreshes every 30m'
      : 'Live · synced just now';
  }

  function readGitHubCache() {
    try {
      var parsed = JSON.parse(localStorage.getItem(GITHUB_CACHE_KEY) || 'null');
      if (!parsed || !Array.isArray(parsed.items)) return null;
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function writeGitHubCache(items) {
    try {
      localStorage.setItem(GITHUB_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), items: items }));
    } catch (error) {
      // Storage can be disabled in private browsing; the live feed still works.
    }
  }

  function eventFallback(event) {
    var repo = event && event.repo && event.repo.name;
    if (!repo) return null;
    if (event.type === 'ReleaseEvent' && event.payload && event.payload.release) {
      return {
        type: 'release',
        title: 'Released ' + (event.payload.release.name || event.payload.release.tag_name || compactRepo(repo)),
        repo: repo,
        sha: event.payload.release.tag_name || '',
        date: event.created_at,
        url: event.payload.release.html_url || ('https://github.com/' + repo + '/releases')
      };
    }
    if (event.type === 'CreateEvent') {
      return {
        type: 'repo',
        title: event.payload && event.payload.ref_type === 'repository' ? 'Created a new repository' : 'Created ' + ((event.payload && event.payload.ref_type) || 'a new ref'),
        repo: repo,
        sha: (event.payload && event.payload.ref) || '',
        date: event.created_at,
        url: 'https://github.com/' + repo
      };
    }
    if (event.type === 'PushEvent') {
      return {
        type: 'commit',
        title: 'Pushed updates to ' + compactRepo(repo),
        repo: repo,
        sha: (event.payload && event.payload.head) || '',
        date: event.created_at,
        url: event.payload && event.payload.head ? 'https://github.com/' + repo + '/commit/' + event.payload.head : 'https://github.com/' + repo
      };
    }
    return null;
  }

  function loadRecentlyShipped() {
    var feed = document.getElementById('shippedFeed');
    if (!feed || typeof fetch !== 'function') return;

    var cached = readGitHubCache();
    if (cached && cached.items.length) renderShipped(cached.items, true);
    if (cached && Date.now() - cached.timestamp < GITHUB_CACHE_MS) return;

    var headers = { Accept: 'application/vnd.github+json' };
    var eventsUrl = 'https://api.github.com/users/' + GITHUB_USER + '/events/public?per_page=30';

    fetchJson(eventsUrl, { headers: headers, cache: 'no-store' }, 9000).then(function (events) {
      if (!Array.isArray(events)) throw new Error('Invalid GitHub response');

      var fallbacks = events.map(eventFallback).filter(Boolean);
      var repoNames = [];
      events.forEach(function (event) {
        if (event.type !== 'PushEvent' || !event.repo || !event.repo.name) return;
        if (repoNames.indexOf(event.repo.name) === -1 && repoNames.length < 3) repoNames.push(event.repo.name);
      });

      // One small commit-list request per recently active repository gives us
      // real commit messages while keeping the feed far below GitHub's public
      // rate limit. On data-saver connections, the event fallback avoids the
      // extra requests entirely.
      var saveData = navigator.connection && navigator.connection.saveData;
      if (saveData || !repoNames.length) return fallbacks.slice(0, 6);

      return Promise.all(repoNames.map(function (repoName) {
        var url = 'https://api.github.com/repos/' + repoName + '/commits?per_page=3';
        return fetchJson(url, { headers: headers, cache: 'no-store' }, 8000).then(function (commits) {
          return (Array.isArray(commits) ? commits : []).map(function (commit) {
            var detail = commit.commit || {};
            var author = detail.author || detail.committer || {};
            return {
              type: 'commit',
              title: String(detail.message || 'Repository updated').split('\n')[0],
              repo: repoName,
              sha: commit.sha || '',
              date: author.date || new Date().toISOString(),
              url: commit.html_url || ('https://github.com/' + repoName)
            };
          });
        }).catch(function () { return []; });
      })).then(function (groups) {
        var detailed = [].concat.apply([], groups);
        var releases = fallbacks.filter(function (item) { return item.type !== 'commit'; });
        var combined = detailed.concat(releases);
        combined.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
        return combined.length ? combined.slice(0, 6) : fallbacks.slice(0, 6);
      });
    }).then(function (items) {
      if (!items) return;
      writeGitHubCache(items);
      renderShipped(items, false);
    }).catch(function () {
      if (cached && cached.items.length) renderShipped(cached.items, true);
      else renderShipped([], false);
    });
  }

  function animateVisitorCount(element, value) {
    var start = 0;
    var started = performance.now();
    var duration = 900;
    function frame(now) {
      var progress = Math.min(1, (now - started) / duration);
      var eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = Math.round(start + (value - start) * eased).toLocaleString('en-IN');
      if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function currentDayKey() {
    // A local date keeps this simple and transparent: a returning visitor can
    // refresh freely without inflating the public number all day.
    var now = new Date();
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  }

  function didCountToday() {
    try { return localStorage.getItem(VISITOR_HIT_DAY_KEY) === currentDayKey(); } catch (error) { return false; }
  }

  function rememberToday() {
    try { localStorage.setItem(VISITOR_HIT_DAY_KEY, currentDayKey()); } catch (error) {}
  }

  function cacheVisitorValue(value) {
    try { localStorage.setItem(VISITOR_CACHE_KEY, String(value)); } catch (error) {}
  }

  function readCachedVisitorValue() {
    try {
      var cached = parseInt(localStorage.getItem(VISITOR_CACHE_KEY), 10);
      return !isNaN(cached) && cached >= 0 ? cached : null;
    } catch (error) {
      return null;
    }
  }

  function loadVisitorCounter() {
    var count = document.getElementById('visitorCount');
    var status = document.getElementById('visitorCounterStatus');
    if (!count || typeof fetch !== 'function') return;

    var host = String(window.location.hostname || '').toLowerCase();
    var production = host === 'yashverma.dev' || host === 'www.yashverma.dev' || host === 'meyashverma.github.io';
    if (!production) {
      count.textContent = '—';
      if (status) status.textContent = 'Preview mode · increments after deploy';
      return;
    }

    var alreadyCounted = didCountToday();
    var endpoint = COUNTER_BASE + (alreadyCounted ? '/get/' : '/hit/') + VISITOR_KEY;
    fetchJson(endpoint, { cache: 'no-store' }, 7000).then(function (data) {
      var value = parseInt(data && data.value, 10);
      // Never surface a corrupt public value again. A fresh bucket starts at
      // zero and this guard leaves a bad response visibly unavailable instead
      // of pretending a negative visit count is meaningful.
      if (isNaN(value) || value < 0) throw new Error('Invalid counter value');
      animateVisitorCount(count, value);
      cacheVisitorValue(value);
      if (!alreadyCounted) rememberToday();
      if (status) status.textContent = alreadyCounted
        ? 'Public page-view counter · counted today'
        : 'Public page-view counter · once per browser/day';
    }).catch(function () {
      var cachedValue = readCachedVisitorValue();
      if (cachedValue !== null) {
        count.textContent = cachedValue.toLocaleString('en-IN');
        if (status) status.textContent = 'Last known count · counter offline';
      } else {
        count.textContent = '—';
        if (status) status.textContent = 'Counter temporarily unavailable';
      }
    });
  }

  function init() {
    loadRecentlyShipped();
    loadVisitorCounter();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
