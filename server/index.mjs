import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OfficeModel } from './model.mjs';

const files = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/office.js': ['office.js', 'text/javascript; charset=utf-8']
};
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../public');
const model = new OfficeModel();
const clients = new Set();
const port = Number(process.env.PORT || 3333);
const host = process.env.HOST || '127.0.0.1';
const token = process.env.OFFICE_TOKEN || '';

function send(res, code, object) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(object));
}

function publish() {
  const data = 'event: snapshot\ndata: ' + JSON.stringify(model.snapshot()) + '\n\n';
  for (const res of clients) {
    try { res.write(data); } catch { clients.delete(res); }
  }
}

function originAllowed(req) {
  if (!req.headers.origin) return true;
  try {
    const origin = new URL(req.headers.origin);
    return (origin.hostname === 'localhost' || origin.hostname === '127.0.0.1') &&
      (origin.port === String(port) || (origin.port === '' && port === 80));
  } catch { return false; }
}

function postAuthorized(req) {
  if (!originAllowed(req)) return false;
  if (token && req.headers.authorization !== 'Bearer ' + token) return false;
  return true;
}

async function readJson(req) {
  let total = 0;
  const chunks = [];
  for await (const chunk of req) {
    total += chunk.length;
    if (total > 16384) {
      const error = new Error('Request too large');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export const server = createServer(async (req, res) => {
  const pathname = new URL(req.url || '/', 'http://localhost').pathname;
  try {
    if (req.method === 'GET' && pathname === '/api/health') {
      return send(res, 200, { ok: true, app: 'GPT Pixel Office' });
    }
    if (req.method === 'GET' && pathname === '/api/state') return send(res, 200, model.snapshot());
    if (req.method === 'GET' && pathname === '/api/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no'
      });
      res.write('retry: 2000\n\n');
      clients.add(res);
      res.write('event: snapshot\ndata: ' + JSON.stringify(model.snapshot()) + '\n\n');
      req.on('close', () => clients.delete(res));
      return;
    }
    if (req.method === 'POST' && (pathname === '/api/events' || pathname === '/api/reset')) {
      if (!postAuthorized(req)) return send(res, 403, { error: 'Forbidden origin or token' });
      if (pathname === '/api/reset') {
        model.reset();
        publish();
        return send(res, 200, { ok: true });
      }
      const event = model.ingest(await readJson(req));
      publish();
      return send(res, 202, { ok: true, id: event.id });
    }
    if (req.method === 'GET' && files[pathname]) {
      const [filename, mime] = files[pathname];
      const contents = await readFile(resolve(root, filename));
      res.writeHead(200, {
        'Content-Type': mime,
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff'
      });
      return res.end(contents);
    }
    return send(res, 404, { error: 'Not found' });
  } catch (error) {
    const status = error.status || ((error instanceof SyntaxError || error instanceof TypeError) ? 400 : 500);
    return send(res, status, { error: status === 500 ? 'Internal server error' : error.message });
  }
});

const heartbeat = setInterval(() => {
  for (const res of clients) {
    try { res.write(': ping\n\n'); } catch { clients.delete(res); }
  }
}, 25000);
heartbeat.unref();

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  server.listen(port, host, () => console.log('GPT Pixel Office → http://' + host + ':' + port));
}
