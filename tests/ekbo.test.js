/* 8 Ekip panosu · 9 Sabah brifingi · 4 Belge okuyucu (kurgusal; sahte room / mcp / sample) — node ekbo.test.js <app.html> */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const APP=path.resolve(process.argv[2]||'../out55.html');let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x).slice(0,600):''))}};
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:1300,height:950}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{localStorage.setItem('ia-arastiran','Kurgu Ercan');window.__calls=[];window.__samples=[];window.__pres=null;let H=null;
    const other={peer:'p2',by:null,isMe:false,sameTab:false,kind:'viewer',guest:false,presence:{ad:'Kurgu Yakup',pid:'pA',i:0,dosya:'KURGU BİR'},updatedAt:Date.now()};
    const room={presence:async o=>{window.__pres=o;const me={peer:'p1',by:null,isMe:true,sameTab:true,kind:'viewer',guest:false,presence:o,updatedAt:Date.now()};if(H)H({peers:[me,other],joined:[],left:[],updated:[]})},onPeers:(h)=>{H=h;return()=>{}},peers:()=>[]};
    const mcp={callTool:async(s,t,i)=>{window.__calls.push({s,t,i});return {payload:{id:'m'+window.__calls.length}}}};
    const TXT='Firma Bilgileri\nUnvan\nOKUNAN KURGU LİMİTED ŞİRKETİ\nKuruluş Tarihi\n01-02-2005\nFirma Durumu\nAktif\nMERSİS No\n0555555555500055\nVergi Dairesi / No\nÖRNEK VERGİ DAİRESİ / 5555555555\nYetkililer\nFirmanın yetkilisi bulunmamaktadır.';
    const sample=async(inp,o)=>{window.__samples.push({n:(o&&o.images||[]).length,p:String(inp).slice(0,40)});return {text:TXT}};sample.limits=async()=>({images:{maxCount:4,maxBytes:5e6,mediaTypes:['image/png']}});
    window.claude={use:async n=>n==='room'?room:n==='mcp'?mcp:n==='sample'?sample:null}});
  await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(1200);
  await p.evaluate(async()=>{const row=i=>({i,ad:i?'KURGU İKİ':'KURGU BİR',kimlik:'1000000000'+i,sirket:false,m:'',m2:'',gib:'',anapara:null,toplam:10,not:'',kef:[],x:{}});
    await Store.savePortfolio('pA',{name:'A',importedAt:'2026-11-01T10:00:00Z',count:2},[row(0),row(1)]);
    for(const i of [0,1]){const pr=newPerson({ad:row(i).ad,kimlik:row(i).kimlik,rol:'Borçlu'});pr.src=emptySrc();pr.src.gib={s:'var',n:'Faal'};pr.gibData={vkn:row(i).kimlik,vd:'X',durum:'FAAL'};await Store.saveResearch({pid:'pA',idx:i,durum:'devam',sonuc:'',updatedAt:new Date().toISOString(),persons:[pr],companies:[]})}});
  await p.reload();await p.waitForTimeout(1500);await p.evaluate(async()=>{document.querySelectorAll('.modal-bg').forEach(x=>x.remove());await openPortfolio('pA');showScreen('dosyalar');select(0);S.tab='kisi';renderCard(true)});await p.waitForTimeout(700);
  /* --- 8 · Ekip --- */
  let r=await p.evaluate(()=>({bar:(document.getElementById('ekBar')||{}).innerText||'',pres:window.__pres,tag:[...document.querySelectorAll('#list [data-i="0"] .ek-tag')].map(x=>x.textContent)}));
  ok(r.pres&&r.pres.ad==='Kurgu Ercan'&&r.pres.pid==='pA'&&r.pres.i===0,'Açık föy ve araştırıcı adı canlı yayınlanıyor',r.pres);
  ok(/kimse üstlenmedi/.test(r.bar)&&/Şu an bakıyor: .*Kurgu Yakup/.test(r.bar),'Föy üstünde: “Üstüme al” ve “Şu an bakıyor: Kurgu Yakup”',r.bar);
  await p.click('#ekBar [data-ek="take"]');await p.waitForTimeout(300);
  r=await p.evaluate(()=>({bar:document.getElementById('ekBar').innerText,c:ekClaimOf('pA',0),tag:[...document.querySelectorAll('#list [data-i="0"] .ek-tag')].map(x=>x.textContent),log:(getR(0).log||[]).map(l=>l.m).filter(m=>/üstlen/.test(m))}));
  ok(r.c&&r.c.ad==='Kurgu Ercan'&&/Bu dosya sizde/.test(r.bar)&&r.tag.includes('✋ siz')&&r.log.length===1,'“Üstüme al”: kayıt, föy çubuğu, listede ✋ etiketi, işlem kaydı',r);
  await p.evaluate(()=>ekSetClaim('pA',1,{ad:'Kurgu Yakup',pid:'pA',i:1,dosya:'KURGU İKİ',t:Date.now()-3600e3}));await p.evaluate(()=>{select(1);renderCard(true)});await p.waitForTimeout(300);
  r=await p.evaluate(()=>document.getElementById('ekBar').innerText);ok(/Kurgu Yakup.*üstlendi/.test(r)&&/Devral/.test(r),'Başkasının üstlendiği dosyada uyarı ve “Devral”',r);
  await p.click('#ekBar [data-ek="force"]');await p.click('#ekBar [data-ek="force2"]');await p.waitForTimeout(300);
  r=await p.evaluate(()=>ekClaimOf('pA',1).ad);ok(r==='Kurgu Ercan','Onaylı devralma çalışıyor',r);
  r=await p.evaluate(async()=>{await agCycle('test');showScreen('mts');MTS.tab='ag';AG.view.m='ekip';renderMts();await new Promise(r=>setTimeout(r,200));return (document.getElementById('ekBox')||{}).textContent||''});
  ok(/Şu an kim nerede/.test(r)&&/Kurgu Yakup/.test(r)&&/Üstlenilen dosyalar\s*2/.test(r)&&/Bugün kim ne yaptı/.test(r)&&/Kurgu Ercan/.test(r),'Ajan Merkezi › 👥 Ekip: çevrimiçiler, üstlenilenler, bugünkü işlemler',r.slice(0,400));
  /* --- 9 · Sabah brifingi --- */
  r=await p.evaluate(async()=>{GM.cfg={on:true,since:0};await gmSaveCfg();const a=await brSend(true);const n1=window.__calls.length;const b=await brSend(false);const c=await brSend(false);return {a,b,c,n1,n2:window.__calls.length,call:window.__calls[0]}});
  ok(r.a.ok&&r.n1===1&&r.call.t==='send_message'&&r.call.i.to.length===2&&/sabah brifingi/.test(r.call.i.subject)&&/Hacze çıkılabilir/.test(r.call.i.htmlBody),'Sabah brifingi iki alıcıya tek e-posta olarak gitti',r.call&&r.call.i.subject);
  ok(r.n2===1&&r.b.skip&&r.c.skip,'Aynı gün ikinci kez gönderilmiyor',{b:r.b,c:r.c});
  r=await p.evaluate(()=>{AG.view.m='mail';renderMts();return (document.getElementById('gmBox')||{}).innerText||''});ok(/Sabah brifingi/.test(r)&&/Şimdi gönder/.test(r)&&/Kapat/.test(r),'E-posta kuyruğu ekranında brifing aç/kapat ve “Şimdi gönder”',r.slice(0,200));
  /* --- 4 · Belge okuyucu --- */
  await p.evaluate(()=>{showScreen('dosyalar');select(0);S.tab='kisi';renderCard(true)});await p.waitForTimeout(300);
  await p.evaluate(()=>{const pn=[...document.querySelectorAll('.pt-pane')].find(x=>x.querySelector('[data-s="mersis"]'));if(pn){const t=document.querySelector('.pt-tab[data-ptab="'+pn.dataset.pt+'"]');if(t)t.click()}});await p.waitForTimeout(200);
  await p.click('.ent [data-s="mersis"] [data-act="mme-paste"]');await p.waitForTimeout(300);
  ok(!!await p.$('.modal [data-bo="shots"]'),'MERSİS penceresinde “🤖 Görselden oku” düğmesi');
  await p.evaluate(async()=>{const c=document.createElement('canvas');c.width=300;c.height=200;c.getContext('2d').fillRect(0,0,10,10);const blob=await new Promise(r=>c.toBlob(r,'image/png'));const dt=new DataTransfer();dt.items.add(new File([blob],'s.png',{type:'image/png'}));document.querySelector('#mmeShot').dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}))});
  await p.waitForFunction(()=>!document.querySelector('#mmeOk').hidden,null,{timeout:10000});
  const n0=await p.evaluate(()=>cur().companies.length);
  await p.click('.modal [data-bo="shots"]');await p.waitForFunction(()=>/OKUNAN KURGU/.test(document.querySelector('#mmeTx').value),null,{timeout:10000});
  r=await p.evaluate(()=>({s:window.__samples,n:cur().companies.length,st:document.querySelector('.bo-st').textContent}));
  ok(r.s.length===1&&r.s[0].n===1&&r.n===0+r.n&&/kontrol edin/.test(r.st),'Claude ekran görüntüsünü okudu, metin kutuya yazıldı; henüz kaydedilmedi',r);
  ok(await p.evaluate(n0=>cur().companies.length===n0,n0),'Kaydet’e basmadan şirket eklenmedi');
  await p.click('.modal [data-m="ok"]');await p.waitForTimeout(500);
  r=await p.evaluate(()=>cur().companies.map(c=>({u:c.unvan,ms:c.mersis,vkn:c.vkn,yy:c.yetkiliYok})));
  ok(r.some(c=>c.u==='OKUNAN KURGU LİMİTED ŞİRKETİ'&&c.ms==='0555555555500055'&&c.vkn==='5555555555'&&c.yy),'Kaydet’le okunan şirket föye işlendi',r);
  /* levha penceresinde de var */
  await p.evaluate(()=>lvPaste(S.sel,cur().persons[0].id));await p.waitForTimeout(300);ok(!!await p.$('.modal [data-bo="file"]'),'Levha penceresinde “Görüntü / PDF seç ve oku”');
  await p.setViewportSize({width:390,height:844});await p.waitForTimeout(300);ok(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'Telefonda taşma yok');
  ok(!errs.length,'Sayfa hatası yok',errs);console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
