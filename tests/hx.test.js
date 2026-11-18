/* HX (İstanbul Varlık · UYAP & Haciz) kabul testleri — node hx.test.js <uygulama.html>
   SENTETİK veri; kolon adları HX içe aktarıcısının tanıdığı HANSOFT başlıklarıdır. Uygulama http üzerinden açılır
   (Chromium file:// adreslerinde yenilemede localStorage yazımlarını ara sıra kaybediyor — lsprobe.js). */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');const XLSX=require('xlsx');
const APP=path.resolve(process.argv[2]||'../out18.html');const OUT=path.join(__dirname,'fxhx');fs.mkdirSync(OUT,{recursive:true});
const book=(name,aoa)=>{const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(aoa),'HANSOFT');const p=path.join(OUT,name);XLSX.writeFile(wb,p);return p};
const TC={A:'10000000146',B:'20000000214',C:'30000000378',E:'40000000442',F:'50000000506'};
const H=['Kurum','Dosya Ref','Uyap Dosya ID','Kişikurum ID','İcra Dairesi','İcra No','Dosya ID','Borçlu Adı','Borçlu TCKN','Borçlu VKN','Borçlu Türü','Toplam Alacak','Dosya Durumu','Dosya Aşama','Kesinleşme Durumu','Tebliğ Tarihi'];
const F={
 durum:book('Dosya Durum Rapor.xlsx',[H,
  ['İSTANBUL VARLIK','R-1','U-1',501,'İSTANBUL 12. İCRA DAİRESİ','2024/1111',1001,'ALİ YILMAZ',TC.A,'','Kişi',250000,'Açık','Tebliğ','Takip kesinleşmiş','2026-10-01'],
  ['İSTANBUL VARLIK','R-1','U-1',502,'İSTANBUL 12. İCRA DAİRESİ','2024/1111',1002,'VELİ KAYA',TC.B,'','Kişi',250000,'Açık','Tebliğ','Takip bu borçlu için kesinleşmemiş','2026-10-01'],
  ['İSTANBUL VARLIK','R-2','U-2',503,'İSTANBUL 3. İCRA DAİRESİ','2023/2222',1003,'CAN DEMİR',TC.C,'','Kişi',900000,'Kapalı - İnfaz','Tebliğ','Takip kesinleşmiş','2026-01-01'],
  ['İSTANBUL VARLIK','R-3','U-3',504,'ANKARA 5. İCRA DAİRESİ','2022/3333',1004,'DELTA İNŞAAT LTD. ŞTİ.','','1234567890','Kurum',400000,'Dosyada vekil kaydınız bulunmamaktadır','Tebliğ','Takip kesinleşmiş','2026-02-01'],
  ['BAŞKA KURUM A.Ş.','R-4','U-4',505,'ANKARA 1. İCRA DAİRESİ','2025/4444',1005,'EMRE ŞAHİN',TC.E,'','Kişi',120000,'Açık','Tebliğ','Takip kesinleşmiş','2026-09-01']]),
 mersis:book('Mersis.xlsx',[['Dosya ID','Borçlu Adı','Mersis Adresi','Faaliyet Durumu','Sorgu Tarihi'],[1001,'ALİ YILMAZ','İKİTELLİ OSB 4. CAD. NO:20','Faal','2026-11-03']]),
 mernis:book('Mernis.xlsx',[['Dosya ID','Borçlu Adı','Mernis Adresi','Mernis İl','Mernis İlçe','Mernis Adres Tipi','Ana Adı','Baba Adı','Aile Sıra No','Sorgu Tarihi'],
  [1001,'ALİ YILMAZ','BARBAROS MAH. 12/4','İSTANBUL','ATAŞEHİR','Yerleşim Yeri','AYŞE','HASAN',1,'2026-11-02'],
  [9999,'ZEYNEP YILMAZ','BARBAROS MAH. 12/4','İSTANBUL','ATAŞEHİR','Yerleşim Yeri','AYŞE','HASAN',2,'2026-11-02']]),
 iski:book('Iski.xlsx',[['Dosya ID','Borçlu Adı','Sözleşme Tarihi','Tür','Adres','Abonelik Durumu'],[1001,'ALİ YILMAZ','2019-01-01','Konut','KADIKÖY MODA CAD. NO:5','Aktif'],[1001,'ALİ YILMAZ','2015-01-01','Konut','ÜSKÜDAR ÇAMLICA SK. NO:9','Pasif']]),
 arac:book('Arac.xlsx',[['Dosya ID','Borçlu Adı','Araç ID','Plaka','Marka'],[1001,'ALİ YILMAZ',9001,'34 ABC 001','FORD'],[1001,'ALİ YILMAZ',9002,'34 ABC 002','FIAT'],[1001,'ALİ YILMAZ',9003,'34 ABC 003','RENAULT']])};
