/* Şifreli bulut yedeği (kurgusal veri, sahte db + sahte assets) — node yd.test.js <app.html> */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http'),crypto=require('crypto'),zlib=require('zlib');
const APP=path.resolve(process.argv[2]||'../out53.html');let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x).slice(0,600):''))}};
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1440,height:1000},acceptDownloads:true,timezoneId:'Europe/Istanbul'});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript({path:path.join(__dirname,'fakedb.js')});
  /* sahte assets: upload → bellekte; fetch('/_blob/id') → içerik */
  await p.addInitScript(()=>{const M=new Map();let n=0;window.__as=M;const as={upload:async(blob,o)=>{if(!(blob instanceof Blob)||!blob.size)throw Object.assign(new Error('bad'),{code:'invalid_request'});if(blob.size>20*1048576)throw Object.assign(new Error('big'),{code:'too_large'});
      const id=(++n).toString(16).padStart(32,'0');M.set(id,{t:await blob.text(),type:(o&&o.type)||blob.type});return {id,url:'/_blob/'+id,sizeBytes:blob.size,contentType:(o&&o.type)||blob.type}},
    list:async()=>({assets:[...M.keys()].map(id=>({id})),usage:{files:M.size}}),delete:async id=>({deleted:M.delete(id)})};
    const u0=window.claude.use;window.claude={use:async x=>x==='assets'?as:u0(x)};
    const f0=window.fetch.bind(window);window.fetch=async(u,o)=>{const m=String(u).match(/\/_blob\/([0-9a-f]{32})/);if(m){const a=M.get(m[1]);return a?new Response(a.t,{status:200,headers:{'content-type':a.type}}):new Response('',{status:404})}return f0(u,o)};
    localStorage.setItem('ia-arastiran','Test')});
  await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(1500);
  await p.evaluate(async()=>{const row=(i,ad,k)=>({i,ad,kimlik:k,sirket:false,m:'',m2:'',gib:'',anapara:null,toplam:1000,not:'',kef:[],x:{}});
    await Store.savePortfolio('pA',{name:'Portföy A',importedAt:'2026-11-01T10:00:00Z',count:2},[row(0,'KURGU BİR','10000000146'),row(1,'KURGU İKİ','20000000002')]);
    for(const i of [0,1]){const R=initResearch(row(i,i?'KURGU İKİ':'KURGU BİR',''));R.pid='pA';R.idx=i;ensureSrc(R);delete R._fresh;R.updatedAt='2026-11-20T10:00:00Z';await Store.saveResearch(JSON.parse(JSON.stringify(R)))}
    /* ekran görüntüsü: research dokümanı olmayan bir dosyaya da (medya dizini üzerinden yakalanmalı) */
    await Store.saveMedia('pA',0,{id:'m1',label:'GİZLİGÖRSEL',entId:'',dataUrl:'data:image/png;base64,AAAA',w:1,h:1,ts:1});
    await Store.saveMedia('pA',7,{id:'m2',label:'DİZİNGÖRSEL',entId:'',dataUrl:'data:image/png;base64,BBBB',w:1,h:1,ts:2})});
  await p.waitForTimeout(1800);/* medya dizini yazımı */
  await p.evaluate(()=>document.querySelectorAll('.modal-bg').forEach(x=>x.remove()));
  await p.evaluate(()=>{showScreen('mts');MTS.tab='ag';AG.view.m='yedek';renderMts()});await p.waitForTimeout(700);
  let t=await p.evaluate(()=>(document.getElementById('ydBox')||{}).innerText||'');
  ok(/bulut yedeği kapalı/i.test(t)&&/Yedek anahtarı oluştur/.test(t),'Başlangıçta bulut yedeği kapalı; “Yedek anahtarı oluştur” düğmesi var',t.slice(0,200));
  await p.click('[data-yd="key"]');await p.waitForTimeout(200);
  ok(await p.$eval('#ydOn',x=>x.disabled),'Özel anahtar indirilmeden etkinleştirilemiyor');
  const [dl]=await Promise.all([p.waitForEvent('download',{timeout:30000}),p.click('.modal [data-m="dl"]')]);const pemPath=path.join(__dirname,'yd_test_key.pem');await dl.saveAs(pemPath);
  const pem=fs.readFileSync(pemPath,'utf8');ok(/BEGIN PRIVATE KEY/.test(pem)&&/^icra-yedek-anahtari-[0-9a-f]{16}\.txt$/.test(dl.suggestedFilename()),'Özel anahtar .txt olarak indirildi (platform .pem’e izin vermiyor)',dl.suggestedFilename());
  await p.check('#ydSaved');await p.click('#ydOn');
  await p.waitForFunction(()=>YD.idx&&YD.idx.items.length===1&&!YD.busy,null,{timeout:30000});
  let r=await p.evaluate(async()=>{const k=await AGS.get('backup_key');const all=JSON.stringify([...window.__fakeDb.store.entries()]);return {k,priv:/PRIVATE KEY|"d":"/.test(all)||/pkcs8/.test(all),it:YD.idx.items[0],as:[...window.__as.values()].map(a=>a.t)}});
  ok(r.k&&r.k.pub&&r.k.kid&&!r.priv,'Veritabanına yalnız açık anahtar kaydedildi (özel anahtar yok)',{kid:r.k&&r.k.kid,priv:r.priv});
  ok(r.it.docs>=5&&r.it.media===2&&r.it.parts.length>=1&&r.it.why==='ilk yedek','İlk yedek alındı: portföy + kartlar + 2 ekran görüntüsü (dizindeki dahil)',r.it);
  const env=JSON.parse(r.as[0]);
  ok(env.app==='icra-yedek'&&env.alg==='RSA-OAEP-256+A256GCM'&&!r.as.some(x=>/KURGU|GİZLİGÖRSEL|10000000146/.test(x)),'Buluttaki dosya şifreli: ad, TCKN ve görsel etiketi düz metin olarak yok');
  /* Node ile bağımsız çözme (standart biçim: uygulama olmadan da açılabilir) */
  let nodeOk=false,nodeErr='';try{const raw=crypto.privateDecrypt({key:pem,padding:crypto.constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(env.ek,'base64'));
    const ct=Buffer.from(env.ct,'base64');const d=crypto.createDecipheriv('aes-256-gcm',raw,Buffer.from(env.iv,'base64'));d.setAuthTag(ct.subarray(ct.length-16));
    const pt=Buffer.concat([d.update(ct.subarray(0,ct.length-16)),d.final()]);const o=JSON.parse(zlib.gunzipSync(pt).toString('utf8'));nodeOk=!!(o.collections&&o.collections.research&&o.collections['media/pA__7/items'])}catch(e){nodeErr=e.message}
  ok(nodeOk,'Yedek, özel anahtarla Node/OpenSSL tarafında da çözülebiliyor (araç: tools/yedek-ac.js)',nodeErr);
  t=await p.evaluate(()=>(document.getElementById('ydBox')||{}).innerText||'');
  ok(/Şimdi bulut yedeği al/.test(t)&&/Bulut yedekleri\s*1/i.test(t.replace(/İ/g,'i'))&&/ 02:00\n/.test(t),'Yedek ekranı: son yedek, sonraki 02:00, yedek listesi',t.slice(0,300));
  /* uygulama içinde çözme */
  await p.click('#ydBox [data-yd="open"][data-set]');await p.waitForTimeout(200);await p.setInputFiles('#ydPem',pemPath);
  const [dl2]=await Promise.all([p.waitForEvent('download',{timeout:30000}),p.click('.modal [data-m="ok"]')]);const decPath=path.join(__dirname,'yd_test_dec.json');await dl2.saveAs(decPath);
  const dec=JSON.parse(fs.readFileSync(decPath,'utf8'));
  ok(dec.kind==='tam-yedek-acik'&&dec.collections['portfolios/pA/chunks']&&dec.collections.research.length===2&&dec.collections['media/pA__0/items'][0].d.label==='GİZLİGÖRSEL','“Yedeği aç”: özel anahtarla çözülüp tam veri .json indirildi',Object.keys(dec.collections||{}));
  /* yanlış anahtar */
  await p.evaluate(()=>document.querySelectorAll('.modal-bg').forEach(x=>x.remove()));
  const {privateKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048});const bad=path.join(__dirname,'yd_bad.pem');fs.writeFileSync(bad,privateKey.export({type:'pkcs8',format:'pem'}));
  await p.click('#ydBox [data-yd="open"][data-set]');await p.waitForTimeout(200);await p.setInputFiles('#ydPem',bad);await p.click('.modal [data-m="ok"]');await p.waitForTimeout(1500);
  t=await p.$eval('#ydOut',x=>x.textContent);ok(/anahtar.*uymuyor/.test(t),'Yanlış anahtarla açılmıyor, anlaşılır uyarı veriyor',t);
  await p.evaluate(()=>document.querySelectorAll('.modal-bg').forEach(x=>x.remove()));
  /* zamanlayıcı: aynı gün tekrar almaz; ertesi gece 02:00 geçince alır; eski yedek silinmez */
  r=await p.evaluate(async()=>{await ydTick();const a=YD.idx.items.length;const n0=AG.now;AG.now=()=>n0()+864e5;await ydTick();const b=YD.idx.items.length;const w=YD.idx.items[b-1].why;AG.now=n0;return {a,b,w,assets:window.__as.size,parts:YD.idx.items.reduce((s,x)=>s+x.parts.length,0)}});
  ok(r.a===1&&r.b===2&&/02:00/.test(r.w)&&r.assets===r.parts,'02:00 zamanlayıcı: aynı gece tekrar almıyor, ertesi gece alıyor; eski yedek silinmiyor',r);
  r=await p.evaluate(()=>{const x=agBackupCheck();return {note:x.note,open:[...AG.tasks.values()].filter(t=>t.ag==='yedek'&&t.st==='open').length}});
  ok(/son bulut yedeği/.test(r.note),'Yedek ajanı bulut yedeğini görüyor (sağlık notu)',r);
  /* silme yalnız onayla */
  await p.click('#ydBox [data-yd="del"]');await p.waitForTimeout(200);
  await p.click('.modal [data-m="no"]');await p.waitForTimeout(200);ok(await p.evaluate(()=>YD.idx.items.length)===2,'Sil → Vazgeç: hiçbir yedek silinmedi');
  r=await p.evaluate(async()=>{const s=await AGS.get('audit_head');return JSON.stringify(await agAuditLoad?await agAuditLoad():[]).match(/şifreli bulut yedeği alındı/g)});
  ok(r&&r.length>=2,'Her yedek değişmez denetim kaydına yazıldı',r&&r.length);
  await p.setViewportSize({width:390,height:844});await p.waitForTimeout(300);ok(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'Telefon genişliğinde taşma yok');
  console.log('\nSayfa hataları:',errs.length?errs.slice(0,5):'yok');ok(!errs.length,'Sayfa hatası yok',errs);
  [pemPath,bad,decPath].forEach(f=>{try{fs.unlinkSync(f)}catch(e){}});
  console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
