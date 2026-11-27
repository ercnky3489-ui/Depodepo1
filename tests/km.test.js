/* Faz 6 · Komuta merkezi + Yönetici ajan — kurgusal veri, sahte veritabanı. node km.test.js <app.html> */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const APP=path.resolve(process.argv[2]||'../out55.html');let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x).slice(0,700):''))}};
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));const U='http://127.0.0.1:'+srv.address().port+'/';
  const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1400,height:950}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  const lib=f=>fs.readFileSync(path.join(__dirname,'node_modules',f));
  await ctx.route(/cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\./,r=>{const u=r.request().url();if(/jspdf/.test(u))return r.fulfill({status:200,contentType:'application/javascript',body:lib('jspdf/dist/jspdf.umd.min.js')});if(/html2canvas/.test(u))return r.fulfill({status:200,contentType:'application/javascript',body:lib('html2canvas/dist/html2canvas.min.js')});if(/xlsx/.test(u))return r.fulfill({status:200,contentType:'application/javascript',body:lib('xlsx/dist/xlsx.full.min.js')});return r.abort()});
  await p.addInitScript({path:path.join(__dirname,'fakedb.js')});
  await p.addInitScript(()=>{localStorage.setItem('ia-arastiran','Kurgu Ercan');window.__saved=[];window.__sample=null;const base=window.claude.use;window.claude={use:async n=>n==='sample'?window.__sample:base(n)}});
  await p.goto(U);await p.waitForTimeout(1800);
  await p.evaluate(async()=>{const rows=[0,1,2].map(i=>({i,ad:'KURGU BORÇLU '+i,kimlik:'3000000000'+i,sirket:false,m:'',kef:i===0?[{ad:'KURGU KEFİL',kimlik:'30000000099'}]:[],x:{}}));await Store.savePortfolio('pK',{name:'Kurgu Devran',importedAt:'2026-11-01T10:00:00Z',count:3},rows);
    const P=(i,o)=>Object.assign({id:'p'+i,ad:'KURGU BORÇLU '+i,kimlik:'3000000000'+i,rol:'Borçlu',adres:'',levhalar:[],telefonlar:[],src:{}},o);
    await Store.saveResearch({pid:'pK',idx:0,durum:'devam',persons:[P(0,{src:{gib:{s:'var',n:''}},gibData:{vkn:'1',vd:'X',durum:'FAAL'}}),{id:'k0',ad:'KURGU KEFİL',kimlik:'30000000099',rol:'Kefil',src:{},levhalar:[],telefonlar:[]}],companies:[],updatedAt:'2026-11-20T10:00:00Z'});
    await Store.saveResearch({pid:'pK',idx:1,durum:'aciz',persons:[P(1,{src:{gib:{s:'var',n:''},sgk:{s:'yok',n:''}},gibData:{vkn:'2',vd:'X',durum:'FAAL'}})],companies:[],updatedAt:'2026-11-20T10:00:00Z'});
    await Store.saveResearch({pid:'pK',idx:2,durum:'',persons:[P(2,{})],companies:[],updatedAt:'2026-11-20T10:00:00Z'})});
  await p.waitForTimeout(1200);await p.evaluate(()=>{document.querySelectorAll('.modal-bg').forEach(x=>x.remove());window.saveFile=async(n,d,m)=>{window.__saved.push({n,size:(d&&(d.byteLength||d.length))||0,m})}});
  await p.evaluate(async()=>{await openPortfolio('pK');showScreen('mts');MTS.tab='ag';renderMts()});await p.waitForTimeout(500);
  await p.evaluate(()=>agCycle('test'));try{await p.waitForFunction(()=>!AG.busy&&AG.ev&&AG.ev.size>=3,null,{timeout:60000})}catch(e){console.log(await p.evaluate(()=>({busy:!!AG.busy,ev:AG.ev&&AG.ev.size,veri:AG.st&&AG.st.ag.veri,pfs:(S.portfolios||[]).map(x=>x.id)})));throw e}
  let r=await p.evaluate(()=>({tab:AG_MODS.some(m=>m[0]==='komuta'),def:!!AG_K.yonetici,hq:AO_DEPS.find(d=>d.k==='hq').ag.join()}));
  ok(r.tab&&r.def&&r.hq==='yonetici','Ajan Merkezi’nde “🧭 Komuta” sekmesi; Yönetici ajan tanımlı ve ofiste yönetici masasında',r);
  await p.evaluate(()=>{AG.view.m='komuta';renderMts()});await p.waitForSelector('#kmCmd');
  await p.fill('#kmCmd','Kurgu Devran portföyündeki bütün derdest icra dosyalarını incele. Vergi kayıtlarını ve SGK bağlantılarını araştır. Kefilleri dosya bazında değerlendir. Sonuçları Excel ve PDF olarak hazırla.');
  await p.click('[data-km="plan"]');await p.waitForFunction(()=>KM.draft,null,{timeout:15000});await p.waitForTimeout(200);
  r=await p.evaluate(()=>({pid:KM.draft.pid,durum:KM.draft.durum,by:KM.draft.by,acts:KM.draft.steps.map(s=>s.act),warn:!!document.querySelector('.km-warn'),st:AG.st.ag.yonetici.s,n:(document.querySelector('.km-draft .ag-note:nth-of-type(2)')||{}).textContent}));
  ok(r.pid==='pK'&&r.durum==='aktif','Komuttan portföy (Kurgu Devran) ve kapsam (derdest) çıkarıldı',r);
  ok(['tara','gib','sgk','iliski','eksik','celiski','excel','pdf'].every(a=>r.acts.includes(a))&&r.acts[0]==='tara'&&r.acts.at(-1)==='pdf','Görev planı: tarama → GİB/SGK/ilişki → eksik + çelişki → Excel/PDF',r.acts);
  ok(r.by==='kural'&&r.warn,'Claude kullanılamayınca kural tabanlı plan kuruldu ve bu açıkça yazıyor',r);
  ok(r.st==='onay','Yönetici ajan durumu: onay bekliyor (ofiste görünür)',r.st);
  ok(await p.evaluate(()=>/2 dosya/.test(document.querySelector('.km-draft').textContent)&&/Veri ajanı/.test(document.querySelector('.km-draft').textContent)),'Tahmini iş akışı gösteriliyor (aciz hariç 2 dosya, çalışacak ajanlar)');
  /* planı düzenle */
  await p.evaluate(()=>{const i=KM.draft.steps.findIndex(s=>s.act==='levha');const c=document.querySelector(`[data-km-on="${i}"]`);c.click()});await p.waitForTimeout(100);
  await p.selectOption('[data-km-add]','osint');await p.waitForTimeout(100);
  r=await p.evaluate(()=>({acts:KM.draft.steps.map(s=>s.act+(s.on?'':'-')),}));ok(r.acts.includes('levha-')&&r.acts.includes('osint'),'Plan başlamadan düzenlenebiliyor (adım kapat / ekle)',r.acts);
  await p.click('[data-km="gonder"]');await p.waitForFunction(()=>KM.plans.length===1,null,{timeout:10000});await p.waitForTimeout(300);
  r=await p.evaluate(()=>{const d=KM.plans[0];const db=[...__fakeDb.store.keys()].filter(k=>k.startsWith('ao_tasks/t_'));return {st:d.status,kind:d.kind,steps:d.plan.steps.map(s=>s.act+':'+s.status),db,ran:d.plan.steps.some(s=>s.status!=='QUEUED')}});
  ok(r.st==='WAITING_FOR_APPROVAL'&&r.kind==='plan'&&r.db.length===1&&!r.ran&&!r.steps.some(s=>s.startsWith('levha')),'“Onaya gönder”: plan veritabanına kaydedildi, onay bekliyor, hiçbir adım çalışmadı',r);
  /* mevcut Onay bekleyenler */
  await p.evaluate(()=>{AG.view.m='onay';renderMts()});await p.waitForTimeout(300);
  r=await p.evaluate(()=>{const b=document.querySelector('.ag-body');return {old:/Bulgu yayılımı/.test(b.textContent)&&/İsim benzerliği/.test(b.textContent),plan:!!b.querySelector('.km-card [data-km="ok"]'),badge:(document.querySelector('[data-ag-m="onay"] .ag-n')||{}).textContent}});
  ok(r.old&&r.plan,'Plan mevcut “Onay bekleyenler” bölümünde; mevcut yayılım / isim bölümleri aynen duruyor',r);ok(r.badge==='1','Onay bekleyenler sayacı planı da sayıyor',r.badge);
  await p.click('.km-card [data-km="ok"]');await p.waitForFunction(()=>KM.plans[0]&&['COMPLETED','NEEDS_REVIEW','FAILED'].includes(KM.plans[0].status),null,{timeout:90000});await p.waitForTimeout(300);
  r=await p.evaluate(()=>{const d=KM.plans[0];return {st:d.status,appr:d.approval,steps:d.plan.steps.map(s=>[s.act,s.status,s.note]),res:d.result,rows:(d.rows||[]).length,ag:AG.st.ag.yonetici.s,tasks:[...AG.tasks.values()].filter(t=>t.ag==='yonetici'&&t.s==='acik').map(t=>t.txt),cel:(d.res&&d.res.celiski||[]).map(c=>c.w)}});
  ok(r.appr&&r.appr.ok&&r.appr.by==='Kurgu Ercan','Onay bilgisi (kim, ne zaman) görevde saklanıyor',r.appr);
  ok(r.steps.every(s=>['COMPLETED','NEEDS_REVIEW'].includes(s[1])),'Adımların hepsi uzman ajanlarca yürütüldü',r.steps);
  ok(r.rows===2&&/2 dosya/.test(r.res),'Kapsam derdest: aciz dosya hariç 2 dosya işlendi',{rows:r.rows,res:r.res});
  const st=k=>(r.steps.find(s=>s[0]===k)||[])[2]||'';
  ok(/olumlu 1/.test(st('gib'))&&/sorgulanmadı/.test(st('sgk'))&&/1 kefil/.test(st('iliski')),'Adım sonuçları gerçek kayıtlardan (GİB olumlu 1, SGK sorgulanmadı, 1 kefil)',{gib:st('gib'),sgk:st('sgk'),il:st('iliski')});
  ok(r.tasks.length>=1&&r.tasks.every(t=>/Eksik sorgu/.test(t)),'Eksik sorgular için mevcut Görevler’e görev açıldı',r.tasks);
  /* aciz dosya kapsam dışı olduğundan çelişki çıkmamalı; tüm dosyalarla tekrar */
  ok(r.st==='COMPLETED'&&r.ag==='tamam','Plan tamamlandı; Yönetici ajan durumu güncellendi',{st:r.st,ag:r.ag});
  await p.evaluate(()=>{AG.view.m='komuta';renderMts()});await p.waitForTimeout(300);
  await p.click('.km-card [data-km="xlsx"]');await p.waitForTimeout(800);await p.click('.km-card [data-km="pdf"]');await p.waitForFunction(()=>__saved.length>=2,null,{timeout:30000});
  r=await p.evaluate(()=>__saved.map(x=>[x.n,x.size>500]));ok(r.length===2&&/_komut_.*\.xlsx$/.test(r[0][0])&&/_komut_.*\.pdf$/.test(r[1][0])&&r.every(x=>x[1]),'Rapor merkezi: Excel ve PDF raporu üretiliyor (indirme kullanıcıya soruluyor)',r);
  /* Claude ile plan (sahte sample) — geçersiz adım/portföy temizlenir */
  await p.evaluate(()=>{window.__sample={json:async(prompt)=>{window.__prompt=prompt;return {pid:'yok-boyle',durum:'all',tur:'kisi',acts:['mersis','sil_hepsini','excel'],ozet:'Şirket ortaklıkları incelenecek.'}}}});
  await p.fill('#kmCmd','Bütün dosyalarda yalnız kişilerin şirket ortaklıklarına bak, Excel ver');await p.click('[data-km="plan"]');await p.waitForFunction(()=>KM.draft&&KM.draft.by==='claude',null,{timeout:15000});
  r=await p.evaluate(()=>({pid:KM.draft.pid,durum:KM.draft.durum,tur:KM.draft.tur,acts:KM.draft.steps.map(s=>s.act),oz:KM.draft.ozet,pr:/Kurgu Devran/.test(window.__prompt)&&/Komut:/.test(window.__prompt)}));
  ok(r.pr&&r.acts.join()==='tara,mersis,excel'&&r.pid===null&&r.durum==='all'&&r.tur==='kisi'&&/ortaklık/.test(r.oz),'Claude planı doğrulanıyor: bilinmeyen adım ve portföy atılıyor, tarama başa ekleniyor',r);
  await p.click('[data-km="gonder"]');await p.waitForTimeout(300);ok(await p.evaluate(()=>KM.plans.length===1&&!!KM.draft),'Portföy seçilmeden plan onaya gönderilemiyor');
  await p.selectOption('[data-km-f="pid"]','pK');await p.click('[data-km="gonder"]');await p.waitForFunction(()=>KM.plans.length===2,null,{timeout:10000});
  const id2=await p.evaluate(()=>KM.plans[0].id);await p.click(`.km-card[data-km-id="${id2}"] [data-km="iptal"]`);await p.waitForTimeout(500);
  r=await p.evaluate(id=>{const d=KM.plans.find(x=>x.id===id);return {st:d.status,ran:d.plan.steps.some(s=>s.status!=='QUEUED')}},id2);ok(r.st==='CANCELLED'&&!r.ran,'Onay bekleyen plan iptal edilebiliyor; iptal edilen plan çalışmıyor',r);
  ok(await p.evaluate(()=>aoMetric('yonetici')===0&&!!AO_SCOPE.yonetici),'Ofiste yönetici masası onay bekleyen plan sayısını gösteriyor; yetki kapsamı tanımlı');
  /* sayfa yenilenince planlar duruyor */
  await p.evaluate(()=>{KM.loaded=false;KM.plans=[];AOT.mem.clear();AG.view.m='komuta';renderMts()});await p.waitForFunction(()=>KM.loaded,null,{timeout:10000});
  r=await p.evaluate(()=>KM.plans.map(d=>d.status).sort());ok(r.join()==='CANCELLED,COMPLETED','Plan kayıtları veritabanından yeniden okunuyor (rapor merkezi kalıcı)',r);
  ok(!errs.length,'Sayfa hatası yok',errs);console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
