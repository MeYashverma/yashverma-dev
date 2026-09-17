#!/usr/bin/env node
/**
 * WakaTime snapshot builder — see README "Wiring WakaTime".
 * Polls through WakaTime's first-run HTTP 202 ("stats being computed")
 * instead of failing the data-sync workflow on a brand-new key.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_FILE = resolve(dirname(fileURLToPath(import.meta.url)), '../assets/data/wakatime.json');
const API_URL = 'https://wakatime.com/api/v1/users/current/stats/last_7_days';
const apiKey = (process.env.WAKATIME_API_KEY || '').trim();

if (!apiKey) {
  console.log('WAKATIME_API_KEY not set — skipping WakaTime snapshot (this is fine).');
  process.exit(0);
}

const auth = Buffer.from(apiKey).toString('base64');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchStats() {
  const MAX_ATTEMPTS = 6;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetch(API_URL, { headers: { Authorization: `Basic ${auth}` } });
    if (res.status === 202) {
      if (attempt === MAX_ATTEMPTS) {
        throw new Error('WakaTime is still computing your stats — re-run the workflow in a minute.');
      }
      console.log(`WakaTime is computing your stats (202) — retrying in 25s [${attempt}/${MAX_ATTEMPTS}]…`);
      await sleep(25000);
      continue;
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error(`WakaTime API ${res.status} — key rejected. Regenerate at https://wakatime.com/settings/api-key and update the WAKATIME_API_KEY secret (watch for stray whitespace).`);
    }
    if (!res.ok) throw new Error(`WakaTime API ${res.status}`);
    return res.json();
  }
}

const data = await fetchStats();
const stats = (data && data.data) || {};
const pick = (arr, n) => (Array.isArray(arr) ? arr.slice(0, n) : []).map((x) => ({
  name: x.name, percent: x.percent, totalSeconds: x.total_seconds
}));
const payload = {
  syncedAt: new Date().toISOString(),
  range: 'last_7_days',
  totalSeconds: stats.total_seconds || 0,
  dailyAverageSeconds: (stats.daily_average && typeof stats.daily_average.seconds === 'number') ? stats.daily_average.seconds : 0,
  humanTotal: stats.human_readable_total || '',
  languages: pick(stats.languages, 6),
  editors: pick(stats.editors, 3),
  operatingSystems: pick(stats.operating_systems, 3),
  categories: pick(stats.categories, 3)
};
await mkdir(dirname(OUT_FILE), { recursive: true });
await writeFile(OUT_FILE, JSON.stringify(payload, null, 2) + '\n');
console.log(`wakatime.json: ${payload.humanTotal || payload.totalSeconds + 's'} synced at ${payload.syncedAt}`);
