/* UYAP şirket hisse / ortaklık kayıtları → ilgili kişinin İstihbarat › MERSİS’i; eski föyler de güncellenir (kurgusal) — node uyapmersis.test.js <app.html> */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const APP=path.resolve(process.argv[2]||'../out55.html');let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x).slice(0,700):''))}};
const T1='10000000146',T2='20000000002',MS1='0111111111100011',MS2='0222222222200022';
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:1300,height:950}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>localStorage.setItem('ia-arastiran','Test'));await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(1200);
  await p.evaluate(async({T1,T2,MS1})=>{const row=(i,ad,k,kef)=>({i,ad,kimlik:k,sirket:false,m:'',m2:'',gib:'',anapara:null,toplam:10,not:'',kef:kef||[],x:{}});
    await Store.savePortfolio('pA',{name:'A',importedAt:'2026-11-01T10:00:00Z',count:3},[row(0,'KURGU BİR',T1),row(1,'KURGU İKİ',T2,[{ad:'KURGU BİR',kimlik:T1,rol:'Kefil'}]),row(2,'KURGU ÜÇ','30000000003')]);
    const pr=newPerson({ad:'KURGU BİR',kimlik:T1,rol:'Borçlu'});pr.src=emptySrc();pr.src.mersis={s:'',n:''};
    const c0=newCompany({unvan:'BİRİNCİ KURGU A.Ş.',kaynakKisi:pr.id,iliski:'Borçlunun ortak/yetkili olduğu şirket'});c0.mersis=MS1;c0.durum='Aktif';c0.sicil='999';
    await Store.saveResearch({pid:'pA',idx:0,durum:'devam',sonuc:'',updatedAt:'2026-11-20T10:00:00Z',persons:[pr],companies:[c0]});
    const p3=newPerson({ad:'KURGU ÜÇ',kimlik:'30000000003',rol:'Borçlu'});p3.src=emptySrc();await Store.saveResearch({pid:'pA',idx:2,durum:'',sonuc:'',updatedAt:'2026-11-20T10:00:00Z',persons:[p3],companies:[]})},{T1,T2,MS1});
  await p.reload();await p.waitForTimeout(800);
  /* UYAP (HANSOFT) dizini: T1 iki şirkette ortak (biri aktif, biri pasif); T3 hiç yok */
  await p.evaluate(({T1,MS1,MS2})=>{HX.ready=true;HX.data=Object.assign(HX.data||{},{hx_debtors:[{id:'d1',tckn:T1,ad:'KURGU BİR'}],hx_research:[
      {type:'ortaklik',debtorId:'d1',sorguTarihi:'2026-11-10',alan:{'Firma Unvanı':'BİRİNCİ KURGU A.Ş.','Mersis No':MS1,'Aktif mi':'Aktif','Görev':'Ortak','Başlangıç Tarihi':'01.01.2015'}},
      {type:'ortaklik',debtorId:'d1',sorguTarihi:'2026-11-10',alan:{'Firma Unvanı':'ESKİ KURGU LTD. ŞTİ.','Mersis No':MS2,'Aktif mi':'Pasif','Görev':'Müdür','Başlangıç Tarihi':'01.01.2010','Bitiş Tarihi':'01.01.2012'}}]})},{T1,MS1,MS2});
  await p.waitForFunction(()=>AG.st&&AG.st.lastFull&&!AG.busy,null,{timeout:30000});await p.evaluate(async()=>{AG.st.lastFull=0;await agCycle('test')});await p.waitForTimeout(1200);
  const r=await p.evaluate(async()=>{const L=await pccLoadResearch('pA',3);const g=i=>{const R=L.find(x=>x.idx===i)||S.research.get(i);return R?{p:R.persons.map(x=>({ad:x.ad,rol:x.rol,m:x.src&&x.src.mersis})),c:R.companies.map(c=>({u:c.unvan,ms:c.mersis,s:c.sicil,uy:(c.uyap||[]).map(u=>u.gorev+'/'+u.aktif),kk:(R.persons.find(x=>x.id===c.kaynakKisi)||{}).ad,il:c.iliski})),cos:R.persons.map(x=>mmeCos(R,x).length)}:null};
    return {f0:g(0),f1:g(1),f2:g(2),note:AG.st.ag.uyapmersis.note}});
  const f0=r.f0;
  ok(f0&&f0.c.length===2,'Föy 1: UYAP’taki 2 şirket MERSİS kayıtlarında (aynı MERSİS no’lu mevcut şirket kopyalanmadı)',f0&&f0.c);
  const a=f0.c.find(c=>c.ms==='0111111111100011'),e=f0.c.find(c=>c.ms==='0222222222200022');
  ok(a&&a.s==='999'&&a.uy.join()==='Ortak/true','Mevcut şirketin bilgileri korunmuş, UYAP ortaklığı eklenmiş',a);
  ok(e&&e.u==='ESKİ KURGU LTD. ŞTİ.'&&e.kk==='KURGU BİR'&&/Geçmiş/.test(e.il)&&e.uy.join()==='Müdür/false','Pasif ortaklık “Geçmiş ortaklık (UYAP)” olarak kişiye bağlandı',e);
  ok(f0.p[0].m&&f0.p[0].m.s==='var'&&/^MERSİS: BİRİNCİ KURGU/.test(f0.p[0].m.n)&&/UYAP: ortaklık hisse haczi tespit edildi — ESKİ KURGU LTD\. ŞTİ\. \(Müdür, pasif\)/.test(f0.p[0].m.n)&&f0.cos[0]===2,'Kişinin MERSİS’i “var”; not UYAP’tan geldiğini söylüyor (“ortaklık hisse haczi tespit edildi”)',f0.p[0]);
  ok(r.f1&&r.f1.p.some(x=>x.ad==='KURGU BİR'&&x.rol==='Kefil')&&r.f1.cos[r.f1.p.findIndex(x=>x.ad==='KURGU BİR')]===2,'Eski föy (kartı olmayan, kişi kefil): kart açıldı, şirketler kefilin MERSİS’ine eklendi',r.f1);
  ok(r.f2&&r.f2.c.length===0&&!(r.f2.p[0].m&&r.f2.p[0].m.s==='var'),'UYAP kaydı olmayan kişiye dokunulmadı',r.f2);
  const au=await p.evaluate(async()=>JSON.stringify((await agAuditLoad()).rows||[]).match(/UYAP hisse kayıtları MERSİS’e eklendi/g));ok(au&&au.length===2,'Ajan iki föyü güncelledi, denetim kaydına yazdı',{au:au&&au.length,note:r.note});
  await p.evaluate(async()=>{AG.st.lastFull=0;await agCycle('tekrar')});await p.waitForTimeout(800);
  const r2=await p.evaluate(async()=>{const L=await pccLoadResearch('pA',3);return {n:L.find(x=>x.idx===0).companies.length,uy:L.find(x=>x.idx===0).companies.map(c=>(c.uyap||[]).length),note:AG.st.ag.uyapmersis.note}});
  ok(r2.n===2&&r2.uy.join()==='1,1'&&/güncellenecek kayıt yok/.test(r2.note),'İkinci taramada kopya oluşmadı',r2);
  await p.evaluate(async()=>{await openPortfolio('pA');showScreen('dosyalar');select(0);S.tab='mersis';renderCard(true);mmeRefresh()});await p.waitForTimeout(400);
  const t=await p.evaluate(()=>document.getElementById('mmeBox').innerText);ok(/UYAP · ortaklık hisse haczi tespit edildi: Ortak · aktif/.test(t)&&/UYAP · ortaklık hisse haczi tespit edildi: Müdür · pasif/.test(t),'Föy MERSİS sekmesinde UYAP ortaklık etiketi görünüyor',t.slice(0,400));
  /* Aşamalar › MERSİS: her şirket ayrı satır, UYAP hisse haczi işaretli; UYAP kaynak madalyonları yok */
  const as=await p.evaluate(()=>{const rows=asRows().filter(r=>r.k==='me');const f0=rows.filter(r=>r.d.i===0).map(r=>r.f[0]+'|'+r.f[1]);const f1=rows.filter(r=>r.d.i===1).map(r=>r.f[0]+'|'+r.f[1]);
    S.asK='me';S.asView='tablo';S.asDur='all';const h=asHTML();S.asView='levha';const hl=asHTML();return {f0,f1,hxas:HXAS.length,tbl:/Hisse haczi \(UYAP\)/.test(h)&&/UYAP: Müdür · pasif/.test(h)&&/data-mlv=/.test(h),seg:/Şirket levhaları/.test(h),lvb:(hl.match(/class="me-c lv-c/g)||[]).length}});
  ok(as.f0.length===2&&as.f0.some(x=>/^BİRİNCİ KURGU A\.Ş\.\|🏢 Şirket/.test(x))&&as.f0.some(x=>/^ESKİ KURGU LTD\. ŞTİ\.\|⚖ Hisse haczi \(UYAP\)/.test(x)),'Aşamalar › MERSİS: her şirket ayrı satır; UYAP’tan gelen “⚖ Hisse haczi (UYAP)” diye ayrılıyor',as);
  ok(as.f1.length===2&&as.f1.every(x=>/Hisse haczi/.test(x)),'Kefil olan kişinin UYAP şirketleri de satır satır',as.f1);
  ok(as.hxas===0,'Aşamalar’da UYAP kaynak madalyonları (Şirket hacizleri, MERSİS/İSKİ/MERNİS adres, GİB) yok',as.hxas);
  ok(as.tbl&&as.seg&&as.lvb>=2,'MERSİS tablosunda hisse haczi rozeti + UYAP görevi + Levha yapıştır; “Şirket levhaları” panosunda şirket kartları',as);
  /* Şirket levhaları panosu: “🏛 MERSİS güncelle” → yapıştırınca şirketin VKN / vergi dairesi / durumu güncellenir */
  await p.evaluate(()=>{showScreen('asama');S.asK='me';S.asView='levha';S.asDur='all';renderAsama()});await p.waitForTimeout(300);
  const upb=await p.$('#asamaScreen [data-meup]');ok(!!upb,'Şirket kartında “🏛 MERSİS güncelle” düğmesi');
  if(upb){const eid=await upb.getAttribute('data-eid');const di=+(await upb.getAttribute('data-meup'));await upb.click();await p.waitForTimeout(250);
    const ttl=await p.evaluate(()=>[...document.querySelectorAll('.modal h3')].pop().textContent);
    const un=await p.evaluate(({di,eid})=>meFind(di,eid).e.unvan,{di,eid});const ms=await p.evaluate(({di,eid})=>meFind(di,eid).e.mersis,{di,eid});
    await p.fill('#mePx',`Firma Bilgileri\nUnvan\n${un}Kuruluş Tarihi 01-02-2005Firma Durumu Aktif\nMERSİS No\n${ms}VergiDairesi/No\nÖRNEK VERGİ DAİRESİ / ${ms.slice(1,11)}Ticaret Sicil No / Dosya No\n4242\nFirma Türü\nLİMİTED ŞİRKET`);
    await p.click('.modal [data-m="ok"]');await p.waitForTimeout(500);
    const up=await p.evaluate(({di,eid})=>{const e=meFind(di,eid).e;const card=[...document.querySelectorAll('#asamaScreen .lv-c')].find(c=>c.querySelector('[data-eid="'+eid+'"]'));return {vkn:e.vkn,vd:e.vd,du:e.durum,sc:e.sicil,card:card?card.innerText:''}},{di,eid});
    ok(/MERSİS güncelle/.test(ttl)&&up.vkn===ms.slice(1,11)&&up.vd==='ÖRNEK VERGİ DAİRESİ'&&up.du&&up.sc==='4242','MERSİS yapıştırılınca şirketin VKN, vergi dairesi, durum ve sicili güncellendi',{ttl,up});
    ok(up.card.includes(ms.slice(1,11))&&!/VKN yok/.test(up.card),'Panodaki kartta artık VKN görünüyor',up.card.slice(0,300))}
  /* Toplu sonuçlar ve Toplu detay: birden çok şirket satır satır */
  const tv=await p.evaluate(()=>{S.tab='toplu';S.tsSrc='mersis';renderCard(true);const tb=document.querySelector('#tsBox table.ts-dt');const rows=tb?[...tb.querySelectorAll('tbody tr')].map(r=>r.innerText.replace(/\s+/g,' ')):[];
    S.tab='tdetay';renderCard(true);try{tdRefresh()}catch(e){}const col=document.querySelector('#tdBox .td-col.c-mersis');const it=col&&[...col.querySelectorAll('.td-it')].find(x=>/KURGU BİR/.test(x.innerText));
    return {rows,cos:it?[...it.querySelectorAll('.td-co')].map(x=>x.innerText.replace(/\s+/g,' ')):[]}});
  ok(tv.rows.length===2&&/BİRİNCİ KURGU/.test(tv.rows[0])&&/ESKİ KURGU/.test(tv.rows[1])&&/UYAP hisse haczi · Müdür · pasif/.test(tv.rows[1]),'Toplu sonuçlar › MERSİS: her şirket ayrı satır (UYAP kaynağı yazıyor)',tv.rows);
  ok(tv.cos.length===2&&/^1\. BİRİNCİ KURGU/.test(tv.cos[0])&&/^2\. ESKİ KURGU/.test(tv.cos[1])&&/UYAP hisse haczi: Müdür · pasif/.test(tv.cos[1]),'Toplu detay › MERSİS: şirketler numaralı, ayrı ayrı',tv.cos);
  await p.screenshot({path:path.join(__dirname,'td_mersis.png')});
  ok(!errs.length,'Sayfa hatası yok',errs);console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
