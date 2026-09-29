import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createShareURL,decodeShare} from '../dist/share.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../build');
const files=[];
async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())await walk(p);else files.push(path.relative(root,p));}}
await walk(root);
const html=await fs.readFile(path.join(root,'index.html'),'utf8');
assert.match(html,/<div class="wheel-hub" aria-hidden="true"><\/div>/);
assert.match(html,/id="spin-start"/);assert(!html.includes('spin-center'));
assert(!html.includes('mascot')&&!html.includes('chibi'));
const refs=[...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(m=>m[1]).filter(x=>!x.startsWith('data:'));
assert(refs.some(x=>x.endsWith('.js'))&&refs.some(x=>x.endsWith('.css')));
for(const file of files.filter(x=>/\.(html|css|js)$/.test(x))){
 const text=await fs.readFile(path.join(root,file),'utf8');
 assert(!/(?:src|href)=["']\/(?!\/)|url\(["']?\/(?!\/)/.test(text),`Root-absolute asset in ${file}`);
 for(const ref of text.matchAll(/url\(["']?([^)'"\s]+)["']?\)|new URL\(["']([^"']+)["'],import.meta.url\)/g)){
  const relative=ref[1]||ref[2];if(relative.startsWith('data:')||/^https?:/.test(relative))continue;
  await fs.access(path.resolve(path.dirname(path.join(root,file)),relative));
 }
}
assert(!files.some(x=>/chibi|mascot/.test(x))&&files.filter(x=>x.endsWith('.ttf')).length===3);
assert(files.includes('.nojekyll'));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.ttf':'font/ttf'};
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');let relative=decodeURIComponent(url.pathname).replace(/^\/ten-repository\//,'/').slice(1);if(!relative)relative='index.html';
 assert(files.includes(relative));const body=await fs.readFile(path.join(root,relative));res.writeHead(200,{'Content-Type':mime[path.extname(relative)]||'application/octet-stream'});res.end(body);
}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
let requests=0;
try{for(const base of ['/', '/ten-repository/']){
 for(const file of files){const response=await fetch(origin+base+file);assert.equal(response.status,200);if(mime[path.extname(file)])assert.equal(response.headers.get('content-type'),mime[path.extname(file)]);requests++;}
 for(const ref of refs){const response=await fetch(new URL(ref,origin+base));assert.equal(response.status,200);requests++;}
 const shared=createShareURL(origin+base,{v:2,id:'production-check',entries:['Ảnh và chữ','Nguyễn An'],music:{track:'dreamy',enabled:true,sound:true,volume:37}});
 assert.equal(new URL(shared).pathname,base);assert.equal(decodeShare(new URL(shared).hash).entries[0],'Ảnh và chữ');
 for(let n=0;n<2;n++){const response=await fetch(shared);assert.equal(response.status,200);assert.equal(await response.text(),html);requests++;}
}}finally{await new Promise(r=>server.close(r));}
console.log(`PASS: production entry without mascot, bundled JS/CSS/fonts and ${requests} static HTTP requests at / and /ten-repository/; direct shared links and refresh return the game.`);