let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x):''))}};
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{localStorage.setItem('ia-arastiran','Test Kullanıcı')});
  await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(1200);await p.addScriptTag({path:path.join(__dirname,'node_modules/xlsx/dist/xlsx.full.min.js')});
  await p.evaluate(()=>{document.querySelectorAll('.modal-bg').forEach(x=>x.remove());hxSetMode(true)});await p.waitForFunction(()=>HX.ready===true,null,{timeout:20000});
  const doImport=async(list)=>{await p.evaluate(()=>hxShow('yukle'));await p.waitForTimeout(200);await p.setInputFiles('#hxFile',list);await p.waitForFunction(()=>HXI.files.length>0&&!HXI.prog);
    const pv=await p.evaluate(()=>({types:HXI.files.map(f=>[f.name,f.type]),tot:hxDecCounts(),unm:HXI.files.map(f=>f.res.filter(r=>r.target==='unmatched').length)}));
    const can=await p.evaluate(()=>!document.querySelector('[data-hx-act="commit"]').disabled);
    if(can){await p.click('[data-hx-act="commit"]');await p.click('.modal [data-m="ok"]');await p.waitForFunction(()=>!HXI.busy&&!HXI.files.length,null,{timeout:30000})}else await p.click('[data-hx-act="clear"]');
    await p.waitForTimeout(400);return Object.assign(pv,{committed:can})};

  console.log('\n1) İçe aktarma: tür tanıma, Kurum alanı, bağlanamayan kayıtlar');
  const all=[F.durum,F.mersis,F.mernis,F.iski,F.arac];
  await p.evaluate(()=>hxShow('yukle'));await p.setInputFiles('#hxFile',all);await p.waitForFunction(()=>HXI.files.length===5&&!HXI.prog);
  const t=await p.evaluate(()=>Object.fromEntries(HXI.files.map(f=>[f.name,f.type])));ok(t['Dosya Durum Rapor.xlsx']==='durum'&&t['Mersis.xlsx']==='mersis'&&t['Mernis.xlsx']==='mernis'&&t['Iski.xlsx']==='iski'&&t['Arac.xlsx']==='arac','5 dosyanın türü tanındı',t);
  const kur=await p.evaluate(()=>HXI.files.find(f=>f.type==='durum').map.kurum);ok(kur==='Kurum','“Kurum” kolonu otomatik eşleşti',kur);
  await p.evaluate(()=>{HXI.sel=HXI.files.findIndex(f=>f.type==='mernis');HXI.tab='rows';HXI.filter='unm';hxRender()});await p.waitForTimeout(150);
  const unm=await p.evaluate(()=>({chip:!!document.querySelector('[data-hx-act="filter"][data-f="unm"]'),rows:document.querySelectorAll('.hx-rows tr').length-1}));ok(unm.chip&&unm.rows===1,'“Bağlanamadı” filtresi ana listede olmayan MERNİS satırını gösteriyor',unm);
  await p.screenshot({path:path.join(__dirname,'hx_preview.png')});
  await p.click('[data-hx-act="commit"]');await p.click('.modal [data-m="ok"]');await p.waitForFunction(()=>!HXI.busy&&!HXI.files.length,null,{timeout:30000});await p.waitForTimeout(500);
  const st=await p.evaluate(()=>({deb:HX.data.hx_debtors.map(d=>[d.dosyaId,d.ad,d.kurum,hxEngine(d)]),cases:HX.data.hx_cases.length,res:HX.data.hx_research.map(r=>r.type)}));
  ok(st.deb.length===5&&st.cases===4,'5 dosya–borçlu, 4 dosya (aynı dosyada 2 borçlu)',st.deb);
  ok(st.deb.every(d=>d[2]),'Kurum her kayda yazıldı',st.deb.map(d=>d[2]));
  ok(!st.deb.some(d=>d[1]==='ZEYNEP YILMAZ'),'Ana listede olmayan MERNİS kişisi borçlu olarak eklenmedi');

  console.log('\n2) Kesinleşme dosya–borçlu bazında; kapalı / vekilsiz dosya');
  const eng=Object.fromEntries(st.deb.map(d=>[d[1],d[3]]));
  ok(eng['VELİ KAYA']==='kes_bek','Aynı dosyada kesinleşmemiş borçlu → “Kesinleşme bekleniyor”',eng);ok(eng['ALİ YILMAZ']==='kes_dog','Kesinleşmiş borçlu doğrulama bekliyor (hazır değil)',eng['ALİ YILMAZ']);
  ok(eng['CAN DEMİR']==='kapali','Kapalı dosya motora girmiyor');ok(eng['DELTA İNŞAAT LTD. ŞTİ.']==='taraf','Vekil kaydı olmayan dosya “Taraf değiliz”');
  await p.evaluate(()=>{['ALİ YILMAZ','EMRE ŞAHİN','VELİ KAYA','CAN DEMİR'].forEach(n=>{const d=HX.data.hx_debtors.find(x=>x.ad===n);d.man=Object.assign({},d.man,{dogrulandi:true,tebligTarihi:'2026-10-01'})})});
  const eng2=await p.evaluate(()=>Object.fromEntries(HX.data.hx_debtors.map(d=>[d.ad,hxEngine(d)])));ok(eng2['ALİ YILMAZ']==='hazir'&&eng2['EMRE ŞAHİN']==='hazir','Doğrulanınca kesinleşmiş + açık + vekilli borçlular hacze hazır',eng2);
  ok(eng2['VELİ KAYA']!=='hazir'&&eng2['CAN DEMİR']!=='hazir','Doğrulama işareti kesinleşmemiş / kapalı dosyayı hazır yapmıyor',eng2);

  console.log('\n3) Adres kaynağı ve türü');
  const A=await p.evaluate(()=>hxdAddrs(HX.data.hx_debtors.find(x=>x.ad==='ALİ YILMAZ')));
  const ms=A.find(a=>a[1].startsWith('MERSİS'));ok(ms&&/şirket \/ işyeri adresi/.test(ms[1])&&/Faal/.test(ms[1]),'MERSİS adresi şirket / işyeri olarak, faaliyet durumu ve tarihle',ms);
  const mn=A.find(a=>a[1].startsWith('MERNİS'));ok(mn&&/Yerleşim Yeri/.test(mn[1])&&/02\.11\.2026/.test(mn[1]),'MERNİS adresi türü ve sorgu tarihiyle',mn);
  ok(A.filter(a=>a[1].startsWith('İSKİ')).length===2&&A.some(a=>/İSKİ · abonelik adresi · Pasif/.test(a[1])),'İSKİ adresleri aktiflik bilgisiyle',A.filter(a=>a[1].startsWith('İSKİ')));
  const nAr=await p.evaluate(()=>HX.data.hx_research.filter(r=>r.type==='arac').length);ok(nAr===3,'Aynı dosyaya bağlı 3 araç kaydı korundu',nAr);
  const mernisFields=await p.evaluate(()=>Object.keys((HX.data.hx_research.find(r=>r.type==='mernis')||{}).alan||{}));ok(!mernisFields.includes('Ana Adı')&&!mernisFields.includes('Aile Sıra No'),'MERNİS ana/baba adı ve aile sıra no aktarılmadı');

  console.log('\n4) Elle adres (dosya + borçlu, tür, kaynak, kullanıcı)');
  await p.evaluate(()=>hxOpenDetail(HX.data.hx_debtors.find(x=>x.ad==='ALİ YILMAZ').id,'C'));await p.waitForTimeout(300);
  await p.fill('form[data-hdf="adr"] input[name="adres"]','MANUEL İŞYERİ ADRESİ 1');await p.selectOption('form[data-hdf="adr"] select[name="tur"]','İşyeri');await p.fill('form[data-hdf="adr"] input[name="kaynak"]','saha teyidi');
  await p.click('form[data-hdf="adr"] button[type="submit"]');await p.waitForTimeout(500);
  const A2=await p.evaluate(()=>hxdAddrs(HX.data.hx_debtors.find(x=>x.ad==='ALİ YILMAZ')));const man=A2.find(a=>a[0]==='MANUEL İŞYERİ ADRESİ 1');
  ok(man&&/^Elle · İşyeri · saha teyidi · Test Kullanıcı/.test(man[1]),'Elle adres türü, kaynağı ve ekleyen kullanıcıyla listede',man);
  const aud=await p.evaluate(()=>HX.data.hx_audit.slice(-1)[0]);ok(aud&&/Elle adres \(İşyeri\)/.test(aud.note)&&aud.by==='Test Kullanıcı'&&aud.ts,'İşlem geçmişine kullanıcı ve zamanla yazıldı',aud);
  await p.screenshot({path:path.join(__dirname,'hx_detail_c.png'),fullPage:false});

  console.log('\n5) Haciz Operasyon Planı: kolonlar, sıralama, mükerrer plan engeli');
  await p.evaluate(()=>{HX9.f='hazir';hxShow('ops')});await p.waitForTimeout(300);
  const head=await p.evaluate(()=>[...document.querySelectorAll('.hx9-t th')].map(th=>th.textContent.trim()));ok(['Kurum','Kesinleşme','Haciz adresi · kaynak'].every(h=>head.includes(h))&&head.some(h=>/Toplam alacak/.test(h)),'Kurum, toplam alacak, kesinleşme, adres+kaynak kolonları',head);
  const ord=()=>p.evaluate(()=>[...document.querySelectorAll('.hx9-t tr[data-id] .hxt-nm')].map(x=>x.textContent));
  const o1=await ord();await p.click('[data-h9="sort"]');await p.waitForTimeout(150);const o2=await ord();ok(o1[0]==='ALİ YILMAZ'&&o2[0]==='EMRE ŞAHİN','Toplam alacağa göre azalan / artan sıralama',{o1,o2});
  const adrCell=await p.evaluate(()=>{const tr=[...document.querySelectorAll('.hx9-t tr[data-id]')].find(r=>r.textContent.includes('ALİ YILMAZ'));return tr.querySelector('.hx9-adrc').innerText});ok(/·/.test(adrCell),'Adres hücresinde kaynak etiketi var',adrCell);
  await p.screenshot({path:path.join(__dirname,'hx_ops.png')});
  const aliId=await p.evaluate(()=>HX.data.hx_debtors.find(x=>x.ad==='ALİ YILMAZ').id);
  await p.evaluate(id=>{HX9.sel=new Set([id]);hx9PlanModal()},aliId);await p.waitForTimeout(200);await p.click('.modal [data-m="ok"]');await p.waitForTimeout(800);
  const n1=await p.evaluate(()=>HX.data.hx_ops.filter(o=>!o.ref).length);
  await p.evaluate(id=>{HX9.sel=new Set([id]);hx9PlanModal()},aliId);await p.waitForTimeout(300);const modalOpen=await p.evaluate(()=>!!document.querySelector('.modal-bg'));
  const n2=await p.evaluate(()=>HX.data.hx_ops.filter(o=>!o.ref).length);ok(n1===1&&n2===1&&!modalOpen,'Açık planı olan borçlu tekrar plana eklenmedi (mükerrer engeli)',{n1,n2,modalOpen});
  const eid=await p.evaluate(()=>HX.data.hx_debtors.find(x=>x.ad==='EMRE ŞAHİN').id);
  await p.evaluate(ids=>{HX9.sel=new Set(ids);hx9PlanModal()},[aliId,eid]);await p.waitForTimeout(200);const warn=await p.evaluate(()=>(document.querySelector('.modal .hx-warn')||{}).textContent||'');
  ok(/1 borçlunun zaten açık planı var/.test(warn),'Toplu planda mükerrer olan önizlemede belirtilip listeden çıkarıldı',warn);
  const mz=await p.evaluate(()=>{const m=document.querySelector('.modal-bg');const box=document.querySelector('.modal').getBoundingClientRect();const top=document.elementFromPoint(box.left+16,box.top+16);return {z:getComputedStyle(m).zIndex,inModal:!!(top&&top.closest('.modal'))}});ok(mz.inModal,'Pencere sol menünün altında kalmıyor',mz);
  await p.click('.modal [data-m="ok"]');await p.waitForTimeout(800);const n3=await p.evaluate(()=>HX.data.hx_ops.filter(o=>!o.ref).length);ok(n3===2,'Toplu planda yalnızca yeni borçlu eklendi',n3);

  console.log('\n6) Aynı Excel’leri yeniden yükleme: kopya yok, manuel veriler korunur');
  const before=await p.evaluate(()=>({deb:HX.data.hx_debtors.length,res:HX.data.hx_research.length,man:HX.data.hx_debtors.find(x=>x.ad==='ALİ YILMAZ').man,ops:HX.data.hx_ops.length,aud:HX.data.hx_audit.length}));
  const re=await doImport(all);ok(re.tot.new===0,'Yeniden yüklemede yeni kayıt önerilmedi',re.tot);
  const after=await p.evaluate(()=>({deb:HX.data.hx_debtors.length,res:HX.data.hx_research.length,man:HX.data.hx_debtors.find(x=>x.ad==='ALİ YILMAZ').man,ops:HX.data.hx_ops.length}));
  ok(after.deb===before.deb&&after.res===before.res,'Kopya kayıt oluşmadı',{before,after});ok(JSON.stringify(after.man)===JSON.stringify(before.man)&&after.ops===before.ops,'Manuel alanlar (doğrulama, tebliğ tarihi) ve planlar ezilmedi',after.man);
  await p.evaluate(()=>hxShow('yukle'));await p.waitForTimeout(200);const hist=await p.evaluate(()=>{const t=[...document.querySelectorAll('.hx-card table.hx-t')].find(x=>x.textContent.includes('Yükleyen'));return t?t.innerText:''});
  ok(/yükleyen/i.test(hist.toLocaleLowerCase('tr'))&&/Test Kullanıcı/.test(hist)&&/Dosya Durum Rapor\.xlsx/.test(hist),'İçe aktarma geçmişinde yükleyen ve dosya adları',hist.slice(0,200));

  console.log('\n7) Okunabilirlik');
  await p.evaluate(()=>{HX9.f='hazir';hxShow('ops')});await p.waitForTimeout(250);
  const cr=await p.evaluate(()=>{const lum=c=>{const m=c.match(/\d+(\.\d+)?/g).map(Number);const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2])};
    const bg=el=>{while(el){const c=getComputedStyle(el).backgroundColor;if(c&&!/rgba\(0, 0, 0, 0\)/.test(c)&&!/,\s*0\)$/.test(c))return c;el=el.parentElement}return 'rgb(9,15,13)'};
    const L=[...document.querySelectorAll('#hxScreen .hx9-t td, #hxScreen .hx9-t th, #hxScreen .hx9-t small, #hxScreen .hx-muted, #hxScreen .hx9-tile span')].filter(el=>el.textContent.trim()).map(el=>{const a=lum(getComputedStyle(el).color),b=lum(bg(el));return {r:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),fs:parseFloat(getComputedStyle(el).fontSize),t:(el.tagName+'.'+el.className+' '+el.textContent.trim().slice(0,20))}});
    return {min:Math.min(...L.map(x=>x.r)),minFs:Math.min(...L.map(x=>x.fs)),worst:L.sort((a,b)=>a.r-b.r)[0],small:[...new Set(L.filter(x=>x.fs<12).map(x=>x.t+':'+x.fs))]}});
  ok(cr.min>=4.5,'Plan ekranında metin kontrastı ≥ 4.5:1',cr);ok(cr.minFs>=12,'Plan ekranında en küçük yazı 12px',cr);
  for(const w of [900,400]){await p.setViewportSize({width:w,height:850});await p.waitForTimeout(250);const sw=await p.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]);ok(sw[0]<=sw[1],w+'px genişlikte sayfa yatay taşmıyor',sw);await p.screenshot({path:path.join(__dirname,'hx_ops_'+w+'.png')})}
  console.log('\nSayfa hataları:',errs.length?errs:'yok');if(errs.length)fail++;
  console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
