/* Şirket kartı: MERSİS metni yapıştır → alanlar + MERSİS sonucu; şirket kaynakları — node mersis.test.js <app.html> */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const APP=path.resolve(process.argv[2]);let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x).slice(0,700):''))}};
/* MERSİS sayfasından kopyalanmış biçim (kurgusal firma): etiketler değerlere bitişik, bağlantılar markdown olarak */
const TXT=`[Firma Bilgileri](https://mersis.ticaret.gov.tr/x#collapseOne)
Unvan
ÖRNEK YAPI MÜHENDİSLİK İNŞAAT SANAYİ TİCARET ANONİM ŞİRKETİKuruluş Tarihi
08-05-2001Firma Durumu
Aktif
MERSİS No
0123456789000001Vergi Dairesi / No
ÖRNEK VERGİ DAİRESİ / 1234567890Ticaret Sicil No / Dosya No
123456
Firma Türü
TEK PAY SAHİPLİ ANONİM ŞİRKETTicaret Sicili Müdürlüğü
ANKARA TİCARET SİCİLİ MÜDÜRLÜĞÜŞehir
ANKARA
Toplam Sermaye
7.200.000,00 TLFirma Adres Bilgisi
Örnek Cad. No:1/2 Çankaya/ANKARAElektronik Tebligat Adresi
11111-22222-33333

[Yönetim Kurulu Bilgilerini Kapat](https://mersis.ticaret.gov.tr/x#c)
Yönetim Kurulu Görev Dağılımı
Kayıt bulunmamaktadır.

Yönetim Kurulu Üyeleri
[Adı Soyadı](https://mersis.ticaret.gov.tr/a?b=1)	Görev Süresi
TEST YETKİLİ KİŞİ	30.01.2027 tarihine kadar
Temsile Yetkililer
[Adı Soyadı](https://mersis.ticaret.gov.tr/a)	[Yetki Şekli](https://mersis.ticaret.gov.tr/b)	Yetki Süresi	[Yetki Bitiş Tarihi](https://mersis.ticaret.gov.tr/c)	
TEST YETKİLİ KİŞİ	Münferiden Temsile Yetkilidir.	30.01.2027 tarihine kadar	30.01.2027 00:00:00`;
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1440,height:1000}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await ctx.route(/cdnjs\.cloudflare\.com/,r=>r.abort());
  await p.addInitScript(()=>{localStorage.setItem('ia-arastiran','Test')});await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(1200);
  await p.evaluate(async()=>{await Store.savePortfolio('pA',{name:'A',importedAt:'2026-11-01T10:00:00Z',count:1},[{i:0,ad:'TEST BORÇLU',kimlik:'11111111110',sirket:false,m:'1',m2:'',gib:'',anapara:5,toplam:10,not:'',kef:[],x:{}}]);
    await Store.saveResearch({pid:'pA',idx:0,durum:'devam',sonuc:'',updatedAt:new Date().toISOString(),persons:[newPerson({ad:'TEST BORÇLU',kimlik:'11111111110',rol:'Borçlu'})],
      companies:[newCompany({unvan:'ÖRNEK YAPI MÜHENDİSLİK İNŞAAT SANAYİ VE TİCARET LİMİTED ŞİRKETİ',vkn:'1234567890',iliski:'Kefil şirket'})]})});
  await p.reload();await p.waitForTimeout(2000);await p.evaluate(async()=>{await openPortfolio('pA');showScreen('dosyalar');select(0)});await p.waitForTimeout(800);
  await p.evaluate(()=>{S.tab='sirket';renderCard()});await p.waitForTimeout(500);
  const src=await p.evaluate(()=>[...document.querySelectorAll('.ent.company .src')].map(x=>x.dataset.s));console.log('    şirket kaynakları',JSON.stringify(src));
  ok(JSON.stringify(src)===JSON.stringify(['levha','mersis','tsg','sosyal','google']),'Şirket kaynakları: E-Vergi Levhası, MERSİS, Ticaret Sicil Gazetesi, Sosyal medya, Google (GİB/SGK yok)',src);
  const P=await p.evaluate(t=>mersisParse(t),TXT);console.log('    ayrıştırma',JSON.stringify(P));
  ok(P.unvan==='ÖRNEK YAPI MÜHENDİSLİK İNŞAAT SANAYİ TİCARET ANONİM ŞİRKETİ'&&P.kurulus==='08.05.2001'&&P.durumSel==='Aktif'&&P.mersis==='0123456789000001'&&P.vkn==='1234567890'&&P.vergiDairesi==='ÖRNEK VERGİ DAİRESİ'&&P.sicil==='123456'&&P.mudurluk==='ANKARA TİCARET SİCİLİ MÜDÜRLÜĞÜ'&&P.sermaye==='7.200.000,00 TL'&&P.adres==='Örnek Cad. No:1/2 Çankaya/ANKARA'&&P.sehir==='ANKARA'&&P.etebligat==='11111-22222-33333','Etiketler bitişik olsa da alanlar doğru ayrışıyor',P);
  ok(P.people.length===1&&P.people[0].ad==='TEST YETKİLİ KİŞİ'&&/Yönetim kurulu üyesi/.test(P.people[0].gorev)&&/Münferiden/.test(P.people[0].gorev)&&/30\.01\.2027/.test(P.people[0].sure),'Yönetim kurulu + temsile yetkili tek kişide birleşiyor',P.people);
  await p.click('.ent.company [data-act="mersis-paste"]');await p.fill('#mrsTxt',TXT);await p.waitForTimeout(200);
  const pv=await p.evaluate(()=>({rows:[...document.querySelectorAll('.mrs-t tbody tr')].map(r=>[r.children[1].textContent,r.querySelector('input').checked,r.querySelector('input').disabled]),pp:document.querySelectorAll('[data-mrsp]:checked').length,note:document.querySelector('.mrs-note span').textContent}));
  console.log('    önizleme',JSON.stringify(pv));
  const row=n=>pv.rows.find(r=>r[0]===n)||[];
  ok(row('Ticaret ünvanı')[1]===false&&row('VKN')[2]===true&&row('MERSİS no')[1]===true&&row('Sermaye')[1]===true,'Önizleme: farklı dolu alan (ünvan) işaretsiz, aynı alan (VKN) kilitli, boşlar işaretli',pv.rows);
  await p.click('#mrsOk');await p.waitForTimeout(500);
  const c=await p.evaluate(()=>{const R=cur();const c=R.companies[0];return {c:{unvan:c.unvan,mersis:c.mersis,sicil:c.sicil,mudurluk:c.mudurluk,durum:c.durum,kurulus:c.kurulus,sermaye:c.sermaye,adres:c.adres},ms:c.src.mersis,y:R.persons.filter(p=>p.sirket===c.id).map(p=>[p.rol,p.ad,p.pay]),
    ui:{mersis:(document.querySelector('.ent.company input[data-f="mersis"]')||{}).value,note:(document.querySelector('.ent.company input[data-sn="mersis"]')||{}).value,seg:(document.querySelector('.ent.company .src[data-s="mersis"] [aria-pressed="true"]')||{}).dataset}}});
  console.log('    kaydedilen',JSON.stringify(c));
  ok(/LİMİTED/.test(c.c.unvan)&&c.c.mersis==='0123456789000001'&&c.c.sicil==='123456'&&c.c.durum==='Aktif'&&c.c.kurulus==='08.05.2001'&&c.c.sermaye==='7.200.000,00 TL'&&/Çankaya/.test(c.c.adres)&&/ANKARA TİCARET/.test(c.c.mudurluk),'Kutucuklar doldu; işaretsiz ünvan değişmedi',c.c);
  ok(c.ms.s==='var'&&/MERSİS: Aktif/.test(c.ms.n)&&/TEST YETKİLİ KİŞİ/.test(c.ms.n)&&c.ui.mersis==='0123456789000001'&&/Aktif/.test(c.ui.note)&&c.ui.seg&&c.ui.seg.v==='var','MERSİS sorgu satırı "Var" ve sonuç notu görünüyor',c);
  const rs=await p.evaluate(()=>{const x=document.querySelector('.ent.company .src[data-s="mersis"] .mrs-res');return x?x.textContent:''});ok(/MERSİS sorgu sonucu/.test(rs)&&/0123456789000001/.test(rs)&&/7\.200\.000,00 TL/.test(rs)&&/TEST YETKİLİ KİŞİ/.test(rs)&&/11111-22222-33333/.test(rs),'MERSİS kutucuğunun altında sonuç paneli',rs.slice(0,300));
  ok(c.y.length===1&&c.y[0][0]==='Yetkili'&&/Münferiden/.test(c.y[0][2]),'Yetkili şirkete eklendi',c.y);
  await p.click('.ent.company [data-act="mersis-paste"]');await p.fill('#mrsTxt',TXT);await p.waitForTimeout(200);const dup=await p.evaluate(()=>document.querySelectorAll('[data-mrsp]:checked').length);await p.click('#mrsOk');await p.waitForTimeout(300);
  const n2=await p.evaluate(()=>{const R=cur();return {y:R.persons.filter(x=>x.sirket===R.companies[0].id).length,n:R.companies[0].src.mersis.n.split('\n').length}});ok(dup===0&&n2.y===1&&n2.n===1,'İkinci yapıştırmada mükerrer yetkili ve tekrar not yok',n2);
  await p.click('.ent.company [data-act="allyok"]');await p.waitForTimeout(300);const ay=await p.evaluate(()=>{const s=cur().companies[0].src;return ['levha','mersis','tsg','sosyal','google'].map(k=>(s[k]||{}).s)});ok(JSON.stringify(ay)===JSON.stringify(['yok','var','yok','yok','yok']),'Kalanlar yok: şirketin 5 kaynağı',ay);
  await (await p.$('.ent.company')).screenshot({path:path.join(__dirname,'mersis_card.png')});
  console.log('\nSayfa hataları:',errs.length?errs:'yok');console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
