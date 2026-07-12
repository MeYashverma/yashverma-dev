/**
 * Live data widgets: real-time Discord presence (via the public Lanyard API)
 * and "now playing" / "last played" music (Last.fm first, falling back to
 * Discord's own Spotify presence via Lanyard, falling back to Last.fm's most
 * recent scrobble labelled as "last played") plus supporting stats (total
 * scrobbles, top artist this week, Discord platform/status detail).
 *
 * Both APIs are public, read-only, and CORS-enabled, so this runs entirely
 * client-side with no backend/build step, consistent with the rest of the
 * site. Every fetch is wrapped so a network hiccup or API downtime degrades
 * to a static fallback instead of breaking the page.
 */
(function () {
  'use strict';

  var DISCORD_USER_ID = '848100520509308989';
  var LASTFM_USER = 'The_Berlin';
  var LASTFM_API_KEY = 'c928f4b7b51bd314bc09ec438eaf85ec';

  var POLL_MS = 30000; // refresh every 30s

  // Last.fm returns this exact grey-star placeholder image (same hash for
  // every user/track) whenever no real album art exists. There's no flag in
  // the API response for this -- the only way to detect it is comparing the
  // hash in the URL. Matching it lets us swap in our own on-brand fallback
  // (an inline SVG vinyl glyph) instead of showing Last.fm's default art.
  var LASTFM_BLANK_ART_HASH = '2a96cbd8b46e442fc41c2b86b821562f';

  // On-brand fallback artwork for "no album art available" — a small inline
  // SVG data URI (lime vinyl glyph on the site's panel colour) so it never
  // depends on an external request and always matches the theme.
  var FALLBACK_ART = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
    '<rect width="64" height="64" fill="#0d0d10"/>' +
    '<circle cx="32" cy="32" r="22" fill="none" stroke="#2a2a30" stroke-width="1.5"/>' +
    '<circle cx="32" cy="32" r="16" fill="none" stroke="#2a2a30" stroke-width="1.5"/>' +
    '<circle cx="32" cy="32" r="10" fill="none" stroke="#d9ff3f" stroke-width="1.5" opacity="0.7"/>' +
    '<circle cx="32" cy="32" r="3.2" fill="#d9ff3f"/>' +
    '</svg>'
  );

  function isUsableArt(url) {
    if (!url) return false;
    if (url.indexOf(LASTFM_BLANK_ART_HASH) !== -1) return false;
    return true;
  }

  function pickArt(images) {
    if (!images || !images.length) return null;
    var url = images[images.length - 1]['#text'];
    return isUsableArt(url) ? url : null;
  }

  /* ------------------------------------------------------------ */
  /* iTunes cover-art fallback (public, CORS-open, no key needed)   */
  /* When Last.fm returns their blank grey placeholder — or nothing */
  /* at all — search the iTunes Search API for the track and pull   */
  /* the highest-res artwork available. Results cached in-memory to */
  /* avoid hammering the endpoint on every poll for the same song.  */
  /* ------------------------------------------------------------ */
  var iTunesCache = Object.create(null);

  function iTunesLookup(track, artist) {
    var key = (artist || '') + '::' + (track || '');
    if (iTunesCache[key]) return Promise.resolve(iTunesCache[key]);

    var term = encodeURIComponent(((artist || '') + ' ' + (track || '')).trim());
    if (!term) return Promise.resolve(null);

    var url = 'https://itunes.apple.com/search?media=music&entity=song&limit=1&term=' + term;
    return fetch(url, { cache: 'default' })
      .then(function (res) { if (!res.ok) throw new Error('itunes http ' + res.status); return res.json(); })
      .then(function (json) {
        var art = json && json.results && json.results[0] && json.results[0].artworkUrl100;
        // Ask iTunes for a much larger version by rewriting the URL — the
        // CDN accepts arbitrary sizes up to ~600px reliably.
        if (art) art = art.replace(/\/\d+x\d+bb\./, '/600x600bb.');
        iTunesCache[key] = art || null;
        return iTunesCache[key];
      })
      .catch(function () { iTunesCache[key] = null; return null; });
  }

  // Resolve album art with a fallback chain:
  //   1. Last.fm image (if not the blank-hash placeholder)
  //   2. iTunes Search API artwork (600x600)
  //   3. On-brand SVG vinyl glyph
  function resolveArt(lastfmImages, track, artist) {
    var direct = pickArt(lastfmImages);
    if (direct) return Promise.resolve(direct);
    return iTunesLookup(track, artist).then(function (url) { return url || FALLBACK_ART; });
  }

  function formatCompactNumber(n) {
    if (typeof n !== 'number' || isNaN(n)) return '\u2014';
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
  }

  var STATUS_LABEL = {
    online: 'Online',
    idle: 'Idle',
    dnd: 'Do Not Disturb',
    offline: 'Offline'
  };

  // Inline icon fragments (sourced from Lucide) so the Discord card can show
  // a small glyph for platform + activity type without any extra requests.
  var ICONS = {
    monitor: '<svg viewBox="0 0 24 24"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>',
    smartphone: '<svg viewBox="0 0 24 24"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>',
    globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>',
    appWindow: '<svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M10 4v4"/><path d="M2 8h20"/><path d="M6 4v4"/></svg>',
    gamepad: '<svg viewBox="0 0 24 24"><line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/></svg>',
    radio: '<svg viewBox="0 0 24 24"><path d="M16.247 7.761a6 6 0 0 1 0 8.478"/><path d="M19.075 4.933a10 10 0 0 1 0 14.134"/><path d="M4.925 19.067a10 10 0 0 1 0-14.134"/><path d="M7.753 16.239a6 6 0 0 1 0-8.478"/><circle cx="12" cy="12" r="2"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>',
    music: '<svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
    message: '<svg viewBox="0 0 24 24"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/></svg>'
  };

  /* ------------------------------------------------------------ */
  /* Discord card (Lanyard)                                         */
  /* ------------------------------------------------------------ */
  function renderDiscordFallback() {
    var name = document.getElementById('liveDiscordName');
    var activityText = document.getElementById('liveDiscordActivityText');
    var activityIcon = document.getElementById('liveDiscordActivityIcon');
    var dot = document.getElementById('liveDiscordDot');
    var statusText = document.getElementById('liveDiscordStatusText');
    var platformText = document.getElementById('liveDiscordPlatformText');
    var platformIcon = document.getElementById('liveDiscordPlatformIcon');
    if (name) name.textContent = 'yashylash';
    if (activityText) activityText.textContent = 'Status unavailable right now';
    if (activityIcon) activityIcon.innerHTML = '';
    if (dot) dot.classList.remove('is-live');
    if (statusText) statusText.textContent = '\u2014';
    if (platformText) platformText.textContent = '\u2014';
    if (platformIcon) platformIcon.innerHTML = '';
  }

  function renderDiscord(data) {
    var user = data.discord_user || {};
    var status = data.discord_status || 'offline';

    var nameEl = document.getElementById('liveDiscordName');
    var handleEl = document.getElementById('liveDiscordHandle');
    var activityTextEl = document.getElementById('liveDiscordActivityText');
    var activityIconEl = document.getElementById('liveDiscordActivityIcon');
    var dotEl = document.getElementById('liveDiscordDot');
    var avatarEl = document.getElementById('liveDiscordAvatar');
    var badgeEl = document.getElementById('liveDiscordStatusBadge');
    var statusTextEl = document.getElementById('liveDiscordStatusText');
    var platformTextEl = document.getElementById('liveDiscordPlatformText');
    var platformIconEl = document.getElementById('liveDiscordPlatformIcon');

    if (nameEl) nameEl.textContent = user.global_name || user.username || 'yashylash';
    if (handleEl) handleEl.textContent = '@' + (user.username || 'yashylash');

    if (avatarEl && user.id && user.avatar) {
      var ext = user.avatar.indexOf('a_') === 0 ? 'gif' : 'png';
      avatarEl.src = 'https://cdn.discordapp.com/avatars/' + user.id + '/' + user.avatar + '.' + ext + '?size=128';
    }

    if (badgeEl) {
      badgeEl.className = 'live-card__status-badge status-' + status;
    }
    if (dotEl) dotEl.classList.toggle('is-live', status === 'online');
    if (statusTextEl) statusTextEl.textContent = STATUS_LABEL[status] || 'Offline';

    // Which client surface is active — desktop / mobile / web / embedded.
    var platformLabel = '\u2014';
    var platformIconKey = null;
    if (data.active_on_discord_desktop) { platformLabel = 'Desktop'; platformIconKey = 'monitor'; }
    else if (data.active_on_discord_mobile) { platformLabel = 'Mobile'; platformIconKey = 'smartphone'; }
    else if (data.active_on_discord_web) { platformLabel = 'Web'; platformIconKey = 'globe'; }
    else if (data.active_on_discord_embedded) { platformLabel = 'Embedded'; platformIconKey = 'appWindow'; }
    if (platformTextEl) platformTextEl.textContent = platformLabel;
    if (platformIconEl) platformIconEl.innerHTML = platformIconKey ? ICONS[platformIconKey] : '';

    // Pick a human activity line: prefer a non-custom-status, non-Spotify
    // activity (game / streaming / app), then custom status, then just the
    // online-status label.
    var activities = data.activities || [];
    var game = activities.find(function (a) { return a.type === 0; }); // Playing
    var stream = activities.find(function (a) { return a.type === 1; }); // Streaming
    var watching = activities.find(function (a) { return a.type === 3; }); // Watching
    var custom = activities.find(function (a) { return a.type === 4; }); // Custom status

    var line = '';
    var iconKey = null;
    if (stream) {
      line = 'Streaming — ' + (stream.details || stream.name);
      iconKey = 'radio';
    } else if (game) {
      line = 'Playing ' + game.name;
      iconKey = 'gamepad';
    } else if (watching) {
      line = 'Watching ' + watching.name;
      iconKey = 'eye';
    } else if (data.listening_to_spotify && data.spotify) {
      line = 'Listening to Spotify';
      iconKey = 'music';
    } else if (custom && custom.state) {
      line = custom.state;
      iconKey = 'message';
    } else {
      line = STATUS_LABEL[status] || 'Offline';
    }

    if (activityTextEl) activityTextEl.textContent = line;
    if (activityIconEl) activityIconEl.innerHTML = iconKey ? ICONS[iconKey] : '';

    // ---- Custom status (with optional emoji) -----------------
    var csWrap  = document.getElementById('liveDiscordCustomStatus');
    var csText  = document.getElementById('liveDiscordCustomText');
    var csEmoji = document.getElementById('liveDiscordCustomEmoji');
    if (csWrap && csText) {
      if (custom && (custom.state || (custom.emoji && custom.emoji.name))) {
        csWrap.hidden = false;
        csText.textContent = custom.state || '';
        if (csEmoji) {
          if (custom.emoji && custom.emoji.id) {
            var ext2 = custom.emoji.animated ? 'gif' : 'png';
            csEmoji.innerHTML = '<img src="https://cdn.discordapp.com/emojis/' + custom.emoji.id + '.' + ext2 + '?size=32" alt="">';
          } else if (custom.emoji && custom.emoji.name) {
            csEmoji.textContent = custom.emoji.name;
          } else {
            csEmoji.textContent = '';
          }
        }
      } else {
        csWrap.hidden = true;
      }
    }

    // ---- Active-on chip (comma-separated platform list) -----
    var activeChips = [];
    if (data.active_on_discord_desktop)  activeChips.push('Desktop');
    if (data.active_on_discord_mobile)   activeChips.push('Mobile');
    if (data.active_on_discord_web)      activeChips.push('Web');
    if (data.active_on_discord_embedded) activeChips.push('Console');
    var actCountEl = document.getElementById('liveDiscordActivityCount');
    if (actCountEl) actCountEl.textContent = activeChips.length ? activeChips.join(' · ') : '\u2014';

    // ---- Rich activity readout (game / app / stream art) -----
    var richWrap   = document.getElementById('liveDiscordActivityRich');
    var richArt    = document.getElementById('liveDiscordActivityArt');
    var richArtSm  = document.getElementById('liveDiscordActivityArtSmall');
    var richName   = document.getElementById('liveDiscordActivityName');
    var richDet    = document.getElementById('liveDiscordActivityDetails');
    var richState  = document.getElementById('liveDiscordActivityState');
    var richTime   = document.getElementById('liveDiscordActivityTime');
    var richItem   = game || stream || watching;
    if (richWrap) {
      if (richItem) {
        richWrap.hidden = false;
        if (richName)  richName.textContent  = richItem.name || '';
        if (richDet)   richDet.textContent   = richItem.details || '';
        if (richState) richState.textContent = richItem.state   || '';
        if (richArt) {
          var large = richItem.assets && richItem.assets.large_image;
          if (large) {
            var url = large.indexOf('mp:') === 0
              ? 'https://media.discordapp.net/' + large.slice(3)
              : 'https://cdn.discordapp.com/app-assets/' + richItem.application_id + '/' + large + '.png';
            richArt.src = url; richArt.style.display = '';
          } else {
            richArt.style.display = 'none';
          }
        }
        if (richArtSm) {
          var small = richItem.assets && richItem.assets.small_image;
          if (small && richItem.application_id) {
            var url2 = small.indexOf('mp:') === 0
              ? 'https://media.discordapp.net/' + small.slice(3)
              : 'https://cdn.discordapp.com/app-assets/' + richItem.application_id + '/' + small + '.png';
            richArtSm.src = url2; richArtSm.style.display = '';
          } else {
            richArtSm.style.display = 'none';
          }
        }
        if (richTime) {
          if (richItem.timestamps && richItem.timestamps.start) {
            var startTs = Number(richItem.timestamps.start);
            var elapsed = Math.max(0, Math.floor((Date.now() - startTs) / 1000));
            var m = Math.floor(elapsed / 60), s = elapsed % 60;
            var h = Math.floor(m / 60); m = m % 60;
            richTime.textContent = (h ? h + ':' + String(m).padStart(2,'0') : m) + ':' + String(s).padStart(2,'0') + ' elapsed';
          } else {
            richTime.textContent = '';
          }
        }
      } else {
        richWrap.hidden = true;
      }
    }
  }

  function fetchDiscord() {
    fetch('https://api.lanyard.rest/v1/users/' + DISCORD_USER_ID, { cache: 'no-store' })
      .then(function (res) { if (!res.ok) throw new Error('lanyard http ' + res.status); return res.json(); })
      .then(function (json) {
        if (json && json.success && json.data) {
          renderDiscord(json.data);
          window.__lanyardData = json.data; // exposed for the music card fallback
        } else {
          renderDiscordFallback();
        }
      })
      .catch(function () {
        renderDiscordFallback();
      });
  }

  /* ------------------------------------------------------------ */
  /* Music card (Last.fm -> Lanyard/Spotify -> Last.fm last played) */
  /* ------------------------------------------------------------ */
  function setMusicCard(opts) {
    var label = document.getElementById('liveMusicLabel');
    var dot = document.getElementById('liveMusicDot');
    var art = document.getElementById('liveMusicArt');
    var backdrop = document.getElementById('liveMusicBackdrop');
    var eq = document.getElementById('liveMusicEq');
    var track = document.getElementById('liveMusicTrack');
    var artist = document.getElementById('liveMusicArtist');
    var album = document.getElementById('liveMusicAlbum');
    var link = document.getElementById('liveMusicLink');
    var progress = document.getElementById('liveMusicProgress');
    var progFill = document.getElementById('liveMusicProgressFill');
    var progEl = document.getElementById('liveMusicElapsed');
    var progDur = document.getElementById('liveMusicDuration');

    if (label) label.textContent = opts.label;
    if (dot) dot.classList.toggle('is-live', !!opts.isLive);
    if (eq) eq.classList.toggle('is-playing', !!opts.isLive);
    if (track) track.textContent = opts.track;
    if (artist) artist.textContent = opts.artist || '\u00A0';
    if (album) album.textContent = opts.album || '\u00A0';
    if (art) {
      var artUrl = opts.art || FALLBACK_ART;
      art.src = artUrl;
      art.onerror = function () {
        art.onerror = null;
        art.src = FALLBACK_ART;
        if (backdrop) backdrop.classList.remove('is-visible');
      };
      if (backdrop) {
        var isFallback = artUrl === FALLBACK_ART;
        backdrop.classList.toggle('is-visible', !isFallback);
        if (!isFallback) backdrop.style.backgroundImage = 'url("' + artUrl + '")';
      }
    }
    if (link && opts.link) {
      link.href = opts.link;
      link.textContent = opts.linkText || 'View listening history \u2197';
    }
    // Progress bar (Spotify presence only — Last.fm doesn't expose position)
    if (progress) {
      if (opts.startTs && opts.endTs) {
        progress.hidden = false;
        renderProgress(opts.startTs, opts.endTs);
      } else {
        progress.hidden = true;
      }
    }
  }

  // Progress bar tick — runs off a shared 1s timer so all cards using
  // the same start/end pair advance together.
  var _progressTimer = null;
  function renderProgress(startTs, endTs) {
    var progFill = document.getElementById('liveMusicProgressFill');
    var progEl   = document.getElementById('liveMusicElapsed');
    var progDur  = document.getElementById('liveMusicDuration');
    function fmt(ms) {
      var s = Math.max(0, Math.floor(ms / 1000));
      var m = Math.floor(s / 60); s = s % 60;
      return m + ':' + String(s).padStart(2, '0');
    }
    function tick() {
      var now = Date.now();
      var total = endTs - startTs;
      var passed = Math.min(total, Math.max(0, now - startTs));
      if (progFill) progFill.style.width = (total ? (passed / total * 100) : 0) + '%';
      if (progEl)   progEl.textContent   = fmt(passed);
      if (progDur)  progDur.textContent  = fmt(total);
      if (passed >= total) {
        clearInterval(_progressTimer);
        _progressTimer = null;
      }
    }
    if (_progressTimer) clearInterval(_progressTimer);
    tick();
    _progressTimer = setInterval(tick, 500);
  }

  // Persist the last successfully-rendered track so if every source goes
  // silent (nothing scrobbling, Spotify off, API blip) we keep the last
  // played artwork on-screen instead of dropping back to the vinyl glyph.
  var lastRenderedTrack = null;

  function tryLanyardSpotify() {
    var data = window.__lanyardData;
    if (data && data.listening_to_spotify && data.spotify) {
      var sp = data.spotify;
      var art = isUsableArt(sp.album_art_url) ? sp.album_art_url : null;
      var render = function (finalArt) {
        var payload = {
          label: 'Now playing',
          isLive: true,
          track: sp.song,
          artist: sp.artist,
          album: sp.album,
          art: finalArt || FALLBACK_ART,
          link: 'https://open.spotify.com/track/' + (sp.track_id || ''),
          linkText: 'Open in Spotify \u2197',
          startTs: sp.timestamps && sp.timestamps.start,
          endTs:   sp.timestamps && sp.timestamps.end
        };
        setMusicCard(payload);
        lastRenderedTrack = payload;
      };
      if (art) render(art);
      else iTunesLookup(sp.song, sp.artist).then(render);
      return true;
    }
    return false;
  }

  function renderMusicFallback() {
    // If we've previously shown a track this session (either now playing or
    // last played), keep displaying it rather than blanking the card — feels
    // less broken to a visitor and matches the Spotify / Apple Music pattern
    // of &ldquo;keep the last cover art on screen when idle&rdquo;.
    if (lastRenderedTrack) {
      setMusicCard({
        label: 'Last played',
        isLive: false,
        track: lastRenderedTrack.track,
        artist: lastRenderedTrack.artist,
        art: lastRenderedTrack.art,
        link: lastRenderedTrack.link,
        linkText: lastRenderedTrack.linkText
      });
      return;
    }
    setMusicCard({
      label: 'Now playing',
      isLive: false,
      track: 'Nothing playing right now',
      artist: '',
      art: FALLBACK_ART,
      link: 'https://www.last.fm/user/' + LASTFM_USER,
      linkText: 'View listening history \u2197'
    });
  }

  function fetchLastfmRecent() {
    // Pull 6 tracks so we can render the little "Recently played" strip
    // below the hero row. The first item is the current/most-recent track
    // (same as before), the rest fill the history list.
    var url = 'https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks'
      + '&user=' + encodeURIComponent(LASTFM_USER)
      + '&api_key=' + LASTFM_API_KEY
      + '&format=json&limit=6';

    return fetch(url, { cache: 'no-store' })
      .then(function (res) { if (!res.ok) throw new Error('lastfm http ' + res.status); return res.json(); })
      .then(function (json) {
        var tracks = json && json.recenttracks && json.recenttracks.track;
        var t = tracks && tracks[0];
        renderRecentList(tracks || []);

        if (t && t['@attr'] && t['@attr']['nowplaying'] === 'true') {
          // Last.fm says something is actively scrobbling right now — highest
          // priority per requested order (Last.fm first, then Discord).
          var artistName = t.artist && t.artist['#text'];
          var albumName  = t.album  && t.album['#text'];
          resolveArt(t.image, t.name, artistName).then(function (art) {
            var payload = {
              label: 'Now playing',
              isLive: true,
              track: t.name,
              artist: artistName,
              album: albumName,
              art: art,
              link: t.url,
              linkText: 'Open track \u2197'
            };
            setMusicCard(payload);
            lastRenderedTrack = payload;
          });
          return;
        }

        // Nothing actively scrobbling on Last.fm — try Discord's Spotify
        // presence next.
        if (tryLanyardSpotify()) return;

        // Neither is live — fall back to Last.fm's most recent play, framed
        // as "last played" rather than "now playing".
        if (t) {
          var artistName2 = t.artist && t.artist['#text'];
          var albumName2  = t.album  && t.album['#text'];
          resolveArt(t.image, t.name, artistName2).then(function (art) {
            var payload = {
              label: 'Last played',
              isLive: false,
              track: t.name,
              artist: artistName2,
              album: albumName2,
              art: art,
              link: t.url,
              linkText: 'Open track \u2197'
            };
            setMusicCard(payload);
            lastRenderedTrack = payload;
          });
        } else {
          renderMusicFallback();
        }
      })
      .catch(function () {
        // Last.fm failed outright — try Discord's Spotify presence before
        // giving up entirely.
        if (!tryLanyardSpotify()) renderMusicFallback();
      });
  }

  /* ------------------------------------------------------------ */
  /* Recently played list — small history strip under the hero row */
  /* ------------------------------------------------------------ */
  function renderRecentList(tracks) {
    var listEl = document.getElementById('liveMusicRecentList');
    if (!listEl) return;
    // Skip the currently-playing / most recent one because it's already
    // shown in the hero row; take up to the next 4.
    var items = tracks.slice(1, 5);
    if (!items.length) { listEl.innerHTML = ''; return; }
    var html = '';
    for (var i = 0; i < items.length; i++) {
      var t = items[i];
      var artistName = t.artist && t.artist['#text'];
      var art = pickArt(t.image);
      var thumb = art
        ? '<img src="' + art + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">'
        : '<span class="live-card__recent-fallback"></span>';
      var when = (t.date && t.date['#text']) ? relativeTime(new Date(t.date['#text'] + ' UTC')) : 'just now';
      html += '<li class="live-card__recent-item">'
           + '<a href="' + (t.url || '#') + '" target="_blank" rel="noopener">'
           + '<span class="live-card__recent-thumb">' + thumb + '</span>'
           + '<span class="live-card__recent-meta">'
           + '<span class="live-card__recent-track">' + escapeHtml(t.name) + '</span>'
           + '<span class="live-card__recent-artist">' + escapeHtml(artistName || '') + '</span>'
           + '</span>'
           + '<span class="live-card__recent-when">' + when + '</span>'
           + '</a></li>';
    }
    listEl.innerHTML = html;
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }
  function relativeTime(d) {
    if (!(d instanceof Date) || isNaN(d)) return 'a while ago';
    var s = Math.max(1, Math.round((Date.now() - d.getTime()) / 1000));
    if (s < 60) return s + 's ago';
    if (s < 3600) return Math.round(s / 60) + 'm ago';
    if (s < 86400) return Math.round(s / 3600) + 'h ago';
    return Math.round(s / 86400) + 'd ago';
  }

  function fetchLastfmStats() {
    var scrobblesEl   = document.getElementById('liveMusicScrobbles');
    var topArtistEl   = document.getElementById('liveMusicTopArtist');
    var topAlbumEl    = document.getElementById('liveMusicTopAlbum');
    var artistCountEl = document.getElementById('liveMusicArtistCount');

    var infoUrl = 'https://ws.audioscrobbler.com/2.0/?method=user.getinfo'
      + '&user=' + encodeURIComponent(LASTFM_USER) + '&api_key=' + LASTFM_API_KEY + '&format=json';
    var topArtistUrl = 'https://ws.audioscrobbler.com/2.0/?method=user.gettopartists'
      + '&user=' + encodeURIComponent(LASTFM_USER) + '&api_key=' + LASTFM_API_KEY
      + '&format=json&period=7day&limit=1';
    var topAlbumUrl = 'https://ws.audioscrobbler.com/2.0/?method=user.gettopalbums'
      + '&user=' + encodeURIComponent(LASTFM_USER) + '&api_key=' + LASTFM_API_KEY
      + '&format=json&period=7day&limit=1';
    var artistCountUrl = 'https://ws.audioscrobbler.com/2.0/?method=user.gettopartists'
      + '&user=' + encodeURIComponent(LASTFM_USER) + '&api_key=' + LASTFM_API_KEY
      + '&format=json&period=overall&limit=1';

    fetch(infoUrl, { cache: 'no-store' })
      .then(function (res) { if (!res.ok) throw new Error('http ' + res.status); return res.json(); })
      .then(function (json) {
        var playcount = json && json.user && parseInt(json.user.playcount, 10);
        if (scrobblesEl && !isNaN(playcount)) scrobblesEl.textContent = formatCompactNumber(playcount);
      })
      .catch(function () { if (scrobblesEl) scrobblesEl.textContent = '\u2014'; });

    fetch(topArtistUrl, { cache: 'no-store' })
      .then(function (res) { if (!res.ok) throw new Error('http ' + res.status); return res.json(); })
      .then(function (json) {
        var artists = json && json.topartists && json.topartists.artist;
        var top = Array.isArray(artists) ? artists[0] : artists;
        if (topArtistEl) topArtistEl.textContent = (top && top.name) || 'No plays this week';
      })
      .catch(function () { if (topArtistEl) topArtistEl.textContent = '\u2014'; });

    fetch(topAlbumUrl, { cache: 'no-store' })
      .then(function (res) { if (!res.ok) throw new Error('http ' + res.status); return res.json(); })
      .then(function (json) {
        var albums = json && json.topalbums && json.topalbums.album;
        var top = Array.isArray(albums) ? albums[0] : albums;
        if (topAlbumEl) topAlbumEl.textContent = (top && top.name) || 'No album plays';
      })
      .catch(function () { if (topAlbumEl) topAlbumEl.textContent = '\u2014'; });

    // Unique artists count = Last.fm's overall top-artists list total, which
    // is the same as "how many distinct artists you've scrobbled" — cheapest
    // way to surface it without walking every page of history.
    fetch(artistCountUrl, { cache: 'no-store' })
      .then(function (res) { if (!res.ok) throw new Error('http ' + res.status); return res.json(); })
      .then(function (json) {
        var attr  = json && json.topartists && json.topartists['@attr'];
        var total = attr && parseInt(attr.total, 10);
        if (artistCountEl && !isNaN(total)) artistCountEl.textContent = formatCompactNumber(total);
      })
      .catch(function () { if (artistCountEl) artistCountEl.textContent = '\u2014'; });
  }

  /* ------------------------------------------------------------ */
  /* Boot + polling                                                  */
  /* ------------------------------------------------------------ */
  function refreshAll() {
    fetchDiscord();
    // Slight delay so Lanyard data is available for the Spotify fallback
    // path before Last.fm's fetch resolves and needs it.
    setTimeout(fetchLastfmRecent, 150);
  }

  function init() {
    var hasLiveSection = document.getElementById('live');
    if (!hasLiveSection || typeof fetch !== 'function') return;
    refreshAll();
    fetchLastfmStats();
    setInterval(refreshAll, POLL_MS);
    // Stats (total scrobbles / top artist) change slowly — refresh far less
    // often than the live now-playing/presence data.
    setInterval(fetchLastfmStats, POLL_MS * 10);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
