import {normalize,indexAtPointer,targetRotation,randomIndex,remainingItems,cleanLines,contentKey,entryKey} from './wheel-core.mjs';
import {ClassroomAudio,savedMusic} from './audio.js';
import {stageLayout,wheelEase} from './wheel-motion.mjs';
import {decodeShare,createShareURL,isSharedHash,ShareSizeError} from './share.mjs';
import {imageFromFile,compressImage,WheelImages,isImageData,loadImage} from './images.mjs';
import {TeacherStore} from './storage.mjs';

const $=id=>document.getElementById(id);

const teacherStore=new TeacherStore();

const palette=[
  '#f7d27e',
  '#b9dfd1',
  '#c6c3e8',
  '#f5b8aa',
  '#f2dfa4',
  '#b8d7e8',
  '#d5dcad',
  '#dfc6e4'
];

const iconPaths={
  volume:'M11 4 6 8H2v8h4l5 4V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
  mute:'M11 4 6 8H2v8h4l5 4V4Zm5 5 5 6m0-6-5 6',
  expand:'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
  shrink:'M3 8h5V3m8 0v5h5M8 21v-5H3m13 5v-5h5',
  shield:'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Zm-4 9 3 3 5-6',
  sparkles:'m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM20 2v4m-2-2h4',
  rotate:'M20 11a8 8 0 1 0-2 6M20 4v7h-7',
  restart:'M3 11a9 9 0 1 1 2 7M3 4v7h7',
  check:'m5 12 4 4L19 6',
  list:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  paste:'M9 5H5v16h14V5h-4M9 3h6v4H9zM8 12h8m-8 4h6',
  plus:'M12 5v14M5 12h14',
  save:'m4 3 14 0 3 3v15H3V3h1ZM7 3v6h10V3M7 21v-8h10v8',
  trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
  music:'M9 18V5l12-2v13M9 8l12-2M9 18c0 4-7 4-7 0s7-4 7 0Zm12-2c0 4-7 4-7 0s7-4 7 0Z',
  upload:'M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6',
  close:'m6 6 12 12M6 18 18 6',
  up:'m6 14 6-6 6 6',
  down:'m6 10 6 6 6-6',
  arrow:'M4 12h16m-6-6 6 6-6 6'
};

function icon(name){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${iconPaths[name]||iconPaths.sparkles}"/></svg>`;
}

document.querySelectorAll('[data-icon]').forEach(
  el=>el.innerHTML=icon(el.dataset.icon)
);

Object.assign(iconPaths,{
  image:'M3 3h18v18H3zM3 17l6-6 4 4 3-3 5 5M16 7h.01',
  left:'m15 6-6 6 6 6',
  right:'m9 6 6 6-6 6',
  play:'m8 4 13 8-13 8V4Z',
  link:'M10 13a5 5 0 0 0 7 0l4-4a5 5 0 0 0-7-7l-3 3M14 11a5 5 0 0 0-7 0l-4 4a5 5 0 0 0 7 7l3-3'
});

document.querySelectorAll('[data-icon]').forEach(
  el=>el.innerHTML=icon(el.dataset.icon)
);

const uid=()=>crypto.randomUUID
  ? crypto.randomUUID()
  : `${Date.now()}-${crypto.getRandomValues(new Uint32Array(2)).join('-')}`;

const samples=[
  'Nguyễn An',
  'Trả lời câu hỏi số 1',
  'Đọc một đoạn văn',
  'Nhận một ngôi sao',
  'Chọn bạn tiếp theo',
  'Lê Minh',
  'Hát một câu',
  'Một tràng pháo tay'
];

const initial=samples.map(text=>({
  id:uid(),
  text
}));

let state={
  items:initial,
  draft:initial.map(x=>({...x})),
  history:[],
  last:null,
  rotation:-22.5,
  sound:true,
  volume:45,
  track:'playful',
  musicEnabled:false,
  customAudio:null
};

let shared=null,
    shareInvalid=false,
    storageProblem=false,
    customFile=null;

const sharedVisit=isSharedHash(location.hash);

const sessionSignature=sharedVisit
  ? await digest(location.hash)
  : '';

async function digest(text){
  if(crypto.subtle){
    const bytes=await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(text)
    );

    return Array.from(
      new Uint8Array(bytes),
      x=>x.toString(16).padStart(2,'0')
    ).join('');
  }

  return text;
}

let importingImages=false,
    preparingSpin=false,
    replaceTarget=null,
    storagePending=false;

if(sharedVisit){

  try{

    shared=decodeShare(location.hash);

    const items=shared.entries.map(
      (entry,i)=>({
        id:`shared-${i}`,
        ...(typeof entry==='string'
          ? {text:entry}
          : entry)
      })
    );

    state={
      ...state,
      items,
      draft:items.map(x=>({...x})),
      sound:shared.music.sound,
      volume:shared.music.volume,
      track:shared.music.track,
      musicEnabled:shared.music.enabled,
      customAudio:shared.music.custom||null
    };

    let saved=null;

    try{
      saved=JSON.parse(
        sessionStorage.getItem(
          'lucky-share-'+shared.id
        )||'null'
      );
    }catch{
      storageProblem=true;
    }

    if(
      saved?.signature===sessionSignature ||
      saved?.signature===location.hash
    ){

      const valid=new Map(
        items.map(x=>[x.id,x])
      );

      state.history=Array.isArray(saved.history)
        ? saved.history
          .map(
            x=>typeof x==='string'
              ? valid.get(x)
              : valid.has(x.id)
                ? {...valid.get(x.id),at:x.at}
                : null
          )
          .filter(Boolean)
        : [];

      state.last=state.history.find(
        x=>x.id===(saved.lastId||saved.last?.id)
      )||null;

      state.rotation=Number.isFinite(saved.rotation)
        ? normalize(saved.rotation)
        : 0;
    }

  }catch{

    shareInvalid=true;
    state.items=[];
    state.draft=[];

  }

}else{

  try{

    const data=await teacherStore.load();

    if(
      data &&
      Array.isArray(data.items) &&
      Array.isArray(data.draft) &&
      Array.isArray(data.history)
    ){

      const valid=x=>
        x &&
        typeof x.id==='string' &&
        typeof x.text==='string' &&
        (!x.image||isImageData(x.image.src));

      const dedupe=arr=>[
        ...new Map(
          arr
            .filter(valid)
            .map(x=>[x.id,{...x}])
        ).values()
      ];

      const history=dedupe(data.history);

      state={
        ...state,
        ...data,
        items:dedupe(data.items).filter(
          x=>x.text.trim()||x.image
        ),
        draft:dedupe(data.draft),
        history,
        last:
          valid(data.last) &&
          history.some(h=>h.id===data.last.id)
            ? data.last
            : null,
        rotation:Number.isFinite(data.rotation)
          ? normalize(data.rotation)
          : 0,
        volume:Number.isFinite(data.volume)
          ? Math.max(
              0,
              Math.min(100,data.volume)
            )
          : 45,
        sound:data.sound!==false,
        musicEnabled:data.musicEnabled===true,
        track:[
          'playful',
          'dreamy',
          'bouncy',
          'custom'
        ].includes(data.track)
          ? data.track
          : 'playful'
      };
    }

  }catch{
    storageProblem=true;
  }

}

let mode=
  sharedVisit ||
  window.history.state?.luckyMode==='play'
    ? 'play'
    : 'teacher';

let spinning=false,
    wheelItems=[],
    entryPage=0,
    historyPage=0,
    pageSize=5,
    historySize=5,
    currentTab=matchMedia('(max-width:739px)').matches
      ? 'preview'
      : 'content';

let animationFrame=null,
    toastTimer,
    confirmCallback=null,
    spinPromise=null,
    finishSpin=null,
    resizeFrame=null;

const audio=new ClassroomAudio(
  message=>{
    if(mode==='teacher')toast(message);
  }
);

