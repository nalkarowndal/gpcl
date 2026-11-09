import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('browser extension ships only ChatGPT-scoped content scripts and local events', async () => {
  const manifest = JSON.parse(await readFile(new URL('../extensions/chatgpt-browser/manifest.json', import.meta.url),'utf8'));
  assert.equal(manifest.manifest_version,3);
  assert.ok(manifest.content_scripts[0].matches.includes('https://chatgpt.com/*'));
  assert.ok(!manifest.permissions.includes('webRequest'));
  assert.ok(!manifest.permissions.includes('cookies'));
  const contents = await readFile(new URL('../extensions/chatgpt-browser/content.js', import.meta.url),'utf8');
  assert.ok(contents.includes('MutationObserver'));
  assert.ok(!contents.includes('fetch('));
  assert.ok(!contents.includes('document.cookie'));
});
