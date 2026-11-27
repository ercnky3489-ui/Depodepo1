/* ☰ Ayarlar › Dosya işlemleri (gizli üst menüye erişim) — kurgusal veri. node mn.test.js <app.html> */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const APP=path.resolve(process.argv[2]||'../out55.html');let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x).slice(0,600):''))}};
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const errs=[];
  for(const vp of [{width:1300,height:900},{width:390,height:844}]){const p=await b.newPage({viewport:vp});p.on('pageerror',e=>errs.push(e.message));await p.addInitScript({path:path.join(__dirname,'fakedb.js')});await p.addInitScript(()=>localStorage.setItem('ia-arastiran','K'));
    await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(1500);
    await p.evaluate(async()=>{const rows=[0,1,2].map(i=>({i,ad:'KURGU '+i,kimlik:'1000000000'+i,sirket:false,m:'',kef:[],x:{}}));await Store.savePortfolio('pA',{name:'Kurgu A',importedAt:'2026-11-01T10:00:00Z',count:3},rows);
      await Store.saveResearch({pid:'pA',idx:0,durum:'hacze',persons:[],companies:[]});document.querySelectorAll('.modal-bg').forEach(x=>x.remove());await openPortfolio('pA');showScreen('dosyalar')});await p.waitForTimeout(800);
    ok(await p.evaluate(()=>!document.querySelector('#menu summary').offsetParent),vp.width+': eski “Dosya ▾” menüsü gerçekten görünmüyor (sorunun kaynağı)');
    if(await p.evaluate(()=>document.body.classList.contains('mb-on'))){await p.click('[data-mb-go="home"]');await p.waitForTimeout(300);await p.click('#mbOv [data-mb-x="ayar"]')}else await p.click('button.bn[data-scr="ayar"]:visible');await p.waitForTimeout(400);
    let r=await p.evaluate(()=>{const x=document.querySelector('.mn-box');return x?{vis:!!x.offsetParent,t:[...x.querySelectorAll('.mn-b')].map(b=>b.textContent),sum:x.querySelector('summary').textContent}:null});
    ok(r&&r.vis&&r.t.some(t=>/Durumlara göre dosya sil/.test(t))&&r.t.some(t=>/Yedek al/.test(t))&&r.t.some(t=>/Bu portföyü sil/.test(t))&&/Kurgu A/.test(r.sum),vp.width+': ☰ Ayarlar açılınca “📁 Dosya işlemleri” bölümünde menünün tamamı var',r);
    await p.click('.mn-b[data-mn="mPtClean"]');await p.waitForSelector('.pt-modal #ptK',{timeout:15000});
    r=await p.evaluate(()=>({k:document.querySelector('#ptKn').textContent,d:document.querySelector('#ptDn').textContent,n:document.querySelectorAll('.modal-bg').length}));
    ok(r.k==='1'&&r.d==='2'&&r.n===1,vp.width+': “🧹 Durumlara göre dosya sil” önizlemesi açılıyor (kalacak 1, silinecek 2); hiçbir şey silinmeden',r);
    ok(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),vp.width+': taşma yok');
    await p.screenshot({path:path.join(__dirname,'..','mn_'+vp.width+'.png')});await p.close()}
  ok(!errs.length,'Sayfa hatası yok',errs);console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