audio.enabled=state.sound;
audio.setVolume(state.volume/100);
audio.track=state.track;
audio.musicOn=state.musicEnabled;

const wheelImages=new WheelImages(
  ()=>{
    if(!spinning)drawWheel();
  }
);

function available(){
  return remainingItems(
    state.items,
    state.history
  );
}

function isDirty(){

  const draft=state.draft.filter(
    x=>x.text.trim()||x.image
  );

  return (
    draft.length!==state.items.length ||
    draft.some(
      (x,i)=>
        x.id!==state.items[i].id ||
        x.text.trim()!==state.items[i].text ||
        x.image?.src!==state.items[i].image?.src
    )
  );
}

function save(){

  if(shared){

    try{

      sessionStorage.setItem(
        'lucky-share-'+shared.id,
        JSON.stringify({
          signature:sessionSignature,
          history:state.history.map(
            x=>({
              id:x.id,
              at:x.at
            })
          ),
          lastId:state.last?.id||null,
          rotation:state.rotation
        })
      );

    }catch{
      storageProblem=true;
      storageNotice();
    }

    return Promise.resolve();
  }

  if(sharedVisit){
    return Promise.resolve();
  }

  storagePending=true;

  return teacherStore.save(state).then(
    ()=>{

      storagePending=
        teacherStore.pending>0;

      storageProblem=false;

      $('storage-notice').hidden=true;

    },
    ()=>{

      storagePending=
        teacherStore.pending>0;

      storageProblem=true;

      storageNotice();

    }
  );
}

function storageNotice(){

  if(
    storageProblem &&
    !sharedVisit
  ){

    $('storage-notice').textContent=
      'Trình duyệt chưa lưu được dữ liệu. Hãy giữ trang mở và sao chép link để lưu lại bộ nội dung.';

    $('storage-notice').hidden=false;
  }
}

function toast(message,undo){

  if(mode!=='teacher')return;

  clearTimeout(toastTimer);

  const el=$('toast');

  el.replaceChildren(
    document.createTextNode(message)
  );

  if(undo){

    const b=document.createElement('button');

    b.className='toast-undo';

    b.textContent='Hoàn tác';

    b.onclick=()=>{

      if(!spinning)undo();

      el.hidden=true;

    };

    el.appendChild(b);
  }

  el.hidden=false;

  toastTimer=setTimeout(
    ()=>el.hidden=true,
    undo?7000:4000
  );
}

function showConfirm(
  title,
  copy,
  label,
  callback,
  allowShared=false
){

  if(
    spinning ||
    preparingSpin ||
    (sharedVisit&&!allowShared) ||
    importingImages
  )return;

  $('confirm-title').textContent=title;

  $('confirm-copy').textContent=copy;

  $('confirm-action').textContent=label;

  confirmCallback=callback;

  $('confirm-dialog').returnValue='cancel';

  $('confirm-dialog').showModal();
}

$('confirm-dialog').addEventListener(
  'close',
  ()=>{

    const fn=confirmCallback;

    confirmCallback=null;

    if(
      $('confirm-dialog').returnValue==='confirm'
    ){
      fn?.();
    }
  }
);

function drawWheel(){

  const canvas=$('wheel'),
        ctx=canvas.getContext('2d');

  if(!ctx)return;

  const size=canvas.width,
        c=size/2,
        r=c-2,
        n=wheelItems.length;

  ctx.clearRect(
    0,
    0,
    size,
    size
  );

  if(n===0){

    ctx.fillStyle='#f3ecdd';

    ctx.beginPath();

    ctx.arc(
      c,
      c,
      r,
      0,
      Math.PI*2
    );

    ctx.fill();

    ctx.strokeStyle='#e1d5bb';

    ctx.lineWidth=2;

    for(let i=0;i<8;i++){

      const angle=i*Math.PI/4;

      ctx.beginPath();

      ctx.moveTo(c,c);

      ctx.lineTo(
        c+Math.cos(angle)*r,
        c+Math.sin(angle)*r
      );

      ctx.stroke();
    }

    canvas.style.transform='rotate(0deg)';

    canvas.setAttribute(
      'aria-label',
      'Chưa có nội dung trên vòng quay'
    );

    return;
  }

  const step=Math.PI*2/n;

  for(let i=0;i<n;i++){

    const start=
      -Math.PI/2+i*step;

    const end=start+step;

    ctx.fillStyle=
      palette[i%palette.length];

    ctx.beginPath();

    ctx.moveTo(c,c);

    ctx.arc(
      c,
      c,
      r,
      start,
      end
    );

    ctx.closePath();

    ctx.fill();

    if(n<100){

      ctx.strokeStyle='#fff9eadd';

      ctx.lineWidth=3;

      ctx.stroke();
    }

    if(wheelItems[i].image){

      drawImageSector(
        ctx,
        wheelItems[i],
        start,
        end,
        c,
        r,
        n
      );

      continue;
    }

    const stride=
      n>60
        ? Math.ceil(n/60)
        : 1;

    if(i%stride!==0)continue;

    const angle=
      start+step/2;

    ctx.save();

    ctx.translate(c,c);

    ctx.rotate(angle);

    const numbered=n>22;

    let text=numbered
      ? String(
          state.items.findIndex(
            x=>x.id===wheelItems[i].id
          )+1
        )
      : wheelItems[i].text;

    let fontSize=
      n<=8
        ? 49
        : n<=12
          ? 36
          : n<=18
            ? 30
            : n<=22
              ? 26
              : 25;

    ctx.font=
      `700 ${fontSize}px Quicksand, sans-serif`;

    ctx.fillStyle='#5f4a37';

    ctx.textAlign='center';

    ctx.textBaseline='middle';

    const maxWidth=
      n===1
        ? r*1.14
        : r*.66;

    let lines=[text];

    if(
      n>1 &&
      n<=10 &&
      ctx.measureText(text).width>maxWidth
    ){

      const words=
        text.split(/\s+/);

      let first='';

      while(
        words.length>1 &&
        ctx.measureText(
          first+' '+words[0]
        ).width<=maxWidth
      ){

        first+=
          (first?' ':'')+
          words.shift();
      }

      lines=first
        ? [
            first,
            words.join(' ')
          ]
        : [text];
    }

    lines=lines.map(
      line=>{

        while(
          ctx.measureText(line).width>maxWidth &&
          line.length>1
        ){

          line=
            line.slice(0,-2)+'…';
        }

        return line;
      }
    );

    const distance=
      n===1
        ? 0
        : r*.63;

    ctx.translate(
      distance,
      0
    );

    if(n===1){

      ctx.rotate(
        -angle-
        state.rotation*
        Math.PI/180
      );

    }else if(
      Math.cos(angle)<0
    ){

      ctx.rotate(Math.PI);

    }

    if(n===1){

      ctx.translate(
        0,
        -r*.56
      );

      ctx.font=
        '700 43px Quicksand, sans-serif';
    }

    lines.forEach(
      (line,j)=>
        ctx.fillText(
          line,
          0,
          (
            j-
            (lines.length-1)/2
          )*
          fontSize*
          1.12,
          maxWidth
        )
    );

    ctx.restore();
  }

  canvas.style.transform=
    `rotate(${state.rotation}deg)`;

  canvas.setAttribute(
    'aria-label',
    'Vòng quay may mắn'
  );
}

