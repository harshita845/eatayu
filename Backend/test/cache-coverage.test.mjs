import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADMIN_CONTENT_CACHE_PREFIXES } from '../src/middleware/cache.js';

const srcDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src');

function jsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? jsFiles(p) : p.endsWith('.js') ? [p] : [];
  });
}

test('every public cached endpoint is cleared when admin or restaurant content changes', () => {
  const used = new Set();
  for (const file of jsFiles(srcDir)) {
    for (const m of fs.readFileSync(file, 'utf8').matchAll(/cacheResponse\(\s*\d+\s*,\s*'([a-z_0-9]+)'/g)) used.add(m[1]);
  }
  assert.ok(used.size > 10, 'expected to find the cached endpoints');
  const missing = [...used].filter((prefix) => !ADMIN_CONTENT_CACHE_PREFIXES.includes(prefix));
  assert.deepEqual(missing, [], `add these cache prefixes to ADMIN_CONTENT_CACHE_PREFIXES: ${missing.join(', ')}`);
});
