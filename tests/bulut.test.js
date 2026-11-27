/* Faz 4b · Bulut ajanı çalıştırıcısı (tools/bulut-ajan/calistir.js) — kurgusal veri. node bulut.test.js <app.html> <depo_kokü> */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http'),cp=require('child_process');
const APP=path.resolve(process.argv[2]||'../out55.html');const REPO=path.resolve(process.argv[3]||'/home/user/Depodepo1');const RUN=path.join(REPO,'tools/bulut-ajan/calistir.js');
let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x).slice(0,700):''))}};
const W=path.join(__dirname,'_bulut');fs.rmSync(W,{recursive:true,force:true});const EXP=path.join(W,'export'),OUT=path.join(W,'out');
(async()=>{/* 1) kurgusal “canlı” veritabanı: kullanıcı uygulamayı bir kez açmış, ajanlar dün çalışmış */
  const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const p=await b.newPage();await p.addInitScript({path:path.join(__dirname,'fakedb.js')});await p.addInitScript(()=>localStorage.setItem('ia-arastiran','Kurgu Ercan'));
  await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(1500);
  await p.evaluate(async()=>{const row=(i,ad,tc)=>({i,ad,kimlik:tc,sirket:false,m:'D'+i,m2:'',gib:'',anapara:null,toplam:10,not:'',kef:[],x:{}});await Store.savePortfolio('pB',{name:'Kurgu Bulut',importedAt:'2026-11-01T10:00:00Z',count:2},[row(0,'KURGU BİR','10000000146'),row(1,'KURGU İKİ','10000000210')]);
    const P=newPerson({ad:'KURGU BİR',kimlik:'10000000146',rol:'Borçlu'});P.src=emptySrc();P.gibData={vkn:P.kimlik,vd:'X',durum:'FAAL'};P.src.gib={s:'var',n:'FAAL'};await Store.saveResearch({pid:'pB',idx:0,durum:'devam',updatedAt:new Date().toISOString(),persons:[P],companies:[]});
    const Q=newPerson({ad:'KURGU İKİ',kimlik:'10000000210',rol:'Borçlu'});Q.src=emptySrc();Object.keys(Q.src).forEach(k=>Q.src[k]={s:'yok',n:''});await Store.saveResearch({pid:'pB',idx:1,durum:'devam',updatedAt:new Date().toISOString(),persons:[Q],companies:[]});
    await agCycle('test');await new Promise(r=>setTimeout(r,1500));await agAuditFlush();await agSaveState();
    /* uygulama kapandıktan sonra (bulut çalışmadan önce) bir kullanıcı föye yeni sonuç yapıştırmış gibi: SGK yetkili kaydı */
    const o=JSON.parse(JSON.stringify(window.__fakeDb.store.get('research/pB--1')));o.persons[0].src.gib={s:'var',n:'FAAL'};o.persons[0].gibData={vkn:'10000000210',vd:'X',durum:'FAAL'};window.__fakeDb.store.set('research/pB--1',o)});
  const store=await p.evaluate(()=>[...window.__fakeDb.store.entries()]);await b.close();srv.close();
  for(const [k,v] of store){const f=path.join(EXP,k+'.json');fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(v,null,2))}
  ok(store.length>20,'Kurgusal canlı veritabanı dosyalara aktarıldı (ArtifactData out_dir biçimi, '+store.length+' belge)');
  /* 2) bulut çalıştırıcısı */
  const t=Date.now();const o=cp.spawnSync('node',[RUN,'calistir',EXP,APP,OUT],{encoding:'utf8',timeout:240000});console.log('    '+(o.stdout||'').trim().split('\n').join('\n    '));if(o.status!==0)console.log(o.stderr);
  ok(o.status===0,'Çalıştırıcı hatasız bitti ('+Math.round((Date.now()-t)/1000)+' sn)',o.stderr&&o.stderr.slice(0,300));
  const Z=JSON.parse(fs.readFileSync(path.join(OUT,'ozet.json'),'utf8'));const paths=Z.degisen.map(x=>x.yol);
  ok(Z.ajanlar&&Object.keys(Z.ajanlar).length===21&&Object.values(Z.ajanlar).every(a=>a.s!=='hata'&&a.s!=='erisim'),'Bulutta 21 ajan kaydı, hata yok',Z.ajanlar);
  ok(Z.sayfa_hatalari.length===0&&Z.db_hatalari.length===0,'Sayfa ve veritabanı hatası yok',[Z.sayfa_hatalari,Z.db_hatalari]);
  ok(paths.some(x=>/^ao_tasks\/run_/.test(x))&&paths.some(x=>x.startsWith('ag/')),'Değişen kayıtlar listelendi: ajan durumu/görevler (ag) ve tur kayıtları (ao_tasks)',paths.slice(0,12));
  const tasks=paths.filter(x=>/^ag\/tasks_/.test(x));let hasNew=false;for(const t2 of tasks){const d=JSON.parse(fs.readFileSync(path.join(OUT,'degisen',t2+'.json'),'utf8'));if(JSON.stringify(d).includes('KURGU İKİ'))hasNew=true}
  ok(hasNew,'Kapalıyken yapıştırılan GİB sonucu için bulut turunda yeni görev açıldı (KURGU İKİ)',tasks);
  ok(!paths.some(x=>x.startsWith('research/'))&&!paths.some(x=>x.startsWith('portfolios/')),'Föy ve portföy belgelerine dokunulmadı (bu turda yazılacak föy değişikliği yok)',paths.filter(x=>/^(research|portfolios)\//.test(x)));
  ok(Z.silinen_yazilmayacak.length===0,'Silinen belge yok',Z.silinen_yazilmayacak);
  ok(!paths.some(x=>/backups|brief_last/.test(x)),'Bulut modunda yedek ya da brifing kaydı oluşmadı',paths.filter(x=>/backups|brief_last/.test(x)));
  /* 3) “başkası değiştirmiş mi” kontrolü */
  const anyEx=Z.degisen.find(x=>!x.yeni);const same=cp.spawnSync('node',[RUN,'karsilastir',anyEx.disari,anyEx.disari]).status;const tmp=path.join(W,'tmp.json');const d=JSON.parse(fs.readFileSync(anyEx.disari,'utf8'));d.__baska=1;fs.writeFileSync(tmp,JSON.stringify(d));const diff=cp.spawnSync('node',[RUN,'karsilastir',anyEx.disari,tmp]).status;
  ok(same===0&&diff===3,'karsilastir: aynı içerik → 0, başkası değiştirmiş → 3 (yazılmaz)',{same,diff});
  /* 4) yazım planı: biri bu arada ag/state belgesini değiştirmiş olsun */
  const G=JSON.parse(cp.spawnSync('node',[RUN,'gereken',OUT],{encoding:'utf8'}).stdout);
  ok(G.koleksiyonlar.includes('ag')&&G.koleksiyonlar.includes('ao_tasks')&&G.surum_gereken.length===Z.degisen.filter(x=>!x.yeni).length,'gereken: okunacak koleksiyonlar ve sürümü gereken belgeler listeleniyor',G.koleksiyonlar);
  const SIM=path.join(W,'simdi');fs.cpSync(EXP,SIM,{recursive:true});const victim=Z.degisen.find(x=>!x.yeni&&/^ag\//.test(x.yol));const vd=JSON.parse(fs.readFileSync(path.join(SIM,victim.yol+'.json'),'utf8'));vd.__kullanici=1;fs.writeFileSync(path.join(SIM,victim.yol+'.json'),JSON.stringify(vd));
  const V={};G.surum_gereken.forEach((y,i)=>V[y]=10+i);const VF=path.join(W,'surumler.json');fs.writeFileSync(VF,JSON.stringify(V));
  const y=cp.spawnSync('node',[RUN,'yazim',OUT,SIM,VF],{encoding:'utf8'});const Y=JSON.parse(fs.readFileSync(path.join(OUT,'yazim_ozet.json'),'utf8'));const all=Y.paketler.flatMap(f=>JSON.parse(fs.readFileSync(f,'utf8')));
  ok(y.status===0&&Y.cakisma.length===1&&Y.cakisma[0].yol===victim.yol&&!all.some(w=>w.collection+'/'+w.doc_id===victim.yol),'Bulut turu sırasında başkasının değiştirdiği belge yazılmıyor (çakışma olarak raporlanıyor)',Y.cakisma);
  const nw=all.filter(w=>!('if_version' in w)),ex=all.filter(w=>'if_version' in w);
  ok(all.length===Z.degisen.length-1&&nw.length===Z.degisen.filter(x=>x.yeni).length&&ex.every(w=>w.if_version===V[w.collection+'/'+w.doc_id])&&all.every(w=>w.op==='set'&&fs.existsSync(w.file_path)),'Yazım paketleri: mevcut belgeler sürüm kilitli (if_version), yeni belgeler sürümsüz, yalnız “set”, silme yok',{n:all.length,nw:nw.length});
  ok(Y.paketler.every(f=>JSON.parse(fs.readFileSync(f,'utf8')).length<=50),'Paket başına en çok 50 yazım');
  fs.writeFileSync(VF,'{}');const y2=cp.spawnSync('node',[RUN,'yazim',OUT,SIM,VF],{encoding:'utf8'});ok(y2.status===4,'Sürüm bilgisi eksikse yazım planı hata koduyla duruyor (körlemesine yazmıyor)',y2.stdout);
  fs.rmSync(W,{recursive:true,force:true});console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
