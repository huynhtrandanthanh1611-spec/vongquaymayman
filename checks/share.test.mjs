import assert from 'node:assert/strict';
import {createShareURL,decodeShare,encodeShare} from '../dist/share.mjs';
const original={v:2,id:'test-classroom-session',entries:['Nguyễn An','Đọc một đoạn văn 🌈','<b>Giữ nguyên văn bản</b>'],music:{track:'dreamy',enabled:true,sound:true,volume:38}};
for(const base of ['https://example.github.io/','https://example.github.io/ten-repository/','https://example.github.io/ten-repository/index.html']){
 const link=createShareURL(base,original),url=new URL(link);assert.equal(url.pathname,new URL(base).pathname);assert.deepEqual(decodeShare(url.hash),original);assert.deepEqual(decodeShare(new URL(url.href).hash),original);
 for(const asset of ['./app.js','./audio.js','./assets/nunito-900.ttf','./viewport.css']){assert(new URL(asset,url).pathname.startsWith(new URL('./',base).pathname));}
}
for(const custom of [{kind:'url',source:'https://example.org/music.mp3',name:'Nhạc riêng'},{kind:'inline',source:'data:audio/wav;base64,UklGRg==',name:'clip.wav'}]){
 const payload={...original,music:{...original.music,track:'custom',custom}};assert.deepEqual(decodeShare(encodeShare(payload)),payload);
}
const large={...original,entries:Array.from({length:2000},(_,i)=>`Nhiệm vụ ${i+1}: viết một câu nêu hoạt động.`)};assert.deepEqual(decodeShare(encodeShare(large)),large);
assert.equal(decodeShare(''),null);assert.throws(()=>decodeShare('#w2=broken'));assert.throws(()=>encodeShare({...original,entries:[]}));assert.throws(()=>encodeShare({...original,music:{...original.music,track:'custom',custom:{kind:'url',source:'javascript:alert(1)'}}}));
console.log('PASS: root and repository paths, full Unicode/text round-trip, refresh, 2,000 entries, selected built-in/URL/embedded music, corrupt payload rejection.');
