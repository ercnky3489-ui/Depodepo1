/* Excel dışa aktarma: GİB sorgu sütunları sona eklendi, diğer sütunlar aynı — node xls_gib.test.js <eski.html> <yeni.html> */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x).slice(0,700):''))}};
async function run(b,APP){const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const ctx=await b.newContext({viewport:{width:1440,height:1000}});const p=await ctx.newPage();
  await ctx.route(/cdnjs\.cloudflare\.com/,route=>{if(route.request().url().endsWith('xlsx.full.min.js'))return route.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync(path.join(__dirname,'node_modules/xlsx/dist/xlsx.full.min.js'))});return route.abort()});
  await p.addInitScript(()=>{localStorage.setItem('ia-arastiran','Test')});await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(1200);
  await p.evaluate(async()=>{const row=(i,ad,k,o)=>Object.assign({i,ad,kimlik:k,sirket:false,m:'M'+i,m2:'',gib:'',anapara:5,toplam:10,not:'',kef:[],x:{}},o||{});
    await Store.savePortfolio('pA',{name:'A',importedAt:'2026-11-01T10:00:00Z',count:3},[row(0,'ŞERİFE KARABOĞA','11111111110'),row(1,'emine gündoğdu','22222222220'),row(2,'ABC LTD ŞTİ','1234567890',{sirket:true})]);
    await Store.saveResearch({pid:'pA',idx:0,durum:'devam',sonuc:'',companies:[],updatedAt:new Date().toISOString(),persons:[newPerson({ad:'ŞERİFE KARABOĞA',kimlik:'11111111110',rol:'Borçlu',babaAdi:'Hayrettin',dogumYeri:'KONYA / SELÇUKLU',dogum:'1934-01-01'}),newPerson({ad:'Saadet Nur Aydın',kimlik:'33333333330',rol:'Kefil',babaAdi:'MUSTAFA',dogumYeri:'diyarbakır-bağlar',dogum:'01/01/1953'})]});
    await Store.saveResearch({pid:'pA',idx:1,durum:'devam',sonuc:'',companies:[],updatedAt:new Date().toISOString(),persons:[newPerson({ad:'emine gündoğdu',kimlik:'22222222220',rol:'Borçlu',babaAdi:'HASAN',dogumYeri:'ERZURUM (YAKUTİYE)',dogum:'01.01.1952'})]})});
  await p.reload();await p.waitForTimeout(2500);await p.evaluate(()=>openPortfolio('pA'));await p.waitForTimeout(1500);
  const r=await p.evaluate(()=>{const {wb}=buildWorkbook();const g=n=>XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,defval:''});return {oz:g('Özet'),kis:g('Kişiler'),sir:g('Şirketler')}});
  await ctx.close();srv.close();return r}
(async()=>{const b=await chromium.launch();const O=await run(b,path.resolve(process.argv[2])),N=await run(b,path.resolve(process.argv[3]));
  const G=['GİB - AD','GİB - SOYAD','GİB - BABA ADI','GİB - DOĞUM YERİ','GİB - DOĞUM TARİHİ'];
  for(const sh of ['oz','kis']){const o=O[sh],n=N[sh];const w=o[0].length;
    ok(JSON.stringify(n[0].slice(-5))===JSON.stringify(G)&&n[0].length===w+5,sh+': GİB başlıkları en sonda',n[0].slice(-6));
    const tsc=o[0].indexOf('Son Güncelleme');const cut=r=>r.slice(0,w).map((x,j)=>j===tsc?'':String(x));const bad=o.findIndex((row,i)=>JSON.stringify(cut(n[i]))!==JSON.stringify(cut(row)));ok(bad<0,sh+': önceki sütunlar ve değerler aynı (zaman damgası hariç)',bad<0?'':[o[bad],n[bad]]);}
  ok(JSON.stringify(N.sir)===JSON.stringify(O.sir),'Şirketler sayfası değişmedi');
  const K=N.kis.slice(1).map(r=>r.slice(-5));console.log('    Kişiler GİB:',JSON.stringify(K));
  ok(JSON.stringify(K)===JSON.stringify([['ŞERİFE','KARABOĞA','HAYRETTİN','Konya','01.01.1934'],['SAADET NUR','AYDIN','MUSTAFA','Diyarbakır','01.01.1953'],['EMİNE','GÜNDOĞDU','HASAN','Erzurum','01.01.1952']]),'Kişiler: ad/soyad ayrımı, büyük harf, doğum yerinde yalnız şehir, tarih biçimi');
  const Z=N.oz.slice(1).map(r=>r.slice(-5));console.log('    Özet GİB:',JSON.stringify(Z));
  ok(Z[0][0]==='ŞERİFE'&&Z[1][1]==='GÜNDOĞDU'&&Z[2].every(x=>x===''),'Özet: borçlunun GİB bilgileri; şirket borçluda boş',Z);
  console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