function drawImageSector(
  ctx,
  item,
  start,
  end,
  c,
  r,
  count
){

  const image=
    wheelImages.get(item.image);

  if(!image)return;

  const angle=
    (start+end)/2;

  const distance=
    count===1
      ? 0
      : r*.63;

  ctx.save();

  ctx.beginPath();

  ctx.moveTo(c,c);

  ctx.arc(
    c,
    c,
    r-3,
    start,
    end
  );

  ctx.closePath();

  ctx.clip();

  ctx.translate(c,c);

  if(count===1){

    ctx.rotate(
      -state.rotation*
      Math.PI/180
    );

    ctx.translate(
      0,
      -r*.46
    );

  }else{

    ctx.rotate(angle);

    ctx.translate(
      distance,
      0
    );

    if(Math.cos(angle)<0){

      ctx.rotate(Math.PI);

    }
  }

  const w=
    count===1
      ? r*.93
      : r*.57;

  const h=
    count===1
      ? r*.7
      : Math.min(
          r*.74,
          Math.max(
            2,
            2*
            distance*
            Math.sin(
              Math.min(
                Math.PI/2,
                Math.PI/count
              )
            )*
            .78
          )
        );

  const radius=
    Math.min(
      18,
      h*.18
    );

  const caption=
    item.text &&
    h>70
      ? Math.min(
          40,
          h*.24
        )
      : 0;

  ctx.beginPath();

  if(ctx.roundRect){

    ctx.roundRect(
      -w/2,
      -h/2,
      w,
      h,
      radius
    );

  }else{

    ctx.rect(
      -w/2,
      -h/2,
      w,
      h
    );

  }

  ctx.fillStyle='#fffdf5';

  ctx.fill();

  ctx.clip();

  const pad=
    Math.min(
      12,
      h*.07
    );

  const imageH=
    h-caption-pad*2;

  const sourceW=
    image.naturalWidth||
    image.width;

  const sourceH=
    image.naturalHeight||
    image.height;

  const scale=
    Math.min(
      (w-pad*2)/sourceW,
      imageH/sourceH
    );

  const iw=
    sourceW*scale;

  const ih=
    sourceH*scale;

  ctx.drawImage(
    image,
    -iw/2,
    -h/2+
      pad+
      (imageH-ih)/2,
    iw,
    ih
  );

  if(caption){

    ctx.font=
      `700 ${Math.min(28,caption*.72)}px Quicksand, sans-serif`;

    ctx.fillStyle='#60462f';

    ctx.textAlign='center';

    ctx.textBaseline='middle';

    let text=item.text;

    while(
      ctx.measureText(text).width>w-pad*2 &&
      text.length>1
    ){

      text=
        text.slice(0,-2)+'…';
    }

    ctx.fillText(
      text,
      0,
      h/2-caption/2,
      w-pad*2
    );
  }

  ctx.restore();
}

function resetWheel(){

  const ids=new Set(
    available().map(
      x=>x.id
    )
  );

  wheelImages.prune(
    state.items
  );

  wheelImages
    .prepare(state.items)
    .catch(()=>{});

  wheelItems=
    state.items.filter(
      x=>
        ids.has(x.id) ||
        x.id===state.last?.id
    );

  if(!state.last){

    state.rotation=
      wheelItems.length
        ? -180/wheelItems.length
        : 0;
  }

  drawWheel();
}

function setMode(
  next,
  push=false
){

  if(
    sharedVisit &&
    next!=='play'
  )return;

  mode=next;

  document.documentElement
    .dataset.mode=mode;

  if(push){

    window.history.pushState(
      {luckyMode:'play'},
      '',
      location.href
    );
  }

  renderUI();

  layout();
}

async function enterPlay(){

  if(
    sharedVisit ||
    spinning ||
    importingImages
  )return;

  if(
    isDirty() &&
    !applyDraft(false)
  )return;

  if(!state.items.length){

    toast(
      'Hãy nhập nội dung trước khi chơi.'
    );

    setTab('content');

    return;
  }

  setMode(
    'play',
    true
  );

  await audio.unlock();

  audio.syncMusic();
}

function setTab(name){

  if(sharedVisit)return;

  currentTab=name;

  $('workspace')
    .dataset.editorTab=name;

  for(
    const tab of [
      'preview',
      'content',
      'audio',
      'history'
    ]
  ){

    const active=
      tab===name;

    $(tab+'-tab')
      .classList.toggle(
        'active',
        active
      );

    $(tab+'-tab')
      .setAttribute(
        'aria-selected',
        String(active)
      );

    $(tab+'-tab')
      .tabIndex=
        active?0:-1;

    if(tab!=='preview'){

      $(tab+'-panel')
        .hidden=
          !active;
    }
  }

  layout();
}

function actionButton(
  kind,
  title,
  index,
  fn
){

  const b=
    document.createElement(
      'button'
    );

  b.type='button';

  b.className=
    'icon-button'+
    (
      kind==='trash'
        ? ' delete'
        : ''
    );

  b.innerHTML=
    icon(kind);

  b.setAttribute(
    'aria-label',
    title+
    ' nội dung '+
    (index+1)
  );

  b.title=title;

  b.onclick=fn;

  return b;
}

function renderEntries(focusId){

  const pages=
    Math.max(
      1,
      Math.ceil(
        state.draft.length/
        pageSize
      )
    );

  entryPage=
    Math.max(
      0,
      Math.min(
        entryPage,
        pages-1
      )
    );

  const list=
    $('entry-list');

  list.replaceChildren();

  if(!state.draft.length){

    const p=
      document.createElement(
        'div'
      );

    p.className='empty-list';

    p.textContent=
      'Thêm nội dung để tạo vòng quay.';

    list.append(p);
  }

  const fragment=
    document.createDocumentFragment();

  state.draft
    .slice(
      entryPage*pageSize,
      (entryPage+1)*pageSize
    )
    .forEach(
      (entry,local)=>{

        const index=
          entryPage*pageSize+
          local;

        const row=
          document.createElement(
            'div'
          );

        row.className=
          'entry-row';

        row.dataset.id=
          entry.id;

        row.style.setProperty(
          '--row-color',
          palette[
            index%
            palette.length
          ]+'99'
        );

        if(
          state.history.some(
            h=>
              h.id===entry.id ||
              entryKey(h)===
              entryKey(entry)
          )
        ){

          row.classList.add(
            'used'
          );
        }

        const num=
          document.createElement(
            'span'
          );

        num.className=
          'entry-number';

        num.textContent=
          index+1;

        const input=
          document.createElement(
            'input'
          );

        input.type='text';

        input.value=
          entry.text;

        input.title=
          entry.text;

        input.placeholder=
          entry.image
            ? 'Tiêu đề ảnh (không bắt buộc)'
            : 'Nhập nội dung...';

        input.setAttribute(
          'aria-label',
          'Nội dung '+
          (index+1)
        );

        input.oninput=()=>{

          entry.text=
            input.value;

          input.title=
            input.value;

          save();

          renderEditStatus();
        };

        const actions=
          document.createElement(
            'div'
          );

        actions.className=
          'row-actions';

        const up=
          actionButton(
            'up',
            'Đưa lên',
            index,
            ()=>moveEntry(index,-1)
          );

        up.disabled=
          index===0;

        const down=
          actionButton(
            'down',
            'Đưa xuống',
            index,
            ()=>moveEntry(index,1)
          );

        down.disabled=
          index===state.draft.length-1;

        const del=
          actionButton(
            'trash',
            'Xóa',
            index,
            ()=>{

              const [removed]=
                state.draft.splice(
                  index,
                  1
                );

              save();

              renderEntries();

              toast(
                'Đã xóa khỏi bản đang nhập.',
                ()=>{

                  state.draft.splice(
                    Math.min(
                      index,
                      state.draft.length
                    ),
                    0,
                    removed
                  );

                  save();

                  renderEntries();
                }
              );
            }
          );

        if(importingImages){

          up.disabled=true;

          down.disabled=true;

          del.disabled=true;
        }

        actions.append(
          up,
          down,
          del
        );

        const media=
          document.createElement(
            'div'
          );

        media.className=
          'entry-media';

        const change=
          actionButton(
            'image',
            entry.image
              ? 'Thay ảnh'
              : 'Thêm ảnh vào',
            index,
            ()=>chooseReplacement(entry.id)
          );

        change.className=
          'entry-thumbnail';

        if(entry.image){

          const img=
            document.createElement(
              'img'
            );

          img.src=
            entry.image.src;

          img.alt=
            entry.text||
            'Ảnh đã thêm';

          img.width=48;

          img.height=48;

          change.replaceChildren(img);

          const remove=
            actionButton(
              'close',
              'Xóa ảnh của',
              index,
              ()=>{

                const removed=
                  entry.image;

                delete entry.image;

                save();

                renderEntries();

                toast(
                  'Đã xóa ảnh.',
                  ()=>{

                    entry.image=
                      removed;

                    save();

                    renderEntries();
                  }
                );
              }
            );

          remove.className=
            'remove-image';

          media.append(
            change,
            remove
          );

        }else{

          media.append(change);

        }

        row.append(
          num,
          media,
          input,
          actions
        );

        fragment.append(row);
      }
    );

  list.append(fragment);

  $('entry-page').textContent=
    `Trang ${entryPage+1} / ${pages}`;

  $('entry-prev').disabled=
    entryPage===0;

  $('entry-next').disabled=
    entryPage>=pages-1;

  renderEditStatus();

  if(focusId){

    Array.from(
      list.querySelectorAll(
        '.entry-row'
      )
    )
      .find(
        x=>x.dataset.id===focusId
      )
      ?.querySelector('input')
      ?.focus({
        preventScroll:true
      });
  }
}

