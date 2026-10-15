/* Keep the existing title artwork at its natural aspect ratio. */
(() => {
  const host=document.querySelector('.page-title');
  if(!host)return;
  host.replaceChildren();
  const img=document.createElement('img');
  img.src='./assets/title-banner.webp';
  img.alt='VÒNG QUAY MAY MẮN';
  img.className='title-banner-image';
  img.decoding='async';
  img.draggable=false;
  host.appendChild(img);
})();
