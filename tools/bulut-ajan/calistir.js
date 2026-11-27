/* Bulut ajanı: uygulama kapalıyken ajan turunu çalıştırır.
   1) node calistir.js calistir <disari_aktarim_klasoru> <uygulama.html> <cikti_klasoru>
      Dışa aktarılmış veritabanı dosyalarını (ArtifactData out_dir biçimi: <koleksiyon yolu>/<belge>.json) sahte veritabanına yükler,
      uygulamayı “bulut modu”nda açar (yedek indirme, e-posta, brifing kapalı), bir ajan turu çalıştırır, değişen/yeni belgeleri
      <cikti>/degisen/<yol>.json olarak ve <cikti>/ozet.json’a listeler. Hiçbir belge silinmez; silinenler yalnız raporlanır.
   2) node calistir.js karsilastir <disari_aktarilan.json> <simdiki.json>
      İki belge içerik olarak aynıysa 0, farklıysa 3 ile çıkar (başkası değiştirmiş mi kontrolü). */
const fs=require('fs'),path=require('path'),http=require('http');
const canon=v=>JSON.stringify(v,(k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.keys(x).sort().reduce((o,k)=>(o[k]=x[k],o),{}):x);
function walk(dir,base=dir,out={}){for(const f of fs.readdirSync(dir)){const p=path.join(dir,f);const st=fs.statSync(p);if(st.isDirectory())walk(p,base,out);else if(f.endsWith('.json')){const rel=path.relative(base,p).split(path.sep).join('/').replace(/\.json$/,'');if(rel.split('/').length%2===0)out[rel]=JSON.parse(fs.readFileSync(p,'utf8'))}}return out}
async function calistir(exp,app,out){const {chromium}=require('playwright');const seed=walk(exp);const n=Object.keys(seed).length;if(!n)throw new Error('Dışa aktarım klasörü boş: '+exp);
  const html='<!doctype html><html><head><meta charset=utf8></head><body>'+fs.readFileSync(app,'utf8').replace(/^[\s\S]*?<body>/i,'').replace(/<\/body>\s*<\/html>\s*$/i,'')+'</body></html>';
  const seedJson=JSON.stringify(seed);const srv=http.createServer((q,r)=>{if(q.url==='/__seed'){r.writeHead(200,{'content-type':'application/json'});return r.end(seedJson)}r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)}).listen(0);await new Promise(r=>srv.once('listening',r));
  const b=await chromium.launch();const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{window.__AO_BULUT=1;try{localStorage.setItem('ia-arastiran','Bulut ajanı')}catch(e){}});
  await p.addInitScript({path:path.join(__dirname,'fakedb.js')});
  await p.addInitScript(()=>{const x=new XMLHttpRequest();x.open('GET','/__seed',false);x.send();const S=JSON.parse(x.responseText);window.__seedOrig={};for(const k in S){window.__fakeDb.store.set(k,S[k]);window.__seedOrig[k]=JSON.stringify(S[k])}});
  await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForFunction(()=>typeof agCycle==='function',null,{timeout:60000});await p.waitForTimeout(3000);
  const t0=Date.now();const res=await p.evaluate(async()=>{await agCycle('bulut');await new Promise(r=>setTimeout(r,1500));try{await agAuditFlush()}catch(e){}try{await agSaveState()}catch(e){}await new Promise(r=>setTimeout(r,2500));
    const ags=Object.fromEntries(Object.entries(AG.st.ag).map(([k,a])=>[k,{s:a.s,note:a.note,err:a.err}]));return {ags,lastFull:AG.st.lastFull}});
  const diff=await p.evaluate(()=>{const S=window.__fakeDb.store,O=window.__seedOrig;const ch=[],nw=[],del=[];for(const [k,v] of S){const j=JSON.stringify(v);if(!(k in O))nw.push([k,v]);else if(O[k]!==j)ch.push([k,v])}for(const k in O)if(!S.has(k))del.push(k);return {ch,nw,del,dbErr:window.__fakeDb.errors}});
  await b.close();srv.close();
  const canonEq=(a,b)=>canon(a)===canon(b);const ch=diff.ch.filter(([k,v])=>!canonEq(v,seed[k]));
  fs.mkdirSync(path.join(out,'degisen'),{recursive:true});const list=[];
  for(const [k,v] of [...ch,...diff.nw]){const f=path.join(out,'degisen',k+'.json');fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(v));const parts=k.split('/');list.push({yol:k,koleksiyon:parts.slice(0,-1).join('/'),belge:parts.at(-1),yeni:!(k in seed),dosya:f,disari:(k in seed)?path.join(exp,k+'.json'):null})}
  const ozet={zaman:new Date().toISOString(),sure_sn:Math.round((Date.now()-t0)/1000),yuklenen:n,degisen:list,silinen_yazilmayacak:diff.del,ajanlar:res.ags,sayfa_hatalari:errs,db_hatalari:diff.dbErr};
  fs.writeFileSync(path.join(out,'ozet.json'),JSON.stringify(ozet,null,1));
  const bad=Object.entries(res.ags).filter(([k,a])=>a.s==='hata'||a.s==='erisim').map(([k,a])=>k+': '+a.err);
  console.log(`Yüklenen belge: ${n} · değişen: ${ch.length} · yeni: ${diff.nw.length} · silinen (yazılmayacak): ${diff.del.length}`);console.log('Hatalı ajan: '+(bad.length?bad.join(' | '):'yok'));if(errs.length)console.log('Sayfa hataları: '+errs.slice(0,5).join(' | '));
  return ozet}

