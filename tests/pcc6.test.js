/* MATRİX açılış ekranı: portföylerin dışında, portföy seçimi buradan — node pcc6.test.js <app.html> */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const APP=path.resolve(process.argv[2]||'../out40.html');
let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x).slice(0,500):''))}};
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1440,height:1000}});const p=await ctx.newPage();
  await ctx.route(/cdnjs\.cloudflare\.com/,route=>{if(route.request().url().endsWith('xlsx.full.min.js'))return route.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync(path.join(__dirname,'node_modules/xlsx/dist/xlsx.full.min.js'))});return route.abort()});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{localStorage.setItem('ia-arastiran','Test Kullanıcı')});
  const U='http://127.0.0.1:'+srv.address().port+'/';await p.goto(U);await p.waitForTimeout(1200);
  await p.evaluate(async()=>{const row=(i,ad,k)=>({i,ad,kimlik:k,sirket:false,m:'',m2:'',gib:'',anapara:null,toplam:1000,not:'',kef:[],x:{}});
    await Store.savePortfolio('pA',{name:'DEVRAN Test',alacakli:'DEVRAN VYŞ',importedAt:'2026-11-01T10:00:00Z',count:2},[row(0,'ALİ YILMAZ','10000000146'),row(1,'AYŞE KARA','22222222220')])});
  await p.reload();await p.waitForTimeout(2500);
  /* İstanbul föyünü yükle */
  await p.evaluate(()=>{document.querySelectorAll('.modal-bg').forEach(x=>x.remove());hxSetMode(true)});await p.waitForFunction(()=>HX.ready===true,null,{timeout:30000});
  await p.evaluate(()=>hxShow('yukle'));await p.waitForTimeout(200);await p.setInputFiles('#hxFile',[path.join(__dirname,'fxhx','Dosya Durum Rapor.xlsx')]);await p.waitForFunction(()=>HXI.files.length>0&&!HXI.prog,null,{timeout:30000});
  await p.click('[data-hx-act="commit"]');await p.click('.modal [data-m="ok"]');await p.waitForFunction(()=>!HXI.busy&&!HXI.files.length,null,{timeout:60000});
  /* İstanbul modunda kapatılıp yeniden açılıyor */
  await p.reload();await p.waitForTimeout(3500);
  const st=()=>p.evaluate(()=>({scr:S.screen,hx:HX.on,mts:!document.getElementById('mtsScreen').hidden,home:document.body.classList.contains('mts-home'),
    nav:getComputedStyle(document.getElementById('bottomNav')).display,hxs:!(document.getElementById('hxScreen')||{hidden:true}).hidden,pid:S.pid,
    gate:[...document.querySelectorAll('.mts-gt')].map(x=>x.dataset.mtsPf+'|'+x.querySelector('b').textContent)}));
  let o=await st();console.log('    ',JSON.stringify(o));
  ok(o.scr==='mts'&&o.mts&&!o.hxs&&!o.hx,'Açılış: İstanbul modunda kapatılsa da uygulama MATRİX açılış ekranıyla açılıyor',o);
  ok(o.home&&o.nav==='none','MATRİX ekranında portföy menüsü (Birikim/İstanbul) görünmüyor',o);
  const hxp=await p.evaluate(()=>HX_BPID);
  ok(o.gate.some(x=>x.startsWith('pA|'))&&o.gate.some(x=>x.startsWith(hxp+'|')),'Portföye giriş: Birikim portföyü ve İstanbul Varlık ayrı ayrı seçilebiliyor',o.gate);
  await p.click(`.mts-gt[data-mts-pf="${hxp}"]`);await p.waitForTimeout(1500);o=await st();
  ok(o.hx&&o.pid===hxp&&!o.mts&&!o.home&&o.nav!=='none','İstanbul Varlık seçildi → İstanbul borçlu föyleri, kendi menüsüyle',o);
  const lb=await p.evaluate(()=>{const x=document.querySelector('#bottomNav .bn[data-scr="mts"]');return {d:getComputedStyle(x).display,t:x.textContent.trim()}});
  ok(lb.d!=='none'&&/Açılış Ekranı/.test(lb.t)&&!/MATRİX/.test(lb.t),'Portföy içinde MATRİX yok; yalnız "Açılış Ekranı"na dönüş var',lb);
  await p.click('#bottomNav .bn[data-scr="mts"]');await p.waitForTimeout(800);o=await st();
  ok(o.scr==='mts'&&o.home&&o.nav==='none','Açılış Ekranı → MATRİX, menü yine gizli',o);
  await p.click('.mts-gt[data-mts-pf="pA"]');await p.waitForTimeout(1500);o=await st();
  ok(!o.hx&&o.pid==='pA'&&o.scr==='dosyalar'&&!o.home&&o.nav!=='none','Birikim portföyü seçildi → Dosya Yönetimi, kendi menüsüyle',o);
  const lb2=await p.evaluate(()=>getComputedStyle(document.querySelector('#bottomNav .bn[data-scr="mts"]')).display);ok(lb2!=='none','Birikim menüsünde de "Açılış Ekranı" var');
  await p.reload();await p.waitForTimeout(3000);o=await st();ok(o.scr==='mts'&&o.home&&o.nav==='none','Birikim modunda kapatılıp açılınca da MATRİX açılış ekranı',o);
  await p.screenshot({path:path.join(__dirname,'mts_home.png')});
  await p.setViewportSize({width:390,height:844});await p.waitForTimeout(500);
  const ov=await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1);ok(ov,'Telefon genişliğinde yatay taşma yok');
  await p.screenshot({path:path.join(__dirname,'mts_home_m.png')});
  console.log('\nSayfa hataları:',errs.length?errs.slice(0,5):'yok');
  console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
