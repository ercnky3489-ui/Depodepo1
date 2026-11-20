/* Sayfanın paylaşımlı veritabanını (claude.use('db')) taklit eder: doküman ≤ 256 KiB, sorgu limit ≤ 1000,
   1000'den çok dokümanı tarayan limitsiz sorgu reddedilir (resource_exhausted). Testlerde addInitScript ile yüklenir. */
(function(){const store=new Map();const subs=new Set();const LIM=256*1024;window.__fakeDb={store,writes:0,errors:[]};
  const err=(code,msg)=>{const e=new Error(msg);e.code=code;window.__fakeDb.errors.push(code+': '+msg);return e};
  const clone=o=>JSON.parse(JSON.stringify(o));
  const dfz=o=>{if(o&&typeof o==='object'){Object.freeze(o);Object.values(o).forEach(dfz)}return o};
  const colOf=p=>p.split('/').slice(0,-1).join('/');
  const snapDoc=(path)=>({id:path.split('/').pop(),exists:store.has(path),data:()=>store.has(path)?dfz(clone(store.get(path))):undefined,ref:{path}});
  const notify=()=>subs.forEach(s=>{try{s()}catch(e){}});
  function query(col,f=[],lim=null){const q={path:col,
    where:(k,op,v)=>query(col,f.concat([[k,op,v]]),lim),orderBy:()=>q,limit:n=>{if(n<1||n>1000)throw err('invalid_argument','limit 1..1000');return query(col,f,n)},
    _run(){let L=[...store.keys()].filter(p=>colOf(p)===col).sort();const ok=d=>f.every(([k,op,v])=>{const x=d[k];return op==='=='?x===v:op==='>='?x>=v:op==='<'?x<v:op==='>'?x>v:op==='<='?x<=v:true});
      L=L.filter(p=>ok(store.get(p)));if(lim==null&&L.length>1000)throw err('resource_exhausted','query scans too many documents');if(lim!=null)L=L.slice(0,lim);return L},
    async get(){await new Promise(r=>setTimeout(r,1));const L=q._run();return {docs:L.map(snapDoc),size:L.length,empty:!L.length}},
    onSnapshot(next,error){let prev=new Map();const run=()=>{let L;try{L=q._run()}catch(e){error&&error(e);return}const cur=new Map(L.map(p=>[p,JSON.stringify(store.get(p))]));const ch=[];
        cur.forEach((v,p)=>{if(!prev.has(p))ch.push({type:'added',doc:snapDoc(p)});else if(prev.get(p)!==v)ch.push({type:'modified',doc:snapDoc(p)})});prev.forEach((v,p)=>{if(!cur.has(p))ch.push({type:'removed',doc:{id:p,data:()=>JSON.parse(v)}})});
        prev=cur;if(ch.length||!run.did){run.did=1;next({docs:L.map(snapDoc),size:L.length,docChanges:()=>ch})}};setTimeout(run,1);subs.add(run);return ()=>subs.delete(run)},
    doc:id=>docRef(col+'/'+(id||Math.random().toString(36).slice(2))),add:async d=>{const r=docRef(col+'/'+Math.random().toString(36).slice(2));await r.set(d);return r}};return q}
  function docRef(path){if(path.split('/').length%2)throw new TypeError('doc path parity');return {path,id:path.split('/').pop(),
    async get(){await new Promise(r=>setTimeout(r,1));return snapDoc(path)},
    async set(d){const s=JSON.stringify(d);if(s.length>LIM)throw err('invalid_argument','document over 256 KiB ('+s.length+' bytes) at '+path);store.set(path,JSON.parse(s));window.__fakeDb.writes++;notify()},
    async update(d){if(!store.has(path))throw err('invalid_argument','missing');const o=Object.assign(store.get(path),clone(d));if(JSON.stringify(o).length>LIM)throw err('invalid_argument','over 256 KiB');store.set(path,o);notify()},
    async delete(){store.delete(path);notify()},collection:c=>query(path+'/'+c),
    onSnapshot(next,error){const run=()=>next(snapDoc(path));setTimeout(run,1);subs.add(run);return ()=>subs.delete(run)}}}
  const db={doc:docRef,collection:p=>query(p)};
  window.claude={use:async n=>n==='db'?db:n==='user'?{id:async()=>'u1',isOwner:()=>true,canEdit:()=>true,can:()=>true,me:async()=>({id:'u1',name:'Test'})}:null};})();
