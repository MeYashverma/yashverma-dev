/**
 * Live data widgets: real-time Discord presence (via the public Lanyard API)
 * and "now playing" / "last played" music (Last.fm first, falling back to
 * Discord's own Spotify presence via Lanyard, falling back to Last.fm's most
 * recent scrobble labelled as "last played").
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
    if (!images || !images.length) return FALLBACK_ART;
    var url = images[images.length - 1]['#text'];
    return isUsableArt(url) ? url : FALLBACK_ART;
  }

  var STATUS_LABEL = {
    online: 'Online',
    idle: 'Idle',
    dnd: 'Do Not Disturb',
    offline: 'Offline'
  };

  /* ------------------------------------------------------------ */
  /* Discord card (Lanyard)                                         */
  /* ------------------------------------------------------------ */
  function renderDiscordFallback() {
    var name = document.getElementById('liveDiscordName');
    var activity = document.getElementById('liveDiscordActivity');
    var dot = document.getElementById('liveDiscordDot');
    if (name) name.textContent = 'yashylash';
    if (activity) activity.textContent = 'Status unavailable right now';
    if (dot) dot.classList.remove('is-live');
  }

  function renderDiscord(data) {
    var user = data.discord_user || {};
    var status = data.discord_status || 'offline';

    var nameEl = document.getElementById('liveDiscordName');
    var activityEl = document.getElementById('liveDiscordActivity');
    var dotEl = document.getElementById('liveDiscordDot');
    var avatarEl = document.getElementById('liveDiscordAvatar');
    var badgeEl = document.getElementById('liveDiscordStatusBadge');

    if (nameEl) nameEl.textContent = user.global_name || user.username || 'yashylash';

    if (avatarEl && user.id && user.avatar) {
      var ext = user.avatar.indexOf('a_') === 0 ? 'gif' : 'png';
      avatarEl.src = 'https://cdn.discordapp.com/avatars/' + user.id + '/' + user.avatar + '.' + ext + '?size=128';
    }

    if (badgeEl) {
      badgeEl.className = 'live-card__status-badge status-' + status;
    }
    if (dotEl) dotEl.classList.toggle('is-live', status === 'online');

    // Pick a human activity line: prefer a non-custom-status, non-Spotify
    // activity (game / streaming / app), then custom status, then just the
    // online-status label.
    var activities = data.activities || [];
    var game = activities.find(function (a) { return a.type === 0; }); // Playing
    var stream = activities.find(function (a) { return a.type === 1; }); // Streaming
    var watching = activities.find(function (a) { return a.type === 3; }); // Watching
    var custom = activities.find(function (a) { return a.type === 4; }); // Custom status

    var line = '';
    if (stream) {
      line = 'Streaming — ' + (stream.details || stream.name);
    } else if (game) {
      line = 'Playing ' + game.name;
    } else if (watching) {
      line = 'Watching ' + watching.name;
    } else if (data.listening_to_spotify && data.spotify) {
      line = 'Listening to Spotify';
    } else if (custom && custom.state) {
      line = custom.state;
    } else {
      line = STATUS_LABEL[status] || 'Offline';
    }

    if (activityEl) activityEl.textContent = line;
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
    var eq = document.getElementById('liveMusicEq');
    var track = document.getElementById('liveMusicTrack');
    var artist = document.getElementById('liveMusicArtist');
    var link = document.getElementById('liveMusicLink');

    if (label) label.textContent = opts.label;
    if (dot) dot.classList.toggle('is-live', !!opts.isLive);
    if (eq) eq.classList.toggle('is-playing', !!opts.isLive);
    if (track) track.textContent = opts.track;
    if (artist) artist.textContent = opts.artist || '\u00A0';
    if (art) {
      art.src = opts.art || FALLBACK_ART;
      // Second safety net: if even the chosen art URL 404s / fails to load
      // (dead CDN link, transient error, anything), fall back to the
      // on-brand SVG rather than showing a browser broken-image icon.
      art.onerror = function () {
        art.onerror = null;
        art.src = FALLBACK_ART;
      };
    }
    if (link && opts.link) {
      link.href = opts.link;
      link.textContent = opts.linkText || 'Scrobbles on Last.fm \u2197';
    }
  }

  function tryLanyardSpotify() {
    var data = window.__lanyardData;
    if (data && data.listening_to_spotify && data.spotify) {
      var sp = data.spotify;
      setMusicCard({
        label: 'Now playing (Discord)',
        isLive: true,
        track: sp.song,
        artist: sp.artist,
        art: isUsableArt(sp.album_art_url) ? sp.album_art_url : FALLBACK_ART,
        link: 'https://open.spotify.com/track/' + (sp.track_id || ''),
        linkText: 'Open in Spotify \u2197'
      });
      return true;
    }
    return false;
  }

  function renderMusicFallback() {
    setMusicCard({
      label: 'Now playing',
      isLive: false,
      track: 'Nothing playing right now',
      artist: '',
      art: FALLBACK_ART,
      link: 'https://www.last.fm/user/' + LASTFM_USER,
      linkText: 'Scrobbles on Last.fm \u2197'
    });
  }

  function fetchLastfm() {
    var url = 'https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks'
      + '&user=' + encodeURIComponent(LASTFM_USER)
      + '&api_key=' + LASTFM_API_KEY
      + '&format=json&limit=1';

    fetch(url, { cache: 'no-store' })
      .then(function (res) { if (!res.ok) throw new Error('lastfm http ' + res.status); return res.json(); })
      .then(function (json) {
        var tracks = json && json.recenttracks && json.recenttracks.track;
        var t = tracks && tracks[0];

        if (t && t['@attr'] && t['@attr']['nowplaying'] === 'true') {
          // Last.fm says something is actively scrobbling right now — highest
          // priority per requested order (Last.fm first, then Discord).
          setMusicCard({
            label: 'Now playing (Last.fm)',
            isLive: true,
            track: t.name,
            artist: t.artist && t.artist['#text'],
            art: pickArt(t.image),
            link: t.url,
            linkText: 'Open on Last.fm \u2197'
          });
          return;
        }

        // Nothing actively scrobbling on Last.fm — try Discord's Spotify
        // presence next.
        if (tryLanyardSpotify()) return;

        // Neither is live — fall back to Last.fm's most recent play, framed
        // as "last played" rather than "now playing".
        if (t) {
          setMusicCard({
            label: 'Last played (Last.fm)',
            isLive: false,
            track: t.name,
            artist: t.artist && t.artist['#text'],
            art: pickArt(t.image),
            link: t.url,
            linkText: 'Open on Last.fm \u2197'
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
  /* Boot + polling                                                  */
  /* ------------------------------------------------------------ */
  function refreshAll() {
    fetchDiscord();
    // Slight delay so Lanyard data is available for the Spotify fallback
    // path before Last.fm's fetch resolves and needs it.
    setTimeout(fetchLastfm, 150);
  }

  function init() {
    var hasLiveSection = document.getElementById('live');
    if (!hasLiveSection || typeof fetch !== 'function') return;
    refreshAll();
    setInterval(refreshAll, POLL_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
