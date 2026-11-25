/* Toplu sonuçlar / Toplu detay gizle düğmesi; Aşamalar’da “Haciz bilgisi yapıştır” yok; Yapılacaklar şeridi yok (kurgusal) — node ui_hide.test.js <app.html> */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const APP=path.resolve(process.argv[2]||'../out55.html');let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x).slice(0,500):''))}};
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:1300,height:950}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>localStorage.setItem('ia-arastiran','Test'));await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(1200);
  await p.evaluate(async()=>{await Store.savePortfolio('pA',{name:'A',importedAt:'2026-11-01T10:00:00Z',count:1},[{i:0,ad:'KURGU KİŞİ',kimlik:'11111111110',sirket:false,m:'1',m2:'',gib:'',anapara:5,toplam:10,not:'',kef:[],x:{}}]);
    const pr=newPerson({ad:'KURGU KİŞİ',kimlik:'11111111110',rol:'Borçlu'});pr.src=emptySrc();await Store.saveResearch({pid:'pA',idx:0,durum:'devam',sonuc:'',updatedAt:new Date().toISOString(),persons:[pr],companies:[]})});
  await p.reload();await p.waitForTimeout(1500);await p.evaluate(async()=>{document.querySelectorAll('.modal-bg').forEach(x=>x.remove());await openPortfolio('pA');showScreen('dosyalar');select(0);S.tab='toplu';renderCard(true)});await p.waitForTimeout(400);
  const vis=()=>p.evaluate(()=>{const s=document.querySelector('section.blk[data-tab="toplu"]');const bx=document.getElementById('tsBox');return {hid:s.classList.contains('blk-hid'),box:!!(bx&&bx.offsetParent),btn:(s.querySelector('[data-blktg]')||{}).textContent}});
  let r=await vis();ok(r.box&&/Gizle/.test(r.btn),'Toplu sonuçlar başlığında “▾ Gizle” düğmesi',r);
  await p.click('section.blk[data-tab="toplu"] [data-blktg]');r=await vis();ok(r.hid&&!r.box&&/Göster/.test(r.btn),'Basınca içerik gizlendi, düğme “▸ Göster” oldu',r);
  await p.evaluate(()=>renderCard(true));r=await vis();ok(r.hid&&!r.box,'Tercih hatırlanıyor (yeniden çizimde gizli kalıyor)',r);
  await p.click('section.blk[data-tab="toplu"] [data-blktg]');r=await vis();ok(!r.hid&&r.box,'Tekrar basınca geri açıldı',r);
  r=await p.evaluate(()=>{S.tab='tdetay';renderCard(true);return !!document.querySelector('section.blk[data-tab="tdetay"] [data-blktg]')});ok(r,'Toplu detayda da gizle düğmesi var');
  r=await p.evaluate(()=>{const t=document.getElementById('todoBox');return !t||getComputedStyle(t).display==='none'});ok(r,'Yapılacaklar şeridi görünmüyor');
  r=await p.evaluate(()=>{showScreen('asama');renderAsama();return !!document.querySelector('#asamaScreen [data-act-as="hz"]')});ok(!r,'Aşamalar’da “Haciz bilgisi yapıştır” düğmesi yok');
  ok(!errs.length,'Sayfa hatası yok',errs);console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
