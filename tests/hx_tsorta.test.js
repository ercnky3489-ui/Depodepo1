/* Toplu sonuçlar / Toplu detay: şirket ortaklık / görevleri her zaman görünür — node hx_tsorta.test.js <app.html> */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const APP=path.resolve(process.argv[2]||'../out26.html');const FX=path.join(__dirname,'fxhx','Dosya Durum Rapor.xlsx');
let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x):''))}};
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:430,height:1600},deviceScaleFactor:2});const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{localStorage.setItem('ia-arastiran','Test Kullanıcı')});
  await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(1200);await p.addScriptTag({path:path.join(__dirname,'node_modules/xlsx/dist/xlsx.full.min.js')});
  await p.evaluate(()=>{document.querySelectorAll('.modal-bg').forEach(x=>x.remove());hxSetMode(true)});await p.waitForFunction(()=>HX.ready===true,null,{timeout:20000});
  await p.evaluate(()=>hxShow('yukle'));await p.waitForTimeout(150);await p.setInputFiles('#hxFile',[FX]);await p.waitForFunction(()=>HXI.files.length>0&&!HXI.prog);
  await p.click('[data-hx-act="commit"]');await p.click('.modal [data-m="ok"]');await p.waitForFunction(()=>!HXI.busy&&!HXI.files.length,null,{timeout:30000});await p.waitForTimeout(1000);
  await p.evaluate(()=>{const add=(did,a)=>HX.data.hx_research.push({id:'t'+Math.random(),debtorId:did,type:'ortaklik',kaynak:'test',sorguTarihi:'2026-11-16',alan:a});
    add('d1001',{'Aktif mi':'Aktif','Başlangıç Tarihi':'2015-01-07','Bitiş Tarihi':'2024-12-30','Firma Unvanı':'ANDARKAN TEMİZLİK HIRDAVAT LTD. ŞTİ.','Görev':'GERÇEK ORTAK, Müdür','Haciz Aşaması':'Sorgulandı, haciz talebi bekleniyor'});
    add('d1001',{'Aktif mi':'Pasif','Başlangıç Tarihi':'2009-08-07, 2011-03-30','Bitiş Tarihi':'2019-09-20, 2011-03-30','Firma Unvanı':'İŞLER GRUP METAL LTD. ŞTİ.','Görev':'GERÇEK ORTAK, Müdür','Haciz Aşaması':'Sorgulandı, haciz talebi bekleniyor'});
    add('d1002',{'Aktif mi':'Aktif','Başlangıç Tarihi':'2017-10-26','Firma Unvanı':'GENÇLER GRUP MAKİNA A.Ş.','Görev':'GERÇEK ORTAK','Haciz Aşaması':'Sorgulandı, haciz talebi bekleniyor'})});
  await p.click('#bottomNav .bn.hxn[data-hxb="dosyalar"]');await p.waitForFunction(()=>S.pid===HX_BPID&&S.debtors.length>0,null,{timeout:20000});await p.waitForTimeout(500);
  /* VELİ föy kişilerinden çıkarılsa bile şirketleri görünmeli */
  await p.evaluate(()=>{const d=S.debtors.find(x=>x.m2==='2024/1111');select(d.i);const R=getR(d.i);R.persons=R.persons.filter(x=>x.kimlik!=='20000000214');R.persons.forEach(x=>{if(x.kimlik==='10000000146')x.kimlik=''});delete R._fresh;S.tab='toplu';renderCard()});await p.waitForTimeout(400);
  for(const [tab,id] of [['toplu','#hxuTs'],['tdetay','#hxuTd']]){await p.evaluate(t=>{S.tab=t;renderCard()},tab);await p.waitForTimeout(300);
    const r=await p.evaluate(id=>{const h=document.querySelector(id+' .hxu-c.hs');return {n:h.querySelectorAll('.hxu-md').length,who:[...h.querySelectorAll('.hxu-who')].map(x=>x.innerText.replace(/\s+/g,' ')),t:h.innerText.replace(/\s+/g,' ')}},id);
    console.log('   ',tab,JSON.stringify(r.who));
    ok(r.n===3,tab+': 3 şirket, föy kişileri eksik/kimliksiz olsa da',r.n);
    ok(/ALİ YILMAZ/.test(r.who[0])&&/VELİ KAYA/.test(r.who[1]||''),tab+': kimin adına (ALİ borçlu, VELİ aynı dosya)',r.who);
    ok(/başlangıç 07\.01\.2015 · bitiş 30\.12\.2024/.test(r.t)&&/başlangıç 07\.08\.2009, 30\.03\.2011/.test(r.t)&&/Sorgulandı, haciz talebi bekleniyor · sorgu 16\.11\.2026/.test(r.t)&&/GERÇEK ORTAK, Müdür/.test(r.t),tab+': Aktif/Pasif, görev, başlangıç-bitiş, haciz aşaması, sorgu tarihi',r.t.slice(0,400))}
  await p.evaluate(()=>{S.tab='toplu';renderCard()});await p.waitForTimeout(300);
  ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Telefonda yatay taşma yok');
  await p.screenshot({path:path.join(__dirname,'hx_tsorta.png'),clip:await p.evaluate(()=>{const x=document.querySelector('#hxuTs .hxu-c.hs').getBoundingClientRect();return {x:0,y:Math.max(0,x.top-4),width:430,height:x.height+8}})});
  console.log('\nSayfa hataları:',errs.length?errs:'yok');if(errs.length)fail++;
  console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
