const {chromium}=require('playwright');const fs=require('fs'),path=require('path');const http=require('http');
fs.writeFileSync('probe.html','<!doctype html><title>p</title><body>p</body>');
const srv=http.createServer((q,s)=>{s.writeHead(200,{'content-type':'text/html'});s.end('<!doctype html><title>p</title><body>p</body>')}).listen(0);
(async()=>{const b=await chromium.launch();const res={file:0,http:0};const N=40;
 for(const kind of ['file','http']){const url=kind==='file'?'file://'+path.resolve('probe.html'):'http://127.0.0.1:'+srv.address().port+'/';
  for(let i=0;i<N;i++){const p=await b.newPage();await p.addInitScript(()=>{if(!localStorage.getItem('k'))localStorage.setItem('k','seed')});
   await p.goto(url);await p.evaluate(()=>localStorage.setItem('k','big'+'x'.repeat(5000)+Date.now()));await p.waitForTimeout(50+Math.random()*100);
   await p.reload();const v=await p.evaluate(()=>localStorage.getItem('k'));if(v==='seed')res[kind]++;await p.close()}}
 console.log('lost after reload (of '+N+'):',JSON.stringify(res));await b.close();srv.close()})();
