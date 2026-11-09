import test from 'node:test';
import assert from 'node:assert/strict';
import { server } from '../server/index.mjs';

test('HTTP API, static dashboard and origin protections', async t => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port;

  const health = await fetch(base + '/api/health').then(r => r.json());
  assert.equal(health.ok, true);
  const page = await fetch(base + '/');
  assert.equal(page.status, 200);
  assert.match(await page.text(), /GPT PIXEL OFFICE/);
  const javascript = await fetch(base + '/app.js');
  assert.equal(javascript.status, 200);
  assert.match(javascript.headers.get('content-type'), /javascript/);

  for(const [route,match] of [['/mini.html',/Little Pixel Office/],['/mini.js',/createCozyWorld/],
    ['/mini.css',/scene-stage/],['/mini-scene.js',/renderCozyScene/]]){
    const resp=await fetch(base+route);
    assert.equal(resp.status,200,route+' should be served');
    assert.match(await resp.text(),match);
  }

  for(const [route,needle] of [
    ['/engine/atlas.js',/ATLAS_FORMAT/],
    ['/engine/timing.js',/advanceFixedClock/],
    ['/engine/character-animation.js',/chooseCharacterAnimation/],
    ['/art-preview.html',/G1 Art Lab/],
    ['/art-preview.css',/\.palette/],
    ['/art-preview.js',/loadAtlas/]
  ]) {
    const asset=await fetch(base+route);
    assert.equal(asset.status,200,route);
    assert.match(await asset.text(),needle);
  }
  const previewHTML=await fetch(base+'/art-preview.html').then(r=>r.text());
  assert.match(previewHTML,/Content-Security-Policy/);
  assert.doesNotMatch(previewHTML,/<style>/);

  const atlas = await fetch(base + '/assets/generated/cat-demo.json');
  assert.equal(atlas.status, 200);
  assert.match(atlas.headers.get('content-type'), /json/);
  const manifest = await atlas.json();
  assert.equal(manifest.format, 'gpcl-atlas/v1');
  const png = await fetch(base + '/assets/generated/cat-demo.png');
  assert.equal(png.status, 200);
  assert.equal(png.headers.get('content-type'), 'image/png');
  const palette = await fetch(base + '/assets/palettes/dusk.json');
  assert.equal(palette.status, 200);
  const paletteJSON = await palette.json();
  assert.equal(paletteJSON.format,'gpcl-palette/v1');
  const invalidAsset = await fetch(base + '/assets/generated/private.aseprite.json');
  assert.equal(invalidAsset.status, 404);
  const missingAsset = await fetch(base + '/assets/generated/unknown.png');
  assert.equal(missingAsset.status, 404);

  for (const name of ['mimi','nori','pico','luna']) {
    const metadata = await fetch(base+'/assets/generated/character-'+name+'.json');
    assert.equal(metadata.status,200,'G2 atlas '+name);
    const decoded=await metadata.json();
    assert.equal(decoded.frames.length,66);
    assert.equal(Object.keys(decoded.animations).length,12);
    const sprite=await fetch(base+'/assets/generated/character-'+name+'.png');
    assert.equal(sprite.status,200,'G2 RGBA png '+name);
    assert.equal(sprite.headers.get('content-type'),'image/png');
    const signature=Buffer.from(await sprite.arrayBuffer()).subarray(0,8);
    assert.equal(signature.toString('hex'),'89504e470d0a1a0a');
  }
  assert.match(previewHTML,/G2 Character Animation Showcase/);

  const accepted = await fetch(base + '/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: 'http-test', type:'task.started', label:'HTTP test' })
  });
  assert.equal(accepted.status, 202);
  const snapshot = await fetch(base + '/api/state').then(r => r.json());
  assert.equal(snapshot.sessions[0].id, 'http-test');

  const blocked = await fetch(base + '/api/events', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', Origin:'https://untrusted.example' },
    body: JSON.stringify({ type:'task.started' })
  });
  assert.equal(blocked.status, 403);

  const invalid = await fetch(base + '/api/events', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ type:'unknown' })
  });
  assert.equal(invalid.status, 400);
});