/* 3) node calistir.js yazim <cikti_klasoru> <simdiki_disari_aktarim> <surumler.json>
      Değişen her belgeyi, bulut turu başladıktan sonra başkası değiştirmiş mi diye kontrol eder (dışa aktarılan ↔ şimdiki).
      Değişmemişse ArtifactData “batch” yazımına (en çok 50 belge ve ~900 KB/paket, mevcut belgelerde if_version ile) ekler; değişmişse YAZMAZ.
      Çıktı: <cikti>/paket_N.json (writes dizisi) ve <cikti>/yazim_ozet.json. surumler.json = {"<koleksiyon>/<belge>": <version>, …}
   4) node calistir.js gereken <cikti_klasoru>  → sürümü gereken belge yollarını ve okunacak koleksiyonları yazar. */
/* Yazım paketleri: toplu yazma isteği en çok 1 MiB kabul ediyor → paket başına en çok 50 belge VE dosya boyutları toplamı ≤ 900 000 bayt.
   Tek başına sınırı aşan belge kendi paketinde kalır (yazımı ayrıca raporlanır). */
const PAKET_BAYT=900000,PAKET_ADET=50;
function paketle(writes,out,pre){const files=[];let cur=[],sz=0;const flush=()=>{if(!cur.length)return;const f=path.join(out,pre+(files.length+1)+'.json');fs.writeFileSync(f,JSON.stringify(cur));files.push(f);cur=[];sz=0};
  for(const w of writes){const b=fs.statSync(w.file_path).size+300;if(cur.length&&(sz+b>PAKET_BAYT||cur.length>=PAKET_ADET))flush();cur.push(w);sz+=b}flush();return files}
