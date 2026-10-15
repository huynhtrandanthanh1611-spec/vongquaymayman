/* Dùng nguyên ảnh tiêu đề tham chiếu làm tiêu đề website. */
(() => {
  const title = document.querySelector('.page-title');
  if (!title) return;

  title.classList.add('page-title-image');
  title.replaceChildren();

  const img = document.createElement('img');
  img.src = './assets/title-banner.webp';
  img.alt = 'VÒNG QUAY MAY MẮN';
  img.className = 'title-banner-image';
  img.decoding = 'async';
  img.draggable = false;
  title.appendChild(img);

  const style = document.createElement('style');
  style.textContent = `
    .page-title.page-title-image{
      display:flex;
      justify-content:center;
      align-items:center;
      width:100%;
      margin:10px 0 14px;
      min-height:0;
      overflow:visible;
    }
    .title-banner-image{
      display:block;
      width:min(100%, 920px);
      height:auto;
      max-height:170px;
      object-fit:contain;
      object-position:center;
      user-select:none;
      pointer-events:none;
      filter:drop-shadow(0 6px 8px rgba(52,119,160,.10));
    }
    @media(max-width:1100px){
      .page-title.page-title-image{margin:8px 0 10px}
      .title-banner-image{width:min(96%,760px);max-height:145px}
    }
    @media(max-width:739px){
      .page-title.page-title-image{margin:5px 0 8px}
      .title-banner-image{width:100%;max-height:118px}
    }
  `;
  document.head.appendChild(style);
})();
