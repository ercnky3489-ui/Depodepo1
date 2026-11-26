/* Açılış ekranı kenar süsü (Matrix kelime yağmuru) — node ks.test.js <app.html> */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const APP=path.resolve(process.argv[2]||'../out55.html');let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x).slice(0,600):''))}};
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));const U='http://127.0.0.1:'+srv.address().port+'/';
  const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1885,height:900}});p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{localStorage.setItem('ia-arastiran','K');window.claude={use:async()=>null}});await p.goto(U);await p.waitForTimeout(1500);
  await p.evaluate(async()=>{await Store.savePortfolio('pA',{name:'A',importedAt:'2026-11-01T10:00:00Z',count:1},[{i:0,ad:'K',kimlik:'1',sirket:false,m:'',kef:[],x:{}}])});await p.reload();await p.waitForTimeout(2500);
  await p.evaluate(()=>document.querySelectorAll('.modal-bg').forEach(x=>x.remove()));
  let r=await p.evaluate(()=>{const c=document.getElementById('ksCanvas');const g=c.getContext('2d');const px=(x,y)=>{const d=devicePixelRatio||1;return g.getImageData(0,Math.round(y*d),Math.round(x*d),1).data};let lit=0;for(let y=100;y<880;y+=4){const d=px(190,y);for(let i=0;i<d.length;i+=4)if(d[i+3]>40)lit++}
    let mid=0;const d2=g.getImageData(Math.round(400*(devicePixelRatio||1)),0,Math.round(1000*(devicePixelRatio||1)),c.height).data;for(let i=3;i<d2.length;i+=400)if(d2[i]>0)mid++;return {scr:S.screen,box:KS.box,lit,mid,pe:getComputedStyle(c).pointerEvents}});
  ok(r.scr==='mts'&&r.box&&r.box.length===2&&r.lit>50,'Açılışta (1885 px) iki yan boşlukta kelime yağmuru çiziliyor',r);
  ok(r.mid===0,'Orta sütuna (içeriğin altına) hiçbir şey çizilmiyor',r.mid);
  ok(r.pe==='none','Süs tıklamayı engellemiyor (pointer-events: none)');
  await p.locator('button:visible',{hasText:'Ajan Merkezi'}).first().click();await p.waitForTimeout(400);ok(await p.evaluate(()=>MTS.tab==='ag'),'İçerikteki düğmeler tıklanabiliyor');
  await p.setViewportSize({width:1300,height:900});await p.waitForTimeout(1200);r=await p.evaluate(()=>KS.box);ok(!r,'Dar ekranda (1300 px, boşluk yok) çizim yok',r);
  await p.setViewportSize({width:1885,height:900});await p.waitForTimeout(1000);
  await p.evaluate(async()=>{await openPortfolio('pA');showScreen('dosyalar')});await p.waitForTimeout(500);await p.click('button.bn[data-scr="ayar"]:visible');await p.waitForTimeout(300);const t1=await p.textContent('[data-ks="tg"]');await p.click('[data-ks="tg"]');await p.waitForTimeout(300);
  r=await p.evaluate(()=>({on:KS.on,ls:localStorage.getItem('ia-kenar'),hid:document.getElementById('ksCanvas').hidden,cls:document.body.classList.contains('ks-on')}));
  ok(/Açık/.test(t1)&&!r.on&&r.ls==='0'&&r.hid&&!r.cls,'Ayarlar › Dosya işlemleri › “Kenar süsü” ile kapanıyor; tercih bu tarayıcıda saklanıyor',{t1,r});
  await p.reload();await p.waitForTimeout(1500);ok(await p.evaluate(()=>!KS.on&&!document.body.classList.contains('ks-on')),'Yenilemeden sonra kapalı kalıyor');
  ok(!errs.length,'Sayfa hatası yok',errs);console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