function gereken(out){const Z=JSON.parse(fs.readFileSync(path.join(out,'ozet.json'),'utf8'));const ex=Z.degisen.filter(x=>!x.yeni);const cols=[...new Set(Z.degisen.map(x=>x.koleksiyon))];return {koleksiyonlar:cols,surum_gereken:ex.map(x=>x.yol)}}
function yazim(out,simdi,surF){const Z=JSON.parse(fs.readFileSync(path.join(out,'ozet.json'),'utf8'));const V=fs.existsSync(surF)?JSON.parse(fs.readFileSync(surF,'utf8')):{};const writes=[],cak=[],eksik=[];
  for(const x of Z.degisen){const now=path.join(simdi,x.yol+'.json');const has=fs.existsSync(now);
    if(x.yeni){if(has){cak.push({yol:x.yol,neden:'bu arada başka biri aynı belgeyi oluşturmuş'});continue}writes.push({op:'set',collection:x.koleksiyon,doc_id:x.belge,file_path:x.dosya});continue}
    if(!has){cak.push({yol:x.yol,neden:'belge bu arada silinmiş'});continue}
    if(!karsilastir(x.disari,now)){cak.push({yol:x.yol,neden:'bulut turu sırasında başka biri değiştirmiş; üzerine yazılmadı'});continue}
    const v=V[x.yol];if(!Number.isInteger(v)){eksik.push(x.yol);continue}writes.push({op:'set',collection:x.koleksiyon,doc_id:x.belge,file_path:x.dosya,if_version:v})}
  const files=paketle(writes,out,'paket_');
  const o={yazilacak:writes.length,paketler:files,cakisma:cak,surum_eksik:eksik};fs.writeFileSync(path.join(out,'yazim_ozet.json'),JSON.stringify(o,null,1));
  console.log(`Yazılacak: ${writes.length} belge, ${files.length} paket · çakışma (yazılmayacak): ${cak.length} · sürümü eksik: ${eksik.length}`);return o}

/* 5) node calistir.js ag-liste <disari_aktarim> <bugun:YYYY-MM-DD>
      Ajanların okuduğu “ag” belgelerinden henüz indirilmemiş olanları yazar (önce sabit liste, sonra görev/anlık görüntü/denetim parçaları).
      Eski denetim arşivi indirilmez; yalnız denetim başlığının gösterdiği son parça gerekir. */
function agListe(exp,day){const has=id=>fs.existsSync(path.join(exp,'ag',id+'.json'));const rd=id=>{try{return JSON.parse(fs.readFileSync(path.join(exp,'ag',id+'.json'),'utf8'))}catch(e){return null}};
  const pids=fs.existsSync(path.join(exp,'portfolios'))?fs.readdirSync(path.join(exp,'portfolios')).filter(f=>f.endsWith('.json')).map(f=>f.slice(0,-5)):[];
  const want=['state','dec','tasks_meta','mail','mail_cfg','media_idx','backups','backup_key','audit_head','brief_last','hist_'+day,...pids.map(p=>'snap_'+p)];
  const tm=rd('tasks_meta');if(tm&&tm.n)for(let k=0;k<tm.n;k++)want.push('tasks_'+k);
  pids.forEach(p=>{const m=rd('snap_'+p);if(m&&m.n)for(let k=0;k<m.n;k++)want.push('snap_'+p+'_'+k)});
  const ah=rd('audit_head');if(ah&&ah.chunks&&ah.chunks.length)want.push(ah.chunks[ah.chunks.length-1]);
  for(let k=0;k<5;k++){const id='hist_'+day+(k?'_'+k:'');const h=rd(id);if(h&&h.items&&h.items.length>=1200)want.push('hist_'+day+'_'+(k+1));else break}
  const tried=new Set((fs.existsSync(path.join(exp,'.yok'))?fs.readFileSync(path.join(exp,'.yok'),'utf8').split('\n'):[]).filter(Boolean));
  return [...new Set(want)].filter(id=>!has(id)&&!tried.has(id))}
function karsilastir(a,b){const A=JSON.parse(fs.readFileSync(a,'utf8')),B=JSON.parse(fs.readFileSync(b,'utf8'));return canon(A)===canon(B)}

/* 6) Web araması (OSINT) — yalnız kullanıcı “osint_web/_ayar” belgesinde açtıysa.
   node calistir.js web-liste <disari_aktarim>            → aranacak hedefler (JSON): sorgulanmamış telefonlar ve Google notu olmayan şirketler
   node calistir.js web-yazim <disari_aktarim> <sonuclar.json> <cikti>  → osint_web/<id> öneri belgeleri için yazım paketleri (yalnız yeni belge)
   Sorguda kişi adı kullanılmaz: telefon için yalnız numara, şirket için ünvan (+VKN). Sonuçlar föye yazılmaz; uygulamada “Onay bekleyenler”de onaylanır. */