function moveEntry(
  index,
  direction
){

  if(
    mode!=='teacher' ||
    spinning ||
    importingImages
  )return;

  const target=
    index+direction;

  if(
    target<0 ||
    target>=state.draft.length
  )return;

  const moving=
    state.draft[index];

  [
    state.draft[index],
    state.draft[target]
  ]=[
    state.draft[target],
    state.draft[index]
  ];

  entryPage=
    Math.floor(
      target/pageSize
    );

  save();

  renderEntries(
    moving.id
  );
}

function renderEditStatus(){

  const dirty=
    isDirty();

  $('edit-status')
    .classList.toggle(
      'dirty',
      dirty
    );

  $('edit-status').textContent=
    dirty
      ? 'Đã lưu bản nhập · bấm Cập nhật để áp dụng'
      : 'Danh sách đã sẵn sàng';

  $('apply-entries').disabled=
    spinning ||
    importingImages ||
    !dirty;

  $('clear-all').disabled=
    importingImages ||
    (
      !state.draft.length &&
      !state.items.length &&
      !state.history.length
    );
}

function renderHistory(){

  const all=[
    ...state.history
  ].reverse();

  const pages=
    Math.max(
      1,
      Math.ceil(
        all.length/
        historySize
      )
    );

  historyPage=
    Math.max(
      0,
      Math.min(
        historyPage,
        pages-1
      )
    );

  const list=
    $('history-list');

  list.replaceChildren();

  if(!all.length){

    const p=
      document.createElement(
        'li'
      );

    p.className=
      'empty-list';

    p.textContent=
      'Chưa có nội dung được chọn.';

    list.append(p);
  }

  for(
    const entry of all.slice(
      historyPage*historySize,
      (historyPage+1)*historySize
    )
  ){

    const li=
      document.createElement(
        'li'
      );

    li.className=
      'history-item';

    const info=
      document.createElement(
        'div'
      );

    const title=
      document.createElement(
        'strong'
      );

    const time=
      document.createElement(
        'small'
      );

    title.textContent=
      entry.text||
      'Ảnh';

    title.title=
      entry.text;

    if(entry.image){

      const thumbnail=
        document.createElement(
          'img'
        );

      thumbnail.src=
        entry.image.src;

      thumbnail.alt=
        entry.text||
        'Ảnh đã chọn';

      thumbnail.className=
        'history-thumbnail';

      li.append(thumbnail);
    }

    time.textContent=
      new Date(
        entry.at||
        Date.now()
      )
      .toLocaleTimeString(
        'vi-VN',
        {
          hour:'2-digit',
          minute:'2-digit'
        }
      );

    info.append(
      title,
      time
    );

    li.append(info);

    list.append(li);
  }

  $('history-page').textContent=
    `Trang ${historyPage+1} / ${pages}`;

  $('history-prev').disabled=
    historyPage===0;

  $('history-next').disabled=
    historyPage>=pages-1;

  $('restart').disabled=
    !state.history.length;
}

function renderUI(editor=false){

  document.documentElement.dataset.mode=
    mode;

  const reveal=
    mode==='play' &&
    !!state.last &&
    !spinning &&
    !preparingSpin &&
    !shareInvalid;

  const imageResult=
    reveal &&
    !!state.last.image;

  document.documentElement.dataset.hasResult=
    String(reveal);

  document.documentElement.dataset.resultKind=
    imageResult
      ? 'image'
      : 'text';

  $('result-box').hidden=
    !reveal;

  const resultImage=
    $('result-image');

  resultImage.hidden=
    !imageResult;

  if(imageResult){

    if(
      resultImage.getAttribute('src')!==
      state.last.image.src
    ){
      resultImage.src=
        state.last.image.src;
    }

    resultImage.alt=
      state.last.text||
      'Ảnh được chọn';

  }else{

    resultImage.removeAttribute(
      'src'
    );

  }

  $('result-text').textContent=
    reveal
      ? state.last.text
      : '';

  $('result-text').hidden=
    imageResult &&
    !state.last.text;

  const complete=
    state.items.length>0 &&
    available().length===0;

  $('spin-main').textContent=
    complete
      ? 'CHƠI LẠI'
      : 'QUAY TIẾP';

  $('spin-main').disabled=
    spinning ||
    preparingSpin ||
    !state.items.length;

  $('spin-start').disabled=
    spinning ||
    preparingSpin ||
    importingImages ||
    !available().length ||
    shareInvalid;

  $('spin-start').textContent=
    'QUAY';

  $('spin-start').setAttribute(
    'aria-busy',
    String(
      spinning||
      preparingSpin
    )
  );

  $('wheel-scene')
    .classList.toggle(
      'is-spinning',
      spinning
    );

  $('empty-preview').hidden=
    !!state.items.length;

  $('share-error').hidden=
    !shareInvalid;

  $('entry-list').inert=
    importingImages;

  $('play-mode').disabled=
    importingImages;

  $('share-link').disabled=
    importingImages;

  $('add-images').disabled=
    importingImages;

  $('add-entry').disabled=
    importingImages;

  $('bulk-open').disabled=
    importingImages;

  $('sound-toggle').innerHTML=
    icon(
      state.sound
        ? 'volume'
        : 'mute'
    )+
    '<span>Âm thanh</span>';

  $('sound-toggle').setAttribute(
    'aria-pressed',
    String(state.sound)
  );

  $('sound-toggle').setAttribute(
    'aria-label',
    state.sound
      ? 'Tắt âm thanh'
      : 'Bật âm thanh'
  );

  $('music-toggle').setAttribute(
    'aria-checked',
    String(
      state.musicEnabled
    )
  );

  $('music-toggle').setAttribute(
    'aria-label',
    state.musicEnabled
      ? 'Tắt nhạc nền'
      : 'Bật nhạc nền'
  );

  $('music-track').value=
    state.track;

  $('volume').value=
    state.volume;

  $('volume-value').value=
    state.volume+'%';

  $('audio-note').textContent=
    state.track==='custom' &&
    state.customAudio?.kind==='file'
      ? 'Tệp lớn cần link nhạc công khai để chia sẻ.'
      : state.musicEnabled
        ? 'Nhạc bắt đầu sau khi bấm CHƠI hoặc QUAY.'
        : 'Nhạc nền đang tắt.';

  if(mode==='teacher'){

    if(editor){
      renderEntries();
    }else{
      renderEditStatus();
    }

    renderHistory();
  }

  if(reveal){
    requestAnimationFrame(
      fitResult
    );
  }
}

