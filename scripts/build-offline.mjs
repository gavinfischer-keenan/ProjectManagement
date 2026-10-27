import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const files=[];function walk(dir){for(const d of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,d.name);if(d.isDirectory())walk(p);else if(d.name!=='sw.js')files.push(p);}}walk('dist');
const version=crypto.createHash('sha256');for(const p of files)version.update(fs.readFileSync(p));const cache='bigfin-squid-'+version.digest('hex').slice(0,12);const urls=files.map(p=>'./'+path.relative('dist',p).split(path.sep).join('/'));
fs.writeFileSync('dist/sw.js',`const CACHE=${JSON.stringify(cache)};const FILES=${JSON.stringify(urls)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('bigfin-squid-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(event.request.method!=='GET'||u.origin!==self.location.origin||!u.href.startsWith(self.registration.scope))return;
 event.respondWith((async()=>{const c=await caches.open(CACHE);if(event.request.mode==='navigate'){try{const r=await fetch(event.request);if(r.ok)return r;}catch{}return await c.match(new URL('./index.html',self.registration.scope))||Response.error();}return await c.match(event.request)||fetch(event.request);})());});
`);console.log('Offline cache:',cache,files.length,'files');
