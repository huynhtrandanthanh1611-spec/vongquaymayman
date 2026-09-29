// Images stay in the browser and are embedded in shared links; never use blob URLs as saved data.
export const isImageData = value => typeof value==='string' && /^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
export function fittedSize(width,height,maxSide=1600){const scale=Math.min(1,maxSide/Math.max(width,height));return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};}
export function loadImage(src){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Không đọc được ảnh. Hãy chọn ảnh JPG, PNG hoặc WebP.'));image.src=src;if(image.complete&&image.naturalWidth)resolve(image);});}
function toBlob(canvas,quality){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Chưa nén được ảnh. Hãy thử ảnh khác.')),'image/webp',quality));}
function asData(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Không đọc được tệp ảnh.'));reader.readAsDataURL(blob);});}
export async function compressImage(source,{maxSide=1600,quality=.82,targetBytes=220000}={}){
 const temporary=source instanceof Blob;let url=temporary?URL.createObjectURL(source):source;
 try{
  const image=await loadImage(url);if(!image.naturalWidth||!image.naturalHeight)throw new Error('Ảnh không có kích thước hợp lệ.');
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');if(!ctx)throw new Error('Trình duyệt chưa xử lý được ảnh.');
  let size=fittedSize(image.naturalWidth,image.naturalHeight,maxSide),blob;
  for(let pass=0;pass<4;pass++){
   canvas.width=size.width;canvas.height=size.height;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
   blob=await toBlob(canvas,quality);if(blob.size<=targetBytes||Math.max(size.width,size.height)<=640)break;
   size=fittedSize(size.width,size.height,Math.max(640,Math.max(size.width,size.height)*.8));quality=Math.max(.58,quality-.06);
  }
  const src=await asData(blob);return{src,width:canvas.width,height:canvas.height};
 }finally{if(temporary)URL.revokeObjectURL(url);}
}
export async function imageFromFile(file){if(!/^image\//.test(file.type)&&! /\.(jpe?g|png|webp|gif|avif|heic|heif)$/i.test(file.name))throw new Error('Hãy chọn một tệp ảnh.');return compressImage(file);}
// Decode sequentially and retain small wheel thumbnails, so large lists do not retain full-resolution rasters.
export class WheelImages{
 constructor(onReady){this.entries=new Map();this.onReady=onReady;}
 ensure(image){if(!image?.src)return Promise.resolve(null);if(this.entries.has(image.src))return this.entries.get(image.src).promise;const entry={element:null,promise:null};this.entries.set(image.src,entry);entry.promise=loadImage(image.src).then(el=>{const thumb=document.createElement('canvas'),size=fittedSize(el.naturalWidth,el.naturalHeight,256);thumb.width=size.width;thumb.height=size.height;const ctx=thumb.getContext('2d');if(!ctx)throw new Error('Không tạo được ảnh xem trước.');ctx.drawImage(el,0,0,thumb.width,thumb.height);entry.element=thumb;this.onReady?.();return thumb;}).catch(error=>{this.entries.delete(image.src);throw error;});return entry.promise;}
 get(image){return this.entries.get(image?.src)?.element;}
 async prepare(items){for(const item of items)if(item.image)await this.ensure(item.image);}
 prune(items){const keep=new Set(items.map(x=>x.image?.src));for(const key of this.entries.keys())if(!keep.has(key))this.entries.delete(key);}
}
