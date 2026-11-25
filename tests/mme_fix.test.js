/* MERSİS firma: yetkili tablolu bitişik metin + eski bozuk kaydın ekranda onarımı (kurgusal) — node mme_fix.test.js <app.html> */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const APP=path.resolve(process.argv[2]||'../out55.html');let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x).slice(0,700):''))}};
const TXT=`Firma Bilgileri
Unvan
ÖRNEK TURŞU KONSERVE GIDA SANAYİ VE TİCARET LİMİTED ŞİRKETİKuruluş Tarihi 08-03-2006Firma Durumu Aktif
MERSİS No
0453061811700099VergiDairesi/No
ÖRNEK VERGİ DAİRESİ / 4530618117Ticaret Sicil No / Dosya No
123456
Firma Türü
ORTAK SAYISI BİRDEN FAZLA LİMİTED ŞİRKETTicaret Sicili Müdürlüğü
ANKARA TİCARET SİCİLİ MÜDÜRLÜĞÜŞehir
ANKARA
Toplam Sermaye
1.100.000,00 TLFirma Adres Bilgisi
DENEME MAH. ÖRNEK SK. NO:5 ÇANKAYA/ANKARAElektronik Tebligat Adresi
11111-22222-33333
Yetkili Bilgilerini Kapat
Yetkililer
Adı Soyadı\tYetki\tYetki Şekli\tYetki Süresi\tYetki Bitiş Tarihi
KURGU MÜDÜR\tMüdür\tMünferiden Temsile Yetkilidir.\tAksi Karar Alınıncaya Kadar\t
İKİNCİ MÜDÜR\tMüdür\tMünferiden Temsile Yetkilidir.\tAksi Karar Alınıncaya Kadar\t
Ticari Temsilciler/Sınırlı Yetkililer Bilgilerini Kapat
Ticari Temsilciler/Sınırlı Yetkililer
Firmanın sınırlı yetkilisi bulunmamaktadır.`;
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:1300,height:950}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(1000);
  const f=await p.evaluate(t=>{const o=parseMersisFirma(t);return o},TXT);
  ok(f.unvan==='ÖRNEK TURŞU KONSERVE GIDA SANAYİ VE TİCARET LİMİTED ŞİRKETİ'&&f.kurulus==='08.03.2006'&&f.durum==='Aktif','parseMersisFirma: unvan, kuruluş, durum ayrıldı',f);
  ok(f.mersis==='0453061811700099'&&f.vd==='ÖRNEK VERGİ DAİRESİ'&&f.vkn==='4530618117'&&f.sicil==='123456','MERSİS no, vergi dairesi / no, sicil',f);
  ok(f.firmaTuru==='ORTAK SAYISI BİRDEN FAZLA LİMİTED ŞİRKET'&&f.mudurluk==='ANKARA TİCARET SİCİLİ MÜDÜRLÜĞÜ'&&f.sehir==='ANKARA'&&f.sermaye==='1.100.000,00 TL'&&/ÇANKAYA\/ANKARA$/.test(f.adres)&&f.kep==='11111-22222-33333','Türü, müdürlük, şehir, sermaye, adres, e-tebligat',f);
  ok((f.yetkililer||[]).length===2&&f.yetkililer[0].ad==='KURGU MÜDÜR','Yetkili tablosu korunuyor',f.yetkililer);
  /* daha önce bozuk kaydedilmiş kayıt ekranda onarılıyor */
  const t=await p.evaluate(()=>{const c={unvan:'ÖRNEK TURŞU KONSERVE GIDA SANAYİ VE TİCARET LİMİTED ŞİRKETİKuruluş Tarihi 08-03-2006Firma Durumu Aktif',mersis:'0453061811700099VergiDairesi/No',firmaTuru:'ORTAK SAYISI BİRDEN FAZLA LİMİTED ŞİRKETTicaret Sicili Müdürlüğü',sermaye:'1.100.000,00 TLFirma Adres Bilgisi',mfAt:1};
    openMersisFirma(c);const tx=document.querySelector('.modal').innerText;document.querySelectorAll('.modal-bg').forEach(x=>x.remove());return {c,tx}});
  ok(t.c.unvan==='ÖRNEK TURŞU KONSERVE GIDA SANAYİ VE TİCARET LİMİTED ŞİRKETİ'&&t.c.kurulus==='08.03.2006'&&t.c.durum==='Aktif'&&t.c.mersis==='0453061811700099'&&t.c.firmaTuru==='ORTAK SAYISI BİRDEN FAZLA LİMİTED ŞİRKET'&&t.c.sermaye==='1.100.000,00 TL','Eski bozuk kayıt: ayrıştırılabilen alanlar düzeltildi',t.c);
  ok(/Kuruluş Tarihi\s*08\.03\.2006/.test(t.tx)&&/Firma Durumu\s*Aktif/.test(t.tx),'Detayda Kuruluş Tarihi ve Firma Durumu görünüyor',t.tx.slice(0,400));
  ok(!errs.length,'Sayfa hatası yok',errs);console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
