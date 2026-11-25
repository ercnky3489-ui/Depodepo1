/* Aciz: föy bazında — dosyadaki TÜM borçlu/kefiller olumsuz olmadan dosya acize önerilmez (kurgusal veri) — node aciz.test.js <app.html> */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const APP=path.resolve(process.argv[2]||'../out54.html');let pass=0,fail=0;const ok=(c,m,x)=>{if(c){pass++;console.log('  ✓ '+m)}else{fail++;console.log('  ✗ '+m+(x!==undefined?' → '+JSON.stringify(x).slice(0,600):''))}};
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>localStorage.setItem('ia-arastiran','Test'));await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(1200);
  const r=await p.evaluate(async()=>{const NEG={gib:{s:'yok',n:''},sgkyet:{s:'yok',n:''},mersis:{s:'yok',n:''},levha:{s:'yok',n:''},tsg:{s:'yok',n:''}};
    const others=[{ad:'KURGU İKİNCİ',kimlik:'20000000002',rol:'Borçlu (aynı dosya)'},{ad:'KURGU ÜÇÜNCÜ',kimlik:'30000000003',rol:'Borçlu (aynı dosya)'},{ad:'KURGU HANE',kimlik:'40000000004',rol:'Hane'}];
    const row=(i,kef)=>({i,ad:'KURGU ANA',kimlik:'10000000146',sirket:false,m:'',m2:'',gib:'',anapara:null,toplam:10,not:'',kef,x:{}});
    const mk=(i,persons)=>({pid:'pX',idx:i,durum:'',persons,companies:[],updatedAt:'2026-11-20T10:00:00Z'});
    const P=(ad,k,rol,src)=>Object.assign(newPerson({ad,kimlik:k,rol}),{src:JSON.parse(JSON.stringify(src))});
    const pf={pid:'pX',name:'X',R:new Map([
      [0,mk(0,[P('KURGU ANA','10000000146','Borçlu',NEG)])],                                        /* diğer 2 borçlu kartta yok */
      [1,mk(1,[P('KURGU ANA','10000000146','Borçlu',NEG),P('KURGU İKİNCİ','20000000002','Kefil',NEG),P('KURGU ÜÇÜNCÜ','30000000003','Kefil',NEG)])], /* hepsi olumsuz */
      [2,mk(2,[P('KURGU ANA','10000000146','Borçlu',NEG),P('KURGU İKİNCİ','20000000002','Kefil',Object.assign({},NEG,{levha:{s:'var',n:''}})),P('KURGU ÜÇÜNCÜ','30000000003','Kefil',NEG)])]])};
    const U={by:new Map(),known:new Set(['10000000146','20000000002','30000000003']),loaded:true};
    const ev=(i,k)=>agEvalFile(pf,row(i,k||others),U,new Set());const e0=ev(0),e1=ev(1,others.slice(0,2)),e2=ev(2);
    pf.R.set(3,mk(3,[P('KURGU ANA','10000000146','Borçlu',NEG),P('KURGU HANE','40000000004','Hane',NEG)]));pf.R.set(4,mk(4,[P('KURGU ANA','10000000146','Borçlu',NEG),P('KURGU HANE','40000000004','Hane',Object.assign({},NEG,{sgkyet:{s:'var',n:''}}))]));
    pf.R.set(5,mk(5,[P('KURGU ANA','10000000146','Borçlu',NEG),P('KURGU ANA','10000000146','Hane',NEG)]));
    const e3=ev(3,[]),e4=ev(4,[]),e5=ev(5,[]);
    return {v0:e0.v,n0:e0.ents.map(x=>x.ad+':'+x.vd.v),v1:e1.v,n1:e1.ents.length,v2:e2.v,v3:e3.v,n3:e3.ents.length,v4:e4.v,n5:e5.ents.length}});
  ok(r.v0==='eksik'&&r.n0.length===4&&r.n0.some(x=>/HANE/.test(x)),'Dosyadaki diğer borçlular ve hane bireyi kartta yoksa da değerlendirmeye giriyor; sorgulanmadıkları için dosya acize önerilmiyor',r);
  ok(r.v1==='olumsuz'&&r.n1===3,'Dosyadaki 3 kişinin hepsi olumsuz → dosya acize çekilebilir',r);
  ok(r.v3==='olumsuz'&&r.n3===2,'Borçlu ve hane bireyi olumsuz → föy acize çekilebilir',r);ok(r.v4==='olumlu','Hane bireyinde SGK yetkili bulgusu varsa föy listeye girmiyor',r);ok(r.n5===1,'Aynı TCKN hem borçlu hem hane ise bir kez sayılıyor',r);
  ok(r.v2==='olumlu','Bir kişide bile bulgu (E-levha) varsa dosya listeye girmiyor',r);
  ok(!errs.length,'Sayfa hatası yok',errs);console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);await b.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(2)});
