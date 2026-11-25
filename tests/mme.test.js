/* Föy MERSİS: İstihbarat kutucuğunda çoklu yapıştırma, sonuç listesi, MERSİS sekmesi, A5 PDF (kurgusal veri) — node mme.test.js <app.html> */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const APP=path.resolve(process.argv[2]||'../out52.html');let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x).slice(0,700):''))}};
const firm=(unvan,ms,durum)=>`[Firma Bilgileri](https://mersis.ticaret.gov.tr/x#collapseOne)
Unvan
${unvan}Kuruluş Tarihi
08-05-2001Firma Durumu
${durum}
MERSİS No
${ms}Vergi Dairesi / No
ÖRNEK VERGİ DAİRESİ / 1234567890Ticaret Sicil No / Dosya No
123456
Firma Türü
LİMİTED ŞİRKETTicaret Sicili Müdürlüğü
ANKARA TİCARET SİCİLİ MÜDÜRLÜĞÜŞehir
ANKARA
Toplam Sermaye
100.000,00 TLFirma Adres Bilgisi
Örnek Cad. No:1 Çankaya/ANKARAElektronik Tebligat Adresi
11111-22222-33333`;
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  const lib=f=>fs.readFileSync(path.join(__dirname,'node_modules',f));
  await ctx.route(/cdnjs\.cloudflare\.com/,r=>{const u=r.request().url();if(/jspdf/.test(u))return r.fulfill({status:200,contentType:'application/javascript',body:lib('jspdf/dist/jspdf.umd.min.js')});if(/html2canvas/.test(u))return r.fulfill({status:200,contentType:'application/javascript',body:lib('html2canvas/dist/html2canvas.min.js')});return r.abort()});
  await p.addInitScript(()=>{localStorage.setItem('ia-arastiran','Test')});await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(1200);
  await p.evaluate(async()=>{await Store.savePortfolio('pA',{name:'A',importedAt:'2026-11-01T10:00:00Z',count:1},[{i:0,ad:'TEST BORÇLU',kimlik:'11111111110',sirket:false,m:'1',m2:'',gib:'',anapara:5,toplam:10,not:'',kef:[],x:{}}]);
    const pr=newPerson({ad:'TEST BORÇLU',kimlik:'11111111110',rol:'Borçlu'});pr.src=emptySrc();pr.src.gib={s:'var',n:'Faal'};pr.gibData={vkn:'11111111110',vd:'KADIKÖY',durum:'FAAL'};
    await Store.saveResearch({pid:'pA',idx:0,durum:'devam',sonuc:'',updatedAt:new Date().toISOString(),persons:[pr],companies:[]})});
  await p.reload();await p.waitForTimeout(2000);await p.evaluate(async()=>{document.querySelectorAll('.modal-bg').forEach(x=>x.remove());await openPortfolio('pA');showScreen('dosyalar');select(0)});await p.waitForTimeout(800);
  await p.evaluate(()=>{S.tab='kisi';renderCard()});await p.waitForTimeout(300);
  const openIst=async()=>{await p.evaluate(()=>{const pn=[...document.querySelectorAll('.pt-pane')].find(x=>x.querySelector('[data-s="mersis"]'));if(pn){const t=document.querySelector('.pt-tab[data-ptab="'+pn.dataset.pt+'"]');if(t)t.click()}});await p.waitForTimeout(250)};await openIst();
  const btn=await p.$('.ent [data-s="mersis"] [data-act="mme-paste"]');ok(!!btn,'İstihbarat MERSİS kutucuğunda “⎀ MERSİS yapıştır” düğmesi var');
  await btn.click();await p.waitForTimeout(200);
  ok(await p.$('.modal #mmeTx')&&await p.$('.modal [data-metab="esnaf"]')&&await p.$('.modal #mmeShot'),'Aşamalar’daki gibi pencere: Şirket / Esnaf sekmeleri + ekran görüntüsü alanı');
  await p.fill('#mmeTx',firm('BİRİNCİ ÖRNEK TİCARET LİMİTED ŞİRKETİ','0111111111100001','Aktif'));await p.click('.modal [data-m="more"]');await p.waitForTimeout(300);
  let r=await p.evaluate(()=>({ta:document.querySelector('#mmeTx').value,list:[...document.querySelectorAll('.mme-add b')].map(x=>x.textContent),open:!!document.querySelector('.modal #mmeTx')}));
  ok(r.open&&r.ta===''&&r.list.length===1,'“Kaydet ve yeni ekle”: kayıt eklendi, pencere açık kaldı, kutu temizlendi',r);
  await p.fill('#mmeTx',firm('İKİNCİ ÖRNEK İNŞAAT LİMİTED ŞİRKETİ','0222222222200002','Terk'));await p.click('.modal [data-m="more"]');await p.waitForTimeout(300);
  /* aynı şirketi tekrar yapıştırmak kopya üretmez */
  await p.fill('#mmeTx',firm('BİRİNCİ ÖRNEK TİCARET LİMİTED ŞİRKETİ','0111111111100001','Aktif'));await p.click('.modal [data-m="more"]');await p.waitForTimeout(300);
  /* ekran görüntüsü yapıştır (Ctrl+V) */
  await p.evaluate(async()=>{const c=document.createElement('canvas');c.width=1200;c.height=2600;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,1200,2600);g.fillStyle='#000';g.font='28px sans-serif';for(let y=40;y<2600;y+=60)g.fillText('MERSİS FİRMA BİLGİLERİ satır '+y,30,y);
    const blob=await new Promise(r=>c.toBlob(r,'image/png'));const dt=new DataTransfer();dt.items.add(new File([blob],'shot.png',{type:'image/png'}));
    document.querySelector('#mmeShot').dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}))});
  await p.waitForFunction(()=>!document.querySelector('#mmeOk').hidden,null,{timeout:10000});
  await p.click('.modal [data-m="ok"]');await p.waitForTimeout(600);
  r=await p.evaluate(()=>{const R=cur();const pr=R.persons[0];const cs=R.companies.map(c=>({u:c.unvan,ms:c.mersis,d:c.durum,k:c.kaynakKisi===pr.id,il:c.iliski,src:c.src.mersis.s}));return {cs,ps:pr.src.mersis,img:(S.media.get(S.sel)||[]).filter(isMeMedia).length}});
  ok(r.cs.length===2&&r.cs.every(c=>c.k&&c.src==='var'),'Bir kişiye iki MERSİS şirketi bağlandı; aynı şirketin tekrar yapıştırılması kopya üretmedi',r.cs);
  ok(r.cs[0].ms==='0111111111100001'&&/^Terk/.test(r.cs[1].d)&&r.ps.s==='var'&&/BİRİNCİ/.test(r.ps.n)&&/İKİNCİ/.test(r.ps.n),'Alanlar doldu; kişinin MERSİS kaynağı “Var” ve not iki şirketi listeliyor',r);
  ok(r.img===1,'Ekran görüntüsü kişiye MERSİS görseli olarak kaydedildi',r.img);
  await openIst();r=await p.evaluate(()=>{const t=document.querySelector('.ent [data-s="mersis"] .mme-res');return t?{rows:t.querySelectorAll('[data-act="mme-detay"]').length,txt:t.textContent}:null});
  ok(r&&r.rows===2&&/0111111111100001/.test(r.txt)&&/Terk/.test(r.txt)&&/1 görüntü/.test(r.txt),'Kutucuğun altında Sorgulamalar’daki gibi MERSİS sonuç listesi',r);
  await p.click('.ent [data-s="mersis"] .mme-res [data-act="mme-detay"]');await p.waitForTimeout(300);r=await p.evaluate(()=>{const m=document.querySelector('.modal');const t=m?m.textContent:'';document.querySelectorAll('.modal-bg').forEach(x=>x.remove());return t});
  ok(/BİRİNCİ ÖRNEK/.test(r),'Sonuç satırı tıklanınca MERSİS detayı açılıyor',r.slice(0,120));
  /* MERSİS sekmesi */
  r=await p.evaluate(()=>{const t=document.querySelector('#foyTabs [data-v="mersis"]');return t?{txt:t.textContent,n:(document.getElementById('mmeBadge')||{}).textContent}:null});ok(r&&/MERSİS/.test(r.txt)&&r.n==='1','Föyde “🏛 MERSİS” sekmesi, görsel sayısıyla',r);
  await p.click('#foyTabs [data-v="mersis"]');await p.waitForTimeout(300);
  r=await p.evaluate(()=>{const b=document.getElementById('mmeBox');return {imgs:b.querySelectorAll('.mme-gal img').length,rows:b.querySelectorAll('[data-act="mme-detay"]').length,pdf:!!b.querySelector('[data-mme-pdf=""]'),paste:b.querySelectorAll('[data-mme-paste]').length}});
  ok(r.imgs===1&&r.rows===2&&r.pdf&&r.paste>=1,'MERSİS sekmesi: kayıtlar, ekran görüntüleri, yapıştır ve A5 PDF düğmeleri',r);
  await p.screenshot({path:path.join(__dirname,'mme_tab.png')});
  const [dl]=await Promise.all([p.waitForEvent('download',{timeout:30000}),p.click('#mmeBox [data-mme-pdf=""]')]);const fp=path.join(__dirname,'mme_a5.pdf');await dl.saveAs(fp);
  const pdf=fs.readFileSync(fp,'latin1');const pages=(pdf.match(/\/Type\s*\/Page[^s]/g)||[]).length;const box=(pdf.match(/\/MediaBox\s*\[([^\]]+)\]/)||[])[1]||'';
  const dims=box.trim().split(/\s+/).map(Number);const wmm=Math.round(dims[2]/72*25.4),hmm=Math.round(dims[3]/72*25.4);
  ok(wmm===148&&hmm===210,'A5 PDF indirildi (148×210 mm)',{f:dl.suggestedFilename(),wmm,hmm});
  ok(pages>=2,'Uzun ekran görüntüsü okunabilir kalsın diye birden çok A5 sayfaya bölündü',pages);
  /* telefon */
  await p.setViewportSize({width:390,height:844});await p.waitForTimeout(400);r=await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1);ok(r,'Telefon genişliğinde yatay taşma yok');
  console.log('\nSayfa hataları:',errs.length?errs.slice(0,5):'yok');ok(!errs.length,'Sayfa hatası yok',errs);
  console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
