import {compressImage} from './images.mjs';

const STORAGE_KEY='lucky-wheel-entry-details-v1';
const normalizeText=value=>String(value||'')
  .normalize('NFC')
  .trim()
  .replace(/\s+/g,' ')
  .toLocaleLowerCase('vi');

let details={};
let activeId=null;
let pendingImage=null;
let listObserver=null;
let resultObserver=null;

function loadDetails(){
  try{
    const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
    if(parsed&&typeof parsed==='object')details=parsed;
  }catch{
    details={};
  }
}

function saveDetails(){
  try{
    localStorage.setItem(STORAGE_KEY,JSON.stringify(details));
    return true;
  }catch{
    showMiniToast('Bộ nhớ trình duyệt đã đầy. Hãy dùng ảnh nhỏ hơn.');
    return false;
  }
}

function showMiniToast(message){
  let toast=document.getElementById('enhancement-toast');
  if(!toast){
    toast=document.createElement('div');
    toast.id='enhancement-toast';
    document.body.appendChild(toast);
  }
  toast.textContent=message;
  toast.hidden=false;
  clearTimeout(showMiniToast.timer);
  showMiniToast.timer=setTimeout(()=>toast.hidden=true,3300);
}

function injectStyles(){
  const style=document.createElement('style');
  style.id='entry-details-enhancement-styles';
  style.textContent=`
    #content-panel>.pagination{display:none!important}
    #entry-list{
      overflow-y:auto!important;
      overflow-x:hidden!important;
      touch-action:pan-y!important;
      overscroll-behavior:contain!important;
      scrollbar-width:thin;
      scrollbar-color:#d7b86d transparent;
      padding-right:4px!important;
    }
    #entry-list::-webkit-scrollbar{width:8px}
    #entry-list::-webkit-scrollbar-thumb{background:#d7b86d;border-radius:999px}
    #entry-list::-webkit-scrollbar-track{background:transparent}
    #entry-list .entry-row{flex:none!important}
    #entry-list .entry-row input{
      flex:1 1 auto!important;
      width:auto!important;
      min-width:0!important;
      text-indent:0!important;
    }
    .entry-detail-button{
      flex:none;
      min-width:114px;
      height:34px;
      padding:5px 8px;
      border:1px solid #ead4a1;
      border-radius:10px;
      background:#fff7db;
      color:#8a6a35;
      font:800 10px/1.1 'Quicksand',sans-serif;
      white-space:nowrap;
    }
    .entry-detail-button:hover{background:#ffefbd;border-color:#d9b86f}
    .entry-detail-button.partial{background:#fff0c9;border-color:#e6c16d;color:#916a22}
    .entry-detail-button.ready{background:#e4f3e9;border-color:#aed4bd;color:#4e7d60}

    #entry-detail-dialog{
      width:min(570px,calc(100% - 28px));
      max-height:calc(100dvh - 28px);
      overflow:auto;
      border:1px solid #e7d7b9;
      border-radius:24px;
      padding:24px;
      color:#60462f;
      background:#fffdf4;
      box-shadow:0 30px 100px #3b281d30;
    }
    #entry-detail-dialog::backdrop{background:#493b2a66;backdrop-filter:blur(4px)}
    .entry-detail-form{display:flex;flex-direction:column;gap:11px}
    .entry-detail-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
    .entry-detail-header h2{margin:0;font-size:24px;line-height:1.25}
    .entry-detail-term{margin-top:4px;color:#b17b29;font-size:15px;font-weight:900;overflow-wrap:anywhere}
    .entry-detail-close{
      width:36px;height:36px;flex:none;border:0;border-radius:10px;
      background:#f4ecdd;color:#826c50;font-size:24px;line-height:1;cursor:pointer
    }
    .entry-detail-label{font-size:11px;font-weight:900;letter-spacing:.7px;color:#9a825d;margin-top:3px}
    #entry-detail-meaning{
      width:100%;min-height:100px;max-height:28vh;resize:vertical;
      border:1px solid #e5d4b2;border-radius:13px;background:#fffefb;
      padding:12px 13px;color:#60462f;font:700 15px/1.55 'Quicksand',sans-serif
    }
    .entry-detail-drop{
      width:100%;height:190px;border:2px dashed #d7c18e;border-radius:16px;
      background:#fffaf0;padding:10px;display:grid;place-items:center;overflow:hidden;
      color:#90754d;text-align:center;cursor:pointer
    }
    .entry-detail-drop:hover{background:#fff4d8;border-color:#cba95b}
    .entry-detail-drop img{display:block;max-width:100%;max-height:100%;object-fit:contain;border-radius:11px}
    .entry-detail-drop-empty{max-width:340px;font-size:13px;line-height:1.55}
    .entry-detail-image-actions{display:flex;align-items:center;justify-content:space-between;gap:10px}
    .entry-detail-image-actions button,.entry-detail-actions button{
      min-height:38px;border-radius:11px;padding:8px 13px;font:800 12px/1 'Quicksand',sans-serif;cursor:pointer
    }
    .entry-detail-choose{border:1px solid #dfd1b7;background:#f8f2e7;color:#765b39}
    .entry-detail-remove{border:0;background:transparent;color:#af6658}
    .entry-detail-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:3px}
    .entry-detail-cancel{border:1px solid #dfd1b7;background:#f8f2e7;color:#765b39}
    .entry-detail-save{border:1px solid #eeb647;background:#ffcb5a;color:#62421e;box-shadow:0 3px 0 #d59b36}
    #enhancement-toast{
      position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:10001;
      max-width:min(520px,90vw);padding:11px 18px;border-radius:14px;
      background:#5b4735;color:#fffbed;text-align:center;font:750 13px/1.4 'Quicksand',sans-serif;
      box-shadow:0 8px 30px #3b281d33
    }
    .result-content.has-entry-details{
      justify-content:center!important;
      gap:12px!important;
      padding:24px 4vw 42px!important
    }
    .result-content.has-entry-details #result-text{
      flex:none!important;
      font-size:clamp(38px,6.2vw,82px)!important;
      line-height:1.08!important;
      max-height:none!important;
      color:#714d24!important;
      text-shadow:0 2px 0 #fff8e8!important
    }
    .entry-result-detail-card{
      width:min(900px,88vw);max-height:60vh;display:flex;flex-direction:column;
      align-items:center;gap:12px;overflow:auto;padding:14px 18px 16px;
      border:1px solid #ead7a8;border-radius:20px;background:#fffdf0e8;
      box-shadow:0 10px 35px #6c4d2418
    }
    .entry-result-detail-card img{
      display:block;max-width:min(620px,78vw);max-height:34vh;object-fit:contain;
      border-radius:14px;background:#fff;border:2px solid #fff;box-shadow:0 6px 20px #5e472624
    }
    .entry-result-detail-card p{
      margin:0;color:#5d4a34;text-align:center;font:800 clamp(18px,2.1vw,27px)/1.48 'Quicksand',sans-serif;
      white-space:pre-wrap;overflow-wrap:anywhere
    }
    @media(max-width:900px){
      .entry-detail-button{min-width:96px;font-size:9px;padding:5px}
    }
    @media(max-width:739px){
      #entry-list .entry-row{height:auto!important;min-height:60px!important;flex-wrap:wrap}
      #entry-list .entry-row input{min-width:118px!important}
      .entry-detail-button{order:5;margin-left:calc(27px + 46px + 10px);min-width:118px;height:29px}
      #entry-detail-dialog{padding:17px}
      .entry-detail-drop{height:150px}
      .result-content.has-entry-details #result-text{font-size:clamp(32px,10vw,58px)!important}
      .entry-result-detail-card{width:92vw;max-height:58vh;padding:11px 12px}
      .entry-result-detail-card img{max-height:28vh}
    }
    @media(max-height:560px){
      #entry-detail-dialog{padding:14px}
      .entry-detail-drop{height:96px}
      #entry-detail-meaning{min-height:60px;max-height:17vh}
      .entry-result-detail-card{max-height:54vh;flex-direction:row;text-align:left}
      .entry-result-detail-card img{max-width:38vw;max-height:42vh}
      .entry-result-detail-card p{text-align:left;font-size:16px}
    }
  `;
  document.head.appendChild(style);
}

