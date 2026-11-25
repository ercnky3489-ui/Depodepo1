/* İndirme: platformun izin listesi dışındaki uzantılar (.pem, .tsv) metin ise .txt olarak kaydedilir — node dl.test.js <app.html> */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const APP=path.resolve(process.argv[2]||'../out55.html');let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x).slice(0,500):''))}};
const OK=['gif','png','jpg','jpeg','webp','mp4','webm','mov','txt','json','md','docx','pptx','epub','csv','ttf','html','svg','pdf','xlsx','zip','fig'];
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(OK=>{window.__saved=[];const dl={save:async({filename,data})=>{const ext=(filename.match(/\.([a-z0-9]+)$/i)||[])[1]||'';if(!OK.includes(ext.toLowerCase()))throw Object.assign(new Error('extension .'+ext+' is not allowed'),{code:'invalid_request'});window.__saved.push(filename);return true}};
    window.claude={use:async n=>n==='downloads'?dl:null};localStorage.setItem('ia-arastiran','Test')},OK);
  await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(1500);
  const r=await p.evaluate(async()=>{const a=await saveFile('sorgu.tsv','x\ty','text/tab-separated-values');const k=await saveFile('icra-yedek-anahtari-abc.pem','-----BEGIN PRIVATE KEY-----','application/x-pem-file');const x=await saveFile('rapor.xlsx',new Uint8Array([1,2]),'application/octet-stream');return {a,k,x,saved:window.__saved}});
  ok(r.a&&r.saved.includes('sorgu.txt'),'.tsv → .txt olarak kaydedildi',r);
  ok(r.k&&r.saved.includes('icra-yedek-anahtari-abc.txt'),'.pem → .txt olarak kaydedildi (yedek anahtarı indirilebiliyor)',r);
  ok(r.x&&r.saved.includes('rapor.xlsx'),'İzinli uzantılar değişmedi',r);
  const src=fs.readFileSync(APP,'utf8');const bad=[...src.matchAll(/saveFile\([^;]{0,160}?\.([a-z]{2,5})['`]/g)].map(m=>m[1].toLowerCase()).filter(e=>!OK.includes(e)&&e!=='sheet');
  ok(bad.every(e=>e==='tsv'),'Kodda izinsiz uzantıyla kaydedilen başka dosya yok (tsv otomatik .txt’ye çevriliyor)',bad);
  ok(!errs.length,'Sayfa hatası yok',errs);console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