function applyDraft(
  announce=true
){

  if(
    sharedVisit ||
    spinning ||
    importingImages
  )return false;

  const seen=
    new Set();

  const cleaned=
    state.draft
      .filter(
        x=>{

          if(
            !x.text.trim() &&
            !x.image
          )return false;

          const key=
            entryKey(x);

          if(
            seen.has(key)
          )return false;

          seen.add(key);

          return true;
        }
      )
      .map(
        x=>({
          ...x,
          text:x.text.trim()
        })
      );

  const commit=()=>{

    const old=
      new Map(
        state.items.map(
          x=>[
            x.id,
            entryKey(x)
          ]
        )
      );

    state.items=
      cleaned.map(
        x=>({
          ...x,
          id:
            old.has(x.id) &&
            old.get(x.id)!==
            entryKey(x) &&
            state.history.some(
              h=>h.id===x.id
            )
              ? uid()
              : x.id
        })
      );

    state.draft=
      state.items.map(
        x=>({...x})
      );

    state.last=null;

    resetWheel();

    save();

    renderUI(true);

    if(announce){
      toast(
        'Đã cập nhật vòng quay.'
      );
    }
  };

  if(!cleaned.length){

    if(
      state.items.length &&
      announce
    ){

      showConfirm(
        'Xóa nội dung vòng quay?',
        'Danh sách đang nhập đang trống. Lịch sử đã quay vẫn được giữ.',
        'Xóa nội dung',
        commit
      );

    }else if(announce){

      commit();

    }else{

      toast(
        'Hãy nhập nội dung trước khi chơi hoặc chia sẻ.'
      );

      setTab('content');
    }

    return false;
  }

  commit();

  return true;
}

function requestRestart(){

  if(!state.items.length)return;

  showConfirm(
    'Chơi lại từ đầu?',
    'Giữ nguyên chữ, ảnh, thứ tự và nhạc đã chọn.',
    'CHƠI LẠI',
    ()=>{

      state.history=[];

      state.last=null;

      historyPage=0;

      resetWheel();

      save();

      renderUI(true);

      layout();
    },
    true
  );
}

async function spin(){

  if(spinning){
    return spinPromise;
  }

  if(
    preparingSpin ||
    importingImages
  )return null;

  if(
    shareInvalid ||
    !available().length ||
    $('confirm-dialog').open ||
    $('bulk-dialog').open ||
    $('share-dialog').open
  )return null;

  if(mode==='teacher'){

    if(
      isDirty() &&
      !applyDraft(false)
    )return null;

    setMode(
      'play',
      true
    );
  }

  const list=
    available();

  if(!list.length){
    return null;
  }

  preparingSpin=true;

  renderUI();

  let chosen;

  try{

    await wheelImages.prepare(
      list
    );

    chosen=
      randomIndex(
        list.length
      );

    if(list[chosen].image){

      await loadImage(
        list[chosen].image.src
      );
    }

  }catch{

    if(mode==='teacher'){

      toast(
        'Một ảnh chưa đọc được. Hãy thay ảnh đó rồi thử lại.'
      );

    }else{

      $('share-error').textContent=
        'Không đọc được ảnh. Hãy tải lại trang hoặc xin lại link.';

      $('share-error').hidden=false;
    }

    preparingSpin=false;

    return null;
  }

  preparingSpin=false;

  wheelItems=list;

  state.last=null;

  state.rotation=
    normalize(
      state.rotation
    );

  drawWheel();

  const start=
    state.rotation;

  const target=
    targetRotation(
      start,
      chosen,
      list.length
    );

  spinning=true;

  save();

  renderUI();

  await audio.unlock();

  audio.syncMusic();

  audio.click();

  spinPromise=
    new Promise(
      resolve=>{
        finishSpin=resolve;
      }
    );

  const finish=()=>{

    cancelAnimationFrame(
      animationFrame
    );

    animationFrame=null;

    state.rotation=
      normalize(target);

    const actual=
      indexAtPointer(
        state.rotation,
        list.length
      );

    const entry={
      ...list[actual],
      at:Date.now()
    };

    if(
      !state.history.some(
        h=>h.id===entry.id
      )
    ){
      state.history.push(entry);
    }

    state.last=entry;

    spinning=false;

    drawWheel();

    save();

    renderUI();

    audio.stop();

    const done=
      finishSpin;

    finishSpin=null;

    done?.({
      result:{
        text:entry.text,
        id:entry.id,
        ...(entry.image
          ? {image:entry.image}
          : {})
      },
      remaining:
        available().length,
      complete:
        available().length===0
    });
  };

  if(list.length===1){

    finish();

    return spinPromise;
  }

  audio.spin();

  const reduced=
    matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

  const duration=
    reduced
      ? 1600
      : 5600;

  const started=
    performance.now();

  let previousSector=
    Math.floor(
      start/
      (360/list.length)
    );

  let lastTick=-100;

  const frame=now=>{

    const progress=
      Math.min(
        1,
        (now-started)/
        duration
      );

    const eased=
      wheelEase(progress);

    const angle=
      start+
      (target-start)*
      eased;

    state.rotation=
      angle;

    if(!reduced){

      $('wheel').style.transform=
        `rotate(${angle}deg)`;
    }

    const sector=
      Math.floor(
        angle/
        (360/list.length)
      );

    if(
      sector!==previousSector &&
      now-lastTick>52
    ){

      audio.tick();

      $('pointer')
        .classList.remove(
          'tick'
        );

      void $('pointer').offsetWidth;

      $('pointer')
        .classList.add(
          'tick'
        );

      previousSector=
        sector;

      lastTick=
        now;
    }

    if(progress<1){

      animationFrame=
        requestAnimationFrame(
          frame
        );

    }else{

      finish();

    }
  };

  animationFrame=
    requestAnimationFrame(
      frame
    );

  return spinPromise;
}

function fitResult(){

  if(
    $('result-box').hidden
  )return;

  const el=
    $('result-text');

  const box=
    $('result-content');

  const imageResult=
    !!state.last?.image;

  let high=
    imageResult
      ? Math.min(
          innerWidth*.075,
          innerHeight*.1,
          80
        )
      : Math.min(
          innerWidth*.14,
          innerHeight*.24,
          220
        );

  let low=6;

  const boxStyle=
    getComputedStyle(box);

  const maxH=
    (
      imageResult
        ? Math.max(
            28,
            box.clientHeight*.23
          )
        : box.clientHeight
    )-
    parseFloat(
      boxStyle.paddingTop
    )-
    parseFloat(
      boxStyle.paddingBottom
    );

  const maxW=
    box.clientWidth-
    parseFloat(
      boxStyle.paddingLeft
    )-
    parseFloat(
      boxStyle.paddingRight
    );

  for(let i=0;i<12;i++){

    const size=
      (low+high)/2;

    el.style.fontSize=
      size+'px';

    if(
      el.scrollHeight<=maxH &&
      el.scrollWidth<=maxW
    ){
      low=size;
    }else{
      high=size;
    }
  }

  el.style.fontSize=
    low+'px';

  if(imageResult){

    const img=
      $('result-image');

    const gap=
      state.last.text
        ? 16
        : 0;

    const caption=
      state.last.text
        ? el.getBoundingClientRect().height
        : 0;

    const h=
      Math.max(
        1,
        box.clientHeight-
        caption-
        gap
      );

    const w=
      Math.max(
        1,
        box.clientWidth
      );

    const scale=
      Math.min(
        w/state.last.image.width,
        h/state.last.image.height
      );

    img.style.width=
      (
        state.last.image.width*
        scale
      )+'px';

    img.style.height=
      (
        state.last.image.height*
        scale
      )+'px';
  }
}