function createDialog(){
  if(document.getElementById('entry-detail-dialog'))return;
  const dialog=document.createElement('dialog');
  dialog.id='entry-detail-dialog';
  dialog.innerHTML=`
    <form class="entry-detail-form" id="entry-detail-form">
      <div class="entry-detail-header">
        <div><h2>Thêm nghĩa và hình ảnh</h2><div class="entry-detail-term" id="entry-detail-term"></div></div>
        <button type="button" class="entry-detail-close" id="entry-detail-close" aria-label="Đóng">×</button>
      </div>
      <label class="entry-detail-label" for="entry-detail-meaning">NGHĨA / GIẢI THÍCH NGẮN</label>
      <textarea id="entry-detail-meaning" rows="4" placeholder="Nhập phần giải thích ngắn gọn, dễ hiểu cho học sinh..."></textarea>
      <div class="entry-detail-label">HÌNH MINH HỌA</div>
      <button type="button" class="entry-detail-drop" id="entry-detail-drop">
        <img id="entry-detail-preview" alt="Hình minh họa đã chọn" hidden>
        <span class="entry-detail-drop-empty" id="entry-detail-drop-empty"><b>Ctrl + V</b> để dán ảnh<br>hoặc bấm vào đây để chọn ảnh từ máy</span>
      </button>
      <input id="entry-detail-file" type="file" accept="image/*" hidden>
      <div class="entry-detail-image-actions">
        <button type="button" class="entry-detail-choose" id="entry-detail-choose">🖼️ CHỌN ẢNH TỪ MÁY</button>
        <button type="button" class="entry-detail-remove" id="entry-detail-remove" hidden>Xóa ảnh</button>
      </div>
      <div class="entry-detail-actions">
        <button type="button" class="entry-detail-cancel" id="entry-detail-cancel">HỦY</button>
        <button type="submit" class="entry-detail-save">✓ LƯU</button>
      </div>
    </form>`;
  document.body.appendChild(dialog);

  dialog.querySelector('#entry-detail-close').onclick=()=>dialog.close();
  dialog.querySelector('#entry-detail-cancel').onclick=()=>dialog.close();
  dialog.querySelector('#entry-detail-choose').onclick=()=>dialog.querySelector('#entry-detail-file').click();
  dialog.querySelector('#entry-detail-drop').onclick=()=>dialog.querySelector('#entry-detail-file').click();
  dialog.querySelector('#entry-detail-remove').onclick=()=>{
    pendingImage=null;
    renderPendingImage();
  };
  dialog.querySelector('#entry-detail-file').onchange=event=>{
    const file=event.target.files?.[0];
    if(file)useImageFile(file);
    event.target.value='';
  };
  dialog.querySelector('#entry-detail-form').onsubmit=event=>{
    event.preventDefault();
    saveActiveDetail();
  };
  dialog.addEventListener('close',()=>{
    activeId=null;
    pendingImage=null;
  });
}

