/* Yayılım: bir föyde sorgulanmış GİB sonucu (faal / potansiyel / terk / kayıt yok) aynı TCKN'nin diğer föylerine öneri olarak gelir — kurgusal veri. node yaygib.test.js <app.html> */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const APP=path.resolve(process.argv[2]||'../out55.html');let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x).slice(0,900):''))}};
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:1300,height:950}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{localStorage.setItem('ia-arastiran','Kurgu Ercan');window.claude={use:async()=>null}});
  await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(1200);
  const T={terk:'10000000146',pot:'10000000210',faal:'10000000358',yok:'10000000420',oto:'10000000594',dolu:'10000000662'};
  await p.evaluate(async T=>{const row=(i,ad,tc,kef)=>({i,ad,kimlik:tc,sirket:false,m:'D'+i,m2:'',gib:'',anapara:null,toplam:10,not:'',kef:kef||[],x:{}});
    const P=(ad,tc,rol,g)=>{const p=newPerson({ad,kimlik:tc,rol});p.src=emptySrc();if(g)g(p);return p};
    const gib=(d)=>p=>{p.gibData={vkn:p.kimlik,vd:'ÖRNEK VD',durum:d};p.src.gib={s:'var',n:d}};
    await Store.savePortfolio('pI',{name:'Kurgu İstanbul',alacakli:'Kurgu Varlık',importedAt:'2026-11-01T10:00:00Z',count:2},[row(0,'KURGU KAYNAK',T.terk),row(1,'KURGU HEDEF',T.dolu)]);
    await Store.savePortfolio('pJ',{name:'Kurgu İstanbul E',alacakli:'Kurgu Varlık',importedAt:'2026-11-01T10:00:00Z',count:1},[row(0,'KURGU TEK',T.faal,[{ad:'KURGU TERK',kimlik:T.terk,rol:'Kefil'}])]);
    /* föy A: kaynak sonuçlar */
    await Store.saveResearch({pid:'pI',idx:0,durum:'devam',updatedAt:new Date().toISOString(),companies:[],persons:[P('KURGU TERK',T.terk,'Borçlu',gib('TERK')),P('KURGU POT',T.pot,'Kefil',gib('POTANSİYEL')),P('KURGU FAAL',T.faal,'Hane',gib('FAAL')),
      P('KURGU YOK',T.yok,'Kefil',p=>{p.src.gib={s:'yok',n:'Sorgulandı, kayıt yok'}}),P('KURGU OTO',T.oto,'Kefil',p=>{p.src.gib={s:'yok',n:'GİB kaydı yok → otomatik'}})]});
    /* föy B (aynı portföy): aynı kişiler sorgulanmamış; DOLU kişi zaten FAAL girilmiş (üzerine yazılmamalı) */
    await Store.saveResearch({pid:'pI',idx:1,durum:'devam',updatedAt:new Date().toISOString(),companies:[],persons:[P('KURGU HEDEF',T.dolu,'Borçlu'),P('KURGU TERK',T.terk,'Kefil'),P('KURGU POT',T.pot,'Kefil',gib('FAAL')),P('KURGU YOK',T.yok,'Hane'),P('KURGU OTO',T.oto,'Hane')]});
    /* diğer portföyde: FAAL kişi borçlu, TERK kişi sadece Excel kefil satırında (araştırma kartında yok) */
    await Store.saveResearch({pid:'pJ',idx:0,durum:'devam',updatedAt:new Date().toISOString(),companies:[],persons:[P('KURGU TEK',T.faal,'Borçlu')]})},T);
  await p.reload();await p.waitForTimeout(1500);await p.evaluate(()=>document.querySelectorAll('.modal-bg').forEach(x=>x.remove()));
  await p.evaluate(async()=>{await agCycle('test')});await p.waitForTimeout(300);
  const props=await p.evaluate(()=>(AG.props||[]).filter(x=>x.k==='gib').map(x=>({to:x.to.pid+'#'+x.to.i,ad:x.ad,l:x.l,s:x.s,id:x.id})));
  const has=(to,ad,re)=>props.some(x=>x.to===to&&x.ad===ad&&re.test(x.l));
  ok(has('pI#1','KURGU TERK',/terk/i),'Aynı portföyün diğer föyünde: TERK sonucu öneri olarak geldi',props);
  ok(has('pI#1','KURGU YOK',/kaydı yok/i),'Aynı portföyün diğer föyünde: “GİB kaydı yok” sonucu öneri olarak geldi');
  ok(has('pJ#0','KURGU TERK',/terk/i),'Diğer portföyde (sadece Excel kefil satırındaki kişi): TERK öneri olarak geldi');
  ok(!props.some(x=>x.to==='pI#1'&&x.ad==='KURGU POT')&&has('pJ#0','KURGU TEK',/faal/i),'Hedefte zaten GİB sonucu olan kişiye öneri yok; hanedeki kişinin FAAL sonucu diğer portföydeki borçluya öneri');
  ok(!props.some(x=>x.ad==='KURGU OTO'),'Otomatik “GİB kaydı yok” notu yayılmıyor (yalnız gerçek sorgu sonucu)');
  let r=await p.evaluate(()=>{showScreen('mts');MTS.tab='ag';AG.view.m='yayilim';try{renderMts()}catch(e){}const t=agOpenTasks(t=>t.ag==='yayilim').map(t=>t.txt);return {t,bar:!!document.querySelector('[data-agb="bulk"]')}});
  ok(r.t.some(x=>/terk/i.test(x))&&r.bar,'Ajan Merkezi’nde yayılım görevi ve “Toplu onayla ve aktar” düğmesi var',r);
  /* toplu onay → aktarım; dolu olana yazılmaz */
  await (p.evaluate(async ids=>{window.__t=[];const _t=toast;toast=function(m){window.__t.push(m);return _t.apply(this,arguments)};await agBulkRun(ids);await new Promise(r=>setTimeout(r,3000));const o=lsGet();const R=o.r['pI--1'];return [window.__t,R&&R.persons.map(x=>x.ad+':'+((x.src||{}).gib||{}).s+':'+((x.gibData||{}).durum||''))]},props.map(x=>x.id)));await p.waitForTimeout(800);
  r=await p.evaluate(async()=>{await openPortfolio('pI');select(1);await new Promise(r=>setTimeout(r,400));const R=cur();const f=n=>R.persons.find(x=>x.ad===n);
    return {terk:[f('KURGU TERK').src.gib.s,(f('KURGU TERK').gibData||{}).durum,/Ajan yayılımı/.test(f('KURGU TERK').src.gib.n)],yok:[f('KURGU YOK').src.gib.s],pot:[(f('KURGU POT').gibData||{}).durum],oto:[f('KURGU OTO').src.gib.s],log:(R.log||[]).filter(l=>/Ajan yayılımı/.test(l.m)).length}});
  ok(r.terk[0]==='var'&&r.terk[1]==='TERK'&&r.terk[2]&&r.yok[0]==='yok'&&r.pot[0]==='FAAL'&&!r.oto[0]&&r.log>=2,'Onaylanınca hedef föye işlendi (TERK + kaynak notu, kayıt yok); mevcut FAAL değişmedi; işlem kaydı yazıldı',r);
  r=await p.evaluate(async()=>{await openPortfolio('pJ');select(0);await new Promise(r=>setTimeout(r,400));const R=cur();const k=R.persons.find(x=>x.kimlik==='10000000146');return k?{rol:k.rol,d:(k.gibData||{}).durum}:null});
  ok(r&&r.d==='TERK','Diğer portföyde Excel kefil satırındaki kişi föye eklendi, TERK işlendi',r);
  ok(!errs.length,'Sayfa hatası yok',errs);console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
