// Derlenmiş index.html'e ana ekrana ekleme (PWA) etiketlerini ekler.
// Kullanım: node tools/inject-pwa.mjs <dizin> [alt-yol]   (örn. docs /Depodepo1)
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2] ?? 'dist';
const base = (process.argv[3] ?? '').replace(/\/$/, '');
const tags = [
  '<meta name="theme-color" content="#080B0A" />',
  '<meta name="color-scheme" content="dark" />',
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
  '<meta name="apple-mobile-web-app-title" content="BOOKFLIX" />',
  '<meta name="mobile-web-app-capable" content="yes" />',
  `<link rel="manifest" href="${base}/manifest.webmanifest" />`,
  `<link rel="apple-touch-icon" href="${base}/icons/apple-touch-icon.png" />`,
  `<link rel="icon" type="image/png" sizes="192x192" href="${base}/icons/icon-192.png" />`,
  '<style>html,body{background:#080B0A}</style>',
].join('\n    ');

for (const name of ['index.html', '404.html']) {
  const file = path.join(dir, name);
  if (!fs.existsSync(file)) continue;
  let html = fs.readFileSync(file, 'utf8');
  if (html.includes('apple-mobile-web-app-capable')) continue; // zaten eklenmiş
  html = html.replace(/<meta charset="utf-8"\s*\/?>/i, (m) => `${m}\n    ${tags}`);
  html = html.replace('<html lang="en">', '<html lang="tr">');
  fs.writeFileSync(file, html);
  console.log('PWA etiketleri eklendi:', file);
}
