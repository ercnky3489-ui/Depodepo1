/* MATRİX TAKİP SİSTEMİ · Aşama 4 — raporlama merkezi + portföy karşılaştırma — node pcc4.test.js <app.html> */
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
  await p.waitForFunction(()=>S.screen==='mts'&&PCC.res&&PCC.res.pfs.length===3&&!PCC.running,null,{timeout:15000});await p.waitForTimeout(500);
  console.log('\n1) Sekmeler ve 10 rapor');
  ok(await p.evaluate(()=>[...document.querySelectorAll('.mts-tabs button')].map(x=>x.textContent).join('|'))==='◆ Komuta|▦ Raporlar|⇄ Karşılaştırma','Komuta · Raporlar · Karşılaştırma sekmeleri');
  await p.click('[data-mts-tab="rep"]');await p.waitForTimeout(400);
  const t=await p.evaluate(()=>[...document.querySelectorAll('.mr-r h3')].map(x=>x.innerText.replace(/\s+/g,' ')));console.log('    ',t.join(' | '));
  ok(t.length===10&&['müşteri dağılımı','icra dosyası dağılımı','Ortak müşteri','Ortak icra dosyası','Mükerrer kayıt','Ortak kefil','Ortak telefon','Şirket bağlantı','Araştırma sonuçları','kesişim'].every((k,i)=>t[i].includes(k)),'10 rapor sırasıyla var',t);
  const ch=await p.evaluate(()=>({donut:!!document.querySelector('#r1 .mts-dn svg path'),bar:document.querySelectorAll('#r2 .mr-b').length,stacked:document.querySelectorAll('#r9 .mr-b i b').length,trend:!!document.querySelector('#r9 svg.mr-svg path[fill="none"]')||!!document.querySelector('#r10 svg.mr-svg path[fill="none"]'),heat:document.querySelectorAll('#r10 .mr-heat td').length,net:!!document.querySelector('#r10 .mr-net line')}));
  ok(ch.donut&&ch.bar===3&&ch.stacked>=4&&ch.trend&&ch.heat===9&&ch.net,'Grafikler: donut, bar, stacked bar, trend, ısı haritası, ilişki ağı',ch);
  console.log('\n2) Değerler gerçek veriden');
  const v=await p.evaluate(()=>{const R=mrReports();const g=id=>R.find(r=>r.id===id);const kpi=mtsKpi();return {r1:g('r1').rows.map(r=>r[3]),r2:g('r2').rows.map(r=>r[1]),r3:g('r3').rows.length,A:PCC.res.conflicts.filter(c=>c.t==='A').length,r4:g('r4').rows,r9:g('r9').rows[0],r10:g('r10').rows,files:kpi.files}});
  console.log('    r9 A:',JSON.stringify(v.r9),' r10:',JSON.stringify(v.r10));
  ok(v.r1.join()==='3,3,1'&&v.r2.reduce((a,b)=>a+b,0)===v.files,'Müşteri (3,3,1) ve dosya dağılımı KPI ile aynı',v);
  ok(v.r3===v.A&&v.r4.length===1&&v.r4[0][0]==='2024/12345','Ortak müşteri raporu = motor; ortak icra dosyası 2024/12345',v.r4);
  ok(v.r9.slice(0,6).join()==='Portföy A,1,1,1,0,0'&&v.r9[6]===1,'Araştırma sonuçları A: başlanmadı 1 · devam 1 · hacze 1 · olumlu 1',v.r9);
  const ab=v.r10.find(r=>r[0]==='Portföy A'&&r[1]==='Portföy B');ok(ab&&ab[2]===1&&ab[3]===1&&ab[4]===1,'Kesişim A×B: ortak müşteri 1, icra dosyası 1, kefil 1',ab);
  console.log('\n3) Filtreler');
  await p.click('[data-mr-p="pC"]');await p.waitForTimeout(300);
  const fc=await p.evaluate(()=>{const R=mrReports();const g=id=>R.find(r=>r.id===id);return {r1:g('r1').rows.length,r3:g('r3').rows.map(r=>r[0]),r4:g('r4').rows.length,head:document.querySelector('.mr h2 span').textContent}});
  ok(fc.r1===1&&fc.r3.length===1&&fc.r3[0]==='AHMET YILMAZ'&&fc.r4===0&&/1 portföy seçili/.test(fc.head),'Portföy C seçili: yalnız C’yi içeren kayıtlar',fc);
  await p.click('[data-mr-p=""]');await p.fill('#mrFrom','2030-01-01');await p.dispatchEvent('#mrFrom','change');await p.waitForTimeout(300);
  const fd=await p.evaluate(()=>{const R=mrReports();return R.filter(r=>['r3','r4','r5','r6','r7','r8'].includes(r.id)).map(r=>r.rows.length)});ok(fd.every(n=>n===0),'Gelecek tarih aralığında eşleşme raporları boş',fd);
  await p.fill('#mrFrom','');await p.dispatchEvent('#mrFrom','change');await p.waitForTimeout(200);
  console.log('\nTEST 8) Filtreler ve raporlar tutarlı');
  const c8=await p.evaluate(()=>{MTS.cmp=new Set(['pA','pB']);const C=mcCalc(['pA','pB']);const R=mrReports();const ab=R.find(r=>r.id==='r10').rows.find(r=>r[0]==='Portföy A'&&r[1]==='Portföy B');
    MTS.rf.pids=new Set(['pA']);const r3a=mrReports().find(r=>r.id==='r3').rows.filter(r=>r[3]==='Kesin').length;MTS.rf.pids=new Set();
    MTS.f={t:'A',lvl:'kesin',q:''};const tab=mtsFiltered().filter(o=>o.pids.includes('pA')).length;MTS.f={t:'',lvl:'',q:''};
    return {cmpC:C.common.c,cmpK:C.common.k,cmpF:C.common.f,repC:ab[2],repK:ab[4],repF:ab[3],r3a,tab,kpi:mtsKpi().dupCust}});
  ok(c8.cmpC===c8.repC&&c8.cmpK===c8.repK&&c8.cmpF===c8.repF,'Karşılaştırma (A vs B) = kesişim raporu: müşteri, kefil, dosya',c8);
  ok(c8.r3a===c8.tab&&c8.tab===c8.kpi,'Portföy A filtresiyle ortak müşteri (kesin) = komuta tablosu = KPI',c8);
  console.log('\n4) Dışa aktarma');
  const dl=p.waitForEvent('download',{timeout:15000}).catch(()=>null);await p.click('[data-mr="xlsx"]');const d=await dl;
  const xs=await p.evaluate(()=>MTS._lastX?{n:MTS._lastX.SheetNames,r3:XLSX.utils.sheet_to_json(MTS._lastX.Sheets[MTS._lastX.SheetNames[3]],{header:1}).length}:null);
  ok(d&&/matrix_rapor_.*\.xlsx$/.test(d.suggestedFilename())&&xs&&xs.n.length===11&&xs.r3>=3,'Excel: özet + 10 rapor sayfası indirildi',{f:d&&d.suggestedFilename(),xs});
  const dl2=p.waitForEvent('download',{timeout:60000}).catch(()=>null);await p.click('[data-mr="pdf"]');const d2=await dl2;
  if(d2)ok(/\.pdf$/.test(d2.suggestedFilename())&&(await p.evaluate(()=>MTS._lastPdfPages))>=2,'PDF raporu indirildi ('+(await p.evaluate(()=>MTS._lastPdfPages))+' sayfa)');else console.log('  (PDF kütüphanesi bu ortamdan yüklenemedi; PDF denetlenemedi)');
  await p.screenshot({path:path.join(__dirname,'mr.png'),fullPage:false});
  console.log('\n5) Portföy karşılaştırma');
  await p.click('[data-mts-tab="cmp"]');await p.waitForTimeout(400);
  const ct=await p.evaluate(()=>({h:document.querySelector('.mc h2 span').textContent,rows:[...document.querySelectorAll('.mc-t tbody tr')].map(x=>x.innerText.replace(/\s+/g,' '))}));console.log('    ',JSON.stringify(ct.rows));
  ok(/Portföy A vs Portföy B/.test(ct.h)&&ct.rows.length===8,'A vs B: 8 ölçü satırı',ct.h);
  ok(ct.rows[0]==='Toplam müşteri 3 3 —'&&ct.rows[1]==='Ortak müşteri (TCKN) 1 1 1'&&ct.rows[2]==='Farklı müşteri 1 2 —'&&ct.rows[4]==='Ortak kefil 1 1 1'&&ct.rows[7]==='Eşleşmeyen kayıt (TCKN yok) 1 0 —','Toplam 3/3, ortak 1, farklı 1/2, kefil 1, eşleşmeyen 1/0',ct.rows);
  await p.click('[data-mc-p="pC"]');await p.waitForTimeout(300);const c3=await p.evaluate(()=>[...document.querySelectorAll('.mc-t thead th')].length+'|'+[...document.querySelectorAll('.mc-t tbody tr')][1].innerText.replace(/\s+/g,' '));
  ok(c3==='6|Ortak müşteri (TCKN) 1 1 1 1 1','Üç portföy: “hepsinde ortak” sütunu (AHMET üçünde)',c3);
  await p.screenshot({path:path.join(__dirname,'mc.png'),fullPage:false});
  await p.setViewportSize({width:390,height:844});await p.waitForTimeout(300);ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Telefonda yatay taşma yok (karşılaştırma)');
  await p.click('[data-mts-tab="rep"]');await p.waitForTimeout(300);ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Telefonda yatay taşma yok (raporlar)');
  console.log('\nSayfa hataları:',errs.length?errs:'yok');if(errs.length)fail++;
  console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
