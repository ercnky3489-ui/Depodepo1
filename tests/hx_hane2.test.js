/* Metinden hane ekle · sorgu sonuç dosyası biçimi (Sorgulanan TCKN;Durum;Yakınlık;…) — node hx_hane2.test.js <app.html> */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const APP=path.resolve(process.argv[2]||'../out30.html');const FX=path.join(__dirname,'fxhx','Dosya Durum Rapor.xlsx');
let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x):''))}};
const U=`Sorgulanan TCKN;Durum;Yakınlık;TCKN;Adı;Soyadı;Doğum Tarihi;Anne Adı;Anne TC;Baba Adı;Baba TC;Nüfus İl;Nüfus İlçe
"=""26237484826""";Bulundu;KENDİSİ;"=""26237484826""";OKTAY;ŞAHİNER;1976-06-15;SONA;"=""26255484242""";ERDOĞAN;"=""26288483168""";Sivas;Suşehri
"=""26237484826""";Bulundu;ANNE;"=""26255484242""";SONA;ŞİMŞEK;1955-04-30;FATMA;-;NAZİM;-;Erzurum;Horasan
"=""26237484826""";Bulundu;BABA;"=""26288483168""";ERDOĞAN;ŞAHİNER;1953-01-01;NAZİFE;"=""34693758702""";HİLMİ;"=""34696758648""";Sivas;Suşehri`;
const T=U.replace(/26237484826/g,'10000000146')+`\n"=""40000000442""";Bulunamadı;;;;;;;;;;;\n"=""40000000442""";Bulundu;EŞİ;"=""40000000777""";SELİN;ŞAHİN;1978-06-06;-;-;-;-;Ankara;Çankaya`;
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:1000}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{localStorage.setItem('ia-arastiran','Test Kullanıcı')});
  await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(1200);await p.addScriptTag({path:path.join(__dirname,'node_modules/xlsx/dist/xlsx.full.min.js')});
  await p.evaluate(()=>{document.querySelectorAll('.modal-bg').forEach(x=>x.remove());hxSetMode(true)});await p.waitForFunction(()=>HX.ready===true,null,{timeout:20000});
  console.log('\n1) Sizin örneğiniz birebir okunuyor');
  const r=await p.evaluate(t=>parseHane(t),U);console.log('   ',JSON.stringify(r.map(x=>[x.yakinlik||'KENDİSİ',x.kimlik,x.ad,x.dogum,x.anneAdi,x.anneTckn,x.babaAdi,x.babaTckn,x.dogumYeri,x.sq])));
  ok(r.length===3,'3 satır okundu',r.length);
  ok(r[0].self&&r[0].kimlik==='26237484826'&&r[0].ad==='OKTAY ŞAHİNER'&&r[0].dogum==='15.06.1976'&&r[0].anneAdi==='SONA'&&r[0].anneTckn==='26255484242'&&r[0].babaAdi==='ERDOĞAN'&&r[0].babaTckn==='26288483168'&&r[0].dogumYeri==='Sivas / Suşehri','KENDİSİ: TCKN, ad soyad, doğum, anne/baba ve TC’leri, nüfus il/ilçe doğru',r[0]);
  ok(r[1].yakinlik==='Anne'&&r[1].kimlik==='26255484242'&&r[1].ad==='SONA ŞİMŞEK'&&r[1].anneTckn===''&&r[1].dogumYeri==='Erzurum / Horasan','ANNE satırı (“-” boş sayılıyor)',r[1]);
  ok(r[2].yakinlik==='Baba'&&r[2].babaTckn==='34696758648','BABA satırı',r[2]);
  const g=await p.evaluate(t=>haneGroups(t).map(x=>({s:x.self&&x.self.kimlik,m:x.mem.length})),U);ok(g.length===1&&g[0].s==='26237484826'&&g[0].m===2,'Sorgulanan TCKN’ye göre tek hane, 2 birey',g);
  ok(await p.evaluate(t=>anaDetect(t),U)==='hane','Dosya bırakma alanı bu biçimi hane olarak tanıyor');
  console.log('\n2) İçe aktarma: eşleşme ve ekleme (TCKN ALİ ve EMRE’ye uyarlanmış örnek)');
  await p.evaluate(()=>hxShow('yukle'));await p.waitForTimeout(150);await p.setInputFiles('#hxFile',[FX]);await p.waitForFunction(()=>HXI.files.length>0&&!HXI.prog);
  await p.click('[data-hx-act="commit"]');await p.click('.modal [data-m="ok"]');await p.waitForFunction(()=>!HXI.busy&&!HXI.files.length,null,{timeout:30000});await p.waitForTimeout(800);
  await p.click('#bottomNav .bn.hxn[data-hxb="aktar"]');await p.waitForTimeout(600);await p.click('#aktarScreen [data-ana-imp="hane"]');await p.waitForSelector('#hbkTxt');
  await p.fill('#hbkTxt',T);await p.click('#hbkPrevBtn');await p.waitForTimeout(300);
  const sum=await p.evaluate(()=>document.querySelector('#hbkPrev .gbk-sum').innerText.replace(/\s+/g,' '));ok(/2 hane eşlendi/.test(sum)&&/3 hane bireyi/.test(sum),'2 hane eşlendi, 3 birey (“Bulunamadı” satırı atlandı)',sum);
  await p.click('#hbkGo');await p.waitForTimeout(1200);await p.evaluate(()=>document.querySelectorAll('.modal-bg').forEach(x=>x.remove()));
  await p.click('#bottomNav .bn.hxn[data-hxb="dosyalar"]');await p.waitForTimeout(800);
  const f=await p.evaluate(()=>{const g=m=>{const d=S.debtors.find(x=>x.m2===m);return S.research.get(d.i).persons.map(x=>[x.ad,x.rol,x.yakinlik||'',x.kimlik,x.dogum||''].join('|'))};return {a:g('2024/1111'),e:g('2025/4444')}});
  console.log('   ',JSON.stringify(f));
  ok(f.a.some(x=>x==='SONA ŞİMŞEK|Hane|Anne|26255484242|30.04.1955')&&f.a.some(x=>/^ERDOĞAN ŞAHİNER\|Hane\|Baba/.test(x)),'ALİ’nin föyüne anne ve baba Hane olarak eklendi',f.a);
  ok(f.a.some(x=>/^ALİ YILMAZ\|Borçlu\|\|10000000146\|15\.06\.1976/.test(x)),'Borçlunun adı değişmedi; yalnız boş doğum tarihi dolduruldu',f.a);
  ok(f.e.some(x=>/^SELİN ŞAHİN\|Hane\|Eş/.test(x)),'KENDİSİ satırı olmasa da Sorgulanan TCKN ile EMRE’nin hanesine eklendi',f.e);
  console.log('\nSayfa hataları:',errs.length?errs:'yok');if(errs.length)fail++;
  console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
