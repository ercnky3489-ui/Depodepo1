/* TSG animasyonu: "Var" tıklaması, föyü açma ve analiz bitişi tetikleyicileri — node tsg_fx.test.js <app.html> [rm] */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const APP=path.resolve(process.argv[2]);const RM=process.argv[3]==='rm';
let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x).slice(0,600):''))}};
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1440,height:480},reducedMotion:RM?'reduce':'no-preference'});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await ctx.route(/cdnjs\.cloudflare\.com/,r=>r.abort());
  await p.addInitScript(()=>{localStorage.setItem('ia-arastiran','Test');window.__fx=0;document.addEventListener('DOMContentLoaded',()=>new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.classList&&n.classList.contains('tsg-fxc'))window.__fx++}))).observe(document.body,{childList:true}))});
  await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(1200);
  /* föyde: TSG "Var" işaretli şirket + analizi bitmiş bir belge kaydı (OCR gerekmeden) */
  await p.evaluate(async()=>{await Store.savePortfolio('pA',{name:'A',importedAt:'2026-11-01T10:00:00Z',count:2},[{i:0,ad:'ÖRNEK ŞİRKET',kimlik:'1234567890',sirket:true,m:'1',m2:'',gib:'',anapara:5,toplam:10,not:'',kef:[],x:{}},{i:1,ad:'BAŞKA',kimlik:'22222222220',sirket:false,m:'2',m2:'',gib:'',anapara:5,toplam:10,not:'',kef:[],x:{}}]);
    const co=newCompany({unvan:'DENEME LTD',iliski:'Kefil şirket'});co.src=Object.assign({},co.src);await Store.saveResearch({pid:'pA',idx:0,durum:'devam',sonuc:'',updatedAt:new Date().toISOString(),persons:[newPerson({ad:'ÖRNEK ŞİRKET',rol:'Borçlu'})],companies:[co]});
    const mk=(sn,t,konu)=>`Ankara Ticaret Sicili
Memurluğundan

Sicil No: ${sn}

Ticaret Ünvanı:
DENEME LİMİTED ŞİRKETİ

Adres: Örnek Mahallesi 1. Sokak
No: 2/3 Çankaya/Ankara

Yukarıda ticaret sicili numarası,
ünvanı ve adresi yazılı şirkete ait
aşağıdaki hususların ${t}
tarihinde tescil edildiği ilan olunur.

Konu: ${konu}

Sermaye: 20.000,00 TL
(5/A)(10/1)

`;
    const txt=['01.02.2010|Yeni Kuruluş','01.03.2011|Adres Değişikliği','01.04.2012|Sermaye Artırımı','01.05.2013|Hisse Devri','01.06.2014|Tasfiyeye Giriş'].map(x=>{const [t,k]=x.split('|');return mk('555001',t,k)}).join('');
    const ana=tsgParse([{p:1,gp:1,t:txt}]);ana.v=TSG_PV;const an=await TSGS.putAna('pA--0--x1',ana);
    await TSGS.set('tsg_txt','pA--0--x1__1',{doc:'pA--0--x1',p:1,t:txt,hdr:'',conf:90,mode:'ocr',lines:[]});
    await TSGS.set('tsg_doc','pA--0--x1',{id:'pA--0--x1',pid:'pA',idx:0,hash:'x1',name:'a.pdf',size:1000,pages:1,uploadedAt:new Date().toISOString(),status:'tamam',n:0,an,ilanN:ana.ilanlar.length,ilanSig:ana.ilanlar.map(il=>tsgCoKey(il)+'|'+(il.tescil||'')+'|'+tsgFold(il.konu||'')),mode:'ocr',conf:90})});
  await p.reload();await p.waitForTimeout(2000);
  const st=()=>p.evaluate(()=>{const t=document.querySelector('#foyTabs [data-v="tsg"]');const n=t&&t.querySelector('[data-tsgn]');return {fx:window.__fx,n:n&&n.textContent,off:n&&n.classList.contains('off')}});
  /* 1) föyü aç */
  await p.evaluate(async()=>{await openPortfolio('pA');showScreen('dosyalar');select(0)});await p.waitForTimeout(1800);
  const vis0=await p.evaluate(()=>{const e=document.querySelector('#foyTabs [data-v="tsg"] [data-tsgn]');const r=e.getBoundingClientRect();return {below:r.top>innerHeight-10,top:Math.round(r.top),cls:e.className}});
  let s1=await st();await p.evaluate(()=>{document.getElementById('foyTabs').scrollIntoView({block:'center'})});await p.waitForTimeout(1500);let s1c=await st();await p.waitForTimeout(3000);let s1b=await st();
  console.log('    açılış',JSON.stringify(vis0),JSON.stringify(s1),JSON.stringify(s1c),JSON.stringify(s1b));
  ok(RM?(s1b.n==='5'&&s1b.fx===0):(s1.fx===1&&s1c.fx===1&&s1b.n==='5'),RM?'Hareket azaltma: ok uçmuyor, sayı 5\'e kadar yazılıyor':'Föy açılınca (TSG kaydı varsa) oklar sekmeye iniyor ve sayı 1\'den 5\'e sayıyor (bir kez)',{vis0,s1,s1c,s1b});
  /* 2) başka föy → geri: aynı oturumda ikinci kez kendiliğinden oynamaz */
  await p.evaluate(()=>select(1));await p.waitForTimeout(500);const f0=(await st()).fx;await p.evaluate(()=>select(0));await p.waitForTimeout(1500);const f1=(await st()).fx;
  ok(f1===f0,'Aynı föye dönünce otomatik tekrar oynamıyor (oturumda bir kez)',{f0,f1});
  /* 3) "Var" tıklaması */
  await p.evaluate(()=>{S.tab='sirket';renderCard()});await p.waitForTimeout(600);
  const before=(await st()).fx;await p.click('.ent.company .src[data-s="tsg"] [data-act="sv"][data-v="var"]');await p.waitForTimeout(1500);const after=await st();
  ok(RM?true:after.fx===before+1,'TSG "Var" işaretlenince animasyon oynuyor',{before,after});
  /* 3b) elle yeniden oynat düğmesi */
  await p.evaluate(()=>{S.tab='tsg';renderCard()});await p.waitForTimeout(1500);console.log('    kutu',JSON.stringify(await p.evaluate(()=>({tab:S.tab,box:!!document.getElementById('tsgBox'),html:(document.getElementById('tsgBox')||{innerHTML:''}).innerHTML.slice(0,160),n:tsgMedalN(cur()).n}))));const b0=(await st()).fx;await p.click('#tsgBox [data-tsg="fx"]',{timeout:3000});await p.waitForTimeout(1500);const b1=await st();
  ok(RM?true:b1.fx===b0+1,'"▶ Animasyonu oynat" düğmesi animasyonu yeniden oynatıyor',{b0,b1});
  /* 4) sekme rozeti her koşulda dolu kalıyor */
  await p.waitForTimeout(4000);const fin=await st();ok(fin.n&&+fin.n>=5&&!fin.off,'Animasyon bitince sekmede sayı balonu duruyor',fin);
  console.log('\nSayfa hataları:',errs.length?errs:'yok');console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
