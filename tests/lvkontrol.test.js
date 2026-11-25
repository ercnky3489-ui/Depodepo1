/* Levha tutarlılık: SGK yetkili / MERSİS / TSG kaydı olan kişide eski ya da otomatik “levha yok” → sorgulanmadı; ajan bulur, uyarır, düzeltir (kurgusal) — node lvkontrol.test.js <app.html> */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const APP=path.resolve(process.argv[2]||'../out55.html');let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x).slice(0,700):''))}};
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>localStorage.setItem('ia-arastiran','Test'));await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(1200);
  await p.evaluate(async()=>{const row=(i,ad,k)=>({i,ad,kimlik:k,sirket:false,m:'',m2:'',gib:'',anapara:null,toplam:10,not:'',kef:[],x:{}});
    const T0=Date.now()-5*864e5,T1=Date.now()-2*864e5;
    const mk=(i,fill)=>{const pr=newPerson({ad:'KURGU '+i,kimlik:'1000000000'+i,rol:'Borçlu'});pr.src=emptySrc();fill(pr);return {pid:'pB',idx:i,durum:'devam',sonuc:'',updatedAt:new Date().toISOString(),persons:[pr],companies:[]}};
    await Store.savePortfolio('pB',{name:'B',importedAt:'2026-11-01T10:00:00Z',count:5},[0,1,2,3,4].map(i=>row(i,'KURGU '+i,'1000000000'+i)));
    const R=[
      mk(0,p=>{p.src.gib={s:'yok',n:''};p.src.levha={s:'yok',n:'GİB kaydı yok → otomatik',t:T0};p.src.sgkyet={s:'var',n:'',t:T1}}),          /* otomatik yok + SGK yetkili → geri */
      mk(1,p=>{p.src.levha={s:'yok',n:'',t:T0};p.src.mersis={s:'var',n:'MERSİS: X',t:T1}}),                                                /* elle yok, MERSİS sonradan → geri */
      mk(2,p=>{p.src.levha={s:'yok',n:'',t:T1};p.src.tsg={s:'var',n:'',t:T0}}),                                                            /* TSG’den SONRA elle yok → kalsın */
      mk(3,p=>{p.src.levha={s:'yok',n:'GİB kaydı yok → otomatik',t:T0}}),                                                                   /* olumlu kayıt yok → kalsın */
      mk(4,p=>{p.src.levha={s:'yok',n:'GİB terk → otomatik',t:T0};p.src.tsg={s:'var',n:'',t:T1}})];                                        /* otomatik + TSG → geri */
    for(const x of R)await Store.saveResearch(x)});
  await p.reload();await p.waitForTimeout(1500);await p.evaluate(()=>document.querySelectorAll('.modal-bg').forEach(x=>x.remove()));
  ok(await p.evaluate(()=>AG_DEF.some(a=>a.k==='lvkontrol')),'“Levha tutarlılık ajanı” ajan listesinde');
  await p.waitForFunction(()=>AG.st&&AG.st.lastFull&&!AG.busy,null,{timeout:30000});
  const dbg=await p.evaluate(()=>({pid:S.pid,note:AG.st.ag.lvkontrol.note,mem:[0,1,2,3,4].map(i=>{const R=(AG.data||[]).find(x=>x.pid==='pB');const r=R&&R.R.get(i);return r?r.persons[0].src.levha.s+'|'+(r.persons[0].src.levha._re||''):'-'})}));console.log('dbg',JSON.stringify(dbg));
  await p.evaluate(async()=>{await flushAll&&flushAll()}).catch(()=>{});await p.waitForTimeout(800);
  let r=await p.evaluate(async()=>{const out={};for(const i of [0,1,2,3,4]){const L=await pccLoadResearch('pB',5);const R=L.find(x=>x.idx===i)||S.research.get(i);const o=R.persons[0].src.levha;out[i]=o.s+'|'+(o._re||'')}
    const st=AG.st.ag.lvkontrol;const tasks=[...AG.tasks.values()].filter(t=>t.ag==='lvkontrol'&&t.s==='acik').length;const al=(AG.st.alerts||[]).find(a=>/levha/.test(a.txt));return {out,st:{s:st.s,note:st.note},tasks,al:al&&al.txt}});
  ok(r.out[0]==='|SGK yetkili'&&r.out[1]==='|MERSİS'&&r.out[4]==='|Ticaret Sicili Gazetesi','Otomatik/eski “levha yok” + SGK yetkili / MERSİS / TSG → levha “sorgulanmadı”ya döndü',r.out);
  ok(r.out[2]==='yok|'&&r.out[3]==='yok|','TSG kaydından sonra elle girilen “yok” ve olumlu kaydı olmayan kişi değişmedi',r.out);
  ok(/düzeltildi/.test(r.st.note)&&r.tasks===3&&/geri alındı/.test(r.al||''),'Ajan uyardı (uyarı + 3 görev) ve sağlık notu yazdı',r);
  r=await p.evaluate(async()=>JSON.stringify((await agAuditLoad()).rows||[]).match(/levha bakılacaklara geri alındı/g));ok(r&&r.length===3,'Her düzeltme denetim kaydına yazıldı',r&&r.length);
  /* kartta: SGK yetkili gelince otomatik levha yok kendiliğinden geri alınır, GİB otomatiği tekrar “yok” yazmaz */
  r=await p.evaluate(()=>{showScreen('dosyalar');select(3);const R=cur();const e=R.persons[0];e.src.sgkyet={s:'var',n:'',t:Date.now()};touch(R);renderCard(true);gibAutoYok(e,'yok');touch(R);renderCard(true);return e.src.levha});
  ok(r.s===''&&/SGK/.test(r._re||''),'Kartta SGK yetkili girilince levha hemen “sorgulanmadı”; GİB otomatiği tekrar “yok” yazmadı',r);
  r=await p.evaluate(()=>{const R=cur();const e=R.persons[0];e.src.levha={s:'yok',n:'',t:Date.now()+1000};touch(R);renderCard(true);return e.src.levha.s});
  ok(r==='yok','Sonradan levhaya elle bakıp “yok” derseniz kalıcı',r);
  ok(!errs.length,'Sayfa hatası yok',errs);console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
