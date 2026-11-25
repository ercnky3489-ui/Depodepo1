#!/usr/bin/env node
/* Şifreli bulut yedeğini uygulama olmadan açar.
   Kullanım: node tools/yedek-ac.js <ozel-anahtar.pem> <yedek-p1.json> [yedek-p2.json ...] > acik-yedek.json
   Biçim: RSA-OAEP (SHA-256) ile sarılmış AES-256-GCM anahtarı, gzip'li JSON. Özel anahtar yalnız okunur, hiçbir yere yazılmaz. */
const fs=require('fs'),crypto=require('crypto'),zlib=require('zlib');
const [pemF,...files]=process.argv.slice(2);
if(!pemF||!files.length){console.error('Kullanım: node tools/yedek-ac.js <ozel-anahtar.pem> <yedek-parçası.json>...');process.exit(1)}
const pem=fs.readFileSync(pemF,'utf8');const C={};let meta=null;
for(const f of files){const e=JSON.parse(fs.readFileSync(f,'utf8'));if(e.app!=='icra-yedek'){console.error(f+': şifreli yedek değil');process.exit(1)}
  let raw;try{raw=crypto.privateDecrypt({key:pem,padding:crypto.constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(e.ek,'base64'))}catch(_){console.error(f+': bu anahtarla açılamıyor (yedek anahtarı '+e.kid+')');process.exit(1)}
  const ct=Buffer.from(e.ct,'base64');const d=crypto.createDecipheriv('aes-256-gcm',raw,Buffer.from(e.iv,'base64'));d.setAuthTag(ct.subarray(ct.length-16));
  let pt=Buffer.concat([d.update(ct.subarray(0,ct.length-16)),d.final()]);if(e.z==='gzip')pt=zlib.gunzipSync(pt);
  const o=JSON.parse(pt.toString('utf8'));meta=meta||{set:o.set,created:o.created,parts:o.parts};for(const [p,a] of Object.entries(o.collections||{}))C[p]=(C[p]||[]).concat(a)}
process.stdout.write(JSON.stringify({app:'icra-arastirma',kind:'tam-yedek-acik',v:1,set:meta.set,created:meta.created,eksikParca:files.length<meta.parts,collections:C}));
console.error('Tamam: '+Object.values(C).reduce((s,a)=>s+a.length,0)+' kayıt'+(files.length<meta.parts?' · UYARI: '+meta.parts+' parçadan '+files.length+' tanesi verildi':''));
