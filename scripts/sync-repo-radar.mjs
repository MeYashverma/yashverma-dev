#!/usr/bin/env node
/**
 * Repo Radar snapshot builder.
 *
 * Runs as a scheduled GitHub Action (see .github/workflows/repo-radar.yml).
 * Pulls the full public repo list once per day with the workflow's built-in
 * GITHUB_TOKEN (5,000 req/h instead of the visitor-facing 60 req/h) and
 * writes a trimmed snapshot to assets/data/radar.json.
 *
 * The site's radar.js only falls back to this file when the live API is
 * unreachable — the Action exists so "automatic" stays true even for
 * rate-limited visitors. It also runs fine locally with `node
 * scripts/sync-repo-radar.mjs` for a manual refresh.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const GITHUB_USER = 'MeYashverma';
const OUT_FILE = resolve(dirname(fileURLToPath(import.meta.url)), '../assets/data/radar.json');

const headers = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {})
};

async function getJson(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GitHub ${res.status} for ${url}`);
  return res.json();
}

const [repos, user] = await Promise.all([
  getJson(`https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=updated`),
  getJson(`https://api.github.com/users/${GITHUB_USER}`).catch(() => null)
]);

if (!Array.isArray(repos)) throw new Error('Unexpected repos payload');

// Keep only the fields the client renders — the snapshot stays small and
// nothing token-adjacent is ever written to disk.
const trimmed = repos.map((r) => ({
  name: r.name,
  description: r.description,
  html_url: r.html_url,
  homepage: r.homepage || '',
  language: r.language,
  stargazers_count: r.stargazers_count,
  forks_count: r.forks_count,
  pushed_at: r.pushed_at,
  created_at: r.created_at,
  fork: r.fork,
  archived: r.archived
}));

const payload = {
  syncedAt: new Date().toISOString(),
  publicRepos: user && typeof user.public_repos === 'number' ? user.public_repos : repos.length,
  repos: trimmed
};

await mkdir(dirname(OUT_FILE), { recursive: true });
await writeFile(OUT_FILE, JSON.stringify(payload, null, 2) + '\n');
console.log(`radar.json: ${trimmed.length} repos synced at ${payload.syncedAt}`);
