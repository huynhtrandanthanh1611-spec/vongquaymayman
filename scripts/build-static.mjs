import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),dist=path.join(root,'dist'),output=path.join(root,'build');
const files=[];
async function walk(dir){for(const item of await fs.readdir(dir,{withFileTypes:true})){const full=path.join(dir,item.name);if(item.isDirectory())await walk(full);else files.push(full);}}
await walk(dist);
for(const file of files){
 if(/\.(js|mjs)$/.test(file))execFileSync(process.execPath,['--check',file]);
 if(!/\.(html|css|js|mjs)$/.test(file))continue;
 const text=await fs.readFile(file,'utf8');
 const refs=[...text.matchAll(/(?:src|href)=["'](\.[^"']+)["']/g),...text.matchAll(/url\(["']?(\.[^)'"\s]+)["']?\)/g),...text.matchAll(/(?:from\s*|new URL\()["'](\.[^"']+)["']/g)];
 for(const match of refs){const resolved=path.resolve(path.dirname(file),match[1].split(/[?#]/)[0]);await fs.access(resolved);}
}
const html=await fs.readFile(path.join(dist,'index.html'),'utf8');
if(/(?:src|href)=["']\/(?!\/)/.test(html))throw new Error('Root-absolute asset path breaks repository-path deployment.');
if(/Không lặp lại|ĐIỀU BẤT NGỜ ĐANG CHỜ|result-eyebrow|remaining-count|progress-text/.test(html))throw new Error('Removed page labels remain in HTML.');
if(!html.includes('class="wheel-hub" aria-hidden="true"></div>')||html.includes('id="spin-center"'))throw new Error('The wheel hub must be empty and contain no controls.');
execFileSync(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'build'],{cwd:root,stdio:'inherit'});

/* Các script giao diện phụ được nạp trực tiếp sau build. */
for(const name of ['loading-game.js','continuous-list.js','title-banner.js','reference-visual-tuning.js']){
 await fs.copyFile(path.join(dist,name),path.join(output,name));
}

/* Các lớp giao diện chỉ override CSS, không thay logic vòng quay. */
const uiStyles=['reference-ui-layout.css','reference-ui-panel.css','reference-ui-responsive.css','reference-ui-mobile.css','layout-fix.css','reference-target-final.css','reference-layout-hotfix.css','reference-polish.css'];
for(const name of uiStyles){
 await fs.copyFile(path.join(dist,name),path.join(output,name));
}
await fs.mkdir(path.join(output,'assets'),{recursive:true});
for(const name of ['title-banner.webp','btn-quay.png','bg-vongquay.png']){
 await fs.copyFile(path.join(dist,'assets',name),path.join(output,'assets',name));
}

/* Nạp CSS giao diện sau CSS gốc; reference-polish.css luôn có ưu tiên cuối. */
const builtIndex=path.join(output,'index.html');
let builtHtml=await fs.readFile(builtIndex,'utf8');
for(const name of uiStyles){
 if(!builtHtml.includes(name)){
  builtHtml=builtHtml.replace('</head>',`<link rel="stylesheet" href="./${name}"></head>`);
 }
}
const extras=['reference-visual-tuning.js','continuous-list.js','title-banner.js'];
for(const name of extras){
 if(!builtHtml.includes(name)){
  builtHtml=builtHtml.replace('</head>',`<script defer src="./${name}"></script></head>`);
 }
}
await fs.writeFile(builtIndex,builtHtml);

await fs.writeFile(path.join(output,'.nojekyll'),'');
await fs.mkdir(path.join(output,'licenses'),{recursive:true});
await fs.copyFile(path.join(dist,'assets/Nunito-OFL.txt'),path.join(output,'licenses/Nunito-OFL.txt'));
await fs.copyFile(path.join(dist,'vendor/LZ-String-LICENSE.txt'),path.join(output,'licenses/LZ-String-LICENSE.txt'));
execFileSync(process.execPath,[path.join(root,'checks/production.test.mjs')],{cwd:root,stdio:'inherit'});
console.log('Production bundle ready in build/: local fonts, CSS and JavaScript; no backend.');