function detailFor(id){
  return details[id]||null;
}

function getRowText(row){
  return row?.querySelector('input[type="text"]')?.value?.trim()||'';
}

function buttonState(button,record){
  const hasMeaning=!!record?.meaning?.trim();
  const hasImage=!!record?.image?.src;
  button.classList.toggle('ready',hasMeaning&&hasImage);
  button.classList.toggle('partial',(hasMeaning||hasImage)&&!(hasMeaning&&hasImage));
  button.textContent=(hasMeaning&&hasImage?'✓ ':(hasMeaning||hasImage?'• ':'+ '))+'NGHĨA & ẢNH';
}

function decorateRows(){
  const list=document.getElementById('entry-list');
  if(!list)return;
  for(const row of list.querySelectorAll('.entry-row')){
    const id=row.dataset.id;
    if(!id)continue;
    let button=row.querySelector('.entry-detail-button');
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='entry-detail-button';
      button.title='Thêm nghĩa và hình minh họa trước khi chơi';
      button.onclick=()=>openDetailEditor(id);
      const actions=row.querySelector('.row-actions');
      row.insertBefore(button,actions||null);
    }
    buttonState(button,detailFor(id));
  }
}

function openDetailEditor(id){
  const row=document.querySelector(`.entry-row[data-id="${CSS.escape(id)}"]`);
  if(!row)return;
  activeId=id;
  const record=detailFor(id)||{};
  pendingImage=record.image?{...record.image}:null;
  document.getElementById('entry-detail-term').textContent=getRowText(row)||'Nội dung chưa đặt tên';
  document.getElementById('entry-detail-meaning').value=record.meaning||'';
  renderPendingImage();
  const dialog=document.getElementById('entry-detail-dialog');
  dialog.showModal();
  requestAnimationFrame(()=>document.getElementById('entry-detail-meaning').focus());
}

function renderPendingImage(){
  const preview=document.getElementById('entry-detail-preview');
  const empty=document.getElementById('entry-detail-drop-empty');
  const remove=document.getElementById('entry-detail-remove');
  if(pendingImage?.src){
    preview.src=pendingImage.src;
    preview.hidden=false;
    empty.hidden=true;
    remove.hidden=false;
  }else{
    preview.removeAttribute('src');
    preview.hidden=true;
    empty.hidden=false;
    remove.hidden=true;
  }
}

async function useImageFile(file){
  if(!file||!file.type?.startsWith('image/')){
    showMiniToast('Hãy chọn hoặc dán một tệp ảnh.');
    return;
  }
  try{
    pendingImage=await compressImage(file,{maxSide:1100,quality:.76,targetBytes:110000});
    renderPendingImage();
    showMiniToast('Đã nhận ảnh. Bấm LƯU để hoàn tất.');
  }catch(error){
    showMiniToast(error?.message||'Chưa đọc được ảnh này.');
  }
}