function layout(){

  const height=
    window.visualViewport?.height||
    innerHeight;

  document.documentElement
    .style.setProperty(
      '--app-h',
      Math.floor(height)+'px'
    );

  const scene=
    $('wheel-scene')
      .getBoundingClientRect();

  if(
    scene.width &&
    scene.height
  ){

    const geometry=
      stageLayout(
        scene.width,
        scene.height
      );

    document.documentElement
      .style.setProperty(
        '--wheel-size',
        geometry.diameter+'px'
      );

    document.documentElement
      .style.setProperty(
        '--wheel-cy',
        geometry.cy+'px'
      );
  }

  const row=
    innerHeight<=560
      ? 52
      : 64;

  const listHeight=
    $('entry-list')
      .getBoundingClientRect()
      .height;

  if(listHeight>0){

    const next=
      Math.max(
        1,
        Math.floor(
          listHeight/row
        )
      );

    if(next!==pageSize){

      const first=
        entryPage*pageSize;

      pageSize=next;

      entryPage=
        Math.floor(
          first/pageSize
        );

      renderEntries();
    }
  }

  const historyHeight=
    $('history-list')
      .getBoundingClientRect()
      .height;

  if(historyHeight>0){

    const next=
      Math.max(
        1,
        Math.floor(
          historyHeight/
          (
            innerHeight<=560
              ? 48
              : 62
          )
        )
      );

    if(next!==historySize){

      historySize=next;

      renderHistory();
    }
  }

  fitResult();
}

function queueLayout(){

  if(resizeFrame){
    cancelAnimationFrame(
      resizeFrame
    );
  }

  resizeFrame=
    requestAnimationFrame(
      ()=>{

        resizeFrame=null;

        layout();
      }
    );
}

for(
  const t of [
    'preview',
    'content',
    'audio',
    'history'
  ]
){
  $(t+'-tab').onclick=
    ()=>setTab(t);
}

document.querySelector(
  '.tabs'
).onkeydown=e=>{

  if(
    ![
      'ArrowLeft',
      'ArrowRight',
      'Home',
      'End'
    ].includes(e.key)
  )return;

  e.preventDefault();

  const tabs=
    matchMedia(
      '(max-width:739px)'
    ).matches
      ? [
          'preview',
          'content',
          'audio',
          'history'
        ]
      : [
          'content',
          'audio',
          'history'
        ];

  let index=
    tabs.indexOf(
      currentTab
    );

  index=
    e.key==='Home'
      ? 0
      : e.key==='End'
        ? tabs.length-1
        : (
            index+
            (
              e.key==='ArrowRight'
                ? 1
                : -1
            )+
            tabs.length
          )%
          tabs.length;

  setTab(
    tabs[index]
  );

  $(tabs[index]+'-tab')
    .focus({
      preventScroll:true
    });
};

$('entry-prev').onclick=()=>{
  entryPage--;
  renderEntries();
};

$('entry-next').onclick=()=>{
  entryPage++;
  renderEntries();
};

$('history-prev').onclick=()=>{
  historyPage--;
  renderHistory();
};

$('history-next').onclick=()=>{
  historyPage++;
  renderHistory();
};

$('add-entry').onclick=()=>{

  if(
    sharedVisit ||
    spinning
  )return;

  const entry={
    id:uid(),
    text:''
  };

  state.draft.push(entry);

  entryPage=
    Math.floor(
      (
        state.draft.length-1
      )/
      pageSize
    );

  save();

  renderEntries(
    entry.id
  );
};

function chooseReplacement(id){

  if(
    sharedVisit ||
    mode!=='teacher' ||
    spinning ||
    importingImages
  )return;

  replaceTarget=id;

  $('replace-image-file').value='';

  $('replace-image-file').click();
}

async function importImages(
  files,
  targetId=null
){

  if(
    sharedVisit ||
    mode!=='teacher' ||
    spinning ||
    importingImages ||
    !files.length
  )return;

  importingImages=true;

  renderUI();

  $('add-images').innerHTML=
    icon('image')+
    ' ĐANG NÉN…';

  $('add-images')
    .setAttribute(
      'aria-busy',
      'true'
    );

  let added=0,
      failed=[],
      lastId;

  try{

    for(
      const file of files
    ){

      try{

        const image=
          await imageFromFile(
            file
          );

        if(targetId){

          const entry=
            state.draft.find(
              x=>x.id===targetId
            );

          if(!entry)break;

          entry.image=image;

          lastId=
            entry.id;

        }else{

          const entry={
            id:uid(),
            text:'',
            image
          };

          state.draft.push(
            entry
          );

          lastId=
            entry.id;
        }

        added++;

        await save();

      }catch(error){

        failed.push(
          file.name+
          ': '+
          error.message
        );

      }
    }

    if(added){

      entryPage=
        Math.floor(
          Math.max(
            0,
            state.draft.findIndex(
              x=>x.id===lastId
            )
          )/
          pageSize
        );

      renderEntries(
        lastId
      );

      toast(
        failed.length
          ? 'Một số ảnh chưa đọc được. Hãy chọn lại ảnh JPG, PNG hoặc WebP.'
          : targetId
            ? 'Đã thay ảnh. Bấm Cập nhật để áp dụng.'
            : 'Đã thêm ảnh. Có thể nhập tiêu đề rồi bấm Cập nhật.'
      );

    }else if(
      failed.length
    ){

      toast(
        failed[0]
      );
    }

  }finally{

    importingImages=false;

    $('add-images').innerHTML=
      icon('image')+
      ' THÊM ẢNH';

    $('add-images')
      .removeAttribute(
        'aria-busy'
      );

    renderUI(true);

    queueLayout();
  }
}

$('add-images').onclick=()=>{

  if(
    sharedVisit ||
    importingImages
  )return;

  $('image-files').value='';

  $('image-files').click();
};

$('image-files').onchange=()=>{

  importImages(
    Array.from(
      $('image-files').files||
      []
    )
  );
};

$('replace-image-file').onchange=()=>{

  const id=
    replaceTarget;

  replaceTarget=null;

  return importImages(
    Array.from(
      $('replace-image-file').files||
      []
    ).slice(
      0,
      1
    ),
    id
  );
};

$('apply-entries').onclick=
  ()=>applyDraft(true);

$('spin-start').onclick=
  spin;

$('spin-main').onclick=()=>
  available().length
    ? spin()
    : requestRestart();

$('play-mode').onclick=
  enterPlay;

$('restart').onclick=
  requestRestart;

$('clear-all').onclick=()=>
  showConfirm(
    'Xóa tất cả nội dung?',
    'Danh sách đang nhập, vòng quay và lịch sử hiện tại sẽ được xóa.',
    'Xóa tất cả',
    ()=>{

      state.items=[];

      state.draft=[];

      state.history=[];

      state.last=null;

      entryPage=0;

      resetWheel();

      save();

      renderUI(true);
    }
  );

$('bulk-open').onclick=()=>{

  if(sharedVisit)return;

  $('bulk-dialog').showModal();

  $('bulk-input').focus({
    preventScroll:true
  });
};

$('bulk-close').onclick=
  ()=>$('bulk-dialog').close();

$('bulk-form').onsubmit=e=>{

  e.preventDefault();

  if(
    sharedVisit ||
    spinning
  )return;

  const lines=
    cleanLines(
      $('bulk-input').value
    );

  if(!lines.length){

    toast(
      'Hãy nhập ít nhất một nội dung.'
    );

    return;
  }

  state.draft=
    state.draft.concat(
      lines.map(
        text=>({
          id:uid(),
          text
        })
      )
    );

  save();

  renderEntries();

  $('bulk-dialog').close();

  $('bulk-input').value='';

  toast(
    'Đã thêm nội dung. Bấm Cập nhật để áp dụng.'
  );
};

$('sound-toggle').onclick=async()=>{

  state.sound=
    !state.sound;

  if(state.sound){
    await audio.unlock();
  }

  audio.setEnabled(
    state.sound
  );

  save();

  renderUI();
};

$('music-toggle').onclick=async()=>{

  state.musicEnabled=
    !state.musicEnabled;

  audio.musicOn=
    state.musicEnabled;

  if(state.musicEnabled){

    state.sound=true;

    audio.enabled=true;

    audio.setVolume(
      state.volume/100
    );

    await audio.unlock();
  }

  audio.syncMusic();

  save();

  renderUI();
};

