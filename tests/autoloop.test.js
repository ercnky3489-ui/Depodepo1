/* “N dosyada resmi kayıtlar otomatik güncellendi” uyarısı her açılışta tekrar etmemeli (kurgusal) — node autoloop.test.js <app.html> */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const APP=path.resolve(process.argv[2]||'../out55.html');let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x).slice(0,600):''))}};
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{localStorage.setItem('ia-arastiran','Test');window.__toasts=[];const t0=window.toast;Object.defineProperty(window,'__hook',{value:1});});
  await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(1200);
  await p.evaluate(async()=>{const row=i=>({i,ad:'KURGU '+i,kimlik:'1000000000'+i,sirket:false,m:'',m2:'',gib:'',anapara:null,toplam:10,not:'',kef:[],x:{}});
    await Store.savePortfolio('pA',{name:'A',importedAt:'2026-11-01T10:00:00Z',count:4},[0,1,2,3].map(row));
    const mk=(i,fill)=>{const pr=newPerson({ad:'KURGU '+i,kimlik:'1000000000'+i,rol:'Borçlu'});pr.src=emptySrc();fill(pr);return {pid:'pA',idx:i,durum:'devam',sonuc:'',updatedAt:'2026-11-20T10:00:00Z',persons:[pr],companies:[]}};
    await Store.saveResearch(mk(0,p=>{p.src.gib={s:'yok',n:''};p.src.sgkyet={s:'var',n:'',t:Date.now()}}));                  /* GİB yok + SGK yetkili */
    await Store.saveResearch(mk(1,p=>{p.src.getcontact={s:'var',n:''};p.src.sgkyet={s:'var',n:'',t:Date.now()}}));         /* telefon kaydı + SGK yetkili */
    await Store.saveResearch(mk(2,p=>{p.src.gib={s:'yok',n:''};p.src.tsg={s:'var',n:'',t:Date.now()}}));                     /* GİB yok + TSG */
    await Store.saveResearch(mk(3,p=>{p.src.gib={s:'yok',n:''}}))});                                                          /* yalnız GİB yok */
  const cycle=async()=>{await p.reload();await p.waitForTimeout(800);return p.evaluate(async()=>{const T=[];const t0=toast;toast=function(m){T.push(String(m));return t0.apply(this,arguments)};
      document.querySelectorAll('.modal-bg').forEach(x=>x.remove());await openPortfolio('pA');await new Promise(r=>setTimeout(r,2600));try{flushAll()}catch(e){}await new Promise(r=>setTimeout(r,800));
      return {T:T.filter(x=>/resmi kayıtlar/.test(x)),lv:[0,1,2,3].map(i=>{const R=S.research.get(i);const o=R.persons[0].src.levha||{};return o.s+'|'+(o.n||'')})}})};
  const c1=await cycle(),c2=await cycle(),c3=await cycle();
  console.log(JSON.stringify({c1,c2,c3}));
  ok(c2.T.length===0&&c3.T.length===0,'İkinci ve üçüncü açılışta “otomatik güncellendi” uyarısı tekrar çıkmıyor',{c1:c1.T,c2:c2.T,c3:c3.T});
  ok(c3.lv[0].startsWith('|')&&c3.lv[1].startsWith('|')&&c3.lv[2].startsWith('|'),'SGK yetkili / TSG olan kişilerin levhası “sorgulanmadı”da kalıyor',c3.lv);
  ok(/^yok\|GİB kaydı yok → otomatik$/.test(c3.lv[3]),'Olumlu kaydı olmayan kişide otomatik “yok” duruyor',c3.lv[3]);
  ok(!errs.length,'Sayfa hatası yok',errs);console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
