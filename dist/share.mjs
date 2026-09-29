import LZString from './vendor/lz-string.mjs';
import {isImageData} from './images.mjs';
export const HASH_PREFIX='#w2=';
export const IMAGE_HASH_PREFIX='#w3=';
export const MAX_SHARE_CODE=1800000;
export const isSharedHash=hash=>hash.startsWith(HASH_PREFIX)||hash.startsWith(IMAGE_HASH_PREFIX);
export class ShareSizeError extends Error{constructor(){super('Bộ nội dung vượt sức chứa của link sau khi nén. Hãy chia thành các vòng quay nhỏ hơn; ảnh hiện tại vẫn được giữ nguyên.');this.name='ShareSizeError';}}
function validImage(image){if(!image||!isImageData(image.src)||!Number.isInteger(image.width)||!Number.isInteger(image.height)||image.width<1||image.height<1||image.width>16000||image.height>16000)throw new Error('Dữ liệu ảnh trong link không hợp lệ.');return{src:image.src,width:image.width,height:image.height};}
export function validateShared(payload){
 if(!payload||![2,3].includes(payload.v)||typeof payload.id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(payload.id)||!Array.isArray(payload.entries)||!payload.entries.length)throw new Error('Link chia sẻ không hợp lệ.');
 const entries=payload.entries.map(entry=>{if(typeof entry==='string'){if(!entry.trim())throw new Error('Nội dung trong link bị trống.');return entry.trim();}if(payload.v!==3||!entry||typeof entry.text!=='string'||(!entry.text.trim()&&!entry.image))throw new Error('Nội dung trong link không hợp lệ.');return{text:entry.text.trim(),...(entry.image?{image:validImage(entry.image)}:{})};});
 const m=payload.music;
 if(!m||!['playful','dreamy','bouncy','custom'].includes(m.track)||typeof m.enabled!=='boolean'||typeof m.sound!=='boolean'||!Number.isFinite(m.volume)||m.volume<0||m.volume>100)throw new Error('Không đọc được lựa chọn nhạc.');
 if(m.track==='custom'){
  if(!m.custom||typeof m.custom.source!=='string')throw new Error('Link chưa có nhạc cá nhân.');
  if(m.custom.kind==='url'){const url=new URL(m.custom.source);if(url.protocol!=='https:')throw new Error('Link nhạc phải dùng HTTPS.');}
  else if(m.custom.kind==='inline'){if(!/^data:audio\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/.test(m.custom.source))throw new Error('Tệp nhạc trong link không hợp lệ.');}
  else throw new Error('Không đọc được nhạc cá nhân.');
 }
 return{v:payload.v,id:payload.id,entries,music:{track:m.track,enabled:m.enabled,sound:m.sound,volume:m.volume,...(m.track==='custom'?{custom:{kind:m.custom.kind,source:m.custom.source,name:typeof m.custom.name==='string'?m.custom.name:'Nhạc của thầy cô'}}:{})}};
}
export function encodeShare(payload){
 const valid=validateShared(payload);let code;
 if(valid.v===2){code=LZString.compressToEncodedURIComponent(JSON.stringify(valid));if(code.length>120000)throw new ShareSizeError();return HASH_PREFIX+code;}
 // Compress text separately; base64 image bytes are already compressed. Duplicate images share one slot.
 const images=[],bodies=[],refs=new Map();const entries=valid.entries.map(entry=>{if(typeof entry==='string'||!entry.image)return entry;let ref=refs.get(entry.image.src);if(ref===undefined){ref=images.length;refs.set(entry.image.src,ref);const [header,body]=entry.image.src.split(',');images.push({type:header.slice(11,-7),width:entry.image.width,height:entry.image.height});bodies.push(body.replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''));}return{text:entry.text,imageRef:ref};});
 const metadata=LZString.compressToEncodedURIComponent(JSON.stringify({...valid,entries,images}));if(metadata.length>120000)throw new ShareSizeError();code=[metadata,...bodies].join('.');if(code.length>MAX_SHARE_CODE)throw new ShareSizeError();return IMAGE_HASH_PREFIX+code;
}
export function decodeShare(hash){
 if(!isSharedHash(hash))return null;const v3=hash.startsWith(IMAGE_HASH_PREFIX),code=hash.slice(4);if(!code||code.length>(v3?MAX_SHARE_CODE:120000)||!/^[A-Za-z0-9+_$=.\-]+$/.test(code))throw new Error('Link chia sẻ bị thiếu hoặc hỏng dữ liệu.');
 try{
  const [metadata,...bodies]=v3?code.split('.'):[code];if(metadata.length>120000)throw new Error();const json=LZString.decompressFromEncodedURIComponent(metadata);if(!json||json.length>2500000)throw new Error();const payload=JSON.parse(json);
  if(v3){if(payload.v!==3||!Array.isArray(payload.images)||payload.images.length!==bodies.length||!Array.isArray(payload.entries))throw new Error();const images=payload.images.map((image,i)=>{if(!['webp','png','jpeg'].includes(image.type)||!bodies[i]||!/^[A-Za-z0-9_-]+$/.test(bodies[i]))throw new Error();let body=bodies[i].replace(/-/g,'+').replace(/_/g,'/');body+='='.repeat((4-body.length%4)%4);return validImage({src:`data:image/${image.type};base64,${body}`,width:image.width,height:image.height});});payload.entries=payload.entries.map(entry=>{if(typeof entry==='string')return entry;if(entry?.imageRef!==undefined){if(!Number.isInteger(entry.imageRef)||!images[entry.imageRef])throw new Error();return{text:entry.text,image:images[entry.imageRef]};}return entry;});}
  return validateShared(payload);
 }catch{throw new Error('Không đọc được link chia sẻ. Hãy sao chép lại toàn bộ link.');}
}
export function createShareURL(base,payload){const url=new URL(base);url.hash=encodeShare(payload);return url.href;}
