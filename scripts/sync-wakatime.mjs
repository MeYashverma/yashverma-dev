#!/usr/bin/env node
/**
 * WakaTime snapshot builder.
 *
 * Pulls the "last 7 days" summary from the WakaTime API and writes a trimmed
 * snapshot to assets/data/wakatime.json for the site's pulse section.
 *
 * The API key never ships to the browser: it lives only in the
 * WAKATIME_API_KEY repository secret, used by the scheduled workflow. If the
 * secret isn't configured this script exits successfully with a note, so a
 * fresh fork never gets a red workflow run — the site's WakaTime panel just
 * stays hidden (or falls back to public share embeds, if configured).
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_FILE = resolve(dirname(fileURLToPath(import.meta.url)), '../assets/data/wakatime.json');
const apiKey = process.env.WAKATIME_API_KEY || '';

if (!apiKey) {
  console.log('WAKATIME_API_KEY not set — skipping WakaTime snapshot (this is fine).');
  process.exit(0);
}

const auth = Buffer.from(apiKey).toString('base64');
const res = await fetch('https://wakatime.com/api/v1/users/current/stats/last_7_days', {
  headers: { Authorization: `Basic ${auth}` }
});
if (!res.ok) throw new Error(`WakaTime API ${res.status}`);
const data = await res.json();
const stats = data.data || {};

const pick = (arr, n) => (Array.isArray(arr) ? arr.slice(0, n) : []).map((x) => ({
  name: x.name,
  percent: x.percent,
  totalSeconds: x.total_seconds
}));

const payload = {
  syncedAt: new Date().toISOString(),
  range: 'last_7_days',
  totalSeconds: stats.total_seconds || 0,
  dailyAverageSeconds: (stats.daily_average && stats.daily_average.seconds) || 0,
  humanTotal: stats.human_readable_total || '',
  languages: pick(stats.languages, 6),
  editors: pick(stats.editors, 3),
  operatingSystems: pick(stats.operating_systems, 3),
  categories: pick(stats.categories, 3)
};

await mkdir(dirname(OUT_FILE), { recursive: true });
await writeFile(OUT_FILE, JSON.stringify(payload, null, 2) + '\n');
console.log(`wakatime.json: ${payload.humanTotal || payload.totalSeconds + 's'} synced at ${payload.syncedAt}`);
