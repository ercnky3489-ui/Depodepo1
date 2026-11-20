/* Ticaret Sicili Gazetesi ayrıştırıcısı (uygulamanın içinden alınır) · kurgusal ilan metinleriyle — node tsg_parse.test.js <app.html> */
const fs=require('fs'),path=require('path');const APP=path.resolve(process.argv[2]);const src=fs.readFileSync(APP,'utf8');
const a=src.indexOf('/* ===================== Ticaret Sicili Gazetesi · metin ayrıştırma'),b=src.indexOf('/* ===================== Ticaret Sicili Gazetesi · föy bölümü');
if(a<0||b<0){console.error('Ayrıştırıcı uygulamada bulunamadı');process.exit(2)}
const T={};new Function('T',src.slice(a,b)+';Object.assign(T,{tsgParse,tsgHeader,tsgAggregate,tsgTcOk});')(T);
let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x).slice(0,700):''))}};
/* kurgusal kişiler; TCKN'ler doğrulama algoritmasına uygun uydurma numaralar */
const mkTc=b9=>{const d=b9.split('').map(Number);const d10=(((d[0]+d[2]+d[4]+d[6]+d[8])*7-(d[1]+d[3]+d[5]+d[7]))%10+10)%10;const d11=(d.reduce((x,y)=>x+y,0)+d10)%10;return b9+d10+d11};
const A=mkTc('100000001'),B=mkTc('200000002'),C=mkTc('300000003');
const P1=`ŞİRKETLER

ANKARA

Ankara Ticaret Sicili
Memurluğu'ndan

Sicil No: 100001

Ticaret Ünvanı:
DENEME YAPI İNŞAAT SANAVİ
TİCARET LİMİTED ŞİRKETİ

Adres: Örnek Mahallesi 1. Sokak
No: 2/3 Çankaya/Ankara

Yukarıda ticaret sicili numarası,
ünvanı ve adresi yazılı şirkete ait
aşağıdaki hususların 10.01.2012
tarihinde tescil edildiği ilan olunur.

Konu: Yeni Kuruluş

Sermaye: 20.000,00 TL

Kuruluş:
Madde 1-
Aşağıda adları soyadları yazılı
kurucular arasında bir limited
şirket kurulmuştur.

1- Ayşe Deneme; Örnek Mahallesi
5. Sokak No: 1 Çankaya/Ankara
${A} T.C. Uyruğundadır.

2- Mehmet Sınama ${B}-
T.C. Uyruklu Test Mahallesi
Yenimahalle/Ankara

Sermaye:
Madde 6-
Şirketin sermayesi 20.000,00 TL'dir.
600 paya karşılık olan 15.000,00 TL'si Ayşe Deneme'ye
200 paya karşılık olan 5.000,00 TL'si Mehmet Sınama'ya
aittir.

Şirketin İdaresi:
Madde 8-
İlk 5 yıl için Ayşe Deneme şirket
müdürü olarak seçilmiştir.
(5/A)(10/100001)`;
const P2=`Ankara Ticaret Sicili
Müdürlüğü'nden

Sicil No: 100001

Ticaret Ünvanı:
DENEME YAPI İNŞAAT SANAYİ
TİCARET LİMİTED ŞİRKETİ

Adres: Yeni Mahalle Cadde No: 9
Keçiören/Ankara

Yukarıda ticaret sicili numarası,
ünvanı ve adresi yazılı şirkete ait
aşağıdaki hususların 20.05.2015
tarihinde tescil edildiği ilan olunur.

Konu: Hisse Devri, Adres Değişikliği, Sermaye Artırımı

Ortaklar kurulu kararı ile Mehmet Sınama
şirketteki 200 adet hissesinin tamamını
Can Örnek'e devretmiştir. Şirketin
adresi Yeni Mahalle Cadde No: 9
Keçiören/Ankara olarak değiştirilmiştir.
Şirketin sermayesi 20.000,00 TL'den
80.000,00 TL'ye artırılmıştır.
(7/A)(20/100002)

İzmir Ticaret Sicili
Müdürlüğü'nden

Sicil No: 55501

Ticaret Ünvanı:
ÖRNEK GIDA ANONİM ŞİRKETİ

Adres: Alsancak Mahallesi 3. Sokak
No: 1 Konak/İzmir

Yukarıda ticaret sicili numarası,
ünvanı ve adresi yazılı şirkete ait
aşağıdaki hususların 02.03.2018
tarihinde tescil edildiği ilan olunur.

Konu: Tasfiyeye Giriş

Şirketin tasfiyeye girmesine,
tasfiye memuru olarak "Ayşe Deneme"
seçilmesine karar verilmiştir.
(9/A)(30/100003)`;
const h=T.tsgHeader('30 MART 2011 SAYI : 7783   TÜRKİYE TİCARET SİCİLİ GAZETESİ   SAYFA : 57');ok(h.tarih==='30.03.2011'&&h.sayi==='7783'&&h.sayfa===57,'Sayfa başlığı: tarih, sayı, sayfa',h);
const h2=T.tsgHeader('SAYFA : 58   TÜRKİYE TİCARET SİCİLİ GAZETESİ   30 MARTI 2011 SAYI : 7783');ok(h2.tarih==='30.03.2011'&&h2.sayfa===58,'Çift sayfa başlığı ve OCR hatalı ay adı',h2);
ok(T.tsgTcOk(A)&&!T.tsgTcOk('12345678901'),'TCKN doğrulama');
const r1=T.tsgParse([{p:1,gp:10,t:P1}]);const i1=r1.ilanlar[0];
ok(r1.ilanlar.length===1&&i1.sicil==='100001'&&i1.unvan==='DENEME YAPI İNŞAAT SANAYİ TİCARET LİMİTED ŞİRKETİ'&&i1.tescil==='10.01.2012'&&i1.konu==='Yeni Kuruluş'&&i1.sermaye.txt==='20.000,00 TL'&&/Çankaya\/Ankara/.test(i1.adres),'İlan başlığı: sicil, ünvan (OCR düzeltmesi), tescil, konu, sermaye, adres',i1);
const ay=i1.kisiler.find(k=>k.ad==='Ayşe Deneme'),me=i1.kisiler.find(k=>k.ad==='Mehmet Sınama');
ok(ay&&ay.tc===A&&ay.tcOk&&me&&me.tc===B,'Kurucular TCKN ile (iki farklı yazım biçimi)',i1.kisiler.map(k=>[k.ad,k.tc]));
ok(ay&&ay.roller.some(r=>r.r==='Kurucu ortak')&&ay.roller.some(r=>r.r==='Müdür'&&r.sure==='5 yıl')&&ay.pay&&ay.pay.tutar==='15.000,00 TL'&&me.pay&&me.pay.adet===200,'Roller ve paylar',{ay:ay&&[ay.roller.map(r=>r.r),ay.pay],me:me&&me.pay});
ok(ay.src[0]&&ay.src[0].p===1&&ay.src[0].gp===10&&/Ayşe Deneme/.test(ay.src[0].snip),'Her bilginin kaynağı: PDF sayfası, gazete sayfası, metin parçası',ay.src[0]);
const r2=T.tsgParse([{p:1,gp:22,t:P2},{p:2,gp:23,t:'(Devamı 24. Sayfada)'}]);
ok(r2.ilanlar.length===2,'İki ilan ayrıldı',r2.ilanlar.map(i=>i.unvan));
const ag=T.tsgAggregate([{id:'d2',name:'b.pdf',gTarih:'25.05.2015',ana:r2},{id:'d1',name:'a.pdf',gTarih:'15.01.2012',ana:r1}]);
ok(ag.ilan.map(i=>i.tescil).join(',')==='10.01.2012,20.05.2015,02.03.2018','Farklı PDF\'lerin ilanları tarih sırasıyla birleşti',ag.ilan.map(i=>i.tescil));
const co=ag.sirketler.find(c=>c.sicil==='100001'),gi=ag.sirketler.find(c=>c.sicil==='55501');
ok(co&&co.adresler.length===2&&/Keçiören/.test(co.adresler[1].v)&&co.sermayeler.map(s=>s.v).join('→')==='20.000,00 TL→80.000,00 TL','Adres geçmişi ve sermaye değişikliği',co&&{a:co.adresler.map(x=>x.v),s:co.sermayeler.map(x=>x.v)});
const k=n=>co.kisiler.find(q=>q.ad===n);
ok(k('Mehmet Sınama')&&k('Mehmet Sınama').guncel===false&&k('Can Örnek')&&k('Can Örnek').guncel===true&&k('Ayşe Deneme').guncel===true,'Pay devri: devreden geçmiş, devralan güncel ortak',co.kisiler.map(q=>[q.ad,q.guncel]));
ok(co.kisiler.filter(q=>q.ad==='Mehmet Sınama').length===1,'Aynı kişi (TCKN\'li ve TCKN\'siz ilan) tek kayıt');
ok(gi&&gi.durum==='Tasfiye halinde'&&gi.kisiler.some(q=>q.ad==='Ayşe Deneme'&&q.gorevler.includes('Tasfiye memuru')),'Tasfiye ve tasfiye memuru',gi&&{d:gi.durum,k:gi.kisiler.map(q=>[q.ad,q.gorevler])});
const rel=ag.iliskiler.find(x=>x.ad==='Ayşe Deneme');ok(rel&&rel.sirketler.length===2,'Şirketler arası ilişki: aynı kişi iki şirkette',ag.iliskiler.map(x=>[x.ad,x.sirketler.map(s=>s.unvan)]));
console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);process.exit(fail?1:0);
