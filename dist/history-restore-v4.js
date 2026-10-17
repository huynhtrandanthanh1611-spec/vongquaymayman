import {TeacherStore} from './storage.mjs';

const $=id=>document.getElementById(id);
const RETURN_KEY='lucky-wheel-return-history-v4';
const store=new TeacherStore();
let historyDecorateToken=0;

function installWheelTextBoost(){
  if(window.__luckyWheelTextBoostV4)return;
  window.__luckyWheelTextBoostV4=true;

  const proto=CanvasRenderingContext2D.prototype;
  const nativeFillText=proto.fillText;
  const nativeStrokeText=proto.strokeText;
  const factor=1.13;

  const withLargerWheelFont=(ctx,draw)=>{
    if(ctx.canvas?.id!=='wheel')return draw();
    const original=ctx.font;
    const match=original.match(/(\d+(?:\.\d+)?)px/);
    if(!match)return draw();
    const size=Number(match[1]);
    if(!Number.isFinite(size)||size<=0)return draw();
    ctx.font=original.replace(match[0],`${Math.round(size*factor*10)/10}px`);
    try{return draw();}
    finally{ctx.font=original;}
  };

  proto.fillText=function(...args){
    return withLargerWheelFont(this,()=>nativeFillText.apply(this,args));
  };
  proto.strokeText=function(...args){
    return withLargerWheelFont(this,()=>nativeStrokeText.apply(this,args));
  };
}

installWheelTextBoost();

function injectStyles(){
  if($('history-restore-style-v4'))return;
  const style=document.createElement('style');
  style.id='history-restore-style-v4';
  style.textContent=`
    #entry-list,#history-list{
      overscroll-behavior:contain!important;
      scrollbar-width:thin;
    }
    .history-restore-v4{
      flex:none;
      width:34px;
      height:34px;
      margin-left:auto;
      padding:0;
      display:grid;
      place-items:center;
      border:1px solid #ead8b6;
      border-radius:10px;
      background:#fff7df;
      color:#9a6e28;
      cursor:pointer;
      transition:background .15s ease,border-color .15s ease,transform .15s ease;
    }
    .history-restore-v4:hover{
      background:#ffedb9;
      border-color:#d9b665;
      transform:translateY(-1px);
    }
    .history-restore-v4:active{transform:translateY(1px)}
    .history-restore-v4:disabled{opacity:.55;cursor:wait;transform:none}
    .history-restore-v4 svg{width:18px;height:18px;display:block}
    .history-restore-v4.is-restoring svg{animation:historyRestoreSpinV4 .7s linear infinite}
    @keyframes historyRestoreSpinV4{to{transform:rotate(-360deg)}}
    #history-restore-toast-v4{
      position:fixed;
      left:50%;
      bottom:20px;
      transform:translateX(-50%);
      z-index:10040;
      max-width:min(520px,90vw);
      padding:11px 17px;
      border-radius:13px;
      background:#594535;
      color:#fffbed;
      text-align:center;
      font:750 13px/1.4 'Quicksand',sans-serif;
      box-shadow:0 8px 28px #2d201b38;
    }
  `;
  document.head.appendChild(style);
}

function toast(text){
  let el=$('history-restore-toast-v4');
  if(!el){
    el=document.createElement('div');
    el.id='history-restore-toast-v4';
    document.body.appendChild(el);
  }
  el.textContent=text;
  el.hidden=false;
  clearTimeout(toast.timer);
  toast.timer=setTimeout(()=>el.hidden=true,3000);
}

function wheelDeltaPixels(event,el){
  if(event.deltaMode===1)return event.deltaY*32;
  if(event.deltaMode===2)return event.deltaY*Math.max(120,el.clientHeight);
  return event.deltaY;
}

function enableMouseWheelScroll(el){
  if(!el||el.dataset.wheelScrollV4==='1')return;
  el.dataset.wheelScrollV4='1';
  el.addEventListener('wheel',event=>{
    if(event.ctrlKey)return;
    const delta=wheelDeltaPixels(event,el);
    if(!delta)return;
    const before=el.scrollTop;
    el.scrollTop+=delta;
    if(el.scrollTop!==before)event.preventDefault();
    // app.js blocks wheel events at document level; stop this event here so
    // the list can keep its own native/manual scrolling behavior.
    event.stopPropagation();
  },{passive:false});
}

function displayTime(entry){
  return new Date(entry?.at||Date.now()).toLocaleTimeString('vi-VN',{
    hour:'2-digit',
    minute:'2-digit'
  });
}

function restoreIcon(){
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11a9 9 0 1 1 2 7M3 4v7h7"/></svg>';
}

