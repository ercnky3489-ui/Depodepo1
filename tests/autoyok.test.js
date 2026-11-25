/* GİB “kayıt yok → otomatik” notu, sonradan girilen olumlu MERSİS/TSG/E-Vergi kaydıyla çelişmez (kurgusal) — node autoyok.test.js <app.html> */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const APP=path.resolve(process.argv[2]||'../out55.html');let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x).slice(0,700):''))}};
const FIRM=`Firma Bilgileri
Unvan
KURGU ÖRNEK LİMİTED ŞİRKETİKuruluş Tarihi 08-03-2006Firma Durumu Aktif
MERSİS No
0453061811700099VergiDairesi/No
ÖRNEK VERGİ DAİRESİ / 4530618117Ticaret Sicil No / Dosya No
123456`;
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>localStorage.setItem('ia-arastiran','Test'));await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(1200);
  await p.evaluate(async()=>{await Store.savePortfolio('pA',{name:'A',importedAt:'2026-11-01T10:00:00Z',count:1},[{i:0,ad:'KURGU KİŞİ',kimlik:'11111111110',sirket:false,m:'1',m2:'',gib:'',anapara:5,toplam:10,not:'',kef:[],x:{}}]);
    const pr=newPerson({ad:'KURGU KİŞİ',kimlik:'11111111110',rol:'Borçlu'});pr.src=emptySrc();pr.src.gib={s:'yok',n:''};gibAutoYok(pr,'yok');
    await Store.saveResearch({pid:'pA',idx:0,durum:'devam',sonuc:'',updatedAt:new Date().toISOString(),persons:[pr],companies:[]})});
  await p.reload();await p.waitForTimeout(1500);await p.evaluate(async()=>{document.querySelectorAll('.modal-bg').forEach(x=>x.remove());await openPortfolio('pA');showScreen('dosyalar');select(0)});await p.waitForTimeout(500);
  let r=await p.evaluate(()=>{const e=cur().persons[0];return ['mersis','tsg','levha'].map(k=>e.src[k].s+'|'+e.src[k].n)});
  ok(r.every(x=>/^yok\|GİB kaydı yok → otomatik$/.test(x)),'Başlangıç: GİB kaydı yok → MERSİS/TSG/E-Vergi otomatik “yok”',r);
  r=await p.evaluate(F=>{const R=cur();const e=R.persons[0];mmeSaveText(R,e,F);e.levhalar=[{yil:'2024',vkn:'1111111111'}];e.src.tsg.s='var';touch(R);renderCard(true);
    return {m:e.src.mersis,t:e.src.tsg,l:e.src.levha,html:document.querySelector('.ent').textContent}},FIRM);
  ok(r.m.s==='var'&&!/otomatik/.test(r.m.n)&&/KURGU ÖRNEK/.test(r.m.n),'MERSİS şirketi girilince kaynak “var”, not şirket adını gösteriyor (otomatik not yok)',r.m);
  ok(r.t.s==='var'&&!r.t.n,'TSG “var” yapılınca otomatik not silindi',r.t);
  ok(r.l.s==='var'&&!r.l.n,'E-Vergi levhası girilince kaynak “var”, otomatik not silindi',r.l);
  ok(!/GİB kaydı yok → otomatik/.test(r.html),'Kartta “GİB kaydı yok → otomatik” yazısı kalmadı');
  r=await p.evaluate(()=>{const e=newPerson({ad:'KURGU İKİ',rol:'Kefil'});e.src=emptySrc();e.src.gib={s:'yok',n:''};gibAutoYok(e,'yok');const R=cur();R.persons.push(e);touch(R);return e.src.mersis});
  ok(r.s==='yok'&&/otomatik/.test(r.n),'Olumlu kayıt yoksa otomatik “yok” olduğu gibi kalıyor',r);
  ok(!errs.length,'Sayfa hatası yok',errs);console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
