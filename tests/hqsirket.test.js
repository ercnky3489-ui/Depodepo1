/* Hızlı sorgu: Levha / MERSİS / Ticaret Sicil Gazetesi sekmelerinde şirket seçimi — node hqsirket.test.js <app.html> */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const APP=path.resolve(process.argv[2]);let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x).slice(0,700):''))}};
const TXT=fs.readFileSync(path.join(__dirname,'mersis.test.js'),'utf8').match(/const TXT=`([\s\S]*?)`;/)[1];
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1440,height:1000}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await ctx.route(/cdnjs\.cloudflare\.com/,r=>r.abort());
  await p.addInitScript(()=>{localStorage.setItem('ia-arastiran','Test')});await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(1200);
  await p.evaluate(async()=>{await Store.savePortfolio('pA',{name:'A',importedAt:'2026-11-01T10:00:00Z',count:1},[{i:0,ad:'TEST BORÇLU',kimlik:'11111111110',sirket:false,m:'1',m2:'',gib:'',anapara:5,toplam:10,not:'',kef:[],x:{}}]);
    await Store.saveResearch({pid:'pA',idx:0,durum:'devam',sonuc:'',updatedAt:new Date().toISOString(),persons:[newPerson({ad:'TEST BORÇLU',kimlik:'11111111110',rol:'Borçlu'}),newPerson({ad:'TEST KEFİL',kimlik:'22222222220',rol:'Kefil'})],
      companies:[newCompany({unvan:'BİRİNCİ ÖRNEK LİMİTED ŞİRKETİ',vkn:'1234567890',iliski:'Kefil şirket'}),newCompany({unvan:'İKİNCİ ÖRNEK ANONİM ŞİRKETİ',vkn:'9876543210'})]})});
  await p.reload();await p.waitForTimeout(2000);await p.evaluate(async()=>{await openPortfolio('pA');showScreen('dosyalar');select(0);showScreen('hizli')});await p.waitForTimeout(700);
  const st=()=>p.evaluate(()=>({chips:[...document.querySelectorAll('#hizliScreen .hqp')].map(x=>(x.classList.contains('c')?'C:':'P:')+x.textContent.trim().replace(/^[✓🏢👤]\s*/u,'')+(x.classList.contains('on')?'*':'')+(x.classList.contains('d')?'✓':'')),
    name:(document.querySelector('#hizliScreen .tq-name')||{}).textContent||''}));
  for(const sub of ['levha','mersis','tsg']){await p.click(`#hizliScreen [data-act="hq-sub"][data-v="${sub}"]`);await p.waitForTimeout(200);const o=await st();
    ok(o.chips.filter(x=>x.startsWith('C:')).length===2&&o.chips.filter(x=>x.startsWith('P:')).length===2,sub+': şirketler ve kişiler seçilebilir listede',o.chips);
    await p.click(`#hizliScreen .hqp[data-eid]:nth-of-type(2)`);/* ilk grubun 2. çipi */await p.waitForTimeout(200);const o2=await st();
    ok(/İKİNCİ ÖRNEK/.test(o2.name)&&o2.chips.some(x=>/İKİNCİ.*\*/.test(x)),sub+': şirket seçilince panel o şirkete geçiyor',o2)}
  // TSG: ilk sırada şirket var
  await p.click('#hizliScreen .hqp.c');await p.waitForTimeout(150);
  await p.click('#hizliScreen [data-act="tsgq-var"]');await p.waitForTimeout(200);
  let t=await p.evaluate(()=>({zone:!!document.querySelector('.tsgq-zone'),name:document.querySelector('.tq-name').textContent,s:cur().companies[0].src.tsg.s}));
  ok(t.zone&&/BİRİNCİ/.test(t.name)&&t.s==='var','TSG VAR → aynı şirkette görsel yapıştırma alanı ve not',t);
  await p.fill('#tsgqNote','İlan 12.03.2024 sayı 11000');await p.click('[data-act="tsgq-next"]');await p.waitForTimeout(300);
  t=await p.evaluate(()=>({n:cur().companies[0].src.tsg.n,name:document.querySelector('.tq-name').textContent}));ok(t.n==='İlan 12.03.2024 sayı 11000'&&/İKİNCİ/.test(t.name),'Kaydet ve ilerle: not kaydedildi, sıradaki şirkete geçti',t);
  await p.click('[data-act="tsgq-yok"]');await p.waitForTimeout(300);t=await p.evaluate(()=>({s:cur().companies[1].src.tsg.s,name:document.querySelector('.tq-name').textContent}));ok(t.s==='yok'&&/TEST BORÇLU/.test(t.name),'Yok → sıradaki (kişi)',t);
  // Kartta TSG durumu görünüyor
  // MERSİS: şirket seçilip yapıştırma → yeni ayrıştırıcı
  await p.click('#hizliScreen [data-act="hq-sub"][data-v="mersis"]');await p.waitForTimeout(200);
  await p.click('#hizliScreen .hqp.c[data-eid]');await p.waitForTimeout(150);await p.click('[data-act="mq-var"]');await p.waitForTimeout(200);
  const hasNew=await p.evaluate(()=>!!document.querySelector('#mrsTxt'));ok(hasNew,'Şirket için MERSİS "Var · yapıştır" yeni MERSİS metni penceresini açıyor');
  if(hasNew){await p.fill('#mrsTxt',TXT);await p.waitForTimeout(150);await p.click('#mrsOk');await p.waitForTimeout(400);
    t=await p.evaluate(()=>{const c=cur().companies[0];return {m:c.mersis,q:c.mersisQ,s:c.src.mersis.s,name:document.querySelector('#hizliScreen .tq-name')&&document.querySelector('#hizliScreen .tq-name').textContent}});
    ok(t.m==='0123456789000001'&&t.q==='var'&&t.s==='var'&&!/BİRİNCİ/.test(t.name||''),'MERSİS kaydedildi, şirket bakıldı sayıldı ve sıradakine geçildi',t)}
  // Levha: şirket seç → Yok
  await p.click('#hizliScreen [data-act="hq-sub"][data-v="levha"]');await p.waitForTimeout(200);const lid=await p.evaluate(()=>cur().companies[1].id);
  await p.click(`#hizliScreen .hqp[data-eid="${lid}"]`);await p.waitForTimeout(150);await p.click('[data-act="lq-yok"]');await p.waitForTimeout(300);
  t=await p.evaluate(()=>({q:cur().companies[1].levhaQ,chips:[...document.querySelectorAll('#hizliScreen .hqp.d')].length}));ok(t.q==='yok'&&t.chips>=1,'Levha: seçilen şirket "Yok" işaretlendi, çipte ✓',t);
  await p.screenshot({path:path.join(__dirname,'hqsirket.png')});
  console.log('\nSayfa hataları:',errs.length?errs:'yok');console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
