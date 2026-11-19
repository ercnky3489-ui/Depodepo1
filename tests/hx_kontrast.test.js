/* Tema kontrast taraması: her temada ekranlardaki yazıların kontrastı (WCAG). 3'ün altı = hata — node hx_kontrast.test.js <app.html> */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http');
const H=__dirname;const APP=path.resolve(process.argv[2]);const FX=['Dosya Durum Rapor.xlsx','Mernis.xlsx','Mersis.xlsx','Iski.xlsx'].map(f=>path.join(H,'fxhx',f));
(async()=>{const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(APP,'utf8')+'</body></html>';
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:1000}});
  await p.addInitScript(()=>{localStorage.setItem('ia-arastiran','Test Kullanıcı')});
  await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(1200);await p.addScriptTag({path:path.join(H,'node_modules/xlsx/dist/xlsx.full.min.js')});
  await p.addStyleTag({content:'.toast{display:none!important}*{transition:none!important;animation:none!important}'});
  await p.evaluate(()=>{document.querySelectorAll('.modal-bg').forEach(x=>x.remove());hxSetMode(true)});await p.waitForFunction(()=>HX.ready===true,null,{timeout:20000});
  await p.evaluate(()=>hxShow('yukle'));await p.waitForTimeout(150);await p.setInputFiles('#hxFile',FX);await p.waitForFunction(()=>HXI.files.length>=4&&!HXI.prog,null,{timeout:20000});
  await p.click('[data-hx-act="commit"]');await p.click('.modal [data-m="ok"]');await p.waitForFunction(()=>!HXI.busy&&!HXI.files.length,null,{timeout:30000});await p.waitForTimeout(800);
  await p.evaluate(()=>{HX.data.hx_research.push({id:'t1',debtorId:'d1001',type:'ortaklik',alan:{'Firma Unvanı':'ÖRNEK LTD. ŞTİ.','Aktif mi':'Aktif'}})});
  await p.click('#bottomNav .bn.hxn[data-hxb="dosyalar"]');await p.waitForFunction(()=>S.pid===HX_BPID&&S.debtors.length>0,null,{timeout:20000});await p.waitForTimeout(400);
  await p.evaluate(()=>{const d=S.debtors.find(x=>x.m2==='2024/1111');const R=getR(d.i);R.durum='devam';delete R._fresh;touch(R)});
  const scanFn=()=>{const parse=c=>{const m=c.match(/rgba?\(([^)]+)\)/);if(!m)return null;const v=m[1].split(/[ ,/]+/).filter(Boolean).map(Number);return {r:v[0],g:v[1],b:v[2],a:v.length>3?v[3]:1}};
    const lum=c=>{const f=x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)};return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b)};
    const mix=(top,bot)=>({r:top.r*top.a+bot.r*(1-top.a),g:top.g*top.a+bot.g*(1-top.a),b:top.b*top.a+bot.b*(1-top.a),a:1});
    const bgOf=el=>{const L=[];let e=el;while(e&&e.nodeType===1){const cs=getComputedStyle(e);const bi=cs.backgroundImage;if(bi&&bi!=='none'&&/gradient/.test(bi)){const cols=[...bi.matchAll(/rgba?\([^)]+\)/g)].map(m=>parse(m[0])).filter(x=>x&&x.a>.3);if(cols.length){const avg={r:0,g:0,b:0,a:1};cols.forEach(c=>{avg.r+=c.r/cols.length;avg.g+=c.g/cols.length;avg.b+=c.b/cols.length});L.push(avg);break}}
      const c=parse(cs.backgroundColor);if(c&&c.a>0){L.push(c);if(c.a>=.95)break}e=e.parentElement}
      let base={r:9,g:15,b:13,a:1};for(let i=L.length-1;i>=0;i--)base=mix(L[i],base);return base};
    const out=[];const seen=new Set();
    document.querySelectorAll('body *').forEach(el=>{if(!el.offsetParent&&getComputedStyle(el).position!=='fixed')return;const own=[...el.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).map(n=>n.textContent.trim()).join(' ');if(!own)return;
      const r=el.getBoundingClientRect();if(r.width<2||r.height<2||r.bottom<0||r.top>innerHeight)return;const cs=getComputedStyle(el);if(cs.visibility==='hidden'||+cs.opacity<.3)return;
      const fg=parse(cs.color);if(!fg)return;const bg=bgOf(el);const f2=mix(fg,bg);const L1=lum(f2),L2=lum(bg);const cr=(Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05);
      if(cr<4.5){const key=(el.className||el.tagName)+'|'+own.slice(0,30);if(seen.has(key))return;seen.add(key);out.push({cr:+cr.toFixed(2),t:own.slice(0,40),cls:String(el.className||el.tagName).slice(0,40),fg:cs.color,bg:`rgb(${bg.r|0},${bg.g|0},${bg.b|0})`})}});
    return out};
  const screens=[['föy-toplu',async()=>{await p.click('#bottomNav .bn.hxn[data-hxb="dosyalar"]');await p.waitForTimeout(400);await p.evaluate(()=>{const d=S.debtors.find(x=>x.m2==='2024/1111');select(d.i);S.tab='toplu';renderCard()});await p.waitForTimeout(300)}],
    ['föy-detay',async()=>{await p.evaluate(()=>{S.tab='tdetay';renderCard()});await p.waitForTimeout(300)}],
    ['föy-uyap',async()=>{await p.evaluate(()=>{const b=document.querySelector('#cardPane .hxf-tab');b&&b.click()});await p.waitForTimeout(300)}],
    ['föy-kişi',async()=>{await p.evaluate(()=>{S.tab='kisi';renderCard()});await p.waitForTimeout(300)}],
    ['aşamalar',async()=>{await p.click('#bottomNav .bn.hxn[data-hxb="asama"]');await p.waitForTimeout(400);await p.click('#asamaScreen [data-asd="devam"]');await p.waitForTimeout(200)}],
    ['genel',async()=>{await p.evaluate(()=>hxShow('takip'));await p.waitForTimeout(500)}],
    ['tebligat',async()=>{await p.evaluate(()=>hxShow('tebligat'));await p.waitForTimeout(400)}],
    ['aktar',async()=>{await p.click('#bottomNav .bn.hxn[data-hxb="aktar"]');await p.waitForTimeout(500)}],
    ['sorgu',async()=>{await p.evaluate(()=>{const x=document.querySelector('#bottomNav .bn.hxn[data-hxb="hizli"]');x&&x.click()});await p.waitForTimeout(600)}],
    ['ops',async()=>{await p.evaluate(()=>hxShow('ops'));await p.waitForTimeout(400)}],
    ['gecmis',async()=>{await p.evaluate(()=>hxShow('gecmis'));await p.waitForTimeout(400)}],
    ['yukle',async()=>{await p.evaluate(()=>hxShow('yukle'));await p.waitForTimeout(400)}],
    ['ozet',async()=>{await p.evaluate(()=>hxShow('ozet'));await p.waitForTimeout(400)}],
    ['matrix',async()=>{await p.evaluate(()=>mtsShow());await p.waitForTimeout(700)}],
    ['ayarlar',async()=>{await p.evaluate(()=>openA11y());await p.waitForTimeout(300)}]];
  const res={};
  for(const k of ['klasik','neon3d','altin','arktik','zumcam']){await p.evaluate(k=>{document.querySelectorAll('.modal-bg').forEach(x=>x.remove());pref('tema',k==='klasik'?'':k);applyA11y()},k);await p.waitForTimeout(200);res[k]={};
    for(const [n,go] of screens){await go();res[k][n]=await p.evaluate(scanFn);await p.evaluate(()=>document.querySelectorAll('.modal-bg').forEach(x=>x.remove()))}}
    for(const k in res){const all=Object.entries(res[k]).flatMap(([n,L])=>L.map(x=>Object.assign({n},x)));console.log(`\n== ${k}: ${all.length} düşük kontrast`);
    if(k!=='klasik'){const base=new Set(Object.entries(res.klasik).flatMap(([n,L])=>L.map(x=>n+x.cls+x.t)));all.filter(x=>!base.has(x.n+x.cls+x.t)).slice(0,25).forEach(x=>console.log('  YENİ',x.n,x.cr,JSON.stringify(x.t),x.cls,x.fg,'on',x.bg))}
    else all.slice(0,25).forEach(x=>console.log('  ',x.n,x.cr,JSON.stringify(x.t),x.cls,x.fg,'on',x.bg))}
  const bad=Object.entries(res).flatMap(([k,o])=>Object.values(o).flat().filter(x=>x.cr<3).map(x=>k+':'+x.t));console.log(`\nSONUÇ: ${bad.length?bad.length+' okunmaz yazı':'okunmaz yazı yok (tüm temalar ≥ 3:1)'}`);
  await b.close();srv.close();process.exit(bad.length?1:0)})().catch(e=>{console.error(e);process.exit(2)});
