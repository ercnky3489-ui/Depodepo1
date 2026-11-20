/* Kişi kartı başlığı: sekmeler ad/TCKN altında yatay, işlem düğmeleri adın sağında — node ptcard.test.js <app.html> */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const APP=path.resolve(process.argv[2]);let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x).slice(0,600):''))}};
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1440,height:1000}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await ctx.route(/cdnjs\.cloudflare\.com/,r=>r.abort());
  await p.addInitScript(()=>{localStorage.setItem('ia-arastiran','Test')});await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(1200);
  await p.evaluate(async()=>{await Store.savePortfolio('pA',{name:'A',importedAt:'2026-11-01T10:00:00Z',count:1},[{i:0,ad:'TEST BORÇLU KİŞİ',kimlik:'11111111110',sirket:false,m:'1',m2:'',gib:'',anapara:5,toplam:10,not:'',kef:[],x:{}}]);
    await Store.saveResearch({pid:'pA',idx:0,durum:'devam',sonuc:'',companies:[],updatedAt:new Date().toISOString(),persons:[newPerson({ad:'TEST BORÇLU KİŞİ',kimlik:'11111111110',rol:'Borçlu'}),newPerson({ad:'TEST KEFİL KİŞİ',kimlik:'33333333330',rol:'Kefil',babaAdi:'BABA',anneAdi:'ANNE',dogumYeri:'İl / İlçe',dogum:'01.01.1953'})]})});
  await p.reload();await p.waitForTimeout(2000);await p.evaluate(async()=>{await openPortfolio('pA');showScreen('dosyalar');select(0)});await p.waitForTimeout(1200);
  const chk=async(lbl)=>{const r=await p.evaluate(()=>{const c=[...document.querySelectorAll('.pt-card')].find(x=>/TEST KEFİL/.test(x.textContent));if(!c)return null;c.scrollIntoView();const R=e=>e.getBoundingClientRect();
      const sum=c.querySelector(':scope > .pt-sum'),m=sum.querySelector('.pt-m'),tb=sum.querySelector(':scope > .pt-tabs'),ac=sum.querySelector('.pt-acts'),body=c.querySelector('.pt-body');const i=sum.querySelector('.pt-i');const sp=[...i.children].filter(x=>getComputedStyle(x).display!=='none');
      return {inHead:!!tb,tabsRow:tb&&getComputedStyle(tb).flexDirection,tabsBelowTc:tb&&R(tb).top>=R(i).bottom-1,tabsLeft:tb&&Math.round(R(tb).left-R(m).left),acRightOfName:R(ac).left>=R(m).right-1,acTop:Math.round(R(ac).top-R(sum).top),
        overflow:[...ac.children].some(x=>R(x).right>R(sum).right+1),bodyW:Math.round(R(body.querySelector('.pt-panes')).width),cardW:Math.round(R(c).width),noOldTabs:!body.querySelector('.pt-tabs'),dobBelow:sp.length>1&&sp[1].getBoundingClientRect().top>=sp[0].getBoundingClientRect().bottom-1&&/Doğum/.test(sp[1].textContent)&&/TCKN/.test(sp[0].textContent),noBaba:!/Baba/.test(i.textContent),oneLine:(()=>{const n=sum.querySelector('.pt-n');return n.getBoundingClientRect().height<34})(),headH:Math.round(R(sum).height)}});
    console.log('    '+lbl,JSON.stringify(r));return r};
  let r=await chk('1440');ok(r&&r.inHead&&r.tabsRow==='row'&&r.tabsBelowTc&&Math.abs(r.tabsLeft)<4&&r.noOldTabs,'Sekmeler başlıkta, ad/TCKN satırının altında, yatay',r);
  ok(r.acRightOfName&&r.acTop<60&&!r.overflow,'İşlem düğmeleri adın sağındaki boşlukta, taşma yok',r);ok(r.dobBelow&&r.noBaba&&r.oneLine,'Başlık: rol+ad tek satır, doğum tarihi TCKN altında, baba yok',r);ok(r.bodyW>r.cardW-40,'İçerik kartın tüm genişliğini kullanıyor',r);
  const card=await p.$('.pt-card:has(.pt-rt.r-kefil), .pt-card.pt-kefil');await card.screenshot({path:path.join(__dirname,'ptcard_1440.png')});
  const an=async()=>p.evaluate(()=>{const l=[...document.querySelectorAll('.pt-card.pt-kefil .pchip')].find(x=>/Anne adı/.test(x.textContent));return l&&getComputedStyle(l).display!=='none'});
  ok(!(await an()),'Anne adı normalde gizli');await p.click('.pt-card.pt-kefil [data-act="ent-detail"]');await p.waitForTimeout(300);ok(await an(),'Detay → anne adı görünüyor');
  await p.click('.pt-card.pt-kefil [data-act="ent-detail"]');await p.waitForTimeout(300);
  await p.click('.pt-card.pt-kefil .pt-tab[data-ptab="ist"]');await p.waitForTimeout(200);
  const t=await p.evaluate(()=>{const c=document.querySelector('.pt-card.pt-kefil');return {sel:c.querySelector('.pt-tab[aria-selected="true"]').dataset.ptab,vis:[...c.querySelectorAll('.pt-pane')].filter(x=>!x.hidden).map(x=>x.dataset.pt)}});
  ok(t.sel==='ist'&&t.vis.join()==='ist','Sekme tıklanınca doğru bölüm açılıyor',t);
  await p.setViewportSize({width:1100,height:900});await p.waitForTimeout(400);r=await chk('1100');ok(r&&!r.overflow,'Dar masaüstünde düğmeler taşmıyor',r);await (await p.$('.pt-card.pt-kefil')).screenshot({path:path.join(__dirname,'ptcard_1100.png')});
  await p.setViewportSize({width:390,height:844});await p.waitForTimeout(400);await p.evaluate(()=>{try{select(0)}catch(e){}});await p.waitForTimeout(500);r=await chk('390');ok(r&&!r.overflow&&await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Telefonda taşma yok',r);
  await (await p.$('.pt-card.pt-kefil')).screenshot({path:path.join(__dirname,'ptcard_390.png')});
  console.log('\nSayfa hataları:',errs.length?errs:'yok');console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