function saveActiveDetail(){
  if(!activeId)return;
  const row=document.querySelector(`.entry-row[data-id="${CSS.escape(activeId)}"]`);
  const meaning=document.getElementById('entry-detail-meaning').value.trim();
  const record={
    text:getRowText(row),
    meaning,
    image:pendingImage||null
  };
  if(!record.meaning&&!record.image){
    delete details[activeId];
  }else{
    details[activeId]=record;
  }
  if(saveDetails()){
    const button=row?.querySelector('.entry-detail-button');
    if(button)buttonState(button,details[activeId]);
    document.getElementById('entry-detail-dialog').close();
    showMiniToast('Đã lưu nghĩa và hình minh họa.');
  }
}

function detailForText(text){
  const key=normalizeText(text);
  if(!key)return null;
  return Object.values(details).find(record=>normalizeText(record?.text)===key&&(record?.meaning||record?.image))||null;
}

function ensureResultCard(){
  const content=document.getElementById('result-content');
  if(!content)return null;
  let card=content.querySelector('.entry-result-detail-card');
  if(!card){
    card=document.createElement('div');
    card.className='entry-result-detail-card';
    card.hidden=true;
    card.innerHTML='<img alt="Hình minh họa" hidden><p hidden></p>';
    content.appendChild(card);
  }
  return card;
}

function updateResultDetails(){
  const resultBox=document.getElementById('result-box');
  const content=document.getElementById('result-content');
  const title=document.getElementById('result-text');
  if(!resultBox||!content||!title)return;
  const card=ensureResultCard();
  if(resultBox.hidden){
    content.classList.remove('has-entry-details');
    if(card)card.hidden=true;
    return;
  }
  const record=detailForText(title.textContent);
  if(!record){
    content.classList.remove('has-entry-details');
    if(card)card.hidden=true;
    return;
  }
  content.classList.add('has-entry-details');
  card.hidden=false;
  const img=card.querySelector('img');
  const p=card.querySelector('p');
  if(record.image?.src){
    img.src=record.image.src;
    img.alt=title.textContent?`Hình minh họa ${title.textContent}`:'Hình minh họa';
    img.hidden=false;
  }else{
    img.removeAttribute('src');
    img.hidden=true;
  }
  if(record.meaning){
    p.textContent=record.meaning;
    p.hidden=false;
  }else{
    p.textContent='';
    p.hidden=true;
  }
}

function interceptPaste(event){
  const dialog=document.getElementById('entry-detail-dialog');
  if(!dialog?.open)return;
  const items=Array.from(event.clipboardData?.items||[]);
  const imageItem=items.find(item=>item.kind==='file'&&item.type.startsWith('image/'));
  const file=imageItem?.getAsFile?.()||Array.from(event.clipboardData?.files||[]).find(x=>x.type.startsWith('image/'));
  if(file){
    event.preventDefault();
    useImageFile(file);
  }
}

function keepRecordTextInSync(event){
  const input=event.target.closest?.('.entry-row input[type="text"]');
  if(!input)return;
  const row=input.closest('.entry-row');
  const id=row?.dataset.id;
  if(id&&details[id]){
    details[id].text=input.value.trim();
    saveDetails();
  }
}

function makeListContinuous(){
  const nativeGetBoundingClientRect=Element.prototype.getBoundingClientRect;
  if(!Element.prototype.__luckyContinuousListPatched){
    Object.defineProperty(Element.prototype,'__luckyContinuousListPatched',{value:true});
    Element.prototype.getBoundingClientRect=function(){
      const rect=nativeGetBoundingClientRect.call(this);
      if(this.id==='entry-list'&&document.documentElement.dataset.mode==='teacher'){
        return new DOMRect(rect.x,rect.y,rect.width,1000000);
      }
      return rect;
    };
  }
  window.dispatchEvent(new Event('resize'));
}

function init(){
  loadDetails();
  injectStyles();
  createDialog();
  makeListContinuous();

  const list=document.getElementById('entry-list');
  if(list){
    decorateRows();
    list.addEventListener('input',keepRecordTextInSync,true);
    listObserver=new MutationObserver(()=>decorateRows());
    listObserver.observe(list,{childList:true,subtree:true});
  }

  document.addEventListener('paste',interceptPaste,true);

  const resultBox=document.getElementById('result-box');
  if(resultBox){
    updateResultDetails();
    resultObserver=new MutationObserver(()=>queueMicrotask(updateResultDetails));
    resultObserver.observe(resultBox,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden']});
  }

  window.addEventListener('resize',()=>setTimeout(decorateRows,60));
  setTimeout(()=>{
    window.dispatchEvent(new Event('resize'));
    decorateRows();
  },120);
}

function waitForApp(){
  if(document.getElementById('entry-list')&&document.documentElement.dataset.loading==='false'){
    init();
  }else{
    setTimeout(waitForApp,50);
  }
}

waitForApp();
