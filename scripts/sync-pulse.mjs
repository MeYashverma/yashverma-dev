#!/usr/bin/env node
/**
 * Commit pulse snapshot builder.
 *
 * Mirrors the public contributions data (from the read-only
 * github-contributions-api.jogruber.de service) into assets/data/pulse.json.
 * The browser normally fetches this API live; the snapshot exists so the
 * heatmap still renders if the mirror is down — same layered-fallback
 * contract as the Repo Radar.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const GITHUB_USER = 'MeYashverma';
const API_URL = `https://github-contributions-api.jogruber.de/v4/${GITHUB_USER}?y=last`;
const OUT_FILE = resolve(dirname(fileURLToPath(import.meta.url)), '../assets/data/pulse.json');

const res = await fetch(API_URL);
if (!res.ok) throw new Error(`Contributions mirror ${res.status}`);
const data = await res.json();
if (!data || !Array.isArray(data.contributions)) throw new Error('Unexpected pulse payload');

const payload = {
  syncedAt: new Date().toISOString(),
  contributions: data.contributions
};

await mkdir(dirname(OUT_FILE), { recursive: true });
await writeFile(OUT_FILE, JSON.stringify(payload, null, 2) + '\n');
console.log(`pulse.json: ${payload.contributions.length} days synced at ${payload.syncedAt}`);