function findRecordForRow(row,history,used){
  const title=(row.querySelector('strong')?.textContent||'').trim();
  const time=(row.querySelector('small')?.textContent||'').trim();
  const imageSrc=row.querySelector('img')?.getAttribute('src')||'';
  const reversed=[...history].reverse();

  let found=reversed.find(entry=>{
    if(!entry?.id||used.has(entry.id))return false;
    const entryTitle=(entry.text||'Ảnh').trim();
    if(entryTitle!==title||displayTime(entry)!==time)return false;
    if(imageSrc&&entry.image?.src!==imageSrc)return false;
    return true;
  });

  if(!found){
    found=reversed.find(entry=>{
      if(!entry?.id||used.has(entry.id))return false;
      return (entry.text||'Ảnh').trim()===title&&displayTime(entry)===time;
    });
  }
  return found||null;
}

function cleanHistoryEntry(entry){
  const copy={id:entry.id,text:entry.text||''};
  if(entry.image)copy.image={...entry.image};
  return copy;
}

async function restoreHistoryItem(id,button){
  if(!id||button?.disabled)return;
  if(button){
    button.disabled=true;
    button.classList.add('is-restoring');
  }
  try{
    const state=await store.load();
    if(!state||!Array.isArray(state.history))throw new Error('Không đọc được lịch sử hiện tại.');
    const entry=state.history.find(item=>item?.id===id);
    if(!entry)throw new Error('Từ này không còn trong lịch sử.');

    state.history=state.history.filter(item=>item?.id!==id);
    if(state.last?.id===id)state.last=null;

    const restored=cleanHistoryEntry(entry);
    if(!Array.isArray(state.items))state.items=[];
    if(!state.items.some(item=>item?.id===id))state.items.push({...restored});

    if(!Array.isArray(state.draft))state.draft=[];
    if(!state.draft.some(item=>item?.id===id))state.draft.push({...restored});

    await store.save(state);
    sessionStorage.setItem(RETURN_KEY,JSON.stringify({text:entry.text||'Ảnh'}));
    location.reload();
  }catch(error){
    if(button){
      button.disabled=false;
      button.classList.remove('is-restoring');
    }
    toast(error?.message||'Chưa khôi phục được từ này.');
  }
}

async function decorateHistory(){
  const list=$('history-list');
  if(!list)return;
  const token=++historyDecorateToken;
  let state;
  try{state=await store.load();}catch{return;}
  if(token!==historyDecorateToken||!state||!Array.isArray(state.history))return;

  const used=new Set();
  for(const row of list.querySelectorAll('.history-item')){
    let button=row.querySelector('.history-restore-v4');
    const record=findRecordForRow(row,state.history,used);
    if(!record){
      button?.remove();
      continue;
    }
    used.add(record.id);
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='history-restore-v4';
      button.innerHTML=restoreIcon();
      row.appendChild(button);
    }
    button.dataset.restoreId=record.id;
    button.title='Khôi phục từ này';
    button.setAttribute('aria-label',`Khôi phục ${record.text||'ảnh'} về vòng quay`);
    button.onclick=event=>{
      event.preventDefault();
      event.stopPropagation();
      restoreHistoryItem(button.dataset.restoreId,button);
    };
  }
}

function returnToHistoryAfterRestore(){
  let payload=null;
  try{payload=JSON.parse(sessionStorage.getItem(RETURN_KEY)||'null');}catch{}
  if(!payload)return;
  sessionStorage.removeItem(RETURN_KEY);
  const tab=$('history-tab');
  if(tab)tab.click();
  requestAnimationFrame(()=>{
    enableMouseWheelScroll($('history-list'));
    decorateHistory();
  });
  setTimeout(()=>toast(`Đã khôi phục “${payload.text||'nội dung'}” về vòng quay.`),80);
}

function init(){
  injectStyles();
  enableMouseWheelScroll($('entry-list'));
  enableMouseWheelScroll($('history-list'));

  const entryList=$('entry-list');
  if(entryList){
    new MutationObserver(()=>enableMouseWheelScroll(entryList)).observe(entryList,{childList:true});
  }

  const historyList=$('history-list');
  if(historyList){
    decorateHistory();
    new MutationObserver(()=>decorateHistory()).observe(historyList,{childList:true,subtree:true});
  }

  $('history-tab')?.addEventListener('click',()=>{
    requestAnimationFrame(()=>{
      enableMouseWheelScroll($('history-list'));
      decorateHistory();
    });
  });

  returnToHistoryAfterRestore();
}

function waitForApp(){
  if($('entry-list')&&$('history-list')&&document.documentElement.dataset.loading==='false')init();
  else setTimeout(waitForApp,40);
}

waitForApp();
