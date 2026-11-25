/* Aşamalar · MERSİS kaydı yapıştır: “Kaydet ve diğer şirketi ekle” (kurgusal) — node me_more.test.js <app.html> */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const APP=path.resolve(process.argv[2]||'../out55.html');let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x).slice(0,700):''))}};
const firm=(u,ms,vd)=>`Firma Bilgileri
Unvan
${u}Kuruluş Tarihi 08-03-2006Firma Durumu Aktif
MERSİS No
${ms}VergiDairesi/No
ÖRNEK VERGİ DAİRESİ / ${vd}Ticaret Sicil No / Dosya No
123456
Firma Türü
LİMİTED ŞİRKETTicaret Sicili Müdürlüğü
ANKARA TİCARET SİCİLİ MÜDÜRLÜĞÜŞehir
ANKARA
Toplam Sermaye
1.100.000,00 TLFirma Adres Bilgisi
DENEME MAH. NO:5 ÇANKAYA/ANKARAElektronik Tebligat Adresi
11111-22222-33333
Yetkililer
Adı Soyadı\tYetki\tYetki Şekli\tYetki Süresi\tYetki Bitiş Tarihi
KURGU YETKİLİ\tMüdür\tMünferiden Temsile Yetkilidir.\tAksi Karar Alınıncaya Kadar\t
Ticari Temsilciler/Sınırlı Yetkililer
Firmanın sınırlı yetkilisi bulunmamaktadır.`;
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:1300,height:950}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>localStorage.setItem('ia-arastiran','Test'));await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(1200);
  await p.evaluate(async()=>{await Store.savePortfolio('pA',{name:'A',importedAt:'2026-11-01T10:00:00Z',count:1},[{i:0,ad:'KURGU YETKİLİ',kimlik:'11111111110',sirket:false,m:'1',m2:'',gib:'',anapara:5,toplam:10,not:'',kef:[],x:{}}]);
    const pr=newPerson({ad:'KURGU YETKİLİ',kimlik:'11111111110',rol:'Borçlu'});pr.src=emptySrc();pr.sgkYet=[{unvan:'ÖRNEK TURŞU SN.VE TC.LTD.ŞTİ.'}];await Store.saveResearch({pid:'pA',idx:0,durum:'devam',sonuc:'',updatedAt:new Date().toISOString(),persons:[pr],companies:[]})});
  await p.reload();await p.waitForTimeout(1800);await p.evaluate(async()=>{document.querySelectorAll('.modal-bg').forEach(x=>x.remove());await openPortfolio('pA')});await p.waitForTimeout(500);
  await p.evaluate(()=>{const R=S.research.get(0);const e=R.persons[0];mePaste(0,e.id,'y:'+meFold('ÖRNEK TURŞU SN.VE TC.LTD.ŞTİ.'),'ÖRNEK TURŞU SN.VE TC.LTD.ŞTİ.')});await p.waitForTimeout(200);
  ok(await p.$('.modal [data-m="more"]'),'Pencerede “Kaydet ve diğer şirketi ekle” düğmesi var');
  await p.fill('#mePx',firm('ÖRNEK TURŞU KONSERVE GIDA SANAYİ VE TİCARET LİMİTED ŞİRKETİ','0453061811700099','4530618117'));await p.click('.modal [data-m="more"]');await p.waitForTimeout(300);
  let r=await p.evaluate(()=>({open:!!document.querySelector('.modal #mePx'),v:document.querySelector('#mePx').value,list:document.querySelector('#meAdded').textContent}));
  ok(r.open&&r.v===''&&/ÖRNEK TURŞU KONSERVE/.test(r.list),'Birinci şirket kaydedildi; pencere açık, kutu boş, eklenenler listesi görünüyor',r);
  await p.fill('#mePx',firm('İKİNCİ KURGU İNŞAAT LİMİTED ŞİRKETİ','0222222222200022','2222222222'));await p.click('.modal [data-m="ok"]');await p.waitForTimeout(400);
  r=await p.evaluate(()=>{const R=S.research.get(0);return {cs:R.companies.map(c=>({u:c.unvan,ms:c.mersis,k:c.kurulus,d:c.durum,vd:c.vd,il:c.iliski,kk:c.kaynakKisi===R.persons[0].id})),src:R.persons[0].src.mersis,row:R.persons[0].sgkYet[0]}});
  ok(r.cs.length===2&&r.cs.every(c=>c.kk),'İki ayrı şirket kişiye bağlandı',r.cs);
  ok(r.cs[0].u==='ÖRNEK TURŞU KONSERVE GIDA SANAYİ VE TİCARET LİMİTED ŞİRKETİ'&&r.cs[0].k==='08.03.2006'&&r.cs[0].vd==='ÖRNEK VERGİ DAİRESİ'&&r.cs[0].il==='SGK yetkili işyeri'&&r.cs[1].ms==='0222222222200022','Alanlar doğru (kuruluş, vergi dairesi); ilki SGK yetkili işyeri',r.cs);
  ok(r.src&&r.src.s==='var'&&r.row.vkn==='4530618117','Kişinin MERSİS kaynağı “var”, SGK satırına VKN yazıldı',{src:r.src,row:r.row});
  /* Aşamalar MERSİS listesinde isme tıklayınca kişinin kartı İstihbarat sekmesiyle açılır */
  await p.evaluate(()=>{showScreen('asama');const R=S.research.get(0);const e=R.persons[0];const el=document.getElementById('asamaScreen');
    el.innerHTML=meBoardHTML([{e,d:{i:0,ad:'KURGU YETKİLİ'},rol:'Borçlu',f:['ÖRNEK TURŞU SN.VE TC.LTD.ŞTİ.','','','','']}],'yt')});await p.waitForTimeout(300);
  const lk=await p.$$('#asamaScreen [data-meist]');ok(lk.length>=1,'Aşamalar MERSİS listesinde isimler tıklanabilir',lk.length);
  if(lk.length){await lk[lk.length-1].click();await p.waitForTimeout(700);
    const st=await p.evaluate(()=>{const card=document.querySelector('.pt-card[data-p="'+cur().persons[0].id+'"]');const t=card&&card.querySelector('.pt-tab[data-ptab="ist"]');const pane=card&&card.querySelector('.pt-pane[data-pt="ist"]');return {scr:S.screen,sel:S.sel,tab:t&&t.getAttribute('aria-selected'),vis:pane&&!pane.hidden}});
    ok(st.scr==='dosyalar'&&st.sel===0&&st.tab==='true'&&st.vis,'İsme tıklayınca kişinin kartı İstihbarat sekmesi açık olarak geldi',st)}
  /* Levha panosu: isme tıklayınca da İstihbarat açılır */
  await p.evaluate(()=>{showScreen('asama');const R=S.research.get(0);const e=R.persons[0];document.getElementById('asamaScreen').innerHTML=lvBoardHTML([{e,d:{i:0,ad:'KURGU YETKİLİ'},rol:'Borçlu',kisi:e.ad}])});await p.waitForTimeout(300);
  const lv=await p.$$('#asamaScreen .lv-p [data-meist]');ok(lv.length===1,'Levha panosunda isim tıklanabilir',lv.length);
  if(lv.length){await lv[0].click();await p.waitForTimeout(700);const st2=await p.evaluate(()=>{const card=document.querySelector('.pt-card[data-p="'+cur().persons[0].id+'"]');const pane=card&&card.querySelector('.pt-pane[data-pt="ist"]');return {scr:S.screen,vis:pane&&!pane.hidden}});
    ok(st2.scr==='dosyalar'&&st2.vis,'Levha panosundan isme tıklayınca İstihbarat açık geldi',st2)}
  ok(!errs.length,'Sayfa hatası yok',errs);console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
