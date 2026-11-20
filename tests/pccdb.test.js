/* MATRİX · paylaşımlı veritabanı modunda (256 KiB doküman, ≤1000 sorgu) büyük portföylerle çalışma — node pccdb.test.js <app.html> */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const APP=path.resolve(process.argv[2]||'../out37.html');
let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x).slice(0,600):''))}};
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:1000}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='warning'||m.type()==='error')errs.push('console: '+m.text().slice(0,200))});
  await p.addInitScript({path:path.join(__dirname,'fakedb.js')});await p.addInitScript(()=>{localStorage.setItem('ia-arastiran','Test Kullanıcı')});
  await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(1500);
  const mode=await p.evaluate(()=>!!db);ok(mode,'Paylaşımlı veritabanı modunda çalışıyor');
  /* iki büyük portföy: 2000 satır, zengin araştırma; 300 ortak TCKN */
  await p.evaluate(async()=>{const mk=async(pid,name,off)=>{const rows=[];for(let i=0;i<2000;i++){const t=String(10000000000+off+i);rows.push({i,ad:'BORÇLU KİŞİ ADI SOYADI '+(off+i),kimlik:t,sirket:false,m:'M'+i,m2:'',gib:'',anapara:null,toplam:1000+i,not:'',kef:[{ad:'KEFİL '+i,kimlik:String(20000000000+i),tur:'Kefil'}],x:{}})}
      await Store.savePortfolio(pid,{name,alacakli:name+' VYŞ',importedAt:new Date().toISOString(),count:rows.length},rows);
      for(let i=0;i<2000;i++){const t=String(10000000000+off+i);await Store.saveResearch({pid,idx:i,durum:i%3?'devam':'',sonuc:'',updatedAt:new Date().toISOString(),icraDaire:'İSTANBUL '+(i%30)+'. İCRA DAİRESİ',esasNo:'2024/'+(off+i),
        persons:[newPerson({ad:'BORÇLU KİŞİ ADI SOYADI '+(off+i),kimlik:t,rol:'Borçlu',telefonlar:[{id:'a',tel:'0532'+String(1000000+i)},{id:'b',tel:'0212'+String(2000000+i)}],anneTckn:String(30000000000+i),babaTckn:String(40000000000+i)}),
          newPerson({ad:'HANE BİREYİ '+i,kimlik:String(50000000000+off+i),rol:'Hane',yakinlik:'Eş'}),newPerson({ad:'KEFİL '+i,kimlik:String(20000000000+i),rol:'Kefil'})],companies:[]})}};
    await mk('bigA','Büyük Portföy A',0);await mk('bigB','Büyük Portföy B',1700)});
  await p.waitForFunction(()=>(S.portfolios||[]).length>=2,null,{timeout:20000});
  const r=await p.evaluate(async()=>{let e=null;try{await pccRun({force:true,why:'test'})}catch(x){e=String(x&&x.message||x)}const res=PCC.res;
    return {e,res:!!res,pfs:res&&res.pfs.length,A:res&&res.counts.A.kesin,B:res&&res.counts.B,stats:Object.fromEntries(Object.entries(PCC.stats||{}).map(([k,v])=>[k,v&&v.rows])),dbErr:__fakeDb.errors.slice(0,5),err:PCC.err||null}});
  console.log('    ',JSON.stringify(r));
  ok(r.res&&r.pfs===2,'Karşılaştırma tamamlandı (2 portföy)',r);
  ok(r.A===300,'300 ortak müşteri (TCKN) bulundu',r.A);
  ok(r.stats.bigA===2000&&r.stats.bigB===2000,'Her iki portföyün istatistiği var',r.stats);
  ok(!r.dbErr.length,'Veritabanı sınırlarına takılan yazma yok',r.dbErr);
  const r2=await p.evaluate(async()=>{await pccRun({why:'ikinci'});return {A:PCC.res.counts.A.kesin,built:PCC.state.runs[0].built}});ok(r2.A===300&&r2.built===0,'İkinci çalışmada dizinler veritabanından okundu (yeniden kurulmadı)',r2);
  await p.evaluate(()=>showScreen('mts'));await p.waitForTimeout(800);
  const k=await p.evaluate(()=>Object.fromEntries([...document.querySelectorAll('.mts-kpi')].map(x=>[x.dataset.mtsKpi,+x.querySelector('b').textContent.replace(/\D/g,'')])));
  ok(k.pf===2&&k.dupCust===300&&k.files===4000,'MATRİX göstergeleri: 2 portföy, 300 mükerrer müşteri, 4000 dosya',k);
  console.log('\nİstanbul Varlık (HANSOFT) paylaşımlı veritabanında');
  await p.evaluate(async()=>{await Store.savePortfolio('pZ',{name:'Küçük Portföy',importedAt:new Date().toISOString(),count:1},[{i:0,ad:'ALİ YILMAZ',kimlik:'10000000146',sirket:false,m:'',m2:'',gib:'',anapara:null,toplam:5,not:'',kef:[],x:{}}])});
  await p.addScriptTag({path:path.join(__dirname,'node_modules/xlsx/dist/xlsx.full.min.js')});
  await p.evaluate(()=>{document.querySelectorAll('.modal-bg').forEach(x=>x.remove());hxSetMode(true)});await p.waitForFunction(()=>HX.ready===true,null,{timeout:30000});
  await p.evaluate(()=>hxShow('yukle'));await p.waitForTimeout(200);await p.setInputFiles('#hxFile',[path.join(__dirname,'fxhx','Dosya Durum Rapor.xlsx')]);await p.waitForFunction(()=>HXI.files.length>0&&!HXI.prog,null,{timeout:20000});
  await p.click('[data-hx-act="commit"]');await p.click('.modal [data-m="ok"]');await p.waitForFunction(()=>!HXI.busy&&!HXI.files.length,null,{timeout:60000});
  await p.waitForFunction(()=>!!HX.bpf,null,{timeout:30000});
  const h=await p.evaluate(async()=>{await pccRun({force:true,why:'hx'});const c=PCC.res.conflicts.find(x=>x.id==='A:10000000146');return {pfs:PCC.res.pfs.map(x=>x.name),hx:(PCC.stats[HX_BPID]||{}).rows,c:c&&c.pids,err:PCC.err,ie:PCC.idxErr,dbErr:__fakeDb.errors.slice(0,3)}});
  console.log('    ',JSON.stringify(h));
  ok(h.hx>0&&h.pfs.some(x=>/İstanbul Varlık/.test(x)),'İstanbul föyü dizinlendi ('+h.hx+' dosya)',h);
  ok(h.c&&h.c.includes('pZ')&&h.c.includes(await p.evaluate(()=>HX_BPID)),'ALİ YILMAZ: İstanbul föyü ile Birikim portföyü arasında ortak müşteri',h.c);
  ok(!h.err&&!Object.keys(h.ie||{}).length&&!h.dbErr.length,'Hata / uyarı yok',h);
  await p.evaluate(()=>mtsShow());await p.waitForTimeout(800);
  const k2=await p.evaluate(()=>({k:Object.fromEntries([...document.querySelectorAll('.mts-kpi')].map(x=>[x.dataset.mtsKpi,+x.querySelector('b').textContent.replace(/\D/g,'')])),dn:[...document.querySelectorAll('.mts-dn li')].map(x=>x.innerText.replace(/\s+/g,' ')),warn:!!document.querySelector('.mts-warn')}));
  console.log('    ',JSON.stringify(k2));ok(k2.k.pf===4&&k2.k.dupCust===301&&k2.dn.some(x=>/İstanbul Varlık · HANSOFT [1-9]/.test(x))&&!k2.warn,'MATRİX: 4 portföy, 301 mükerrer müşteri, İstanbul dağılımda > 0',k2);
  console.log('\nSayfa hataları:',errs.length?errs.slice(0,5):'yok');
  console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
