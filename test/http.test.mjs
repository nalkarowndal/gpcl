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
