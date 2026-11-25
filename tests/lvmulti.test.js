/* İstihbarat › MERSİS: şirket satırında E-Vergi levhası; levha penceresinde birden çok şirket; föy Toplu sonuçlar / Toplu detay (kurgusal) — node lvmulti.test.js <app.html> */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const APP=path.resolve(process.argv[2]||'../out55.html');let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x).slice(0,700):''))}};
const LEV=(ad,vkn,vd,mat)=>`Adı Soyadı / Ünvan
${ad}
Vergi / T.C. Kimlik No
${vkn}
Vergi Dairesi
${vd}
Vergi Türü
KURUMLAR VERGİSİ
Ana Faaliyet
İNŞAAT
Tablo
Yıl
Beyan Olunan Matrah
2024
${mat}
1.000,00`;
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:1300,height:950}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>localStorage.setItem('ia-arastiran','Test'));await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(1200);
  await p.evaluate(async()=>{await Store.savePortfolio('pA',{name:'A',importedAt:'2026-11-01T10:00:00Z',count:1},[{i:0,ad:'KURGU KİŞİ',kimlik:'11111111110',sirket:false,m:'1',m2:'',gib:'',anapara:5,toplam:10,not:'',kef:[],x:{}}]);
    const pr=newPerson({ad:'KURGU KİŞİ',kimlik:'11111111110',rol:'Borçlu'});pr.src=emptySrc();pr.src.gib={s:'var',n:'Faal'};pr.gibData={vkn:'11111111110',vd:'X',durum:'FAAL'};
    const c1=newCompany({unvan:'BİRİNCİ KURGU A.Ş.',kaynakKisi:pr.id,iliski:'Borçlunun ortak/yetkili olduğu şirket'});c1.mersis='0111111111100011';c1.mersisQ='var';
    const c2=newCompany({unvan:'İKİNCİ KURGU LTD. ŞTİ.',kaynakKisi:pr.id,iliski:'Borçlunun ortak/yetkili olduğu şirket'});c2.mersis='0222222222200022';c2.mersisQ='var';
    await Store.saveResearch({pid:'pA',idx:0,durum:'devam',sonuc:'',updatedAt:new Date().toISOString(),persons:[pr],companies:[c1,c2]})});
  await p.reload();await p.waitForTimeout(1500);await p.evaluate(async()=>{document.querySelectorAll('.modal-bg').forEach(x=>x.remove());await openPortfolio('pA');showScreen('dosyalar');select(0);S.tab='kisi';renderCard(true)});await p.waitForTimeout(500);
  await p.evaluate(()=>{const pn=[...document.querySelectorAll('.pt-pane')].find(x=>x.querySelector('[data-s="mersis"]'));if(pn){const t=document.querySelector('.pt-tab[data-ptab="'+pn.dataset.pt+'"]');if(t)t.click()}});await p.waitForTimeout(250);
  const btns=await (await p.$('.ent [data-s="mersis"] .mme-res')).$$('[data-mlv]');ok(btns.length===2,'İstihbarat › MERSİS şirket satırlarında “📄 Levha yapıştır” düğmesi',btns.length);
  await btns[0].click();await p.waitForTimeout(200);ok(!!await p.$('.modal [data-m="more"]'),'Levha penceresinde “Kaydet ve diğer şirketi ekle” düğmesi');
  await p.fill('#lvpTx',LEV('BİRİNCİ KURGU A.Ş.','0111111111','KADIKÖY','500.000,00'));await p.click('.modal [data-m="more"]');await p.waitForTimeout(300);
  let r=await p.evaluate(()=>({open:!!document.querySelector('.modal #lvpTx'),v:document.querySelector('#lvpTx').value,l:document.querySelector('#lvpAdded').textContent}));
  ok(r.open&&r.v===''&&/BİRİNCİ KURGU/.test(r.l),'Birinci şirketin levhası kaydedildi; pencere açık, liste görünüyor',r);
  /* ikinci: MERSİS no’sundan VKN ile föydeki şirkete gider */
  await p.fill('#lvpTx',LEV('İKİNCİ KURGU LTD. ŞTİ.','2222222222','ÜSKÜDAR','750.000,00'));await p.click('.modal [data-m="more"]');await p.waitForTimeout(300);
  /* üçüncü: föyde olmayan şirket → şirket kaydı açılır */
  await p.fill('#lvpTx',LEV('ÜÇÜNCÜ KURGU A.Ş.','3333333333','BEŞİKTAŞ','90.000,00'));await p.click('.modal [data-m="ok"]');await p.waitForTimeout(500);
  r=await p.evaluate(()=>{const R=cur();return R.companies.map(c=>({u:c.unvan,n:(c.levhalar||[]).length,vd:(c.levhalar||[])[0]&&c.levhalar[0].vd,s:((c.src||{}).levha||{}).s,kk:c.kaynakKisi===R.persons[0].id}))});
  ok(r.length===3&&r.every(c=>c.n===1&&c.s==='var'&&c.kk),'Üç şirketin levhası ayrı ayrı kaydedildi (VKN ile eşleşti, olmayan şirket açıldı)',r);
  ok(r[0].vd==='KADIKÖY'&&r[1].vd==='ÜSKÜDAR'&&r[2].u==='ÜÇÜNCÜ KURGU A.Ş.','Doğru levha doğru şirkette',r);
  ok(await p.evaluate(()=>!(cur().persons[0].levhalar||[]).length),'Kişinin kendi levhasına şirket levhası yazılmadı');
  /* İstihbarat MERSİS satırında levha durumu */
  await p.evaluate(()=>{S.tab='kisi';renderCard(true)});await p.evaluate(()=>{const pn=[...document.querySelectorAll('.pt-pane')].find(x=>x.querySelector('[data-s="mersis"]'));if(pn){const t=document.querySelector('.pt-tab[data-ptab="'+pn.dataset.pt+'"]');if(t)t.click()}});await p.waitForTimeout(250);
  const t1=await p.evaluate(()=>document.querySelector('.ent [data-s="mersis"] .mme-res').innerText);ok((t1.match(/Levha var/g)||[]).length>=2&&/KADIKÖY/.test(t1),'MERSİS sonuç listesinde şirketlerin levha durumu görünüyor',t1.slice(0,300));
  /* föy: Toplu sonuçlar ve Toplu detay */
  const ts=await p.evaluate(()=>{S.tab='toplu';renderCard(true);return document.getElementById('tsBox').innerText});ok(/BİRİNCİ KURGU/.test(ts)&&/İKİNCİ KURGU/.test(ts)&&/ÜÇÜNCÜ KURGU/.test(ts),'Toplu sonuçlarda üç şirket görünüyor');
  const td=await p.evaluate(()=>{S.tab='tdetay';renderCard(true);try{tdRefresh()}catch(e){}return document.getElementById('tdBox').innerText});
  ok((td.match(/1 levha/gi)||[]).length>=3&&/KADIKÖY/.test(td)&&/ÜSKÜDAR/.test(td)&&/BEŞİKTAŞ/.test(td),'Toplu detayda üç şirketin levhası (vergi dairesi, matrah) görünüyor',td.slice(0,500));
  ok(!errs.length,'Sayfa hatası yok',errs);console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
