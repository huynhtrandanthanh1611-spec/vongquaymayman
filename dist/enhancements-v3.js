import {compressImage} from './images.mjs';

const STORAGE_KEY='lucky-wheel-entry-details-v3';
const $=id=>document.getElementById(id);
const normalize=value=>String(value||'').normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('vi');

let details={};
let activeId=null;
let pendingImage=null;
let decorateFrame=0;

try{
  const old=JSON.parse(localStorage.getItem('lucky-wheel-entry-details-v1')||'{}');
  const now=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
  details={...(old&&typeof old==='object'?old:{}),...(now&&typeof now==='object'?now:{})};
}catch{ details={}; }

function saveDetails(){
  try{
    localStorage.setItem(STORAGE_KEY,JSON.stringify(details));
    return true;
  }catch{
    miniToast('Bộ nhớ trình duyệt đã đầy. Hãy chọn ảnh nhỏ hơn.');
    return false;
  }
}

function miniToast(text){
  let el=$('enhancement-toast-v3');
  if(!el){
    el=document.createElement('div');
    el.id='enhancement-toast-v3';
    document.body.appendChild(el);
  }
  el.textContent=text;
  el.hidden=false;
  clearTimeout(miniToast.timer);
  miniToast.timer=setTimeout(()=>el.hidden=true,2800);
}

