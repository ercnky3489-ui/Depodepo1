/* Toplu sonuçlar / Toplu detay: sağda “UYAP bilgilerini gizle” — yalnız UYAP kutuları gizlenir, matris ve detay ızgarası kalır; Aşamalar’da “Haciz bilgisi yapıştır” yok; Yapılacaklar yok (kurgusal) — node ui_hide.test.js <app.html> */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const APP=path.resolve(process.argv[2]||'../out55.html');let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x).slice(0,500):''))}};
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:1300,height:950}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>localStorage.setItem('ia-arastiran','Test'));await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(1200);
  await p.evaluate(async()=>{await Store.savePortfolio('pA',{name:'A',importedAt:'2026-11-01T10:00:00Z',count:1},[{i:0,ad:'KURGU KİŞİ',kimlik:'11111111110',sirket:false,m:'1',m2:'',gib:'',anapara:5,toplam:10,not:'',kef:[],x:{}}]);
    const pr=newPerson({ad:'KURGU KİŞİ',kimlik:'11111111110',rol:'Borçlu'});pr.src=emptySrc();await Store.saveResearch({pid:'pA',idx:0,durum:'devam',sonuc:'',updatedAt:new Date().toISOString(),persons:[pr],companies:[]})});
  await p.reload();await p.waitForTimeout(1500);
  /* İstanbul föylerindeki UYAP kutusunu (hxu) taklit et: tsHTML/tdHTML başına eklenir */
  await p.evaluate(async()=>{const a=tsHTML,b=tdHTML;tsHTML=function(R){return '<div class="hxu" id="hxuTs">UYAP KUTUSU</div>'+a.apply(this,arguments)};tdHTML=function(R){return '<div class="hxu" id="hxuTd">UYAP KUTUSU</div>'+b.apply(this,arguments)};
    document.querySelectorAll('.modal-bg').forEach(x=>x.remove());await openPortfolio('pA');showScreen('dosyalar');select(0);S.tab='toplu';renderCard(true)});await p.waitForTimeout(400);
  const st=(t)=>p.evaluate(t=>{const s=document.querySelector('section.blk[data-tab="'+t+'"]');const h=s.querySelector('.blk-h');const bt=h.querySelector('[data-blktg]');const hx=s.querySelector('.hxu');const body=s.querySelector(t==='toplu'?'#tsBox':'#tdBox');
    const hb=h.getBoundingClientRect(),bb=bt.getBoundingClientRect();return {btn:bt.textContent,right:bb.right>hb.right-60,hx:!!(hx&&hx.offsetParent),body:!!(body&&body.offsetParent&&body.innerText.replace('UYAP KUTUSU','').trim().length)}},t);
  let r=await st('toplu');ok(/UYAP bilgilerini gizle/.test(r.btn)&&/▲/.test(r.btn)&&r.right&&r.hx&&r.body,'Toplu sonuçlar: düğme başlığın sağında, UYAP kutusu görünüyor',r);
  await p.click('section.blk[data-tab="toplu"] [data-blktg]');r=await st('toplu');ok(!r.hx&&r.body&&/göster/.test(r.btn),'Basınca yalnız UYAP kutuları gizlendi; matris (sonuçlar) görünür kaldı',r);
  await p.evaluate(()=>renderCard(true));r=await st('toplu');ok(!r.hx&&r.body,'Tercih hatırlanıyor',r);
  await p.click('section.blk[data-tab="toplu"] [data-blktg]');r=await st('toplu');ok(r.hx&&r.body,'Tekrar basınca UYAP kutuları geri geldi',r);
  await p.evaluate(()=>{S.tab='tdetay';renderCard(true)});await p.waitForTimeout(200);r=await st('tdetay');ok(r.right&&r.hx&&r.body,'Toplu detayda da sağda düğme',r);
  await p.click('section.blk[data-tab="tdetay"] [data-blktg]');r=await st('tdetay');ok(!r.hx&&r.body,'Toplu detay: UYAP gizlendi, kaynak ızgarası görünür',r);
  r=await p.evaluate(()=>{const t=document.getElementById('todoBox');return !t||getComputedStyle(t).display==='none'});ok(r,'Yapılacaklar şeridi görünmüyor');
  r=await p.evaluate(()=>{showScreen('asama');renderAsama();return !!document.querySelector('#asamaScreen [data-act-as="hz"]')});ok(!r,'Aşamalar’da “Haciz bilgisi yapıştır” düğmesi yok');
  r=await p.evaluate(()=>({sub:HX_SUB.takip.map(x=>x[0]).join(),btn:(document.querySelector('#bottomNav .bn.hxn[data-hx]')||{dataset:{}}).dataset.hx,v:HX.view,teb:JSON.stringify(HX_SUB).includes('Tebligat ve Kesinleşme')}));
  ok(r.sub==='genel,takip'&&r.btn==='genel'&&r.v==='genel'&&!r.teb,'Genel Bakış ilk sayfa Özet; “Tebligat ve Kesinleşme” sekmesi yok',r);
  ok(!errs.length,'Sayfa hatası yok',errs);console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
