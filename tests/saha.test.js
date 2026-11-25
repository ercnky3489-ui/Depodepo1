/* 14 Masraf/tahsilat · 15 Sesle saha notu · 19 Saha fotoğrafları · 18 Haftalık performans (kurgusal; sahte dictation) — node saha.test.js <app.html> */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const APP=path.resolve(process.argv[2]||'../out55.html');let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x).slice(0,600):''))}};
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1300,height:950},acceptDownloads:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  const lib=f=>fs.readFileSync(path.join(__dirname,'node_modules',f));
  await ctx.route(/cdnjs\.cloudflare\.com/,r=>{const u=r.request().url();if(/jspdf/.test(u))return r.fulfill({status:200,contentType:'application/javascript',body:lib('jspdf/dist/jspdf.umd.min.js')});if(/html2canvas/.test(u))return r.fulfill({status:200,contentType:'application/javascript',body:lib('html2canvas/dist/html2canvas.min.js')});if(/xlsx/.test(u)&&fs.existsSync(path.join(__dirname,'node_modules','xlsx/dist/xlsx.full.min.js')))return r.fulfill({status:200,contentType:'application/javascript',body:lib('xlsx/dist/xlsx.full.min.js')});return r.continue()});
  await p.addInitScript(()=>{localStorage.setItem('ia-arastiran','Kurgu Ercan');let F=null,St=null;
    const dict={start:async()=>{St&&St({state:'listening'});setTimeout(()=>{F&&F({text:'Kapı kapalı, komşu taşındığını söyledi.'});St&&St({state:'idle',reason:'stopped'})},200)},stop:async()=>{St&&St({state:'idle',reason:'viewer_stopped'})},onPartial:()=>()=>{},onFinal:h=>{F=h;return()=>{}},onState:h=>{St=h;return()=>{}}};
    window.claude={use:async n=>n==='dictation'?dict:null}});
  await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(1200);
  await p.evaluate(async()=>{await Store.savePortfolio('pA',{name:'A',importedAt:'2026-11-01T10:00:00Z',count:1},[{i:0,ad:'KURGU BİR',kimlik:'10000000146',sirket:false,m:'',m2:'',gib:'',anapara:null,toplam:10,not:'',kef:[],x:{}}]);
    const pr=newPerson({ad:'KURGU BİR',kimlik:'10000000146',rol:'Borçlu'});pr.src=emptySrc();await Store.saveResearch({pid:'pA',idx:0,durum:'devam',sonuc:'',updatedAt:new Date().toISOString(),persons:[pr],companies:[]})});
  await p.reload();await p.waitForTimeout(1500);await p.evaluate(async()=>{document.querySelectorAll('.modal-bg').forEach(x=>x.remove());await openPortfolio('pA');showScreen('dosyalar');select(0);S.tab='kisi';renderCard(true)});await p.waitForTimeout(500);
  ok(!!await p.$('[data-act="tab"][data-v="saha"]'),'Föyde “🧾 Saha” sekmesi');
  await p.click('[data-act="tab"][data-v="saha"]');await p.waitForTimeout(300);
  /* 14 */
  await p.fill('#sfMa','1.250,50');await p.fill('#sfMn','Çilingir');await p.selectOption('#sfMk','Çilingir');await p.click('[data-sff="masraf"] button[type="submit"]');await p.waitForTimeout(200);
  await p.fill('#sfMa','450');await p.selectOption('#sfMk','Yol / araç');await p.click('[data-sff="masraf"] button[type="submit"]');await p.waitForTimeout(200);
  await p.fill('#sfTa','5000');await p.fill('#sfTn','Kısmi ödeme');await p.click('[data-sff="tahsilat"] button[type="submit"]');await p.waitForTimeout(300);
  let r=await p.evaluate(()=>{const R=cur();return {m:(R.masraflar||[]).map(x=>x.tutar),t:(R.tahsilatlar||[]).map(x=>x.tutar),tot:document.querySelector('.sf-tot').innerText.replace(/\s+/g,' '),rows:document.querySelectorAll('.sf-t tbody tr').length}});
  ok(r.m.join()==='1250.5,450'&&r.t.join()==='5000'&&r.rows===3,'Masraflar (1.250,50 + 450) ve tahsilat (5.000) kaydedildi',r);
  ok(/1\.700,50 ₺/.test(r.tot)&&/5\.000,00 ₺/.test(r.tot)&&/3\.299,50 ₺/.test(r.tot),'Toplam masraf, tahsilat ve net doğru',r.tot);
  /* silme iki adımlı */
  await p.click('.sf-t [data-sfdel="masraf"]');r=await p.evaluate(()=>(cur().masraflar||[]).length);ok(r===2,'İlk basışta silinmedi (onay bekliyor)',r);
  await p.click('.sf-t [data-sfdel].arm');await p.waitForTimeout(200);r=await p.evaluate(()=>(cur().masraflar||[]).length);ok(r===1,'İkinci basışta silindi',r);
  /* 15 */
  await p.click('[data-sf="mic"]');await p.waitForTimeout(300);await p.click('[data-sf="mic"]');await p.waitForTimeout(600);
  r=await p.evaluate(()=>document.getElementById('sfNote').value);ok(/Kapı kapalı, komşu taşındığını söyledi\./.test(r),'Konuşma metne çevrildi, kutuya yazıldı',r);
  await p.click('[data-sf="note"]');await p.waitForTimeout(300);r=await p.evaluate(()=>({n:(cur().sahaNotlari||[]).map(x=>({t:x.text,s:x.ses,by:x.by})),log:(cur().log||[]).some(l=>/Saha notu: Kapı kapalı/.test(l.m))}));
  ok(r.n.length===1&&r.n[0].s&&r.n[0].by==='Kurgu Ercan'&&r.log,'Saha notu kaydedildi (🎙 işaretli, kim girdi, işlem kaydı)',r);
  /* 19 */
  const png=path.join(__dirname,'sf_test.png');await p.evaluate(async()=>{});const buf=await p.evaluate(async()=>{const c=document.createElement('canvas');c.width=800;c.height=600;const g=c.getContext('2d');g.fillStyle='#456';g.fillRect(0,0,800,600);return c.toDataURL('image/png').split(',')[1]});fs.writeFileSync(png,Buffer.from(buf,'base64'));
  await p.fill('#sfPhL','Kapı');await p.setInputFiles('#sfPh',[png,png]);await p.waitForFunction(()=>(S.media.get(S.sel)||[]).filter(m=>m.src==='saha').length===2,null,{timeout:10000});await p.waitForTimeout(300);
  r=await p.evaluate(()=>({n:document.querySelectorAll('.sf-gal figure').length,lb:(S.media.get(S.sel)||[]).filter(m=>m.src==='saha').map(m=>m.label),badge:document.getElementById('sfBadge').textContent}));
  ok(r.n===2&&r.lb.every(x=>x==='Saha · Kapı')&&r.badge==='5','İki saha fotoğrafı açıklamasıyla galeride; sekme sayacı 5',r);
  const [dl]=await Promise.all([p.waitForEvent('download',{timeout:30000}),p.click('[data-sf="pdf"]')]);const fp=path.join(__dirname,'sf_a5.pdf');await dl.saveAs(fp);const pdf=fs.readFileSync(fp,'latin1');
  const box=((pdf.match(/\/MediaBox\s*\[([^\]]+)\]/)||[])[1]||'').trim().split(/\s+/).map(Number);const pages=(pdf.match(/\/Type\s*\/Page[^s]/g)||[]).length;
  ok(pages===2&&[Math.round(box[2]/72*25.4),Math.round(box[3]/72*25.4)].sort().join()==='148,210','Saha fotoğrafları A5 PDF (2 sayfa)',{pages,box});
  /* 18 */
  r=await p.evaluate(async()=>{await agCycle('test');showScreen('mts');MTS.tab='ag';AG.view.m='haftalik';renderMts();await new Promise(r=>setTimeout(r,200));const b=document.getElementById('pfBox');return b?{t:b.textContent,bars:b.querySelectorAll('.pf-bar').length}:null});
  ok(r&&r.bars===8&&/bu hafta bakılan dosya/.test(r.t)&&/Kurgu Ercan/.test(r.t)&&/5\.000,00 ₺/.test(r.t)&&/Aşama dağılımı/.test(r.t),'Ajan Merkezi › 📈 Haftalık: 8 haftalık grafik, kişi tablosu, tahsilat, aşama dağılımı',r&&r.t.slice(0,300));
  ok(await p.evaluate(()=>!!document.querySelector('[data-pf="xls"]')&&!!document.querySelector('[data-pf="mail"]')),'Excel ve e-posta düğmeleri');
  await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{showScreen('dosyalar');select(0);S.tab='saha';renderCard(true)});await p.waitForTimeout(300);ok(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'Telefonda Saha sekmesinde taşma yok');
  [png,fp].forEach(f=>{try{fs.unlinkSync(f)}catch(e){}});
  ok(!errs.length,'Sayfa hatası yok',errs);console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
