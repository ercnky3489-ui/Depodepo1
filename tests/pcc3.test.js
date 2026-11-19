/* MATRİX TAKİP SİSTEMİ · Aşama 3 — etkileşimli ilişki haritası — node pcc3.test.js <app.html> */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const APP=path.resolve(process.argv[2]||'../out34.html');
let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x).slice(0,500):''))}};
const T1='11111111110',T2='22222222220',T3='33333333330',TK='44444444440',T9='99999999990';
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1440,height:1000}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
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
  await p.waitForFunction(()=>S.screen==='mts'&&PCC.res&&PCC.res.pfs.length===3&&!PCC.running,null,{timeout:15000});await p.waitForTimeout(600);
  console.log('\n1) Genel görünüm');
  const ov=await p.evaluate(()=>({pf:MN.nodes.filter(n=>n.t==='pf').map(n=>n.label),shared:MN.nodes.filter(n=>n.t!=='pf').length,cv:!!document.getElementById('mnCv'),perf:[...document.querySelectorAll('.mts-perf tbody tr')].map(x=>x.innerText.replace(/\s+/g,' '))}));
  ok(ov.cv&&ov.pf.length===3&&ov.shared>0,'Harita: 3 portföy düğümü ve aralarındaki ortak kayıtlar',ov);
  ok(ov.perf.length===3&&/Portföy A 67% 33% 33% \d/.test(ov.perf[0]),'Portföy performans raporu (A: araştırılan 67%, olumlu 33%, tamamlanan 33%)',ov.perf[0]);
  console.log('\n2) “İlişki” → müşteri merkezde');
  const ia=await p.evaluate(()=>mtsFiltered().findIndex(o=>o.tc==='11111111110'));await p.click(`.mts-tw tr[data-mts-row="${ia}"] [data-mts-a="rel"]`);await p.waitForTimeout(700);
  const g=await p.evaluate(()=>{const deg=n=>MN.edges.filter(e=>e.a===n||e.b===n).map(e=>(e.a===n?e.b:e.a).label).sort();const f=t=>MN.nodes.find(n=>n.t===t);const c=MN.nodes.find(n=>n.center);
    return {center:c&&c.label,cdeg:c&&deg(c),file:f('file')&&{l:f('file').label,deg:deg(f('file')),lvl:f('file').lvl},kef:f('kef')&&{l:f('kef').label,deg:deg(f('kef'))},head:(document.querySelector('.mn-card h2 span')||{}).textContent}});
  console.log('    ',JSON.stringify(g));
  ok(g.center==='AHMET YILMAZ'&&g.cdeg.join()==='Portföy A,Portföy B,Portföy C','Merkez AHMET YILMAZ; A, B, C portföylerine bağlı',g);
  ok(g.file&&/^2024\/12345/.test(g.file.l)&&g.file.deg.join()==='Portföy A,Portföy B'&&g.file.lvl==='olasi','İcra dosyası 2024/12345 tek düğüm, A ve B’ye bağlı (olası → kesikli)',g.file);
  ok(g.kef&&g.kef.l==='MEHMET YILMAZ'&&g.kef.deg.join()==='Portföy A,Portföy B','Kefil MEHMET YILMAZ tek düğüm, A ve B’ye bağlı',g.kef);
  ok(/merkez: AHMET YILMAZ/.test(g.head||''),'Başlıkta merkez müşteri yazıyor');
  console.log('\n3) Yakınlaştırma, kaydırma, düğüm taşıma');
  const cv=await p.$('#mnCv');const bb=await cv.boundingBox();
  const k0=await p.evaluate(()=>MN.k);await p.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2);await p.mouse.wheel(0,-300);await p.waitForTimeout(100);const k1=await p.evaluate(()=>MN.k);ok(k1>k0,'Tekerlekle yakınlaşıyor',{k0,k1});
  await p.click('[data-mn="out"]');const k2=await p.evaluate(()=>MN.k);ok(k2<k1,'“－” ile uzaklaşıyor',{k1,k2});
  const x0=await p.evaluate(()=>MN.x);await p.mouse.move(bb.x+10,bb.y+10);await p.mouse.down();await p.mouse.move(bb.x+90,bb.y+60,{steps:5});await p.mouse.up();const x1=await p.evaluate(()=>MN.x);ok(Math.abs(x1-x0-80)<2,'Zemini sürükleyince harita kayıyor',{x0,x1});
  const pos=await p.evaluate(()=>{const n=MN.nodes.find(n=>n.t==='kef');return {sx:n.x*MN.k+MN.x,sy:n.y*MN.k+MN.y,x:n.x,y:n.y}});
  await p.mouse.move(bb.x+pos.sx,bb.y+pos.sy);await p.mouse.down();await p.mouse.move(bb.x+pos.sx+40,bb.y+pos.sy+20,{steps:4});await p.mouse.up();
  const np=await p.evaluate(()=>{const n=MN.nodes.find(n=>n.t==='kef');return {x:n.x,y:n.y,k:MN.k}});ok(Math.abs((np.x-pos.x)*np.k-40)<2,'Düğüm sürüklenerek taşınıyor',{pos,np});
  console.log('\n4) Düğüme dokununca ayrıntı');
  const fp=await p.evaluate(()=>{const n=MN.nodes.find(n=>n.t==='file');return {sx:n.x*MN.k+MN.x,sy:n.y*MN.k+MN.y}});await p.mouse.click(bb.x+fp.sx,bb.y+fp.sy);await p.waitForTimeout(200);
  const pn=await p.evaluate(()=>document.getElementById('mnSide').innerText.replace(/\s+/g,' '));ok(/2024\/12345/.test(pn)&&/İcra dosyası/.test(pn)&&/Portföy A/.test(pn)&&/Portföy B/.test(pn),'Ayrıntı: dosya, türü, iki portföydeki kayıtlar',pn);
  console.log('\n5) Filtreler');
  await p.click('[data-mn-t="kef"]');const fk=await p.evaluate(()=>mnVisible(MN.nodes.find(n=>n.t==='kef')));ok(fk===false,'“Kefil” kapatılınca kefil düğümü gizleniyor');
  await p.click('[data-mn-p="pC"]');const fc=await p.evaluate(()=>mnVisible(MN.nodes.find(n=>n.t==='pf'&&n.pid==='pC')));ok(fc===false,'Portföy C kapatılınca C düğümü gizleniyor');
  await p.click('[data-mn-t="kef"]');await p.click('[data-mn-p="pC"]');
  ok(await p.evaluate(()=>{const c=MN.nodes.filter(n=>n.t==='pf').map(n=>mnColor(n));return new Set(c).size===3}),'Portföyler farklı renkte');
  await p.screenshot({path:path.join(__dirname,'mn.png'),clip:await p.evaluate(()=>{const r=document.querySelector('.mn-card').getBoundingClientRect();return {x:r.left,y:r.top,width:r.width,height:r.height}})});
  console.log('\n6) Ayrıntıdan dosyaya git; harita araması');
  await p.click('#mnSide [data-mts-go]');await p.waitForTimeout(1500);ok(await p.evaluate(()=>S.screen==='dosyalar'&&(S.debtors[S.sel]||{}).ad==='AHMET YILMAZ'),'Ayrıntıdaki kayda tıklayınca föy açıldı');
  await p.click('#bottomNav .bn[data-scr="mts"]');await p.waitForTimeout(700);await p.fill('#mnQ','ALİ');await p.waitForTimeout(200);await p.click('#mnQRes [data-mn-c]');await p.waitForTimeout(600);
  ok(await p.evaluate(()=>{const c=MN.nodes.find(n=>n.center);return c&&c.label==='ALİ VURAL'}),'Harita aramasıyla ALİ VURAL merkeze alındı');
  await p.click('[data-mn="all"]');await p.waitForTimeout(500);ok(await p.evaluate(()=>!MN.center&&MN.nodes.filter(n=>n.t==='pf').length===3),'“Genel görünüm” ile tüm portföylere dönüldü');
  console.log('\n7) Telefon: iki parmakla yakınlaştırma yolu ve taşma');
  await p.setViewportSize({width:390,height:844});await p.waitForTimeout(400);ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Telefonda yatay taşma yok');
  const tz=await p.evaluate(()=>{const k=MN.k;MN.pinch=100;const cv=MN.cv;MN.ptr.set(1,{x:100,y:100});MN.ptr.set(2,{x:200,y:100});cv.onpointermove({pointerId:2,clientX:cv.getBoundingClientRect().left+250,clientY:cv.getBoundingClientRect().top+100});MN.ptr.clear();MN.pinch=0;return MN.k>k});
  ok(tz,'İki parmak açılınca yakınlaşıyor');
  console.log('\nSayfa hataları:',errs.length?errs:'yok');if(errs.length)fail++;
  console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