const webRd=f=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch(e){return null}};
const webTel=s=>{const d=String(s||'').replace(/\D/g,'');return d.length>=10?d.slice(-10):''};
const webFmt=d=>'0'+d.slice(0,3)+' '+d.slice(3,6)+' '+d.slice(6,8)+' '+d.slice(8);
function webAyar(exp){const a=webRd(path.join(exp,'osint_web','_ayar.json'))||{};return {on:a.on===true,maxTel:Math.min(200,+a.maxTel||25),maxCo:Math.min(200,+a.maxCo||15),cx:String(a.cx||'').replace(/[^\w:-]/g,'').slice(0,80)}}
/* Daha önce sorgulanan hiçbir hedef yeniden aranmaz:
   - telefon: numara (son 10 hane) bir kez; föyde “sorgulandı” (gs) ya da osint_web’de herhangi bir belgesi (onay / eklendi / red / sonuç yok) varsa atlanır.
   - şirket: VKN varsa VKN’ye, yoksa sadeleştirilmiş ünvana göre tek hedef (tüm föyler tek öneride); osint_web’de aynı VKN / ünvanla belge varsa
     (eski föy bazlı kimlikler dahil) ya da föylerden birinde Google notu varsa atlanır. */
const WEB_STOP=new Set(['LTD','LİMİTED','ŞTİ','ŞİRKETİ','A','Ş','AŞ','ANONİM','TİC','TİCARET','SAN','SANAYİ','VE','İTH','İHR']);
const webUn=s=>String(s||'').toLocaleUpperCase('tr').replace(/[^0-9A-ZÇĞİÖŞÜ]+/g,' ').split(' ').filter(w=>w&&!WEB_STOP.has(w)).join(' ');
const webVkn=s=>{const v=String(s||'').replace(/\D/g,'');return v.length===10?v:''};
const webH=s=>require('crypto').createHash('sha1').update(s).digest('hex').slice(0,12);
/* Sorgu kurma (sürüm 2): tam resmî ünvan tırnakla aranınca neredeyse hiç eşleşme çıkmıyor. Bunun yerine
   ayırt edici ad (ilk 1–3 kelime, sektör/tür kelimelerinden önce) tırnakla + en çok 2 sektör kelimesi; ikinci sorgu VKN ya da tam ünvan. */
