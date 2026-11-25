/* MERSİS firma yapıştırma: bitişik başlıklar + Terkin Tarihi + “yetkilisi bulunmamaktadır” (kurgusal şirket) — node mme_terkin.test.js <app.html> */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const APP=path.resolve(process.argv[2]||'../out55.html');let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x).slice(0,700):''))}};
const GLUED=`[Firma Bilgileri](https://mersis.ticaret.gov.tr/x#collapseOne)
Unvan
TASFİYE HALİNDE ÖRNEK GIDA TURİZM TEKSTİL İNŞAAT SANAYİ VE TİCARET LTD.ŞTİ.Kuruluş Tarihi 30-12-1999Firma Durumu Terkin EdilmişTerkin Tarihi
14-01-2013MERSİS No
0042010601300099VergiDairesi/No
ÖRNEK VERGİ DAİRESİ / 0420106099Ticaret Sicil No / Dosya No
431199-0
Firma Türü
ORTAK SAYISI BİRDEN FAZLA LİMİTED ŞİRKETTicaret Sicili Müdürlüğü
İSTANBUL TİCARET SİCİLİ MÜDÜRLÜĞÜŞehir
İSTANBUL
Toplam Sermaye
20.000,00 TLFirma Adres Bilgisi
ÖRNEK MAH. DENEME CD. NO:1 BEŞİKTAŞ/İSTANBULElektronik Tebligat Adresi
-
[İç Yönerge TTSG İlan Metni](https://mersis.ticaret.gov.tr/y)
[Yetkili Bilgilerini Kapat](https://mersis.ticaret.gov.tr/z)
Yetkililer
Firmanın yetkilisi bulunmamaktadır.
[Ticari Temsilciler/Sınırlı Yetkililer Bilgilerini Kapat](https://mersis.ticaret.gov.tr/w)
Ticari Temsilciler/Sınırlı Yetkililer
Firmanın sınırlı yetkilisi bulunmamaktadır.`;
const TAB=`Firma Bilgileri
Unvan\tKuruluş Tarihi\tFirma Durumu\tTerkin Tarihi
İKİNCİ ÖRNEK TİCARET LTD.ŞTİ.\t01-02-2005\tTerkin Edilmiş\t03-04-2015
MERSİS No\tVergi Dairesi / No\tTicaret Sicil No / Dosya No
0111111111100077\tKADIKÖY VERGİ DAİRESİ / 1111111177\t555
Firma Türü\tTicaret Sicili Müdürlüğü\tŞehir
LİMİTED ŞİRKET\tİSTANBUL TİCARET SİCİLİ MÜDÜRLÜĞÜ\tİSTANBUL
Toplam Sermaye\tFirma Adres Bilgisi\tElektronik Tebligat Adresi
10.000,00 TL\tDENEME SOK. NO:2 KADIKÖY/İSTANBUL\t-
Yetkililer
Firmanın yetkilisi bulunmamaktadır.`;
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:1300,height:950}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>localStorage.setItem('ia-arastiran','Test'));await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(1200);
  await p.evaluate(async()=>{await Store.savePortfolio('pA',{name:'A',importedAt:'2026-11-01T10:00:00Z',count:1},[{i:0,ad:'TEST BORÇLU',kimlik:'11111111110',sirket:false,m:'1',m2:'',gib:'',anapara:5,toplam:10,not:'',kef:[],x:{}}]);
    const pr=newPerson({ad:'TEST BORÇLU',kimlik:'11111111110',rol:'Borçlu'});pr.src=emptySrc();pr.src.gib={s:'var',n:'Faal'};await Store.saveResearch({pid:'pA',idx:0,durum:'devam',sonuc:'',updatedAt:new Date().toISOString(),persons:[pr],companies:[]})});
  await p.reload();await p.waitForTimeout(1800);await p.evaluate(async()=>{document.querySelectorAll('.modal-bg').forEach(x=>x.remove());await openPortfolio('pA');showScreen('dosyalar');select(0);S.tab='kisi';renderCard()});await p.waitForTimeout(600);
  const r=await p.evaluate(({G,T})=>{const R=cur();const e=R.persons[0];mmeSaveText(R,e,G);mmeSaveText(R,e,T);return R.companies.map(c=>({u:c.unvan,k:c.kurulus,d:c.durum,dt:c.durumTxt,t:c.terkin,m:c.mersis,vd:c.vd,vkn:c.vkn,s:c.sicil,ft:c.firmaTuru,md:c.mudurluk,sh:c.sehir,sr:c.sermaye,a:c.adres,kep:c.kep,yy:c.yetkiliYok,tm:c.temsilci}))},{G:GLUED,T:TAB});
  const a=r[0]||{};
  ok(a.u==='TASFİYE HALİNDE ÖRNEK GIDA TURİZM TEKSTİL İNŞAAT SANAYİ VE TİCARET LTD.ŞTİ.','Bitişik metin: unvan temiz',a.u);
  ok(a.k==='30.12.1999'&&a.dt==='Terkin Edilmiş'&&a.t==='14.01.2013','Kuruluş, firma durumu ve Terkin Tarihi okundu',a);
  ok(a.m==='0042010601300099'&&a.vd==='ÖRNEK VERGİ DAİRESİ'&&a.vkn==='0420106099'&&a.s==='431199-0','MERSİS no, vergi dairesi / no, sicil no okundu',a);
  ok(a.ft==='ORTAK SAYISI BİRDEN FAZLA LİMİTED ŞİRKET'&&a.md==='İSTANBUL TİCARET SİCİLİ MÜDÜRLÜĞÜ'&&a.sh==='İSTANBUL','Firma türü, sicil müdürlüğü, şehir okundu',a);
  ok(a.sr==='20.000,00 TL'&&/BEŞİKTAŞ\/İSTANBUL$/.test(a.a)&&!a.kep,'Sermaye ve adres okundu; e-tebligat “-” boş sayıldı',a);
  ok(a.yy&&/sınırlı yetkilisi bulunmamaktadır/.test(a.tm||''),'“Firmanın yetkilisi bulunmamaktadır” ve sınırlı yetkili bilgisi alındı',a);
  const t=r[1]||{};ok(t.u==='İKİNCİ ÖRNEK TİCARET LTD.ŞTİ.'&&t.t==='03-04-2015'.replace(/-/g,'-')||t.t==='03.04.2015'||t.t==='03-04-2015','Sekmeli tablo biçimi de doğru okunuyor (Terkin Tarihi dahil)',t);
  ok(t.m==='0111111111100077'&&t.vkn==='1111111177'&&t.sh==='İSTANBUL','Sekmeli biçim: MERSİS, VKN, şehir',t);
  await p.evaluate(()=>{openMersisDetay(cur().companies[0])});await p.waitForTimeout(300);
  const txt=await p.evaluate(()=>document.querySelector('.modal').innerText);
  ok(/Terkin Tarihi\s*14\.01\.2013/.test(txt)&&/Firma Durumu\s*Terkin Edilmiş/.test(txt)&&/BEŞİKTAŞ VERGİ|ÖRNEK VERGİ DAİRESİ \/ 0420106099/.test(txt)&&/Firmanın yetkilisi bulunmamaktadır/.test(txt)&&!/yapıştırılmamış/.test(txt),'Detay ekranı MERSİS sayfası gibi: Terkin Tarihi, vergi dairesi, “yetkilisi bulunmamaktadır”',txt.slice(0,600));
  await p.screenshot({path:path.join(__dirname,'mme_terkin.png')});
  ok(!errs.length,'Sayfa hatası yok',errs);console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
