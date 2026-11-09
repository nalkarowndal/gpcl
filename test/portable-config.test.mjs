import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('desktop is a single-file portable exe target, not an installer', async () => {
  const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
  assert.equal(pkg.main,'desktop/main.cjs');
  assert.ok(pkg.scripts['build:portable'].includes('portable'));
  assert.equal(pkg.build.win.target[0].target,'portable');
  assert.match(pkg.build.portable.artifactName,/\.exe$/);
  assert.equal(pkg.build.asar,false);
});

test('portable Electron window uses secure isolated renderer and local server', async () => {
  const file=await readFile(new URL('../desktop/main.cjs',import.meta.url),'utf8');
  assert.match(file,/nodeIntegration: false/);
  assert.match(file,/contextIsolation: true/);
  assert.match(file,/sandbox: true/);
  assert.match(file,/127\.0\.0\.1/);
  assert.match(file,/startOfficeService/);
  assert.match(file,/requestSingleInstanceLock/);
});