const WEB_QV=2;
const WEB_HUKUK=new Set(['LTD','LİMİTED','ŞTİ','ŞİRKETİ','ŞİRKET','A','Ş','AŞ','ANONİM','KOLL','KOMANDİT','KOOPERATİFİ']);
const WEB_SEKTOR=new Set(['TARIM','HAYVANCILIK','GIDA','İNŞAAT','İNŞ','SANAYİ','SAN','TİCARET','TİC','PAZARLAMA','OTOMOTİV','TEKSTİL','İMALAT','METAL','NAKLİYAT','NAKLİYE','LOJİSTİK','TURİZM','ENERJİ','MADENCİLİK','MOBİLYA','DEKORASYON','RESTORAN','KONAKLAMA','EMLAK','OTOMASYON','ELEKTRİK','ELEKTRONİK','KİMYA','PLASTİK','AMBALAJ','YAPI','MALZEMELERİ','ÜRÜNLERİ','SÜT','ET','OTO','TAMİR','DIŞ','İTHALAT','İHRACAT','İTH','İHR','VE','ÜRETİM','HİZMETLERİ','DANIŞMANLIK','YAZILIM','BİLİŞİM','SAĞLIK','EĞİTİM','GÜVENLİK','TEKNOLOJİLERİ','CNC','TALAŞLI','ORMAN','AHŞAP','MAD','KİMYEVİ','ZEYTİN','ZEYTİNYAĞI','ACENTELİĞİ','SEYAHAT','ARAÇ','KİRALAMA','HEDİYELİK','ÇİFTLİĞİ']);
const webTemiz=s=>String(s||'').replace(/(Kuruluş Tarihi|Firma Durumu|Vergi (No|Dairesi)|Sicil No).*$/i,'').replace(/\([^)]*\)/g,' ').replace(/\s+/g,' ').trim();
const webTitle=w=>w.charAt(0)+w.slice(1).toLocaleLowerCase('tr');
function webCoQ(un,v){const temiz=webTemiz(un);const W=temiz.toLocaleUpperCase('tr').replace(/[^0-9A-ZÇĞİÖŞÜ]+/g,' ').trim().split(' ').filter(Boolean);
  const core=[];let i=0;for(;i<W.length&&core.length<3;i++){const w=W[i];if(WEB_HUKUK.has(w)||(WEB_SEKTOR.has(w)&&core.length&&w!=='ÇİFTLİĞİ'))break;core.push(w)}
  if(W[i]==='ÇİFTLİĞİ'&&core.length<3)core.push(W[i++]);
  const sek=[...new Set(W.slice(i).filter(w=>WEB_SEKTOR.has(w)&&w.length>3&&!['SANAYİ','TİCARET','İTHALAT','İHRACAT','ÜRÜNLERİ','HİZMETLERİ','MALZEMELERİ','ÜRETİM'].includes(w)))].slice(0,2);
  if(!core.length||core.join('').length<3)return null;
  if(core.length===1&&!sek.length){const full=temiz.toLocaleUpperCase('tr').replace(/[^0-9A-ZÇĞİÖŞÜ ]+/g,' ').split(/\s+/).filter(w=>w&&!WEB_HUKUK.has(w)).slice(0,3);core.splice(0,1,...full)}
  return {q:'"'+core.map(webTitle).join(' ')+'"'+(sek.length?' '+sek.map(w=>w.toLocaleLowerCase('tr')).join(' '):''),q2:v?'"'+v+'"':'"'+temiz+'"',temiz}}
function webSorgulanan(wdir){const tel=new Set(),co=new Set();if(!fs.existsSync(wdir))return {tel,co};
  for(const f of fs.readdirSync(wdir).filter(f=>f.endsWith('.json')&&f!=='_ayar.json')){let d=webRd(path.join(wdir,f));if(!d)continue;if(d.data&&!d.kind)d=d.data;if(d.status==='sonuc-yok'&&!(d.qv>=WEB_QV))continue;
    if(d.kind==='tel'||/^tel_/.test(f)){const t=webTel(d.tel||f.slice(4,-5));if(t)tel.add(t)}
    else{const v=webVkn(d.vkn)||((String(d.q||'').match(/"(\d{10})"/)||[])[1]||'');if(v)co.add('v'+v);const u=webUn(d.unvan);if(u)co.add('u'+u)}}
  return {tel,co}}
