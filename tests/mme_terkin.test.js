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
  /* üç şirket tek seferde yapıştırılınca üçü de eklenir (pencere üzerinden) */
  await p.evaluate(()=>{document.querySelectorAll('.modal-bg').forEach(x=>x.remove());const R=cur();R.companies=[];renderCard(true)});await p.waitForTimeout(300);
  await p.evaluate(()=>{const pn=[...document.querySelectorAll('.pt-pane')].find(x=>x.querySelector('[data-s="mersis"]'));if(pn){const t=document.querySelector('.pt-tab[data-ptab="'+pn.dataset.pt+'"]');if(t)t.click()}});await p.waitForTimeout(250);
  await p.click('.ent [data-s="mersis"] [data-act="mme-paste"]');await p.waitForTimeout(200);
  const third=GLUED.replace(/TASFİYE HALİNDE ÖRNEK GIDA[^\n]*LTD\.ŞTİ\./,'ÜÇÜNCÜ ÖRNEK ENERJİ A.Ş.').replace('0042010601300099','0333333333300033');
  await p.fill('#mmeTx',GLUED+'\n'+TAB+'\n\n'+third);await p.click('.modal [data-m="ok"]');await p.waitForTimeout(500);
  const m3=await p.evaluate(()=>cur().companies.map(c=>c.unvan+'|'+c.mersis));
  ok(m3.length===3&&m3.some(x=>/^TASFİYE.*\|0042010601300099$/.test(x))&&m3.some(x=>/^İKİNCİ.*\|0111111111100077$/.test(x))&&m3.some(x=>/^ÜÇÜNCÜ ÖRNEK ENERJİ A\.Ş\.\|0333333333300033$/.test(x)),'Üç MERSİS sayfası tek seferde yapıştırılınca üç ayrı şirket eklendi',m3);
  await p.evaluate(()=>{const pn=[...document.querySelectorAll('.pt-pane')].find(x=>x.querySelector('[data-s="mersis"]'));if(pn){const t=document.querySelector('.pt-tab[data-ptab="'+pn.dataset.pt+'"]');if(t)t.click()}});await p.waitForTimeout(250);
  const rows=await p.evaluate(()=>document.querySelector('.ent [data-s="mersis"] .mme-res').querySelectorAll('[data-act="mme-detay"]').length);ok(rows===3,'MERSİS sonuç listesinde 3 şirket görünüyor',rows);
  /* aynı şirketi föydeki başka bir kişiye (kefil) yapıştırmak: kopya yok, şirket iki kişinin altında da görünür */
  const k=await p.evaluate((G)=>{const R=cur();const kf=newPerson({ad:'KURGU KEFİL',kimlik:'',rol:'Kefil'});kf.src=emptySrc();R.persons.push(kf);const n0=R.companies.length;
    const c=mmeSaveText(R,kf,G);S.tab='mersis';renderCard(true);mmeRefresh();const box=document.getElementById('mmeBox');
    const grp=[...box.querySelectorAll('.mme-pg')].map(g=>({h:g.querySelector('.mme-gh b').textContent,n:g.querySelectorAll('[data-act="mme-detay"]').length,t:g.textContent}));
    return {n0,n1:R.companies.length,own:mmeOwners(R,c).map(x=>x.ad),kc:mmeCos(R,kf).length,grp}},GLUED);
  ok(k.n1===k.n0&&k.own.includes('TEST BORÇLU')&&k.own.includes('KURGU KEFİL')&&k.kc===1,'Aynı MERSİS no’lu şirket kefile yapıştırılınca kopya oluşmadı, iki kişiye de bağlandı',k);
  const gk=k.grp.find(g=>g.h==='KURGU KEFİL'),gb=k.grp.find(g=>g.h==='TEST BORÇLU');
  ok(gk&&gk.n===1&&/TASFİYE/.test(gk.t)&&gb&&gb.n===3&&/ayrıca: KURGU KEFİL/.test(gb.t),'Föy MERSİS sekmesinde kayıtlar kişi kişi: kefilin şirketi kefilin altında da görünüyor',k.grp.map(g=>g.h+':'+g.n));
  ok(!errs.length,'Sayfa hatası yok',errs);console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
