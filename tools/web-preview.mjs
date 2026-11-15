#!/usr/bin/env node
// BOOKFLIX web önizleme sunucusu: `expo export -p web` çıktısını (dist/) sunar ve /sb/* isteklerini
// yerel Supabase API'sine (varsayılan http://127.0.0.1:54321) aktarır. Böylece uygulama ve API tek
// adresten açılır; önizleme başka bir cihazdaki tarayıcıda açılsa da çalışır.
//   npm run web:preview          (önce: npx supabase start, sonra npm run web:build)
import { createReadStream, existsSync, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const PORT = Number(process.env.PORT ?? 8080);
const DIST = path.resolve(process.env.DIST ?? 'dist');
const API = new URL(process.env.SUPABASE_API ?? 'http://127.0.0.1:54321');
// Edge Function'lar ayrı çalıştırılıyorsa (tools/functions-dev.ts) /functions/v1 oraya gider.
const FUNCTIONS = process.env.FUNCTIONS_API ? new URL(process.env.FUNCTIONS_API) : null;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.ico': 'image/x-icon', '.map': 'application/json', '.webmanifest': 'application/manifest+json' };

http.createServer((req, res) => {
  if (req.url.startsWith('/sb/')) {
    const target = FUNCTIONS && req.url.startsWith('/sb/functions/v1/') ? FUNCTIONS : API;
    const headers = { ...req.headers, host: target.host };
    const up = http.request({ hostname: target.hostname, port: target.port, path: req.url.slice(3), method: req.method, headers }, (r) => {
      res.writeHead(r.statusCode ?? 502, r.headers);
      r.pipe(res);
    });
    up.on('error', (e) => { res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' }); res.end('Supabase API yanıt vermiyor: ' + e.message); });
    req.pipe(up);
    return;
  }
  const clean = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.join(DIST, clean);
  if (!file.startsWith(DIST)) { res.writeHead(403); res.end(); return; }
  if (!existsSync(file) || statSync(file).isDirectory()) {
    const html = path.join(DIST, clean, 'index.html');
    file = existsSync(html) ? html : existsSync(file + '.html') ? file + '.html' : path.join(DIST, 'index.html');
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
  createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`BOOKFLIX önizleme: http://localhost:${PORT}  (API → ${API.origin})`));
