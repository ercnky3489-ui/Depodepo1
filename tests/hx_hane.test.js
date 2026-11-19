/* İçe aktarma merkezi · Metinden hane ekle (toplu) — node hx_hane.test.js <app.html> */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const APP=path.resolve(process.argv[2]||'../out29.html');const FX=path.join(__dirname,'fxhx','Dosya Durum Rapor.xlsx');
let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x):''))}};
const T=['KENDİSİ\t10000000146\tALİ\tYILMAZ\t1980-01-01\tAYŞE\t\tHASAN\t\tİSTANBUL\tATAŞEHİR',
 'EŞİ\t10000000999\tZEYNEP\tYILMAZ\t1982-02-02\tFATMA\t\tMEHMET\t\tİSTANBUL\tKADIKÖY',
 'OĞLU\t10000000888\tCAN\tYILMAZ\t2010-03-03\tZEYNEP\t10000000999\tALİ\t10000000146\tİSTANBUL\tATAŞEHİR',
 'KENDİSİ\t40000000442\tEMRE\tŞAHİN\t1975-05-05\tELİF\t\tOSMAN\t\tANKARA\tÇANKAYA',
 'EŞİ\t40000000777\tSELİN\tŞAHİN\t1978-06-06\t-\t\t-\t\tANKARA\tÇANKAYA',
 'KENDİSİ\t99999999990\tBİLİNMEYEN\tKİŞİ\t1970-01-01\t\t\t\t\t\t',
 'EŞİ\t99999999991\tX\tY\t\t\t\t\t\t\t'].join('\n');
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:1000}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{localStorage.setItem('ia-arastiran','Test Kullanıcı')});
  const boot=async()=>{await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(1200);await p.addScriptTag({path:path.join(__dirname,'node_modules/xlsx/dist/xlsx.full.min.js')});
    await p.evaluate(()=>{document.querySelectorAll('.modal-bg').forEach(x=>x.remove());hxSetMode(true)});await p.waitForFunction(()=>HX.ready===true,null,{timeout:20000})};
  await boot();await p.evaluate(()=>hxShow('yukle'));await p.waitForTimeout(150);await p.setInputFiles('#hxFile',[FX]);await p.waitForFunction(()=>HXI.files.length>0&&!HXI.prog);
  await p.click('[data-hx-act="commit"]');await p.click('.modal [data-m="ok"]');await p.waitForFunction(()=>!HXI.busy&&!HXI.files.length,null,{timeout:30000});await p.waitForTimeout(1000);
  console.log('\n1) İçe aktarma merkezinde kart');
  await p.click('#bottomNav .bn.hxn[data-hxb="aktar"]');await p.waitForFunction(()=>S.screen==='aktar'&&!!document.querySelector('#aktarScreen .akt-sec'),null,{timeout:15000});await p.waitForTimeout(300);
  const cards=await p.evaluate(()=>[...document.querySelectorAll('#aktarScreen [data-ana-imp]')].map(x=>x.dataset.anaImp+':'+x.querySelector('b').textContent));
  ok(cards.includes('hane:Hane (metinden)'),'“Hane (metinden)” kartı var',cards);
  ok(await p.evaluate(t=>anaDetect(t),T)==='hane','Dosya bırakma alanı hane metnini tanıyor');
  console.log('\n2) Önizle → eşleşme');
  await p.click('#aktarScreen [data-ana-imp="hane"]');await p.waitForSelector('#hbkTxt');await p.fill('#hbkTxt',T);await p.click('#hbkPrevBtn');await p.waitForTimeout(300);
  const pv=await p.evaluate(()=>({sum:document.querySelector('#hbkPrev .gbk-sum').innerText.replace(/\s+/g,' '),rows:document.querySelectorAll('#hbkPrev .gbk-r').length,chk:document.querySelectorAll('#hbkPrev [data-hon]').length}));
  console.log('   ',JSON.stringify(pv));ok(/2 hane eşlendi/.test(pv.sum)&&/1 uygulamada yok/.test(pv.sum)&&pv.rows===3&&pv.chk===2,'3 hane: 2 eşlendi (TCKN ile), 1 uygulamada yok',pv);
  await p.screenshot({path:path.join(__dirname,'hx_hane.png'),clip:await p.evaluate(()=>{const r=document.querySelector('.modal').getBoundingClientRect();return {x:r.left,y:r.top,width:r.width,height:Math.min(r.height,990)}})});
  await p.click('#hbkGo');await p.waitForTimeout(1500);
  const done=await p.evaluate(()=>(document.querySelector('#hbkPrev .gbk-done')||{}).innerText||'');ok(/3 kişi eklendi/.test(done),'Aktarıldı: 3 hane bireyi eklendi',done);
  await p.evaluate(()=>document.querySelectorAll('.modal-bg').forEach(x=>x.remove()));
  const chk=async()=>p.evaluate(()=>{const f=m=>{const d=S.debtors.find(x=>x.m2===m);const R=S.research.get(d.i);return R?R.persons.map(x=>x.ad+'|'+x.rol+'|'+(x.yakinlik||'')+'|'+(x.dogum||'')):null};return {a:f('2024/1111'),e:f('2025/4444')}});
  let r=await chk();console.log('   ',JSON.stringify(r));
  ok(r.a&&r.a.some(x=>/^ZEYNEP YILMAZ\|Hane\|Eş\|02\.02\.1982/.test(x))&&r.a.some(x=>/^CAN YILMAZ\|Hane\|Çocuk/.test(x)),'ALİ’nin föyüne eşi ve çocuğu Hane olarak eklendi',r.a);
  ok(r.a.some(x=>/^ALİ YILMAZ\|Borçlu\|\|01\.01\.1980/.test(x)),'KENDİSİ satırı borçlunun boş doğum tarihini doldurdu',r.a);
  ok(r.e&&r.e.some(x=>/^SELİN ŞAHİN\|Hane\|Eş/.test(x)),'EMRE ŞAHİN’in föyüne eşi eklendi',r.e);
  ok(!JSON.stringify(r).includes('BİLİNMEYEN')&&!JSON.stringify(r).includes('X Y'),'Eşleşmeyen hane hiçbir föye eklenmedi');
  console.log('\n3) Tekrar aktarınca çift kayıt yok; yeniden yüklemede korunur');
  await p.evaluate(t=>anaImportText('hane',t),T);await p.waitForTimeout(500);await p.click('#hbkGo');await p.waitForTimeout(1200);
  const d2=await p.evaluate(()=>(document.querySelector('#hbkPrev .gbk-done')||{}).innerText||'');ok(/0 kişi eklendi/.test(d2),'İkinci aktarımda yeni kişi yok',d2);
  await p.evaluate(()=>document.querySelectorAll('.modal-bg').forEach(x=>x.remove()));
  const n1=await p.evaluate(()=>{const d=S.debtors.find(x=>x.m2==='2024/1111');return S.research.get(d.i).persons.length});
  await p.waitForTimeout(2500);await boot();await p.click('#bottomNav .bn.hxn[data-hxb="dosyalar"]');await p.waitForFunction(()=>S.pid===HX_BPID&&S.debtors.length>0,null,{timeout:20000});await p.waitForTimeout(800);
  r=await chk();ok(r.a&&r.a.length===n1&&r.a.filter(x=>/ZEYNEP/.test(x)).length===1,'Yeniden yüklemede duruyor, ZEYNEP tek kayıt',{n1,a:r.a});
  console.log('\n4) Föydeki “Metinden hane ekle” düğmesi hâlâ çalışıyor');
  await p.evaluate(()=>{const d=S.debtors.find(x=>x.m2==='2025/4444');select(d.i);S.tab='kisi';renderCard()});await p.waitForTimeout(300);
  ok(await p.evaluate(()=>!!document.querySelector('#cardPane [data-act="hane-paste"]')),'Föyde düğme duruyor');
  console.log('\nSayfa hataları:',errs.length?errs:'yok');if(errs.length)fail++;
  console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