function webListe(exp){const A=webAyar(exp);if(!A.on)return {acik:false,hedefler:[]};const rdir=path.join(exp,'research');const wdir=path.join(exp,'osint_web');
  const Q=webSorgulanan(wdir);const T=new Map(),C=new Map(),notlu=new Set();
  if(fs.existsSync(rdir))for(const f of fs.readdirSync(rdir).filter(f=>f.endsWith('.json')).sort()){const R=webRd(path.join(rdir,f));if(!R||!R.pid)continue;
    (R.persons||[]).forEach(p=>(p.telefonlar||[]).forEach(t=>{const d=webTel(t.tel);if(!d)return;if(t.gs){Q.tel.add(d);return}if(Q.tel.has(d))return;const id=(fs.existsSync(path.join(wdir,'tel_'+d+'.json'))?'tel2_':'tel_')+d;if(!T.has(id))T.set(id,{id,kind:'tel',q:'"'+webFmt(d)+'"',q2:'"0'+d+'"',tel:d,qv:WEB_QV,refs:[]});T.get(id).refs.push({pid:R.pid,i:R.idx,entId:p.id||'',tid:t.id||''})}));
    (R.companies||[]).forEach(c=>{const un=String(c.unvan||'').trim();if(un.length<3)return;const v=webVkn(c.vkn),u=webUn(un);const key=v?'v'+v:'u'+u;if(!u&&!v)return;
      const g=c.src&&c.src.google;if(g&&(g.s||String(g.n||'').trim())){notlu.add(key);if(u)notlu.add('u'+u);return}
      if(!C.has(key)){const Qc=webCoQ(un,v);if(!Qc)return;C.set(key,{id:'co_'+(v?'v'+v:'u'+webH(u)),kind:'sirket',q:Qc.q,q2:Qc.q2,unvan:Qc.temiz||un,vkn:v,qv:WEB_QV,_k:[key,'u'+u],refs:[]})}
      C.get(key).refs.push({pid:R.pid,i:R.idx,entId:c.id||''})})}
  for(const [id,t] of [...T.entries()])if(Q.tel.has(t.tel))T.delete(id);
  const cos=[...C.values()].filter(c=>!c._k.some(k=>Q.co.has(k)||notlu.has(k))&&!fs.existsSync(path.join(wdir,c.id+'.json'))).map(c=>{const o=Object.assign({},c);delete o._k;return o});
  return {acik:true,cx:A.cx,hedefler:[...[...T.values()].slice(0,A.maxTel),...cos.slice(0,A.maxCo)]}}
function webYazim(exp,sonF,out){const L=webListe(exp);const H=new Map(L.hedefler.map(h=>[h.id,h]));const S=webRd(sonF)||[];const writes=[];let atl=0;fs.mkdirSync(out,{recursive:true});
  const tr=(s,n)=>String(s||'').replace(/\s+/g,' ').trim().slice(0,n);
  for(const s of S){const h=H.get(s.id);if(!h){atl++;continue}const res=(Array.isArray(s.results)?s.results:[]).filter(r=>r&&/^https?:\/\//.test(String(r.url||''))).slice(0,5).map(r=>({title:tr(r.title,160),url:tr(r.url,400),snippet:tr(r.snippet,320)}));
    const doc=Object.assign({},h,{results:res,kaynak:s.kaynak==='google-api'?'google-api':'websearch',t:Date.now(),status:res.length?'onay':'sonuc-yok'});const f=path.join(out,'web_'+h.id+'.json');fs.writeFileSync(f,JSON.stringify(doc));writes.push({op:'set',collection:'osint_web',doc_id:h.id,file_path:f})}
  const files=paketle(writes,out,'web_paket_');
  const o={yazilacak:writes.length,paketler:files,atlanan:atl};console.log(`Web araması: ${writes.length} öneri belgesi, ${files.length} paket · listede olmayan (atlandı): ${atl}`);return o}
(async()=>{const [cmd,...a]=process.argv.slice(2);
  if(cmd==='calistir'){if(a.length<3){console.error('kullanım: calistir <disari> <uygulama.html> <cikti>');process.exit(2)}await calistir(...a);return}
  if(cmd==='ag-liste'){console.log(JSON.stringify(agListe(a[0],a[1])));return}
  if(cmd==='yok-isaretle'){fs.appendFileSync(path.join(a[0],'.yok'),a.slice(1).join('\n')+'\n');return}
  if(cmd==='gereken'){console.log(JSON.stringify(gereken(a[0]),null,1));return}
  if(cmd==='yazim'){const o=yazim(...a);process.exit(o.surum_eksik.length?4:0)}
  if(cmd==='web-liste'){console.log(JSON.stringify(webListe(a[0]),null,1));return}
  if(cmd==='web-yazim'){webYazim(...a);return}
  if(cmd==='karsilastir'){const same=karsilastir(a[0],a[1]);console.log(same?'AYNI':'FARKLI');process.exit(same?0:3)}
  console.error('komutlar: calistir | ag-liste | yok-isaretle | gereken | yazim | karsilastir');process.exit(2)})().catch(e=>{console.error(e);process.exit(1)});
if(typeof module!=='undefined')module.exports={walk,canon,karsilastir};
