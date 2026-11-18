/* İcra esasına göre tekil föy + eski föylerden göç testi — node hx_tekil.test.js <eski.html> <yeni.html> */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const OLD=path.resolve(process.argv[2]||'../out19.html'),NEW=path.resolve(process.argv[3]||'../out20.html');const FX=path.join(__dirname,'fxhx','Dosya Durum Rapor.xlsx');
let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x):''))}};
let which=OLD;const wrap=f=>'<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(f,'utf8')+'</body></html>';
(async()=>{const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(wrap(which))}).listen(0);await new Promise(r=>srv.once('listening',r));
  const U='http://127.0.0.1:'+srv.address().port+'/';
  const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1440,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{localStorage.setItem('ia-arastiran','Test Kullanıcı')});
  const boot=async()=>{await p.goto(U);await p.waitForTimeout(1200);await p.addScriptTag({path:path.join(__dirname,'node_modules/xlsx/dist/xlsx.full.min.js')});
    await p.evaluate(()=>{document.querySelectorAll('.modal-bg').forEach(x=>x.remove());hxSetMode(true)});await p.waitForFunction(()=>HX.ready===true,null,{timeout:20000})};
  const closeModals=()=>p.evaluate(()=>document.querySelectorAll('.modal-bg').forEach(m=>m.remove()));
  await boot();
  await p.evaluate(()=>hxShow('yukle'));await p.waitForTimeout(150);await p.setInputFiles('#hxFile',[FX]);await p.waitForFunction(()=>HXI.files.length>0&&!HXI.prog);
  await p.click('[data-hx-act="commit"]');await p.click('.modal [data-m="ok"]');await p.waitForFunction(()=>!HXI.busy&&!HXI.files.length,null,{timeout:30000});await p.waitForTimeout(1200);
  console.log('\n0) Eski sürüm: borçlu başına föy');
  await p.click('#bottomNav .bn.hxn[data-hxb="dosyalar"]');await p.waitForTimeout(1200);
  const o0=await p.evaluate(()=>({pid:S.pid,n:S.debtors.filter(d=>d.m).length}));ok(o0.n===5,'eski föy: 5 borçlu satırı',o0);
  /* VELİ'ye telefon (UYAP/istihbarat çalışması), ALİ'ye değerlendirme notu */
  await p.click('#bottomNav .bn.hxn[data-hxb="aktar"]');await p.waitForTimeout(800);await p.click('#aktarScreen [data-ana-imp="tel"]');await p.waitForSelector('#tbkTxt');
  await p.fill('#tbkTxt','20000000214\t05321112233');await p.click('#tbkPrevBtn');await p.waitForTimeout(300);await p.click('#tbkGo');await p.waitForTimeout(1200);await closeModals();
  await p.evaluate(()=>{const d=S.debtors.find(x=>x.kimlik==='10000000146');const R=getR(d.i);R.degerlendirme='Ali için not';delete R._fresh;touch(R)});await p.waitForTimeout(2500);
  console.log('\n1) Yeni sürüm: icra esasına göre tekil föy');
  which=NEW;await boot();
  await p.click('#bottomNav .bn.hxn[data-hxb="dosyalar"]');await p.waitForFunction(()=>S.pid===HX_BPID&&S.debtors.length>0,null,{timeout:20000});await p.waitForTimeout(1500);
  const r=await p.evaluate(()=>{const rows=S.debtors.filter(d=>d.m);const e=rows.find(d=>d.m2==='2024/1111');const R=e&&S.research.get(e.i);
    return {pid:S.pid,n:rows.length,esas:rows.filter(d=>d.m2==='2024/1111').length,ad:e&&e.ad,kef:e&&e.kef.map(k=>k.ad),ids:e&&e.x['HANSOFT Dosya ID'],
      persons:R?(R.persons||[]).map(x=>x.ad+':'+(x.telefonlar||[]).map(t=>t.tel).join('/')):null,deg:R&&R.degerlendirme,log:R&&(R.log||[]).map(l=>l.m).filter(m=>/tekilleştirildi/.test(m)),
      oldKept:(()=>{try{const o=JSON.parse(localStorage.getItem('icra-arastirma-v1'));return !!o.p.pistanbul&&Object.values(o.r).some(x=>x.pid==='pistanbul')}catch(e){return 'db'}})(),
      selHidden:!(S.portfolios||[]).some(x=>/^pistanbul/.test(x.id))}});
  console.log('   ',JSON.stringify(r));
  ok(r.n===4,'5 borçlu → 4 icra esası satırı',r.n);ok(r.esas===1,'2024/1111 tek satır');
  ok(r.ad==='ALİ YILMAZ','En dolu föy (ALİ: not + kefil telefonu) esas alındı',r.ad);ok((r.kef||[]).includes('VELİ KAYA'),'Aynı dosyanın diğer borçlusu föyde',r.kef);
  ok(/1001/.test(r.ids)&&/1002/.test(r.ids),'Her iki Dosya ID föyde',r.ids);
  ok(r.persons&&r.persons.some(x=>/VELİ KAYA:05321112233/.test(x))&&r.persons.some(x=>/^ALİ YILMAZ/.test(x)),'Kişiler: VELİ (telefonla) + ALİ',r.persons);
  ok(r.deg==='Ali için not','ALİ föyündeki not kaybolmadan taşındı',r.deg);ok(r.log&&r.log.length===1,'Birleştirme işlem geçmişine yazıldı',r.log);
  ok(r.oldKept===true||r.oldKept==='db','Eski föy kayıtları yedek olarak duruyor',r.oldKept);ok(r.selHidden,'Eski/yeni İstanbul föyü Birikim portföy listesinde görünmüyor');
  console.log('\n2) Yeniden yükleme ve HANSOFT tekrar senkronu');
  await p.reload();await p.waitForTimeout(1200);await p.addScriptTag({path:path.join(__dirname,'node_modules/xlsx/dist/xlsx.full.min.js')});
  await p.evaluate(()=>{document.querySelectorAll('.modal-bg').forEach(x=>x.remove());hxSetMode(true)});await p.waitForFunction(()=>HX.ready===true,null,{timeout:20000});
  await p.evaluate(()=>hxSyncBirikim(true));await p.click('#bottomNav .bn.hxn[data-hxb="dosyalar"]');await p.waitForTimeout(1500);
  const r2=await p.evaluate(()=>{const rows=S.debtors.filter(d=>d.m);const e=rows.find(d=>d.m2==='2024/1111');const R=e&&S.research.get(e.i);return {n:rows.length,ad:e&&e.ad,tel:R?(R.persons||[]).flatMap(x=>(x.telefonlar||[]).map(t=>t.tel)):null}});
  ok(r2.n===4&&r2.ad==='ALİ YILMAZ'&&r2.tel&&r2.tel.includes('05321112233'),'Tekrar senkron sonrası tekil yapı ve telefon korunuyor',r2);
  console.log('\n3) Portföy Dosya Takibi’nden ada tıklayınca doğru föy');
  await p.evaluate(async()=>{const d=HX.data.hx_debtors.find(x=>String(x.dosyaId)==='1001');await hxOpenFoyKisi(d)});await p.waitForTimeout(1200);
  const r3=await p.evaluate(()=>{const d=S.debtors[S.sel];return d&&d.m2});ok(r3==='2024/1111','ALİ (1001) → 2024/1111 föyü açılıyor',r3);
  await p.screenshot({path:path.join(__dirname,'hx_tekil.png')});
  console.log('\nSayfa hataları:',errs.length?errs:'yok');if(errs.length)fail++;
  console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
