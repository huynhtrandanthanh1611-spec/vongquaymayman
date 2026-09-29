import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {remainingItems,entryKey} from '../dist/wheel-core.mjs';
import {encodeShare,decodeShare,createShareURL,ShareSizeError} from '../dist/share.mjs';
import {packState,unpackState,TeacherStore} from '../dist/storage.mjs';
import {fittedSize,isImageData} from '../dist/images.mjs';
const image={src:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',width:1,height:1};
const other={src:'data:image/webp;base64,UklGRgABCD==',width:720,height:1280};
const entries=[{id:'a',text:'',image},{id:'b',text:'',image:other},{id:'c',text:'Ảnh mang tiêu đề',image},{id:'d',text:'Chữ riêng'},{id:'e',text:'Ảnh mang tiêu đề',image:other}];
assert.equal(remainingItems(entries,[]).length,3,'Different image-only entries must not collapse together');
assert.deepEqual(remainingItems(entries,[entries[0]]).map(x=>x.id),['b','d']);
assert.notEqual(entryKey(entries[0]),entryKey(entries[1]));
const payload={v:3,id:'picture-session',entries:entries.map(({text,image})=>image?{text,image}:text),music:{track:'bouncy',enabled:true,sound:false,volume:73}};
for(const base of ['https://example.github.io/','https://example.github.io/wheel/','https://example.github.io/wheel/index.html']){const url=new URL(createShareURL(base,payload));assert.equal(url.pathname,new URL(base).pathname);assert.deepEqual(decodeShare(url.hash),payload);assert.equal(url.hash.split('.').length,3,'Identical images must be embedded only once');}
const combined={...payload,music:{...payload.music,track:'custom',custom:{kind:'inline',source:'data:audio/wav;base64,UklGRg==',name:'nhạc.wav'}}};assert.deepEqual(decodeShare(encodeShare(combined)),combined);
const malicious={...payload,entries:[{text:'',image:{...image,src:'data:image/svg+xml;base64,PHN2Zz4='}}]};assert.throws(()=>encodeShare(malicious));
assert.throws(()=>encodeShare({...payload,entries:[{text:'',image:{...image,width:0}}]}));assert.throws(()=>decodeShare(encodeShare(payload).slice(0,-4)+'.extra'));
const tooLarge={...payload,entries:[{text:'',image:{...image,src:'data:image/png;base64,'+randomBytes(1400000).toString('base64')}}]};assert.throws(()=>encodeShare(tooLarge),ShareSizeError);assert.equal(tooLarge.entries.length,1,'Size failure must not remove an image');
const state={items:entries,draft:entries.map(x=>({...x})),history:[entries[0]],last:entries[0],rotation:12};const packed=packState(state);assert.equal(packed.images.length,2);assert.deepEqual(unpackState(packed),state);
const local=new Map();const adapter={getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v)};const old={items:[{id:'old',text:'Danh sách cũ'}],draft:[],history:[],last:null};adapter.setItem('classroom-lucky-wheel-v1',JSON.stringify(old));const storage=new TeacherStore(adapter,null);assert.deepEqual(await storage.load(),old);await storage.save(state);const restored=await storage.load();assert.deepEqual(restored.items,state.items);assert.deepEqual(restored.last,state.last);
const failing=new TeacherStore({getItem:()=>null,setItem:()=>{throw new Error('Quota');}},null);await assert.rejects(failing.save(state));
for(const [w,h,max] of [[4000,3000,1600],[1500,6000,1280],[200,100,1600]]){const fitted=fittedSize(w,h,max);assert(Math.max(fitted.width,fitted.height)<=max);assert(Math.abs(fitted.width/fitted.height-w/h)<.005);}
assert(isImageData(image.src));assert(!isImageData('blob:local-only-image'));
console.log('PASS: image-only/mixed entries; image deduplication and no-repeat; complete cross-device hash round-trip; legacy migration; compact image storage; quota and oversize failure; safe raster types and proportional resizing.');