$('music-track').onchange=()=>{

  state.track=
    $('music-track').value;

  audio.track=
    state.track;

  audio.syncMusic();

  save();

  renderUI();
};

$('volume').oninput=()=>{

  state.volume=
    Number(
      $('volume').value
    );

  $('volume-value').value=
    state.volume+'%';

  audio.setVolume(
    state.volume/100
  );

  save();
};

function customOption(name){

  const opt=
    $('music-track')
      .querySelector(
        '[value=custom]'
      );

  opt.disabled=false;

  opt.textContent=
    name||
    'Nhạc của thầy cô';

  $('music-track').value=
    'custom';
}

$('apply-music-url').onclick=async()=>{

  try{

    const url=
      new URL(
        $('music-url')
          .value
          .trim()
      );

    if(
      url.protocol!=='https:'
    ){
      throw new Error(
        'Hãy nhập link HTTPS của một tệp nhạc công khai.'
      );
    }

    state.customAudio={
      kind:'url',
      source:url.href,
      name:'Nhạc từ link'
    };

    customFile=null;

    audio.setCustomURL(
      url.href
    );

    state.track='custom';

    audio.track='custom';

    customOption(
      'Nhạc từ link'
    );

    await audio.unlock();

    audio.syncMusic();

    save();

    renderUI();

    toast(
      'Đã chọn nhạc từ link.'
    );

  }catch{

    toast(
      'Hãy nhập link HTTPS của một tệp nhạc công khai.'
    );
  }
};

$('upload-music').onclick=
  ()=>$('music-file').click();

$('music-file').onchange=async()=>{

  const file=
    $('music-file').files?.[0];

  if(!file)return;

  if(
    !file.type.startsWith(
      'audio/'
    ) &&
    !/\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(
      file.name
    )
  ){

    toast(
      'Vui lòng chọn tệp âm thanh.'
    );

    return;
  }

  customFile=file;

  audio.setCustom(
    file
  );

  state.track='custom';

  audio.track='custom';

  state.customAudio={
    kind:'file',
    name:file.name
  };

  customOption(
    file.name
  );

  await audio.unlock();

  audio.syncMusic();

  save();

  renderUI();

  try{

    await savedMusic(
      file
    );

    toast(
      'Đã lưu nhạc trên thiết bị.'
    );

  }catch{

    toast(
      'Đã chọn nhạc cho phiên hiện tại.'
    );
  }
};

const musicReady=
  (
    async()=>{

      if(
        state.track!=='custom'
      )return;

      if(
        state.customAudio?.kind==='url' ||
        state.customAudio?.kind==='inline'
      ){

        audio.setCustomURL(
          state.customAudio.source
        );

        customOption(
          state.customAudio.name
        );

        if(
          state.customAudio.kind==='url'
        ){

          $('music-url').value=
            state.customAudio.source;
        }

        return;
      }

      if(sharedVisit)return;

      try{

        const file=
          await savedMusic();

        if(file instanceof Blob){

          customFile=file;

          audio.setCustom(
            file
          );

          state.customAudio={
            kind:'file',
            name:
              file.name||
              'Nhạc của thầy cô'
          };

          customOption(
            state.customAudio.name
          );

        }else{

          state.track='playful';

          audio.track='playful';

          save();

        }

      }catch{

        state.track='playful';

        audio.track='playful';
      }

      renderUI();

    }
  )();

async function fileAsData(file){

  const bytes=
    new Uint8Array(
      await file.arrayBuffer()
    );

  let binary='';

  for(
    let i=0;
    i<bytes.length;
    i+=8192
  ){

    binary+=
      String.fromCharCode(
        ...bytes.subarray(
          i,
          i+8192
        )
      );
  }

  return `data:${
    file.type.startsWith('audio/')
      ? file.type
      : 'audio/mpeg'
  };base64,${btoa(binary)}`;
}

async function buildShareLink(){

  if(sharedVisit){
    throw new Error(
      'Link chia sẻ chỉ mở chế độ chơi.'
    );
  }

  if(
    isDirty() &&
    !applyDraft(false)
  ){
    throw new Error(
      'Hãy nhập nội dung trước khi chia sẻ.'
    );
  }

  if(!state.items.length){
    throw new Error(
      'Hãy nhập nội dung trước khi chia sẻ.'
    );
  }

  await musicReady;

  let custom=
    state.customAudio;

  if(
    state.track==='custom' &&
    custom?.kind==='file'
  ){

    if(!customFile){
      throw new Error(
        'Hãy chọn lại tệp nhạc để chia sẻ.'
      );
    }

    if(
      customFile.size>
      64*1024
    ){
      throw new Error(
        'Tệp nhạc lớn không thể nằm trong link. Hãy dùng link nhạc công khai hoặc chọn nhạc có sẵn.'
      );
    }

    custom={
      kind:'inline',
      source:
        await fileAsData(
          customFile
        ),
      name:
        customFile.name
    };
  }

  const payload={
    v:
      state.items.some(
        x=>x.image
      )
        ? 3
        : 2,
    id:uid(),
    entries:
      state.items.map(
        x=>x.image
          ? {
              text:x.text,
              image:x.image
            }
          : x.text
      ),
    music:{
      track:state.track,
      enabled:state.musicEnabled,
      sound:state.sound,
      volume:state.volume,
      ...(state.track==='custom'
        ? {custom}
        : {})
    }
  };

  try{

    return createShareURL(
      location.href,
      payload
    );

  }catch(error){

    if(
      !(
        error instanceof ShareSizeError
      ) ||
      payload.v!==3
    ){
      throw error;
    }
  }

  for(
    const maxSide of [
      1280,
      960,
      720
    ]
  ){

    const compressed=
      new Map();

    for(
      const item of state.items
    ){

      if(
        item.image &&
        !compressed.has(
          item.image.src
        )
      ){

        compressed.set(
          item.image.src,
          await compressImage(
            item.image.src,
            {
              maxSide,
              quality:
                maxSide===720
                  ? .64
                  : .75,
              targetBytes:
                Math.max(
                  14000,
                  Math.floor(
                    1000000/
                    state.items.filter(
                      x=>x.image
                    ).length
                  )
                )
            }
          )
        );
      }
    }

    payload.entries=
      state.items.map(
        x=>x.image
          ? {
              text:x.text,
              image:
                compressed.get(
                  x.image.src
                )
            }
          : x.text
      );

    try{

      return createShareURL(
        location.href,
        payload
      );

    }catch(error){

      if(
        !(
          error instanceof ShareSizeError
        )
      ){
        throw error;
      }
    }
  }

  throw new ShareSizeError();
}

async function copyText(text){

  if(
    navigator.clipboard?.writeText
  ){

    try{

      await navigator.clipboard
        .writeText(text);

      return true;

    }catch{}
  }

  const field=
    $('share-output');

  field.value=text;

  const wasOpen=
    $('share-dialog').open;

  if(!wasOpen){
    $('share-dialog').showModal();
  }

  field.focus({
    preventScroll:true
  });

  field.select();

  try{

    const done=
      document.execCommand(
        'copy'
      );

    if(
      done &&
      !wasOpen
    ){
      $('share-dialog').close();
    }

    return done;

  }catch{

    return false;
  }
}

$('share-link').onclick=async()=>{

  const button=
    $('share-link');

  button.disabled=true;

  button.setAttribute(
    'aria-busy',
    'true'
  );

  const label=
    button.innerHTML;

  button.innerHTML=
    icon('link')+
    ' ĐANG TẠO LINK…';

  try{

    const url=
      await buildShareLink();

    $('share-output').value=
      url;

    if(
      await copyText(url)
    ){

      toast(
        'Đã sao chép link'
      );

    }else{

      $('share-copy-note').textContent=
        'Trình duyệt chưa cho sao chép tự động. Chọn và sao chép link bên dưới.';

      if(
        !$('share-dialog').open
      ){
        $('share-dialog').showModal();
      }
    }

  }catch(error){

    toast(
      error.message
    );

  }finally{

    button.disabled=false;

    button.removeAttribute(
      'aria-busy'
    );

    button.innerHTML=
      label;
  }
};

