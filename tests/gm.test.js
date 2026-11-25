/* Gmail otomatik bildirim + Drive yedek kopyası (kurgusal veri, sahte db/assets/mcp) — node gm.test.js <app.html> */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const APP=path.resolve(process.argv[2]||'../out54.html');let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x).slice(0,600):''))}};
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1440,height:1000},acceptDownloads:true,timezoneId:'Europe/Istanbul'});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript({path:path.join(__dirname,'fakedb.js')});
  await p.addInitScript(()=>{const M=new Map();let n=0;window.__as=M;const as={upload:async(blob,o)=>{const id=(++n).toString(16).padStart(32,'0');M.set(id,{t:await blob.text(),type:o.type});return {id,url:'/_blob/'+id,sizeBytes:blob.size,contentType:o.type}},list:async()=>({assets:[],usage:{}}),delete:async id=>({deleted:M.delete(id)})};
    window.__calls=[];window.__fail=null;const mcp={callTool:async(s,t,i,o)=>{window.__calls.push({s,t,i,o});if(window.__fail){const e=Object.assign(new Error('x'),{code:window.__fail});throw e}
      if(t==='create_file')return {payload:{id:'drv'+window.__calls.length}};return {payload:{id:'msg'+window.__calls.length}}}};
    const u0=window.claude.use;window.claude={use:async x=>x==='assets'?as:x==='mcp'?mcp:u0(x)};localStorage.setItem('ia-arastiran','Test')});
  await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(1500);
  await p.evaluate(async()=>{const row=(i,ad)=>({i,ad,kimlik:'',sirket:false,m:'',m2:'',gib:'',anapara:null,toplam:1000,not:'',kef:[],x:{}});
    await Store.savePortfolio('pA',{name:'Portföy A',importedAt:'2026-11-01T10:00:00Z',count:3},[row(0,'KURGU BİR'),row(1,'KURGU İKİ'),row(2,'KURGU ÜÇ')]);
    document.querySelectorAll('.modal-bg').forEach(x=>x.remove());await agCycle('test');
    AG.mail.items['pA#0#hacze']={pid:'pA',i:0,ad:'KURGU BİR',du:'hacze',t:AG.now()-864e5,s:'mevcut'}});
  await p.evaluate(()=>{showScreen('mts');MTS.tab='ag';AG.view.m='mail';renderMts()});await p.waitForTimeout(400);
  let t=await p.$eval('#gmBox',x=>x.innerText);ok(/Otomatik e-posta kapalı/.test(t)&&/ercankaya@hotmail\.com\.tr/.test(t),'Başlangıçta kapalı; alıcı gösteriliyor');
  ok(await p.evaluate(()=>window.__calls.length)===0,'Kullanıcı etkinleştirmeden hiçbir e-posta gönderilmedi');
  await p.click('[data-gm="on"]');await p.waitForFunction(()=>GM.cfg&&GM.cfg.on&&!GM.busy);
  let c=await p.evaluate(()=>window.__calls);ok(c.length===1&&c[0].s==='Gmail'&&c[0].t==='send_message'&&c[0].i.to[0]==='ercankaya@hotmail.com.tr'&&/etkinleştirildi/.test(c[0].i.subject)&&c[0].o.cache===false,'Etkinleştir: sabit alıcıya deneme e-postası (önbelleksiz)',c[0]);
  /* yeni dosyalar kuyruğa girer → tek özet e-postası */
  await p.evaluate(async()=>{const now=AG.now()+1000;AG.mail.items['pA#1#hacze']={pid:'pA',i:1,ad:'KURGU İKİ',du:'hacze',t:now,s:'kuyruk'};AG.mail.items['pA#2#tamam']={pid:'pA',i:2,ad:'KURGU ÜÇ',du:'tamam',t:now,s:'kuyruk'};await gmAuto()});
  c=await p.evaluate(()=>({calls:window.__calls,st:Object.fromEntries(Object.entries(AG.mail.items).map(([k,v])=>[k,v.s]))}));
  ok(c.calls.length===2&&/KURGU İKİ/.test(c.calls[1].i.htmlBody)&&/KURGU ÜÇ/.test(c.calls[1].i.htmlBody)&&/2 dosya/.test(c.calls[1].i.subject),'Kuyruğa giren 2 dosya tek özet e-postasıyla gönderildi',c.calls[1]&&c.calls[1].i.subject);
  ok(c.st['pA#1#hacze']==='gonderildi'&&c.st['pA#2#tamam']==='gonderildi'&&c.st['pA#0#hacze']==='mevcut','Gönderilenler işaretlendi; ajan öncesi “mevcut” dosya gönderilmedi',c.st);
  await p.evaluate(()=>gmAuto());ok(await p.evaluate(()=>window.__calls.length)===2,'Aynı dosya ikinci kez gönderilmiyor');
  /* belirsiz sonuç: otomatik tekrar yok */
  await p.evaluate(async()=>{window.__fail='server_unavailable';AG.mail.items['pA#0#tamam']={pid:'pA',i:0,ad:'KURGU BİR',du:'tamam',t:AG.now()+2000,s:'kuyruk'};await gmAuto();await gmAuto()});
  c=await p.evaluate(()=>({n:window.__calls.length,s:AG.mail.items['pA#0#tamam'].s}));ok(c.n===3&&c.s==='belirsiz','Zaman aşımı: “sonucu belirsiz” işaretlendi, otomatik tekrar gönderilmedi',c);
  /* bağlantı düştü: durur */
  await p.evaluate(async()=>{window.__fail='needs_reauth';AG.mail.items['pA#1#tamam']={pid:'pA',i:1,ad:'KURGU İKİ',du:'tamam',t:AG.now()+3000,s:'kuyruk'};await gmAuto();await gmAuto();renderMts()});await p.waitForTimeout(200);
  c=await p.evaluate(()=>({n:window.__calls.length,p:GM.cfg.paused,t:document.getElementById('gmBox').innerText}));ok(c.n===4&&c.p==='needs_reauth'&&/yeniden bağlayın/.test(c.t),'Gmail bağlantısı düşünce gönderim duruyor ve ne yapılacağı yazıyor',c);
  await p.evaluate(()=>{window.__fail=null});await p.click('[data-gm="resume"]');await p.waitForTimeout(400);
  ok(await p.evaluate(()=>AG.mail.items['pA#1#tamam'].s)==='kuyruk'&&await p.evaluate(()=>!!AG.mail.items['pA#1#tamam'].err),'Hatalı kayıt kullanıcı “Tekrar gönder” diyene kadar bekliyor');
  await p.click('[data-gm="send"][data-id="pA#1#tamam"]');await p.waitForTimeout(400);ok(await p.evaluate(()=>AG.mail.items['pA#1#tamam'].s)==='gonderildi','“Tekrar gönder” ile gönderildi');
  const au=await p.evaluate(async()=>JSON.stringify(await agAuditLoad()).match(/e-posta gönderildi/g));ok(au&&au.length>=3,'Her gönderim denetim kaydına yazıldı',au&&au.length);
  /* Drive yedek kopyası */
  await p.evaluate(()=>{AG.view.m='yedek';renderMts()});await p.waitForTimeout(600);
  await p.evaluate(async()=>{await AGS.set('backup_key',{pub:await (async()=>{const kp=await crypto.subtle.generateKey({name:'RSA-OAEP',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['encrypt','decrypt']);return ydB64(await crypto.subtle.exportKey('spki',kp.publicKey))})(),kid:'testkid'});await ydLoad(true);ydPaint()});
  await p.waitForTimeout(200);await p.click('[data-gd="on"]');await p.waitForTimeout(400);
  c=await p.evaluate(()=>({cfg:GM.cfg,last:window.__calls[window.__calls.length-1]}));ok(c.cfg.drv&&c.cfg.drvFolder&&c.last.s==='Google Drive'&&c.last.i.contentMimeType==='application/vnd.google-apps.folder','Drive’da “İcra Yedekleri (şifreli)” klasörü oluşturuldu',c);
  await p.evaluate(()=>ydRun('elle'));c=await p.evaluate(()=>({it:YD.idx.items[YD.idx.items.length-1],up:window.__calls.filter(x=>x.s==='Google Drive'&&x.i.parentId)}));
  ok(c.it.drive===c.it.parts.length&&c.up.length===c.it.parts.length&&c.up[0].i.disableConversionToGoogleType&&/"app":"icra-yedek"/.test(c.up[0].i.textContent)&&!/KURGU/.test(c.up[0].i.textContent),'Yedek Drive’a şifreli hâliyle kopyalandı',{drive:c.it.drive,n:c.up.length});
  await p.evaluate(()=>{window.__fail='server_not_connected'});await p.evaluate(()=>ydRun('elle'));c=await p.evaluate(()=>YD.idx.items[YD.idx.items.length-1]);
  ok(c.parts.length>=1&&!c.drive&&c.warn.some(w=>/Drive/.test(w)),'Drive hatasında bulut yedeği yine alınıyor, uyarı yazılıyor',c.warn);
  await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{AG.view.m='mail';renderMts()});await p.waitForTimeout(300);ok(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'Telefon genişliğinde taşma yok');
  console.log('\nSayfa hataları:',errs.length?errs.slice(0,5):'yok');ok(!errs.length,'Sayfa hatası yok',errs);
  console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
