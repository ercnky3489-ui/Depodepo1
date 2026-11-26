/* KORUMA TESTİ — Ajan Merkezi'nin korunan 6 bölümü (Aciz uyarıları, Görevler, Onay bekleyenler, Ekip, Haftalık, Yedek).
   Kurgusal veriyle her bölümün bugünkü davranışını doğrular ve düğme/başlık iskeletini koruma_baseline.json ile karşılaştırır.
   node koruma.test.js <app.html> [--baseline]   (--baseline: mevcut iskeleti temel olarak kaydeder) */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const APP=path.resolve(process.argv[2]||'../out55.html');const MK=process.argv.includes('--baseline');const BL=path.join(__dirname,'koruma_baseline.json');
let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x).slice(0,700):''))}};
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:1400,height:950}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{localStorage.setItem('ia-arastiran','Kurgu Ercan');let H=null;
    const room={presence:async o=>{if(H)H({peers:[{peer:'p1',isMe:true,kind:'viewer',presence:o,updatedAt:Date.now()},{peer:'p2',isMe:false,kind:'viewer',presence:{ad:'Kurgu Yakup',pid:'pK',i:1,dosya:'KURGU İKİ'},updatedAt:Date.now()}],joined:[],left:[],updated:[]})},onPeers:h=>{H=h;return()=>{}},peers:()=>[]};
    window.claude={use:async n=>n==='room'?room:null}});
  await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(1200);
  await p.evaluate(async()=>{const row=(i,ad,tc)=>({i,ad,kimlik:tc,sirket:false,m:'D'+i,m2:'',gib:'',anapara:null,toplam:100,not:'',kef:[],x:{}});
    const P=(ad,tc,rol,f)=>{const p=newPerson({ad,kimlik:tc,rol});p.src=emptySrc();if(f)f(p);return p};const allYok=p=>{Object.keys(p.src).forEach(k=>p.src[k]={s:'yok',n:''})};
    await Store.savePortfolio('pK',{name:'Kurgu Koruma',alacakli:'Kurgu Varlık',importedAt:'2026-11-01T10:00:00Z',count:3},[row(0,'KURGU ACİZ','10000000146'),row(1,'KURGU FAAL','10000000210'),row(2,'KURGU KOPYA','10000000358')]);
    const now=new Date().toISOString();
    await Store.saveResearch({pid:'pK',idx:0,durum:'devam',updatedAt:now,companies:[],persons:[P('KURGU ACİZ','10000000146','Borçlu',allYok)]});
    await Store.saveResearch({pid:'pK',idx:1,durum:'devam',updatedAt:now,companies:[],persons:[P('KURGU FAAL','10000000210','Borçlu',p=>{p.gibData={vkn:p.kimlik,vd:'X',durum:'FAAL'};p.src.gib={s:'var',n:'FAAL'}})]});
    await Store.saveResearch({pid:'pK',idx:2,durum:'devam',updatedAt:now,companies:[],persons:[P('KURGU KOPYA','10000000358','Borçlu'),P('KURGU FAAL','10000000210','Kefil')]})});
  await p.reload();await p.waitForTimeout(1500);await p.evaluate(()=>document.querySelectorAll('.modal-bg').forEach(x=>x.remove()));
  await p.evaluate(async()=>{await agCycle('test')});
  const MODS=['aciz','gorev','onay','ekip','haftalik','yedek'];
  const shot=async m=>p.evaluate(async m=>{showScreen('mts');MTS.tab='ag';AG.view.m=m;AG.view.pf='';renderMts();await new Promise(r=>setTimeout(r,250));
    const root=document.querySelector('.ag-body')||document.getElementById('mtsScreen');const tab=[...document.querySelectorAll('[data-agm],[data-ag-m],button')].find(x=>x.offsetParent&&(x.dataset.agm===m||x.dataset.agM===m));
    const btn=[...root.querySelectorAll('button')].filter(x=>x.offsetParent).map(x=>x.textContent.replace(/\d+/g,'#').replace(/\s+/g,' ').trim()).filter(Boolean);
    const hd=[...root.querySelectorAll('h2,h3,h4,.ag-h,.ag-sec-h,b.ag-t')].filter(x=>x.offsetParent).map(x=>x.textContent.replace(/\d+/g,'#').replace(/\s+/g,' ').trim()).slice(0,12);
    return {txt:root.textContent.replace(/\s+/g,' '),btn:[...new Set(btn)].sort(),hd,modTab:AG_MODS.some(x=>x[0]===m)}},m);
  const S={};for(const m of MODS)S[m]=await shot(m);
  ok(MODS.every(m=>S[m].modTab),'Korunan 6 bölüm Ajan Merkezi menüsünde yerinde ('+MODS.join(', ')+')');
  ok(/KURGU ACİZ/.test(S.aciz.txt)&&/Acize çekilebilir föyler/.test(S.aciz.txt),'Aciz uyarıları: bütün kişileri olumsuz föy listede',S.aciz.txt.slice(0,300));
  ok(/KURGU FAAL/.test(S.gorev.txt)&&/(levha|MERSİS)/i.test(S.gorev.txt),'Görevler: GİB faal kişi için levha/MERSİS görevleri açık',S.gorev.txt.slice(0,300));
  ok(/KURGU FAAL|KURGU KOPYA/.test(S.onay.txt)&&/GİB faal/i.test(S.onay.txt)&&/Onayla/.test(S.onay.txt),'Onay bekleyenler: aynı TCKN’nin diğer föyüne GİB önerisi, “Onayla” düğmesiyle',S.onay.txt.slice(0,300));
  ok(/Şu an kim nerede/.test(S.ekip.txt)&&/Kurgu Yakup/.test(S.ekip.txt)&&/Bugün kim ne yaptı/.test(S.ekip.txt),'Ekip: çevrimiçi kişiler ve bugünkü işlemler',S.ekip.txt.slice(0,300));
  ok(/bu hafta bakılan dosya/i.test(S.haftalik.txt)&&/Aşama dağılımı/.test(S.haftalik.txt),'Haftalık: haftalık grafik ve aşama dağılımı',S.haftalik.txt.slice(0,300));
  ok(/yedek/i.test(S.yedek.txt)&&/(Şifreli|şifreli)/.test(S.yedek.txt),'Yedek: yedek paneli (şifreli gece yedeği) görünüyor',S.yedek.txt.slice(0,300));
  /* Onay mekanizması gerçekten çalışıyor: bir öneriyi onayla → föye işlenir */
  const r=await p.evaluate(async()=>{const pr=(AG.props||[]).find(x=>x.s==='onay'&&x.k==='gib');if(!pr)return {none:true};await agBulkRun([pr.id]);await new Promise(r=>setTimeout(r,1500));const o=lsGet();const R=o.r[pr.to.pid+'--'+pr.to.i];const t=R&&R.persons.find(x=>x.kimlik==='10000000210');return {s:t&&t.src.gib&&t.src.gib.s,dec:(AG.dec.prop[pr.id]||{}).s}});
  ok(r.s==='var'&&r.dec==='uygulandi','Onay bekleyenler: onaylanan öneri föye işlendi ve karar kaydedildi',r);
  const SK={};MODS.forEach(m=>SK[m]={btn:S[m].btn,hd:S[m].hd});
  if(MK){fs.writeFileSync(BL,JSON.stringify(SK,null,1));console.log('  ● koruma_baseline.json kaydedildi')}
  else if(fs.existsSync(BL)){const B=JSON.parse(fs.readFileSync(BL,'utf8'));MODS.forEach(m=>{const miss=B[m].btn.filter(x=>!SK[m].btn.includes(x));ok(!miss.length,m+': temel sürümdeki düğmelerin hepsi duruyor',miss)})}
  ok(!errs.length,'Sayfa hatası yok',errs);console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