$('share-close').onclick=
  ()=>$('share-dialog').close();

$('share-copy-retry').onclick=async()=>{

  if(
    await copyText(
      $('share-output').value
    )
  ){

    $('share-dialog').close();

    toast(
      'Đã sao chép link'
    );
  }
};

$('present').onclick=async()=>{

  try{

    if(!document.fullscreenElement){

      await document.documentElement
        .requestFullscreen?.();

    }else{

      await document
        .exitFullscreen?.();

    }

  }catch{

    toast(
      'Trình duyệt chưa hỗ trợ toàn màn hình.'
    );
  }
};

window.addEventListener(
  'popstate',
  ()=>{

    if(!sharedVisit){

      setMode(
        window.history.state?.luckyMode==='play'
          ? 'play'
          : 'teacher'
      );
    }
  }
);

window.addEventListener(
  'hashchange',
  ()=>{

    if(
      isSharedHash(
        location.hash
      ) ||
      sharedVisit
    ){
      location.reload();
    }
  }
);

document.addEventListener(
  'keydown',
  event=>{

    const editing=
      [
        'INPUT',
        'TEXTAREA',
        'SELECT'
      ].includes(
        event.target.tagName
      ) ||
      event.target.isContentEditable;

    const dialogOpen=
      !!document.querySelector(
        'dialog[open]'
      );

    if(
      event.key==='Escape' &&
      !dialogOpen &&
      mode==='play' &&
      !sharedVisit &&
      !spinning
    ){

      window.history.back();

      return;
    }

    if(
      editing ||
      dialogOpen
    )return;

    if(
      [
        'PageDown',
        'PageUp',
        'ArrowDown',
        'ArrowUp',
        'Home',
        'End'
      ].includes(
        event.key
      )
    ){
      event.preventDefault();
    }

    if(
      event.code==='Space' &&
      !event.repeat &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      ![
        'BUTTON',
        'A'
      ].includes(
        event.target.tagName
      )
    ){

      event.preventDefault();

      if(mode==='play'){

        if(
          !available().length &&
          state.items.length
        ){

          requestRestart();

        }else{

          spin();

        }
      }
    }
  }
);

for(
  const name of [
    'wheel',
    'touchmove'
  ]
){

  document.addEventListener(
    name,
    event=>{

      if(
        event.target.closest?.(
          'textarea,input,select,.lookup-popup,.result-screen'
        )
      )return;

      event.preventDefault();
    },
    {
      passive:false
    }
  );
}

window.addEventListener(
  'scroll',
  ()=>window.scrollTo(0,0)
);

window.addEventListener(
  'resize',
  ()=>{

    if(
      currentTab==='preview' &&
      !matchMedia(
        '(max-width:739px)'
      ).matches
    ){
      setTab('content');
    }

    queueLayout();
  }
);

window.visualViewport
  ?.addEventListener(
    'resize',
    queueLayout
  );

document.addEventListener(
  'fullscreenchange',
  queueLayout
);

if(window.ResizeObserver){

  new ResizeObserver(
    queueLayout
  ).observe(
    $('workspace')
  );
}

window.addEventListener(
  'beforeunload',
  event=>{

    if(
      spinning ||
      importingImages ||
      storagePending
    ){

      event.preventDefault();

      event.returnValue='';
    }
  }
);

document.addEventListener(
  'visibilitychange',
  ()=>{

    if(document.hidden){

      audio.pause();

    }else if(audio.ctx){

      audio.unlock()
        .then(
          ()=>audio.syncMusic()
        );
    }
  }
);

resetWheel();

setTab(
  currentTab
);

renderUI(true);

storageNotice();

try{

  await wheelImages.prepare(
    state.items
  );

}catch{

  if(sharedVisit){

    shareInvalid=true;

    $('share-error').textContent=
      'Không đọc được ảnh trong link. Hãy xin lại link từ giáo viên.';

    renderUI();

  }else{

    toast(
      'Một ảnh chưa đọc được. Hãy thay ảnh đó.'
    );
  }
}

document.documentElement.dataset.loading=
  'false';

delete document.documentElement
  .dataset.startupError;

clearTimeout(
  window.wheelStartupTimer
);

layout();

document.fonts
  ?.ready
  .then(
    ()=>{
      drawWheel();
      layout();
    }
  );

if(document.modelContext?.registerTool){

  const lifetime=
    new AbortController();

  const toolset=[
    {
      name:'read_wheel_session',
      title:'Xem phiên vòng quay',
      description:'Read current mode and only the revealed result; teacher mode additionally exposes the editor contents and history.',
      inputSchema:{
        type:'object',
        properties:{},
        additionalProperties:false
      },
      annotations:{
        readOnlyHint:true,
        untrustedContentHint:true
      },
      execute:()=>({
        mode,
        shared:sharedVisit,
        spinning,
        result:
          !spinning &&
          state.last
            ? {
                text:state.last.text,
                ...(
                  state.last.image
                    ? {
                        image:
                          state.last.image
                      }
                    : {}
                )
              }
            : null,
        ...(
          mode==='teacher'
            ? {
                items:
                  state.items.map(
                    x=>({...x})
                  ),
                history:
                  state.history.map(
                    x=>({...x})
                  )
              }
            : {}
        )
      })
    },
    {
      name:'spin_wheel',
      title:'Quay vòng may mắn',
      description:'Run one visible draw; return the selected text only after the wheel stops. Never repeats prior choices.',
      inputSchema:{
        type:'object',
        properties:{},
        additionalProperties:false
      },
      annotations:{
        readOnlyHint:false,
        untrustedContentHint:true
      },
      execute:async()=>{

        if(
          spinning ||
          !available().length ||
          shareInvalid ||
          document.querySelector(
            'dialog[open]'
          )
        ){
          throw new Error(
            'Vòng quay chưa sẵn sàng.'
          );
        }

        const result=
          await spin();

        if(!result){
          throw new Error(
            'Vòng quay chưa sẵn sàng.'
          );
        }

        return {
          ...result.result
        };
      }
    }
  ];

  if(!sharedVisit){

    toolset.push({
      name:'stage_wheel_contents',
      title:'Thêm nội dung đang nhập',
      description:'Append draft contents in teacher mode without applying changes to the wheel.',
      inputSchema:{
        type:'object',
        properties:{
          entries:{
            type:'array',
            minItems:1,
            items:{
              type:'string',
              minLength:1
            }
          }
        },
        required:[
          'entries'
        ],
        additionalProperties:false
      },
      annotations:{
        readOnlyHint:false,
        untrustedContentHint:true
      },
      execute:input=>{

        if(
          mode!=='teacher' ||
          spinning
        ){
          throw new Error(
            'Cần chế độ giáo viên.'
          );
        }

        if(
          !Array.isArray(
            input?.entries
          ) ||
          !input.entries.length ||
          input.entries.some(
            x=>
              typeof x!=='string' ||
              !x.trim()
          )
        ){
          throw new Error(
            'Cần nội dung không rỗng.'
          );
        }

        state.draft=
          state.draft.concat(
            input.entries.map(
              text=>({
                id:uid(),
                text:text.trim()
              })
            )
          );

        save();

        setTab(
          'content'
        );

        renderEntries();

        return {
          applied:false
        };
      }
    });
  }

  for(
    const tool of toolset
  ){

    try{

      Promise.resolve(
        document.modelContext
          .registerTool(
            tool,
            {
              signal:
                lifetime.signal
            }
          )
      ).catch(()=>{});

    }catch{}
  }

  window.addEventListener(
    'pagehide',
    ()=>lifetime.abort(),
    {
      once:true
    }
  );
}