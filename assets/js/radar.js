/**
 * Repo Radar — the self-updating project layer.
 *
 * Pulls the full public repo list for GITHUB_USER, removes forks and any
 * project already showcased on the page (declared via data-repo attributes
 * in index.html), and renders the rest as live cards. Nothing requires a
 * manual page edit: publish a repo on GitHub and it appears here on its own.
 *
 * Resolution order (first success wins):
 *   1. fresh localStorage cache (< CACHE_MS)
 *   2. live GitHub REST API
 *   3. assets/data/radar.json — a daily snapshot rebuilt by a GitHub Action,
 *      so the section still works behind API rate limits / offline CI
 *   4. stale localStorage cache
 *   5. a graceful "unavailable" note
 *
 * The module never throws: any failure path ends in the cached/snapshot data
 * or a quiet status line.
 */
(function () {
  'use strict';

  var GITHUB_USER = 'MeYashverma';
  var CACHE_KEY = 'yv_repo_radar_v1';
  var CACHE_MS = 30 * 60 * 1000;
  var SNAPSHOT_URL = 'assets/data/radar.json';
  var MAX_CARDS = 6;
  var NEW_REPO_DAYS = 60;

  // GitHub Linguist colours for the language dots.
  var LANG_COLORS = {
    'JavaScript': '#f1e05a', 'TypeScript': '#3178c6', 'Python': '#3572a5',
    'Kotlin': '#a97bff', 'HTML': '#e34c26', 'CSS': '#663399',
    'Java': '#b07219', 'Shell': '#89e051', 'Nix': '#7e7eff',
    'C++': '#f34b7d', 'C': '#555555', 'Go': '#00add8',
    'Rust': '#dea584', 'Astro': '#ff5a03', 'Svelte': '#ff3e00'
  };

  function fetchJson(url, options, timeout) {
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, timeout || 9000) : null;
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
    if (seconds < 3600) return Math.max(1, Math.floor(seconds / 60)) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
    return date.toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function isNew(createdAt) {
    var created = new Date(createdAt);
    if (isNaN(created.getTime())) return false;
    return (Date.now() - created.getTime()) < NEW_REPO_DAYS * 86400000;
  }

  // Repos already showcased anywhere else on the page never appear twice:
  // the selected-work / lab / notes markup declares them via data-repo.
  function featuredRepoNames() {
    var names = {};
    var nodes = document.querySelectorAll('[data-repo]');
    for (var i = 0; i < nodes.length; i++) {
      var name = (nodes[i].getAttribute('data-repo') || '').trim().toLowerCase();
      if (name) names[name] = true;
    }
    // The profile README repo and this site's own repo add nothing here.
    names[GITHUB_USER.toLowerCase()] = true;
    names['yashverma-dev'] = true;
    return names;
  }

  function normalize(repo) {
    return {
      name: repo.name || 'untitled',
      description: String(repo.description || '').trim(),
      url: repo.html_url || ('https://github.com/' + GITHUB_USER + '/' + repo.name),
      homepage: String(repo.homepage || '').trim(),
      lang: repo.language || '',
      stars: typeof repo.stargazers_count === 'number' ? repo.stargazers_count : 0,
      forks: typeof repo.forks_count === 'number' ? repo.forks_count : 0,
      isFork: !!repo.fork,
      pushedAt: repo.pushed_at || repo.updated_at || '',
      createdAt: repo.created_at || ''
    };
  }

  function shortlist(repos) {
    var featured = featuredRepoNames();
    // Forks are fair game — most forks here are working copies, not drive-by
    // checkouts. They only get a badge so originals stay distinguishable.
    return (Array.isArray(repos) ? repos : [])
      .filter(function (repo) {
        if (!repo || repo.archived) return false;
        return !featured[String(repo.name || '').toLowerCase()];
      })
      .map(normalize)
      .sort(function (a, b) { return new Date(b.pushedAt) - new Date(a.pushedAt); });
  }

  /* ------------------------------------------------------------ */
  /* Rendering                                                      */
  /* ------------------------------------------------------------ */
  function starSvg() {
    return '<svg viewBox="0 0 24 24"><path d="m12 2 3 6 7 .9-5 4.7 1.4 6.9L12 17l-6.4 3.5L7 13.6 2 8.9 9 8Z"/></svg>';
  }
  function forkSvg() {
    return '<svg viewBox="0 0 24 24"><circle cx="6" cy="6" r="2.6"/><circle cx="18" cy="6" r="2.6"/><circle cx="12" cy="18" r="2.6"/><path d="M6 8.6v2.9a4 4 0 0 0 4 4M18 8.6v2.9a4 4 0 0 1-4 4"/></svg>';
  }
  function arrowSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg>';
  }

  function renderCard(repo) {
    var li = document.createElement('li');
    li.className = 'radar-card';
    li.setAttribute('data-tilt', '');

    var top = document.createElement('div');
    top.className = 'radar-card__top';
    var lang = document.createElement('span');
    lang.className = 'radar-card__lang';
    var langColor = LANG_COLORS[repo.lang] || 'var(--accent)';
    lang.innerHTML = '<i style="--lang:' + langColor + '"></i>' + (repo.lang || 'notes');
    top.appendChild(lang);
    if (repo.isFork) {
      var forkBadge = document.createElement('span');
      forkBadge.className = 'radar-card__fork-badge';
      forkBadge.textContent = 'FORK';
      forkBadge.title = 'Forked repository — usually a working copy';
      top.appendChild(forkBadge);
    }
    if (isNew(repo.createdAt)) {
      var badge = document.createElement('span');
      badge.className = 'radar-card__new';
      badge.textContent = 'NEW';
      top.appendChild(badge);
    }
    var when = document.createElement('time');
    when.className = 'radar-card__time';
    when.dateTime = repo.pushedAt;
    when.textContent = relativeTime(repo.pushedAt);
    top.appendChild(when);

    var title = document.createElement('a');
    title.className = 'radar-card__title';
    title.href = repo.url;
    title.target = '_blank';
    title.rel = 'noopener';
    title.setAttribute('data-cursor', 'view');
    title.setAttribute('aria-label', repo.name + ' on GitHub');
    var titleText = document.createElement('span');
    titleText.textContent = repo.name;
    title.appendChild(titleText);
    title.insertAdjacentHTML('beforeend', arrowSvg());

    var desc = document.createElement('p');
    desc.className = 'radar-card__desc';
    desc.textContent = repo.description ||
      'No README blurb yet — fresh out of the lab, watch this space.';

    var bottom = document.createElement('div');
    bottom.className = 'radar-card__bottom';
    var stars = document.createElement('span');
    stars.className = 'radar-card__stat';
    stars.innerHTML = starSvg() + ' ' + repo.stars;
    stars.title = 'Stars';
    var forks = document.createElement('span');
    forks.className = 'radar-card__stat';
    forks.innerHTML = forkSvg() + ' ' + repo.forks;
    forks.title = 'Forks';
    bottom.appendChild(stars);
    bottom.appendChild(forks);

    if (repo.homepage) {
      var demo = document.createElement('a');
      demo.className = 'radar-card__demo';
      demo.href = repo.homepage;
      demo.target = '_blank';
      demo.rel = 'noopener';
      demo.setAttribute('data-cursor', 'view');
      demo.textContent = 'Live demo ↗';
      bottom.appendChild(demo);
    }

    li.appendChild(top);
    li.appendChild(title);
    li.appendChild(desc);
    li.appendChild(bottom);
    return li;
  }

  function render(items, meta) {
    var grid = document.getElementById('radarGrid');
    var status = document.getElementById('radarStatus');
    var foot = document.getElementById('radarFoot');
    if (!grid) return;
    grid.innerHTML = '';

    if (!items.length) {
      var empty = document.createElement('li');
      empty.className = 'radar-card';
      empty.style.gridColumn = '1/-1';
      empty.textContent = 'Every public repo is already showcased above — or GitHub is unreachable right now.';
      grid.appendChild(empty);
      if (status) status.textContent = 'Nothing unfeatured right now';
      if (foot) foot.textContent = '';
      return;
    }

    items.slice(0, MAX_CARDS).forEach(function (repo) {
      grid.appendChild(renderCard(repo));
    });

    if (foot) {
      var remaining = items.length - MAX_CARDS;
      foot.innerHTML = remaining > 0
        ? '<span>' + remaining + ' more unfeatured repo' + (remaining > 1 ? 's' : '') + ' on the profile</span>' +
          '<a href="https://github.com/' + GITHUB_USER + '?tab=repositories" target="_blank" rel="noopener" data-cursor="text" data-cursor-text="↗">Browse everything ↗</a>'
        : '<span>That is everything currently off the radar</span>' +
          '<a href="https://github.com/' + GITHUB_USER + '?tab=repositories" target="_blank" rel="noopener" data-cursor="text" data-cursor-text="↗">All repositories ↗</a>';
    }

    if (status) {
      status.textContent = meta.source === 'live'
        ? 'Live · synced just now'
        : meta.source === 'snapshot'
          ? 'Daily Actions snapshot · ' + relativeTime(meta.syncedAt)
          : 'Cached locally · refreshes every 30m';
    }

    // Dynamic cards join the same tilt/scramble/cursor family as authored ones.
    if (typeof window.__yvEnhance === 'function') window.__yvEnhance(grid);
  }

  /* ------------------------------------------------------------ */
  /* Stats strip — "Public repos" becomes a real number             */
  /* ------------------------------------------------------------ */
  function updateRepoCount(total) {
    if (typeof total !== 'number' || total <= 0) return;
    var el = document.getElementById('statRepos');
    if (!el) return;
    // If the count-up animation hasn't run yet it will read the attribute;
    // if it has, just set the final text directly.
    el.setAttribute('data-count', String(total));
    if (el.textContent && el.textContent.trim() !== '0') {
      el.textContent = String(total);
    }
  }

  /* ------------------------------------------------------------ */
  /* Cache                                                          */
  /* ------------------------------------------------------------ */
  function readCache() {
    try {
      var parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (!parsed || !Array.isArray(parsed.items)) return null;
      return parsed;
    } catch (e) { return null; }
  }

  function writeCache(items, publicRepos) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: Date.now(), publicRepos: publicRepos || 0, items: items
      }));
    } catch (e) {}
  }

  /* ------------------------------------------------------------ */
  /* Sources                                                        */
  /* ------------------------------------------------------------ */
  function fetchLive() {
    var headers = { Accept: 'application/vnd.github+json' };
    var reposUrl = 'https://api.github.com/users/' + GITHUB_USER + '/repos?per_page=100&sort=updated';
    var userUrl = 'https://api.github.com/users/' + GITHUB_USER;

    return Promise.all([
      fetchJson(reposUrl, { headers: headers, cache: 'no-store' }, 9000),
      // The profile request is a bonus (real public-repos stat); the repo
      // list renders even when only the first call succeeds.
      fetchJson(userUrl, { headers: headers, cache: 'no-store' }, 8000).catch(function () { return null; })
    ]).then(function (results) {
      var repos = results[0];
      var user = results[1];
      if (!Array.isArray(repos)) throw new Error('Invalid GitHub response');
      return {
        repos: repos,
        publicRepos: user && typeof user.public_repos === 'number' ? user.public_repos : repos.length
      };
    });
  }

  function fetchSnapshot() {
    return fetchJson(SNAPSHOT_URL, { cache: 'no-store' }, 7000).then(function (data) {
      if (!data || !Array.isArray(data.repos)) throw new Error('Bad snapshot');
      return {
        repos: data.repos,
        publicRepos: typeof data.publicRepos === 'number' ? data.publicRepos : data.repos.length,
        syncedAt: data.syncedAt || ''
      };
    });
  }

  function boot() {
    var grid = document.getElementById('radarGrid');
    if (!grid || typeof fetch !== 'function') return;

    var cached = readCache();
    if (cached) {
      render(shortlist(cached.repos || cached.items), { source: 'cache', syncedAt: new Date(cached.timestamp).toISOString() });
      updateRepoCount(cached.publicRepos);
    }
    if (cached && Date.now() - cached.timestamp < CACHE_MS) return;

    fetchLive().then(function (live) {
      writeCache(live.repos, live.publicRepos);
      render(shortlist(live.repos), { source: 'live' });
      updateRepoCount(live.publicRepos);
    }).catch(function () {
      fetchSnapshot().then(function (snapshot) {
        render(shortlist(snapshot.repos), { source: 'snapshot', syncedAt: snapshot.syncedAt });
        updateRepoCount(snapshot.publicRepos);
      }).catch(function () {
        if (cached) {
          render(shortlist(cached.repos || cached.items), { source: 'cache', syncedAt: new Date(cached.timestamp).toISOString() });
        } else {
          render([], { source: 'none' });
        }
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
