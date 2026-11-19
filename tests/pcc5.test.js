/* MATRİX TAKİP SİSTEMİ · Aşama 5 — gelişmiş filtre, kayıtlı filtre, ajan, 100.000 müşteri yük testi — node pcc5.test.js <app.html> */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const APP=path.resolve(process.argv[2]||'../out37.html');
let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x).slice(0,500):''))}};
const T1='11111111110',T2='22222222220',T3='33333333330',TK='44444444440',T9='99999999990';
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});const p=await ctx.newPage();
  /* dış CDN’ler test ortamında kapalı: aynı sürümlerin yerel kopyaları */
  const LOC={'xlsx.full.min.js':'node_modules/xlsx/dist/xlsx.full.min.js','html2canvas.min.js':'node_modules/html2canvas/dist/html2canvas.min.js','jspdf.umd.min.js':'node_modules/jspdf/dist/jspdf.umd.min.js'};
  await ctx.route(/cdnjs\.cloudflare\.com/,route=>{const f=Object.keys(LOC).find(k=>route.request().url().endsWith(k));if(f)return route.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync(path.join(__dirname,LOC[f]))});return route.abort()});const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{localStorage.setItem('ia-arastiran','Test Kullanıcı')});
  const U='http://127.0.0.1:'+srv.address().port+'/';
  /* önce veri: üç portföy (Aşama 1 testindeki senaryo) */
  await p.goto(U);await p.waitForTimeout(1200);
  await p.evaluate(async({T1,T2,T3,TK,T9})=>{const row=(i,ad,kimlik,o)=>Object.assign({i,ad,kimlik,sirket:false,m:'',m2:'',gib:'',anapara:null,toplam:10000*(i+1),not:'',kef:[],x:{}},o||{});
    const mk=async(pid,name,rows,res)=>{await Store.savePortfolio(pid,{name,alacakli:name+' VYŞ',importedAt:'2026-11-0'+(pid==='pA'?1:pid==='pB'?2:3)+'T10:00:00Z',count:rows.length},rows);for(const R of res)await Store.saveResearch(Object.assign({pid,durum:'',sonuc:'',persons:[],companies:[],updatedAt:new Date().toISOString()},R))};
    const P=o=>newPerson(o);
    await mk('pA','Portföy A',[row(0,'AHMET YILMAZ',T1,{m:'100'}),row(1,'AYŞE KARA',T2),row(2,'MEHMET DEMİR','')],[
      {idx:0,durum:'devam',icraDaire:'İstanbul 5. İcra Dairesi',esasNo:'2024/12345',persons:[P({ad:'AHMET YILMAZ',kimlik:T1,rol:'Borçlu',telefonlar:[{id:'a',tel:'0532 111 22 33'}]}),P({ad:'MEHMET YILMAZ',kimlik:TK,rol:'Kefil'})]},
      {idx:1,durum:'hacze',sonuc:'Tespit var',persons:[P({ad:'AYŞE KARA',kimlik:T2,rol:'Borçlu'})]}]);
    await mk('pB','Portföy B',[row(0,'AHMET YILMAZ',T1),row(1,'ALİ VURAL',T3),row(2,'MEHMET DEMİR',T9)],[
      {idx:0,icraDaire:'İSTANBUL 5. İCRA DAİRESİ',esasNo:'2024/12345',persons:[P({ad:'AHMET YILMAZ',kimlik:T1,rol:'Borçlu'})]},
      {idx:1,durum:'aciz',persons:[P({ad:'ALİ VURAL',kimlik:T3,rol:'Borçlu'}),P({ad:'MEHMET YILMAZ',kimlik:TK,rol:'Kefil'}),P({ad:'AYŞE KARA',kimlik:T2,rol:'Hane',yakinlik:'Eş'})]}]);
    await mk('pC','Portföy C',[row(0,'AHMET YILMAZ',T1,{m:'500'})],[])},{T1,T2,T3,TK,T9});
  await p.reload();await p.waitForTimeout(3500);await p.evaluate(()=>document.querySelectorAll('.modal-bg').forEach(x=>x.remove()));
  /* önce veri: üç portföy (Aşama 1 testindeki senaryo) */
  await p.goto(U);await p.waitForTimeout(1200);
  await p.evaluate(async({T1,T2,T3,TK,T9})=>{const row=(i,ad,kimlik,o)=>Object.assign({i,ad,kimlik,sirket:false,m:'',m2:'',gib:'',anapara:null,toplam:10000*(i+1),not:'',kef:[],x:{}},o||{});
    const mk=async(pid,name,rows,res)=>{await Store.savePortfolio(pid,{name,alacakli:name+' VYŞ',importedAt:'2026-11-0'+(pid==='pA'?1:pid==='pB'?2:3)+'T10:00:00Z',count:rows.length},rows);for(const R of res)await Store.saveResearch(Object.assign({pid,durum:'',sonuc:'',persons:[],companies:[],updatedAt:new Date().toISOString()},R))};
    const P=o=>newPerson(o);
    await mk('pA','Portföy A',[row(0,'AHMET YILMAZ',T1,{m:'100'}),row(1,'AYŞE KARA',T2),row(2,'MEHMET DEMİR','')],[
      {idx:0,durum:'devam',icraDaire:'İstanbul 5. İcra Dairesi',esasNo:'2024/12345',persons:[P({ad:'AHMET YILMAZ',kimlik:T1,rol:'Borçlu',telefonlar:[{id:'a',tel:'0532 111 22 33'}]}),P({ad:'MEHMET YILMAZ',kimlik:TK,rol:'Kefil'})]},
      {idx:1,durum:'hacze',sonuc:'Tespit var',persons:[P({ad:'AYŞE KARA',kimlik:T2,rol:'Borçlu'})]}]);
    await mk('pB','Portföy B',[row(0,'AHMET YILMAZ',T1),row(1,'ALİ VURAL',T3),row(2,'MEHMET DEMİR',T9)],[
      {idx:0,icraDaire:'İSTANBUL 5. İCRA DAİRESİ',esasNo:'2024/12345',persons:[P({ad:'AHMET YILMAZ',kimlik:T1,rol:'Borçlu'})]},
      {idx:1,durum:'aciz',persons:[P({ad:'ALİ VURAL',kimlik:T3,rol:'Borçlu'}),P({ad:'MEHMET YILMAZ',kimlik:TK,rol:'Kefil'}),P({ad:'AYŞE KARA',kimlik:T2,rol:'Hane',yakinlik:'Eş'})]}]);
    await mk('pC','Portföy C',[row(0,'AHMET YILMAZ',T1,{m:'500'})],[])},{T1,T2,T3,TK,T9});
  await p.reload();await p.waitForTimeout(3500);await p.evaluate(()=>document.querySelectorAll('.modal-bg').forEach(x=>x.remove()));
  /* önce veri: üç portföy (Aşama 1 testindeki senaryo) */
  await p.goto(U);await p.waitForTimeout(1200);
  await p.evaluate(async({T1,T2,T3,TK,T9})=>{const row=(i,ad,kimlik,o)=>Object.assign({i,ad,kimlik,sirket:false,m:'',m2:'',gib:'',anapara:null,toplam:10000*(i+1),not:'',kef:[],x:{}},o||{});
    const mk=async(pid,name,rows,res)=>{await Store.savePortfolio(pid,{name,alacakli:name+' VYŞ',importedAt:'2026-11-0'+(pid==='pA'?1:pid==='pB'?2:3)+'T10:00:00Z',count:rows.length},rows);for(const R of res)await Store.saveResearch(Object.assign({pid,durum:'',sonuc:'',persons:[],companies:[],updatedAt:new Date().toISOString()},R))};
    const P=o=>newPerson(o);
    await mk('pA','Portföy A',[row(0,'AHMET YILMAZ',T1,{m:'100'}),row(1,'AYŞE KARA',T2),row(2,'MEHMET DEMİR','')],[
      {idx:0,durum:'devam',icraDaire:'İstanbul 5. İcra Dairesi',esasNo:'2024/12345',persons:[P({ad:'AHMET YILMAZ',kimlik:T1,rol:'Borçlu',telefonlar:[{id:'a',tel:'0532 111 22 33'}]}),P({ad:'MEHMET YILMAZ',kimlik:TK,rol:'Kefil'})]},
      {idx:1,durum:'hacze',sonuc:'Tespit var',persons:[P({ad:'AYŞE KARA',kimlik:T2,rol:'Borçlu'})]}]);
    await mk('pB','Portföy B',[row(0,'AHMET YILMAZ',T1),row(1,'ALİ VURAL',T3),row(2,'MEHMET DEMİR',T9)],[
      {idx:0,icraDaire:'İSTANBUL 5. İCRA DAİRESİ',esasNo:'2024/12345',persons:[P({ad:'AHMET YILMAZ',kimlik:T1,rol:'Borçlu'})]},
      {idx:1,durum:'aciz',persons:[P({ad:'ALİ VURAL',kimlik:T3,rol:'Borçlu'}),P({ad:'MEHMET YILMAZ',kimlik:TK,rol:'Kefil'}),P({ad:'AYŞE KARA',kimlik:T2,rol:'Hane',yakinlik:'Eş'})]}]);
    await mk('pC','Portföy C',[row(0,'AHMET YILMAZ',T1,{m:'500'})],[])},{T1,T2,T3,TK,T9});
  await p.reload();await p.waitForTimeout(3500);await p.evaluate(()=>document.querySelectorAll('.modal-bg').forEach(x=>x.remove()));
  /* önce veri: üç portföy (Aşama 1 testindeki senaryo) */
  await p.goto(U);await p.waitForTimeout(1200);
  await p.evaluate(async({T1,T2,T3,TK,T9})=>{const row=(i,ad,kimlik,o)=>Object.assign({i,ad,kimlik,sirket:false,m:'',m2:'',gib:'',anapara:null,toplam:10000*(i+1),not:'',kef:[],x:{}},o||{});
    const mk=async(pid,name,rows,res)=>{await Store.savePortfolio(pid,{name,alacakli:name+' VYŞ',importedAt:'2026-11-0'+(pid==='pA'?1:pid==='pB'?2:3)+'T10:00:00Z',count:rows.length},rows);for(const R of res)await Store.saveResearch(Object.assign({pid,durum:'',sonuc:'',persons:[],companies:[],updatedAt:new Date().toISOString()},R))};
    const P=o=>newPerson(o);
    await mk('pA','Portföy A',[row(0,'AHMET YILMAZ',T1,{m:'100'}),row(1,'AYŞE KARA',T2),row(2,'MEHMET DEMİR','')],[
      {idx:0,durum:'devam',icraDaire:'İstanbul 5. İcra Dairesi',esasNo:'2024/12345',persons:[P({ad:'AHMET YILMAZ',kimlik:T1,rol:'Borçlu',telefonlar:[{id:'a',tel:'0532 111 22 33'}]}),P({ad:'MEHMET YILMAZ',kimlik:TK,rol:'Kefil'})]},
      {idx:1,durum:'hacze',sonuc:'Tespit var',persons:[P({ad:'AYŞE KARA',kimlik:T2,rol:'Borçlu'})]}]);
    await mk('pB','Portföy B',[row(0,'AHMET YILMAZ',T1),row(1,'ALİ VURAL',T3),row(2,'MEHMET DEMİR',T9)],[
      {idx:0,icraDaire:'İSTANBUL 5. İCRA DAİRESİ',esasNo:'2024/12345',persons:[P({ad:'AHMET YILMAZ',kimlik:T1,rol:'Borçlu'})]},
      {idx:1,durum:'aciz',persons:[P({ad:'ALİ VURAL',kimlik:T3,rol:'Borçlu'}),P({ad:'MEHMET YILMAZ',kimlik:TK,rol:'Kefil'}),P({ad:'AYŞE KARA',kimlik:T2,rol:'Hane',yakinlik:'Eş'})]}]);
    await mk('pC','Portföy C',[row(0,'AHMET YILMAZ',T1,{m:'500'})],[])},{T1,T2,T3,TK,T9});
  await p.reload();await p.waitForTimeout(3500);await p.evaluate(()=>document.querySelectorAll('.modal-bg').forEach(x=>x.remove()));
  await p.waitForFunction(()=>S.screen==='mts'&&PCC.res&&PCC.res.pfs.length===3&&!PCC.running,null,{timeout:15000});await p.waitForTimeout(500);
  const rows=()=>p.evaluate(()=>[...document.querySelectorAll('.mts-tbl .mts-tw tbody tr[data-mts-row]')].map(x=>x.querySelector('td b').textContent));
  const kp=()=>p.evaluate(()=>Object.fromEntries([...document.querySelectorAll('.mts-kpi')].map(x=>[x.dataset.mtsKpi,+x.querySelector('b').textContent.replace(/\D/g,'')])));
  const all=await rows();console.log('    tüm satırlar:',all.join(' | '));
  console.log('\n1) Gelişmiş filtre');
  await p.click('[data-gf="tog"]');await p.waitForSelector('.gf-b');ok(await p.evaluate(()=>document.querySelectorAll('.gf-b input,.gf-b select').length)===10,'Filtre paneli: tarih ×2, ad, TCKN, dosya no, seviye, araştırma durumu, kefil, şirket, filtre adı + portföy ve tür çipleri');
  await p.click('[data-gf-p="pC"]');await p.waitForTimeout(250);let r=await rows();let k=await kp();
  ok(k.pf===1&&k.files===1&&r.length===1&&r[0]==='AHMET YILMAZ','Portföy C: KPI (1 portföy, 1 dosya) ve tablo (AHMET) birlikte süzüldü',{k,r});
  await p.click('[data-gf-p="pA"]');await p.waitForTimeout(250);r=await rows();ok(r.length>1,'Çoklu portföy (A + C): daha çok satır',r);
  await p.click('[data-gf-t="E"]');await p.waitForTimeout(250);r=await rows();ok(r.length===1&&r[0]==='MEHMET YILMAZ','+ tür: Ortak kefil → kefil MEHMET YILMAZ satırı (A + C seçiliyken A’daki kefil)',r);
  await p.click('[data-gf="reset"]');await p.waitForTimeout(250);
  await p.fill('#gfQ','DEMİR');await p.waitForTimeout(600);r=await rows();ok(r.length===1&&r[0]==='MEHMET DEMİR','Müşteri adı: DEMİR',r);
  ok(await p.evaluate(()=>document.activeElement&&document.activeElement.id==='gfQ'),'Yazarken odak kutuda kalıyor');
  await p.fill('#gfQ','');await p.fill('#gfTc','4444');await p.waitForTimeout(600);r=await rows();ok(r.length===1&&r[0]==='MEHMET YILMAZ','TCKN parçası 4444 → kefil MEHMET YILMAZ',r);
  await p.fill('#gfTc','');await p.fill('#gfEsas','2024/12345');await p.waitForTimeout(600);r=await rows();ok(r.length===1&&r[0]==='AHMET YILMAZ','İcra dosya no 2024/12345',r);
  await p.fill('#gfEsas','');await p.waitForTimeout(500);
  await p.selectOption('#gfLvl','olasi');await p.waitForTimeout(250);ok(await p.evaluate(()=>mtsFiltered().every(o=>o.cs.some(c=>c.lvl==='olasi'))),'Seviye: olası');await p.selectOption('#gfLvl','');
  await p.selectOption('#gfDu','hacze');await p.waitForTimeout(250);r=await rows();ok(r.length===1&&r[0]==='AYŞE KARA','Araştırma durumu: Hacze çıkılabilir → AYŞE',r);await p.selectOption('#gfDu','*');
  await p.selectOption('#gfKef','var');await p.waitForTimeout(250);const kv=await rows();await p.selectOption('#gfKef','yok');await p.waitForTimeout(250);const ky=await rows();
  ok(kv.length&&ky.length&&kv.length+ky.length>=all.length&&!kv.some(x=>ky.includes(x)&&x!=='AHMET YILMAZ'),'Kefil var / yok ayrışıyor',{kv,ky});await p.selectOption('#gfKef','');
  await p.selectOption('#gfComp','var');await p.waitForTimeout(250);ok((await rows()).length===0,'Şirket bağlantısı var: bu veride 0');await p.selectOption('#gfComp','');
  console.log('\nTEST 8) Filtre her yerde aynı');
  await p.click('[data-gf-p="pA"]');await p.click('[data-gf-t="A"]');await p.waitForTimeout(300);
  const t8=await p.evaluate(()=>({tab:mtsFiltered().length,rep:mrReports().find(r=>r.id==='r3').rows.length,kpi:mtsKpi().dupCust,net:(MN.built=null,mnBuild(),MN.nodes.filter(n=>n.t!=='pf').length)}));
  ok(t8.tab===t8.rep&&t8.net===t8.rep&&t8.kpi===1,'Portföy A + ortak müşteri: tablo = rapor = harita; KPI 1',t8);
  console.log('\n2) Kayıtlı filtre');
  await p.fill('#gfName','A portföyü ortak müşteri');await p.click('[data-gf="save"]');await p.waitForTimeout(200);
  await p.click('[data-gf="reset"]');await p.waitForTimeout(200);ok(await p.evaluate(()=>gfActive()===0),'Temizlendi');
  await p.selectOption('#gfSaved','0');await p.waitForTimeout(300);ok(await p.evaluate(()=>GF.pids.has('pA')&&GF.types.has('A')&&gfActive()===2),'Kayıtlı filtre seçilince aynı kombinasyon geri geldi');
  await p.reload();await p.waitForTimeout(3000);await p.evaluate(()=>document.querySelectorAll('.modal-bg').forEach(x=>x.remove()));
  ok(await p.evaluate(()=>gfSaved().length===1&&gfSaved()[0].name==='A portföyü ortak müşteri'),'Kayıtlı filtre yeniden yüklemede duruyor');
  await p.waitForFunction(()=>PCC.res&&!PCC.running,null,{timeout:15000});await p.waitForTimeout(400);
  console.log('\n3) Ajan: onay kuyruğu ve raporlar');
  const q=await p.evaluate(()=>({ui:[...document.querySelectorAll('.ag-q li b')].map(x=>x.textContent),n:PCC.res.conflicts.filter(c=>c.durum==='onay-bekliyor').length}));
  ok(q.ui.length===q.n&&q.n>=2,'Onay kuyruğu: olası eşleşmeler ('+q.n+')',q);
  await p.click('.ag-q [data-ag-rv="ret"]');await p.waitForTimeout(400);ok(await p.evaluate(n=>document.querySelectorAll('.ag-q li [data-ag-rv]').length/2===n-1,q.n),'Reddedilen kuyruktan çıktı');
  const rp=await p.evaluate(()=>({reps:(PCC.state.reps||[]).map(x=>x.type),ui:document.querySelectorAll('[data-ag-rep]').length,d:!!PCCS._ls().d['rep_d_'+new Date().toISOString().slice(0,10)]}));
  ok(rp.reps.includes('Günlük')&&rp.reps.includes('Haftalık')&&rp.d&&rp.ui>=2,'Günlük ve haftalık ajan raporu oluşturuldu',rp);
  await p.click('[data-ag-rep][data-ty="Günlük"]');await p.waitForTimeout(400);ok(await p.evaluate(()=>MTS.tab==='rep'&&GF.from===new Date().toISOString().slice(0,10)),'“Raporu aç” → Raporlar sekmesi o günün tarihiyle');
  await p.click('[data-mts-tab="cmd"]');await p.waitForTimeout(200);await p.click('[data-gf="reset"]').catch(()=>{});
  console.log('\n4) Yeni eşleşme bildirimi');
  const bell0=await p.evaluate(()=>+((document.querySelector('.mts-bell b')||{}).textContent||0));
  await p.evaluate(async()=>{S.portfolios.push({id:'pE',name:'Portföy E',count:1,importedAt:new Date().toISOString()});await Store.savePortfolio('pE',{name:'Portföy E',count:1,importedAt:new Date().toISOString()},[{i:0,ad:'ALİ VURAL',kimlik:'33333333330',sirket:false,m:'',m2:'',gib:'',anapara:null,toplam:1,not:'',kef:[],x:{}}])});
  await p.waitForFunction(()=>PCC.state.runs.some(x=>x.why==='portföy yüklendi')&&!PCC.running&&!PCC.again,null,{timeout:15000});await p.waitForTimeout(400);
  const nw=await p.evaluate(()=>({run:PCC.state.runs[0],toast:[...document.querySelectorAll('#fxToasts .toast')].map(x=>x.textContent),bell:+((document.querySelector('.mts-bell b')||{}).textContent||0),feed:(document.querySelector('.mts-runs li')||{}).innerText}));
  ok(nw.run.yeni>=1&&nw.toast.some(x=>/yeni eşleşme/.test(x))&&nw.bell>bell0&&/yeni/.test(nw.feed),'Portföy E yüklenince: ajan çalıştı, bildirim, zil sayacı arttı',nw);
  console.log('\n5) Yük testi · 100.000 müşteri');
  const perf=await p.evaluate(async()=>{const pfs=[],facts={};const N=100000,P=4;for(let k=0;k<P;k++){const pid='L'+k;pfs.push({pid,name:'Yük '+k});facts[pid]=[]}
    for(let i=0;i<N;i++){const k=i%P;const pid='L'+k;const tc=String(10000000000+((i*7919)%85000));const ad='K'+(i%85000);const row=Math.floor(i/P);
      facts[pid].push(['c',tc,row,tc,ad,'B',{f:i%3?'İST '+(i%20)+'|2024/'+(i%60000):'',m:''}],['n',ad,row,tc,ad,'B',0]);if(i%5===0)facts[pid].push(['t','05'+String(320000000+(i*31)%400000).slice(0,9),row,tc,ad,'B',0]);if(i%7===0)facts[pid].push(['k',String(20000000000+(i%9000)),row,'',ad,'K',0]);if(i%3===0)facts[pid].push(['f','İST '+(i%20)+'|2024/'+(i%60000),row,tc,ad,'B',{tur:''}])}
    const nF=Object.values(facts).reduce((a,F)=>a+F.length,0);
    let t0=performance.now();const r=await pccComputeAsync({pfs:pfs.map(p=>({pid:p.pid})),facts});const tW=performance.now()-t0;
    const save={res:PCC.res,facts:PCC.facts,stats:PCC.stats};r.pfs=pfs;r.at=Date.now();r.conflicts.forEach(c=>{c.first=Date.now();c.durum=c.lvl==='olasi'?'onay-bekliyor':'tespit'});PCC.res=r;PCC.facts=facts;PCC.stats=Object.fromEntries(pfs.map(p=>[p.pid,{rows:25000,tc:21000,noTc:0,borc:0,borcN:0,ara:0,bek:25000,tamam:0,olumlu:0,last:'',trend:[0,0,0,0,0,0,0,0],du:{'':25000}}]));
    MTS.rows=null;MN.built=null;t0=performance.now();renderMts();const tR=performance.now()-t0;t0=performance.now();renderMts();const tR2=performance.now()-t0;
    GF.q='K123';t0=performance.now();renderMts();const tF=performance.now()-t0;GF.q='';
    const out={facts:nF,conf:r.conflicts.length,worker:Math.round(tW),render:Math.round(tR),render2:Math.round(tR2),filter:Math.round(tF),rowsShown:document.querySelectorAll('.mts-tbl .mts-tw tbody tr[data-mts-row]').length};
    PCC.res=save.res;PCC.facts=save.facts;PCC.stats=save.stats;MTS.rows=null;MN.built=null;renderMts();return out});
  console.log('    ',JSON.stringify(perf));
  ok(perf.worker<15000,'100.000 müşteri ('+perf.facts+' olgu, '+perf.conf+' çakışma) ayrı iş parçacığında '+perf.worker+' ms');
  ok(perf.render<4000&&perf.render2<1500&&perf.rowsShown===25,'Ekran ilk çizim '+perf.render+' ms, tekrar '+perf.render2+' ms; tablo sayfalı (25 satır)',perf);
  ok(perf.filter<4000,'Filtre uygulama '+perf.filter+' ms');
  console.log('\nSayfa hataları:',errs.length?errs:'yok');if(errs.length)fail++;
  console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