function injectStyles(){
  if($('enhancement-style-v3'))return;
  const style=document.createElement('style');
  style.id='enhancement-style-v3';
  style.textContent=`
    #content-panel>.pagination{display:none!important}
    #entry-list{
      overflow-y:auto!important;
      overflow-x:hidden!important;
      touch-action:pan-y!important;
      overscroll-behavior:contain!important;
      scrollbar-width:thin;
      scrollbar-color:#d8b96f transparent;
      padding-right:5px!important;
    }
    #entry-list::-webkit-scrollbar{width:8px}
    #entry-list::-webkit-scrollbar-thumb{background:#d8b96f;border-radius:999px}
    #entry-list .entry-row{flex:none!important}
    #entry-list .entry-row input{flex:1 1 auto!important;width:auto!important;min-width:0!important;text-indent:0!important}
    #wheel{will-change:transform;backface-visibility:hidden;transform-origin:50% 50%}
    .entry-detail-button-v3{
      flex:none;min-width:112px;height:34px;padding:5px 8px;border:1px solid #ead3a0;border-radius:10px;
      background:#fff6d8;color:#866631;font:800 10px/1.1 'Quicksand',sans-serif;white-space:nowrap;cursor:pointer
    }
    .entry-detail-button-v3:hover{background:#ffedb5;border-color:#d7b15b}
    .entry-detail-button-v3.partial{background:#fff0c9;color:#8d661f}
    .entry-detail-button-v3.ready{background:#e2f3e7;border-color:#add4ba;color:#477859}
    #entry-detail-dialog-v3{width:min(590px,calc(100% - 28px));max-height:calc(100dvh - 28px);overflow:auto;border:1px solid #e5d3b2;border-radius:24px;padding:22px;background:#fffdf4;color:#60462f;box-shadow:0 28px 90px #2f211d35}
    #entry-detail-dialog-v3::backdrop{background:#3a30286b;backdrop-filter:blur(4px)}
    .detail-v3-form{display:flex;flex-direction:column;gap:11px}
    .detail-v3-header{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
    .detail-v3-header h2{margin:0;font-size:23px;line-height:1.2}
    #detail-v3-term{margin-top:4px;color:#b07823;font-weight:900;font-size:15px;overflow-wrap:anywhere}
    .detail-v3-close{width:36px;height:36px;flex:none;border:0;border-radius:10px;background:#f2eadc;color:#80684b;font-size:24px;cursor:pointer}
    .detail-v3-label{font-size:11px;font-weight:900;letter-spacing:.6px;color:#927b58}
    #detail-v3-meaning{width:100%;min-height:100px;max-height:28vh;resize:vertical;border:1px solid #e1cfac;border-radius:13px;background:#fffefb;padding:12px 13px;color:#60462f;font:700 15px/1.55 'Quicksand',sans-serif}
    #detail-v3-drop{width:100%;height:190px;border:2px dashed #d4bd88;border-radius:16px;background:#fffaf0;padding:10px;display:grid;place-items:center;overflow:hidden;color:#8d7249;text-align:center;cursor:pointer}
    #detail-v3-drop:hover{background:#fff3d2;border-color:#c6a04f}
    #detail-v3-preview{display:block;max-width:100%;max-height:100%;object-fit:contain;border-radius:11px}
    #detail-v3-empty{font-size:13px;line-height:1.55}
    .detail-v3-image-actions,.detail-v3-actions{display:flex;align-items:center;gap:9px}
    .detail-v3-image-actions{justify-content:space-between}.detail-v3-actions{justify-content:flex-end;margin-top:2px}
    .detail-v3-image-actions button,.detail-v3-actions button{min-height:38px;border-radius:11px;padding:8px 13px;font:800 12px/1 'Quicksand',sans-serif;cursor:pointer}
    .detail-v3-choose,.detail-v3-cancel{border:1px solid #ddd0b8;background:#f8f1e6;color:#735a3b}
    .detail-v3-remove{border:0;background:transparent;color:#a95e51}
    .detail-v3-save{border:1px solid #e8ad39;background:#ffcb59;color:#60411d;box-shadow:0 3px 0 #d4962c}
    #enhancement-toast-v3{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:10020;max-width:min(520px,90vw);padding:11px 17px;border-radius:13px;background:#594535;color:#fffbed;text-align:center;font:750 13px/1.4 'Quicksand',sans-serif;box-shadow:0 8px 28px #2d201b38}
    .result-content.detail-v3-active{justify-content:center!important;gap:12px!important;padding:22px 4vw 48px!important}
    .result-content.detail-v3-active #result-text{flex:none!important;font-size:clamp(38px,6.2vw,82px)!important;line-height:1.08!important;max-height:none!important;color:#704d24!important;text-shadow:0 2px 0 #fff8e8!important}
    #result-detail-v3{width:min(900px,88vw);max-height:58vh;display:flex;flex-direction:column;align-items:center;gap:12px;overflow:auto;padding:14px 18px 16px;border:1px solid #ead7a8;border-radius:20px;background:#fffdf0e8;box-shadow:0 10px 35px #6c4d2418}
    #result-detail-v3 img{display:block;max-width:min(620px,78vw);max-height:33vh;object-fit:contain;border-radius:14px;background:#fff;box-shadow:0 6px 20px #5e472624}
    #result-detail-v3 p{margin:0;color:#5d4a34;text-align:center;font:800 clamp(18px,2.1vw,27px)/1.48 'Quicksand',sans-serif;white-space:pre-wrap;overflow-wrap:anywhere}
    @media(max-width:900px){.entry-detail-button-v3{min-width:96px;font-size:9px;padding:5px}}
    @media(max-width:739px){#entry-list .entry-row{height:auto!important;min-height:60px!important;flex-wrap:wrap}.entry-detail-button-v3{order:5;margin-left:82px;min-width:118px;height:29px}#entry-detail-dialog-v3{padding:16px}#detail-v3-drop{height:150px}.result-content.detail-v3-active #result-text{font-size:clamp(32px,10vw,58px)!important}}
  `;
  document.head.appendChild(style);
}

function createDialog(){
  if($('entry-detail-dialog-v3'))return;
  const d=document.createElement('dialog');
  d.id='entry-detail-dialog-v3';
  d.innerHTML=`<form id="detail-v3-form" class="detail-v3-form">
    <div class="detail-v3-header"><div><h2>Thêm nghĩa và hình ảnh</h2><div id="detail-v3-term"></div></div><button type="button" id="detail-v3-close" class="detail-v3-close" aria-label="Đóng">×</button></div>
    <label class="detail-v3-label" for="detail-v3-meaning">NGHĨA / GIẢI THÍCH NGẮN</label>
    <textarea id="detail-v3-meaning" rows="4" placeholder="Nhập nghĩa hoặc lời giải thích ngắn gọn, dễ hiểu..."></textarea>
    <div class="detail-v3-label">HÌNH MINH HỌA</div>
    <button type="button" id="detail-v3-drop"><img id="detail-v3-preview" alt="Hình minh họa" hidden><span id="detail-v3-empty"><b>Ctrl + V</b> để dán ảnh<br>hoặc bấm vào đây để chọn ảnh từ máy</span></button>
    <input id="detail-v3-file" type="file" accept="image/*" hidden>
    <div class="detail-v3-image-actions"><button type="button" id="detail-v3-choose" class="detail-v3-choose">🖼️ CHỌN ẢNH TỪ MÁY</button><button type="button" id="detail-v3-remove" class="detail-v3-remove" hidden>Xóa ảnh</button></div>
    <div class="detail-v3-actions"><button type="button" id="detail-v3-cancel" class="detail-v3-cancel">HỦY</button><button type="submit" class="detail-v3-save">✓ LƯU</button></div>
  </form>`;
  document.body.appendChild(d);
  $('detail-v3-close').onclick=() => d.close();
  $('detail-v3-cancel').onclick=() => d.close();
  $('detail-v3-choose').onclick=() => $('detail-v3-file').click();
  $('detail-v3-drop').onclick=() => $('detail-v3-file').click();
  $('detail-v3-remove').onclick=()=>{pendingImage=null;renderPendingImage();};
  $('detail-v3-file').onchange=e=>{const f=e.target.files?.[0];if(f)useImage(f);e.target.value='';};
  $('detail-v3-form').onsubmit=e=>{e.preventDefault();saveActive();};
  d.addEventListener('close',()=>{activeId=null;pendingImage=null;});
}

