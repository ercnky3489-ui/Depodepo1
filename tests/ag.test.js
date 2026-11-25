/* Ajan Merkezi · GÖREV 12 kabul senaryoları (kurgusal veri) — node ag.test.js <app.html> [--db] */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const APP=path.resolve(process.argv[2]||'../out51.html');const DB=process.argv.includes('--db');
let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x).slice(0,600):''))}};
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1440,height:1000}});const p=await ctx.newPage();
  await ctx.route(/cdnjs\.cloudflare\.com/,route=>{if(route.request().url().endsWith('xlsx.full.min.js'))return route.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync(path.join(__dirname,'node_modules/xlsx/dist/xlsx.full.min.js'))});return route.abort()});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  if(DB)await p.addInitScript({path:path.join(__dirname,'fakedb.js')});
  await p.addInitScript(()=>{localStorage.setItem('ia-arastiran','Test Kullanıcı');window.AG_TEST={fail:{sgk:sessionStorage.getItem('agf-sgk')==='1'}}});
  const U='http://127.0.0.1:'+srv.address().port+'/';await p.goto(U);await p.waitForTimeout(1500);
  /* kurgusal üç portföy: aynı borçlu (T1) üçünde de var */
  const T1='10000000146',T2='20000000002',T3='30000000003',T4='40000000004';
  await p.evaluate(async({T1,T2,T3,T4})=>{const row=(i,ad,k)=>({i,ad,kimlik:k,sirket:false,m:'',m2:'',gib:'',anapara:null,toplam:1000,not:'',kef:[],x:{}});
    const save=async(pid,meta,rows,fill)=>{await Store.savePortfolio(pid,meta,rows);for(const d of rows){const R=initResearch(d);R.pid=pid;R.idx=d.i;ensureSrc(R);delete R._fresh;if(fill[d.i])fill[d.i](R);R.updatedAt='2026-11-20T10:00:00Z';await Store.saveResearch(JSON.parse(JSON.stringify(R)))}};
    const bor=R=>R.persons.find(x=>x.rol==='Borçlu');
    await save('pA',{name:'Portföy A',alacakli:'A VYŞ',importedAt:'2026-11-01T10:00:00Z',count:4},[row(0,'ALİ YILMAZ',T1),row(1,'VELİ OLUMSUZ',T2),row(2,'HASAN EKSİK',T3),row(3,'AYŞE DEMİR','')],{
      0:R=>{const a=bor(R);a.gibData={vkn:T1,vd:'KADIKÖY',durum:'Faal'};a.src.gib={s:'var',n:'Faal'};a.src.sgkyet={s:'yok',n:''};
        const c1=newCompany({unvan:'ESKİ ORTAKLIK LTD ŞTİ',vkn:'1111111111',iliski:'Borçlunun ortak/yetkili olduğu şirket',kaynakKisi:a.id});
        const c2=newCompany({unvan:'GÜNCEL ORTAKLIK AŞ',vkn:'2222222222',iliski:'Borçlunun ortak/yetkili olduğu şirket',kaynakKisi:a.id});R.companies.push(c1,c2);
        R.persons.push(newPerson({rol:'Ortak',ad:'ALİ YILMAZ',kimlik:T1,sirket:c1.id,ortakDurum:'Pasif'}),newPerson({rol:'Ortak',ad:'ALİ YILMAZ',kimlik:T1,sirket:c2.id,ortakDurum:'Aktif'}))},
      1:R=>{const a=bor(R);a.src.gib={s:'yok',n:''};a.src.sgkyet={s:'yok',n:''};a.src.mersis={s:'yok',n:''};a.src.levha={s:'yok',n:''}},
      2:R=>{const a=bor(R);a.src.gib={s:'yok',n:''}}});
    await save('pB',{name:'Portföy B',alacakli:'B VYŞ',importedAt:'2026-11-02T10:00:00Z',count:2},[row(0,'ALİ YILMAZ',T1),row(1,'AYŞE DEMİR',T4)],{});
    await save('pC',{name:'Portföy C',alacakli:'C VYŞ',importedAt:'2026-11-03T10:00:00Z',count:1},[row(0,'ALİ YILMAZ',T1)],{})},{T1,T2,T3,T4});
  if(!DB){await p.evaluate(()=>sessionStorage.setItem('agf-sgk','1'));await p.reload();await p.waitForTimeout(300)}else await p.evaluate(()=>{AG_TEST.fail.sgk=true;if(AG.st)AG.st.lastFull=0});await p.evaluate(()=>{AG.backoff=20;sessionStorage.removeItem('agf-sgk');document.querySelectorAll('.modal-bg').forEach(x=>x.remove())});
  /* --- 1 · SGK okuyucu erişemiyor → olumsuz üretilmez --- */
  await p.evaluate(()=>{AG_TEST.fail.sgk=true});
  await p.waitForFunction(()=>AG.st&&AG.st.lastFull>0&&!AG.busy,null,{timeout:30000});
  let r=await p.evaluate(()=>{const ev=AG.ev.get('pA#1');return {v:ev.v,sgk:ev.ents[0].st.sgk,s:AG.st.ag.sgk.s,aciz:agOpenTasks(t=>t.type==='aciz').length,seen:Object.keys(AG.st.seenAciz).length,err:AG.st.ag.sgk.errCat}});
  ok(r.v==='eksik'&&r.sgk==='err'&&r.aciz===0&&r.seen===0,'1 · SGK okunamayınca dosya “olumsuz” sayılmadı; SGK = SORGULANAMADI, aciz bildirimi yok',r);
  ok(r.s==='erisim'&&r.err==='erisim','1 · SGK ajanı “Kaynak sisteme erişilemiyor” durumunda; hata türü bağlantı/erişim',r);
  await p.evaluate(()=>{AG_TEST.fail.sgk=false});await p.evaluate(()=>agCycle('test'));
  r=await p.evaluate(()=>{const ev=AG.ev.get('pA#1');return {v:ev.v,aciz:agOpenTasks(t=>t.type==='aciz').map(t=>t.pid+'#'+t.i),s:AG.st.ag.sgk.s,e2:AG.ev.get('pA#2').v}});
  ok(r.v==='olumsuz'&&r.aciz.join()==='pA#1'&&r.s==='tamam','1b · erişim düzelince “tüm kişiler olumsuz” + acize çekme görevi (yalnız o dosya)',r);
  ok(r.e2==='eksik','1c · SGK yetkili sorgulanmamış dosya olumsuz değil “eksik sorgu”',r);
  /* --- 3 · aynı borçlu üç portföyde → tek ana kişi kaydı --- */
  r=await p.evaluate(T1=>{const G=AG.graph;const n=G.N.get('t:'+T1);const same=[...G.N.values()].filter(x=>x.type==='p'&&x.tc===T1).length;const M=agMasters(G).map(x=>x.id);
    return n?{files:n.files.size,pfs:[...n.pfs].sort(),same,master:M.includes('t:'+T1)}:null},T1);
  ok(r&&r.files===3&&r.pfs.join()==='pA,pB,pC'&&r.same===1&&r.master,'3 · Aynı TCKN üç portföyde: tek ana kişi düğümü, 3 dosya ilişkisi ayrı korunuyor',r);
  /* --- 5 · geçmiş ortaklık güncel gösterilmez --- */
  r=await p.evaluate(T1=>{const E=AG.graph.E.filter(e=>e.a==='t:'+T1);const x=v=>E.filter(e=>e.b===v).map(e=>e.rel+'/'+(e.gec||'?'));return {eski:x('v:1111111111'),guncel:x('v:2222222222')}},T1);
  ok(r.eski.join()==='gecmis-ortak/gecmis','5 · Pasif ortaklık yalnız “Geçmiş şirket ortaklığı · geçmiş” olarak var',r);
  ok(r.guncel.join()==='ortak/guncel','5 · Aktif ortaklık “Şirket ortağı · güncel”',r);
  /* --- 6 · isim benzerliği birleştirme yapmaz --- */
  r=await p.evaluate(T4=>{const G=AG.graph;const loc=[...G.N.values()].find(n=>n.type==='p'&&n.label==='AYŞE DEMİR'&&n.id.startsWith('p:'));const t=G.N.get('t:'+T4);
    const kes=G.E.filter(e=>(e.a===loc.id&&e.b===t.id)||(e.b===loc.id&&e.a===t.id)).map(e=>e.lvl);return {loc:!!loc,sep:loc&&t&&loc.id!==t.id,tFiles:t.files.size,names:AG.names.map(n=>n.from+'→'+n.to),kes}},T4);
  ok(r.loc&&r.sep&&r.tFiles===1&&r.names.length===1&&r.kes.join()==='olasi','6 · TCKN’siz “AYŞE DEMİR” TCKN’li kayıtla birleştirilmedi; yalnız “olası · doğrulama bekliyor”',r);
  await p.evaluate(()=>agNameAct(AG.names[0].id,'farkli'));await p.evaluate(()=>agCycle('test'));
  r=await p.evaluate(()=>AG.names.length);ok(r===0,'6b · Kullanıcı “farklı kişi” dedi → bir daha önerilmiyor',r);
  /* --- 7 · aynı bulgu tekrar görev / e-posta üretmez --- */
  const tk1=await p.evaluate(()=>[...AG.tasks.keys()].sort());await p.evaluate(()=>agCycle('test'));const tk2=await p.evaluate(()=>[...AG.tasks.keys()].sort());
  ok(tk1.length>0&&JSON.stringify(tk1)===JSON.stringify(tk2)&&new Set(tk2).size===tk2.length,'7 · Ardışık taramalar aynı görev kimliklerini üretiyor, kopya görev yok',{n1:tk1.length,n2:tk2.length});
  await p.evaluate(async()=>{await mtsOpenRow('pA',0);const R=getR(0);R.durum='hacze';touch(R,true);await new Promise(r=>setTimeout(r,1500));await agCycle('test');await agCycle('test')});
  r=await p.evaluate(async()=>{const it=Object.entries(AG.mail.items).filter(([k])=>k.startsWith('pA#0#'));const {rows}=await agAuditLoad();return {it:it.map(([k,v])=>k+'='+v.s),n:rows.filter(e=>e.act==='e-posta kuyruğuna alındı').length}});
  ok(r.it.join()==='pA#0#hacze=kuyruk'&&r.n===1,'7 · “Hacze çıkılabilir”e geçen dosya e-posta kuyruğuna bir kez alındı; tekrar taramada yeni e-posta yok',r);
  r=await p.evaluate(()=>/gönderilmedi/.test(agMailHTML()));ok(r,'7 · Gmail bağlı değil: ekranda “hiçbir e-posta gönderilmedi” açıkça yazıyor');
  /* --- 4 · yeni şirket bağlantısı diğer portföylerdeki dosyaları yeniden değerlendirir --- */
  await p.evaluate(async T1=>{await mtsOpenRow('pB',0);const R=getR(0);let a=R.persons.find(x=>x.rol==='Borçlu');if(!a){a=newPerson({rol:'Borçlu',ad:'ALİ YILMAZ',kimlik:T1});R.persons.push(a)}
    R.companies.push(newCompany({unvan:'YENİ BAĞLANTI TİC LTD',vkn:'3333333333',iliski:'Borçlunun ortak/yetkili olduğu şirket',kaynakKisi:a.id}));touch(R)},T1);
  await p.waitForFunction(()=>AG.lastTouch&&AG.lastTouch.pid==='pB'&&AG.lastTouch.touched.length>0,null,{timeout:10000}).catch(()=>{});
  r=await p.evaluate(()=>({props:AG.props.filter(x=>x.k==='sirket:v:3333333333'&&x.s==='onay').map(x=>x.to.pid+'#'+x.to.i).sort(),touched:AG.lastTouch.touched.sort(),
    tasks:agOpenTasks(t=>t.ag==='yayilim'&&/YENİ BAĞLANTI/.test(t.txt)).map(t=>t.pid+'#'+t.i).sort()}));
  ok(r.props.join()==='pA#0,pC#0'&&r.tasks.join()==='pA#0,pC#0','4 · pB’de yeni şirket bağlantısı → pA ve pC dosyalarında öneri + görev',r);
  ok(r.touched.includes('pA#0')&&r.touched.includes('pC#0'),'4 · Bağlantılı dosyalar yeniden değerlendirildi',r);
  /* onaylı yayılım: hedef föye kaynağıyla eklenir, üzerine yazılmaz */
  await p.evaluate(async()=>{const id=AG.props.find(x=>x.k==='sirket:v:3333333333'&&x.to.pid==='pC').id;const pr=agPropAct(id,'ok');for(let k=0;k<50&&!document.querySelector('.modal [data-m="ok"]');k++)await new Promise(r=>setTimeout(r,100));document.querySelector('.modal [data-m="ok"]').click();await pr;await new Promise(r=>setTimeout(r,1800))});
  r=await p.evaluate(()=>{const R=S.pid==='pC'?getR(0):null;const c=R&&R.companies.find(c=>c.vkn==='3333333333');return {pid:S.pid,c:!!c,not:c&&c.not,task:agOpenTasks(t=>t.ag==='yayilim'&&t.pid==='pC'&&/YENİ BAĞLANTI/.test(t.txt)).length}});
  ok(r.c&&/Ajan yayılımı: Portföy B/.test(r.not)&&r.task===0,'4b · Onaylanan bulgu pC föyüne kaynak notuyla eklendi, ilgili görev kapandı',r);
  /* --- 8 · ajan durdurulunca görevler kaybolmaz --- */
  const before=await p.evaluate(()=>agOpenTasks(t=>t.ag==='sahis'||t.ag==='sirket').map(t=>t.id).sort());
  await p.evaluate(async()=>{showScreen('mts');MTS.tab='ag';AG.view.m='saglik';renderMts();await new Promise(r=>setTimeout(r,200));document.querySelector('[data-ag-stop="sahis"]').click();document.querySelector('[data-ag-stop="sirket"]').click();await agCycle('test')});
  r=await p.evaluate(()=>({after:agOpenTasks(t=>t.ag==='sahis'||t.ag==='sirket').map(t=>t.id).sort(),s:AG.st.ag.sahis.s}));
  ok(before.length>0&&JSON.stringify(before)===JSON.stringify(r.after)&&r.s==='durdu','8 · Şahıs/şirket ajanları durduruldu, açık görevleri korunuyor',{b:before.length,a:r.after.length,s:r.s});
  /* --- 9 · yeniden başlatmada bekleyen görevler ve yarım çalışma sürer --- */
  const openBefore=await p.evaluate(async()=>{await agTasksSave();AG.st.cycle={id:'cYARIM',t0:Date.now(),done:['veri','uyap'],why:'test'};await agSaveState(true);return agOpenTasks().map(t=>t.id).sort()});
  if(!DB){await p.reload();await p.waitForTimeout(800)}else await p.evaluate(()=>{AG.st=null;AG.tasks=new Map();AG.tasksLoaded=false;AG.auditHead=null;setTimeout(()=>agCycle('yeniden açılış'),300)});
  r=await p.evaluate(async()=>{await agLoadState();await agTasksLoad();return {open:agOpenTasks().map(t=>t.id).sort(),stop:AG.st.ag.sahis.s}});
  ok(JSON.stringify(r.open)===JSON.stringify(openBefore)&&r.stop==='durdu','9 · Yeniden açılışta bekleyen görevler (ve durdurma kararı) kaldığı yerden yüklendi',{a:openBefore.length,b:r.open.length,stop:r.stop});
  await p.waitForFunction(()=>AG.st&&AG.st.cycles&&AG.st.cycles[0]&&!AG.busy&&AG.st.cycle&&AG.st.cycle.t1,null,{timeout:30000});
  r=await p.evaluate(async()=>{const {rows}=await agAuditLoad();return rows.some(e=>e.act==='yarım kalan çalışma sürdürüldü'&&/cYARIM/.test(e.note||''))});
  ok(r,'9 · Yarım kalan tarama algılandı ve sürdürüldü (denetim kaydında)');
  await p.evaluate(async()=>{for(const k of ['sahis','sirket']){const a=AG.st.ag[k];a.s='bekliyor';a.manual=false}await agSaveState(true)});
  /* --- 2 · GİB okuyucu üç gün üst üste başarısız → kritik uyarı --- */
  r=await p.evaluate(async()=>{AG.backoff=5;AG_TEST.fail.gib='format bozuk';AG_TEST.fail.gib_code='unavailable';const real=Date.now();const out=[];
    for(let d=0;d<3;d++){AG.now=()=>real+(d+1)*864e5+3600e3;await agCycle('gün '+(d+1));out.push({s:AG.st.ag.gib.s,crit:AG.st.ag.gib.crit,days:AG.st.ag.gib.failDays.length})}
    const al=AG.st.alerts.filter(a=>a.k==='3gun:gib'&&a.lvl==='kritik').length;const ev=AG.ev.get('pA#1');AG.now=()=>Date.now();AG_TEST.fail.gib=false;return {out,al,v:ev.v,gib:ev.ents[0].st.gib}});
  ok(!r.out[0].crit&&!r.out[1].crit&&r.out[2].crit&&r.al===1,'2 · GİB 3 gün üst üste başarısız → tek kritik uyarı (1. ve 2. günde yok)',r);
  ok(r.v!=='olumsuz'&&r.gib==='err','2 · GİB sorgulanamazken dosya olumsuz sayılmadı (GİB = SORGULANAMADI)',r);
  r=await p.evaluate(async()=>{const a=AG.st.ag.gib;a.s='bekliyor';a.manual=false;await agCycle('test');return {s:AG.st.ag.gib.s,crit:AG.st.ag.gib.crit,v:AG.ev.get('pA#1').v}});
  ok(r.s==='tamam'&&!r.crit&&r.v==='olumsuz','2b · GİB düzelince ajan “Tamamlandı”, kritik bayrağı kalktı',r);
  /* --- 10 · bütün ajanların işlem geçmişi denetlenebilir --- */
  r=await p.evaluate(async()=>{await agAuditFlush();const v=await agAuditVerify();const {rows}=await agAuditLoad();const ags=new Set(rows.map(e=>e.ag));
    const miss=AG_DEF.map(a=>a.k).filter(k=>!ags.has(k));const user=rows.filter(e=>e.user).length;const err=rows.filter(e=>e.err).length;
    const okF=rows.filter(e=>e.act==='tamamlandı').every(e=>e.t0&&e.t1&&e.src&&e.task);return {v,miss,user,err,okF,n:rows.length}});
  ok(r.v.ok&&r.miss.length===0&&r.n>20,'10 · Denetim zinciri doğrulandı ve 15 ajanın hepsinin kaydı var',r);
  ok(r.okF&&r.user>0&&r.err>0,'10 · Kayıtlarda görev kimliği, başlangıç/bitiş, kaynak, hata/tekrar ve kullanıcı onayları var',r);
  r=await p.evaluate(async()=>{const head=await AGS.get('audit_head');const c=await AGS.get(head.chunks[0]);c.e[1].to='DEĞİŞTİRİLDİ';
    if(typeof db!=='undefined'&&db)await db.doc('ag/'+head.chunks[0]).set(c);else{const o=JSON.parse(localStorage.getItem('ag-v1'));o[head.chunks[0]]=c;localStorage.setItem('ag-v1',JSON.stringify(o))}
    return agAuditVerify()});
  ok(r.ok===false,'10 · Sonradan değiştirilen kayıt zincir doğrulamasında yakalanıyor',r);
  /* --- arayüz --- */
  await p.evaluate(()=>{showScreen('mts');MTS.tab='cmd';renderMts()});await p.waitForTimeout(300);
  r=await p.evaluate(()=>({ban:!!document.querySelector('.ag-ban'),tab:!!document.querySelector('[data-mts-tab="ag"]')}));ok(r.ban&&r.tab,'Komuta ekranında ajan şeridi ve “Ajan Merkezi” sekmesi var',r);
  const mods=await p.evaluate(()=>AG_MODS.map(m=>m[0]));const bad=[];
  for(const m of mods){await p.evaluate(m=>{MTS.tab='ag';AG.view.m=m;renderMts()},m);await p.waitForTimeout(m==='denetim'?600:120);const t=await p.evaluate(()=>{const c=document.getElementById('agCenter');return c?c.innerText:''});if(!t||/gösterilemedi/.test(t))bad.push(m)}
  ok(!bad.length,'Ajan Merkezi’nin 10 modülü hatasız açılıyor',bad);
  await p.evaluate(()=>{AG.view.m='ozet';renderMts()});await p.waitForTimeout(200);await p.screenshot({path:path.join(__dirname,'ag_ozet.png')});
  await p.evaluate(T1=>{AG.view.m='ag';AG.view.ego='t:'+T1;renderMts()},T1);await p.waitForTimeout(200);await p.locator('.ag-ego').screenshot({path:path.join(__dirname,'ag_graf.png')});
  r=await p.evaluate(()=>{const t=document.getElementById('agCenter').innerText;return {g:/Geçmiş şirket ortaklığı/.test(t),c:/Güncel/.test(t),svg:!!document.querySelector('.ag-svg circle')}});ok(r.g&&r.c&&r.svg,'İlişki ağı: SVG grafik + geçmiş/güncel ayrımlı bağlantı tablosu',r);
  await p.evaluate(()=>{AG.view.m='saglik';renderMts()});await p.waitForTimeout(200);await p.screenshot({path:path.join(__dirname,'ag_saglik.png')});
  await p.evaluate(async()=>{await mtsOpenRow('pA',1)});await p.waitForTimeout(800);
  r=await p.evaluate(()=>{const f=document.querySelector('#agFoy .ag-foy');return f?{cls:f.className,t:f.innerText}:null});ok(r&&/hot/.test(r.cls)&&/olumsuz/.test(r.t),'Föyde ajan paneli: “Tüm kişiler olumsuz” uyarısı',r);
  await p.evaluate(()=>{document.querySelector('#agFoy .ag-foy').open=true});await p.waitForTimeout(150);await p.screenshot({path:path.join(__dirname,'ag_foy.png')});
  await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{showScreen('mts');MTS.tab='ag';AG.view.m='ozet';renderMts()});await p.waitForTimeout(400);
  r=await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1);ok(r,'Telefon genişliğinde yatay taşma yok');await p.screenshot({path:path.join(__dirname,'ag_m.png')});
  console.log('\nSayfa hataları:',errs.length?errs.slice(0,5):'yok');ok(!errs.length,'Sayfa hatası yok',errs);
  if(DB){const fe=await p.evaluate(()=>window.__fakeDb.errors);console.log('fakedb hataları:',fe.slice(0,5))}
  console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