function rowText(row){return row?.querySelector('input[type="text"]')?.value?.trim()||'';}
function detailFor(id){return details[id]||null;}

function setButtonState(button,record){
  const m=!!record?.meaning?.trim();
  const i=!!record?.image?.src;
  button.classList.toggle('ready',m&&i);
  button.classList.toggle('partial',(m||i)&&!(m&&i));
  button.textContent=(m&&i?'✓ ':(m||i?'• ':'+ '))+'NGHĨA & ẢNH';
}

function decorateRows(){
  decorateFrame=0;
  const list=$('entry-list');
  if(!list)return;
  list.querySelectorAll('.entry-row').forEach(row=>{
    const id=row.dataset.id;
    if(!id)return;
    let b=row.querySelector('.entry-detail-button-v3');
    if(!b){
      b=document.createElement('button');
      b.type='button';
      b.className='entry-detail-button-v3';
      b.title='Thêm nghĩa và hình minh họa trước khi chơi';
      b.onclick=()=>openEditor(id);
      const actions=row.querySelector('.row-actions');
      row.insertBefore(b,actions||null);
    }
    setButtonState(b,detailFor(id));
  });
}

function scheduleDecorate(){
  if(!decorateFrame)decorateFrame=requestAnimationFrame(decorateRows);
}

function openEditor(id){
  const row=document.querySelector(`.entry-row[data-id="${CSS.escape(id)}"]`);
  if(!row)return;
  activeId=id;
  const record=detailFor(id)||{};
  pendingImage=record.image?{...record.image}:null;
  $('detail-v3-term').textContent=rowText(row)||'Nội dung chưa đặt tên';
  $('detail-v3-meaning').value=record.meaning||'';
  renderPendingImage();
  $('entry-detail-dialog-v3').showModal();
  requestAnimationFrame(()=>$('detail-v3-meaning').focus());
}

function renderPendingImage(){
  const img=$('detail-v3-preview'), empty=$('detail-v3-empty'), remove=$('detail-v3-remove');
  if(pendingImage?.src){
    img.src=pendingImage.src;img.hidden=false;empty.hidden=true;remove.hidden=false;
  }else{
    img.removeAttribute('src');img.hidden=true;empty.hidden=false;remove.hidden=true;
  }
}

async function useImage(file){
  if(!file?.type?.startsWith('image/')){miniToast('Hãy chọn hoặc dán một tệp ảnh.');return;}
  try{
    pendingImage=await compressImage(file,{maxSide:1000,quality:.74,targetBytes:90000});
    renderPendingImage();
    miniToast('Đã nhận ảnh. Bấm LƯU để hoàn tất.');
  }catch(err){miniToast(err?.message||'Chưa đọc được ảnh này.');}
}

function saveActive(){
  if(!activeId)return;
  const row=document.querySelector(`.entry-row[data-id="${CSS.escape(activeId)}"]`);
  const record={text:rowText(row),meaning:$('detail-v3-meaning').value.trim(),image:pendingImage||null};
  if(!record.meaning&&!record.image)delete details[activeId]; else details[activeId]=record;
  if(saveDetails()){
    const b=row?.querySelector('.entry-detail-button-v3');if(b)setButtonState(b,details[activeId]);
    $('entry-detail-dialog-v3').close();
    miniToast('Đã lưu nghĩa và hình minh họa.');
  }
}

function byText(text){
  const key=normalize(text);if(!key)return null;
  return Object.values(details).find(r=>normalize(r?.text)===key&&(r?.meaning||r?.image))||null;
}

function ensureResultCard(){
  const content=$('result-content');if(!content)return null;
  let card=$('result-detail-v3');
  if(!card){card=document.createElement('div');card.id='result-detail-v3';card.hidden=true;card.innerHTML='<img alt="Hình minh họa" hidden><p hidden></p>';content.appendChild(card);}
  return card;
}

function updateResult(){
  const box=$('result-box'), content=$('result-content'), title=$('result-text');
  if(!box||!content||!title)return;
  const card=ensureResultCard();
  const record=!box.hidden?byText(title.textContent):null;
  if(!record){content.classList.remove('detail-v3-active');if(card&&!card.hidden)card.hidden=true;return;}
  content.classList.add('detail-v3-active');card.hidden=false;
  const img=card.querySelector('img'), p=card.querySelector('p');
  if(record.image?.src){if(img.src!==record.image.src)img.src=record.image.src;img.alt=title.textContent?`Hình minh họa ${title.textContent}`:'Hình minh họa';img.hidden=false;}else{img.removeAttribute('src');img.hidden=true;}
  if(record.meaning){p.textContent=record.meaning;p.hidden=false;}else{p.textContent='';p.hidden=true;}
}

function installContinuousList(){
  if(Element.prototype.__luckyListV3)return;
  const native=Element.prototype.getBoundingClientRect;
  Object.defineProperty(Element.prototype,'__luckyListV3',{value:true});
  Element.prototype.getBoundingClientRect=function(){
    const rect=native.call(this);
    if(this.id==='entry-list'&&document.documentElement.dataset.mode==='teacher'){
      return new DOMRect(rect.x,rect.y,rect.width,1000000);
    }
    return rect;
  };
}

function installFasterSpin(){
  if(window.__luckyFastSpinV3)return;
  window.__luckyFastSpinV3=true;
  const nativeRAF=window.requestAnimationFrame.bind(window);
  let spinStart=0;
  const factor=2.05;
  window.requestAnimationFrame=callback=>nativeRAF(realNow=>{
    const spinning=$('wheel-scene')?.classList.contains('is-spinning');
    if(spinning){
      if(!spinStart)spinStart=performance.now();
      callback(spinStart+(realNow-spinStart)*factor);
    }else{
      spinStart=0;
      callback(realNow);
    }
  });
}

function syncDetailText(e){
  const input=e.target.closest?.('.entry-row input[type="text"]');if(!input)return;
  const row=input.closest('.entry-row'), id=row?.dataset.id;
  if(id&&details[id]){details[id].text=input.value.trim();saveDetails();}
}

function handlePaste(e){
  if(!$('entry-detail-dialog-v3')?.open)return;
  const items=Array.from(e.clipboardData?.items||[]);
  const item=items.find(x=>x.kind==='file'&&x.type.startsWith('image/'));
  const file=item?.getAsFile?.()||Array.from(e.clipboardData?.files||[]).find(x=>x.type.startsWith('image/'));
  if(file){e.preventDefault();useImage(file);}
}

function init(){
  injectStyles();
  createDialog();
  installContinuousList();
  installFasterSpin();

  const list=$('entry-list');
  if(list){
    scheduleDecorate();
    list.addEventListener('input',syncDetailText,true);
    new MutationObserver(scheduleDecorate).observe(list,{childList:true});
  }
  document.addEventListener('paste',handlePaste,true);

  const resultBox=$('result-box'), resultText=$('result-text');
  if(resultBox)new MutationObserver(updateResult).observe(resultBox,{attributes:true,attributeFilter:['hidden']});
  if(resultText)new MutationObserver(updateResult).observe(resultText,{childList:true,characterData:true,subtree:true});

  requestAnimationFrame(()=>{
    window.dispatchEvent(new Event('resize'));
    setTimeout(()=>{scheduleDecorate();updateResult();},80);
  });
}

function wait(){
  if($('entry-list')&&document.documentElement.dataset.loading==='false')init();
  else setTimeout(wait,40);
}

wait();
