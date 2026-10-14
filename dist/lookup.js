/* =========================================================
   TRA CỨU NHANH - DỮ LIỆU GIÁO VIÊN CHUẨN BỊ SẴN
   Không gọi Wikipedia/Wikidata để tránh lag khi đang chơi.
   ========================================================= */

const LOOKUP_MAX_LENGTH = 80;
const LOOKUP_STORAGE = 'lucky-lookup-custom-v1';

let currentLookupText = '';
let currentLookupTitle = '';
let currentLookupDescription = '';
let lookupSpeaking = false;
let lookupUtterance = null;

const normalizeLookupKey = text =>
  String(text || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('vi');

function loadPreparedLookup(term) {
  try {
    const raw = localStorage.getItem(LOOKUP_STORAGE);
    const store = raw ? JSON.parse(raw) : {};
    const record = store?.[normalizeLookupKey(term)];
    if (!record) return null;
    return {
      title: record.term || String(term).trim(),
      description: record.meaning || '',
      image: record.image || '',
      source: 'Dữ liệu giáo viên đã chuẩn bị'
    };
  } catch {
    return null;
  }
}

const lookupButton = document.createElement('button');
lookupButton.type = 'button';
lookupButton.className = 'lookup-selection-button';
lookupButton.setAttribute('aria-label', 'Tra cứu nội dung đã chọn');
lookupButton.innerHTML = '🔍';
lookupButton.hidden = true;
document.body.appendChild(lookupButton);

const lookupOverlay = document.createElement('div');
lookupOverlay.className = 'lookup-overlay';
lookupOverlay.hidden = true;
lookupOverlay.innerHTML = `
  <section class="lookup-popup" role="dialog" aria-modal="true" aria-labelledby="lookup-title">
    <button type="button" class="lookup-close" aria-label="Đóng tra cứu">×</button>
    <div class="lookup-heading">
      <span class="lookup-heading-icon">🔎</span>
      <h2 id="lookup-title">TRA CỨU NHANH</h2>
    </div>
    <div class="lookup-body">
      <div class="lookup-result" hidden>
        <div class="lookup-image-box">
          <img class="lookup-image" alt="" hidden>
          <div class="lookup-no-image" hidden><span>🖼️</span><p>Chưa có hình minh họa</p></div>
        </div>
        <h3 class="lookup-result-title"></h3>
        <p class="lookup-description"></p>
        <button type="button" class="lookup-speak-button" aria-label="Đọc nội dung tra cứu" aria-pressed="false">🔊 ĐỌC CHO EM NGHE</button>
        <p class="lookup-source"></p>
      </div>
      <div class="lookup-error" hidden>
        <div>🌱</div>
        <p></p>
      </div>
    </div>
  </section>
`;
document.body.appendChild(lookupOverlay);

const popup = lookupOverlay.querySelector('.lookup-popup');
const closeButton = lookupOverlay.querySelector('.lookup-close');
const resultBox = lookupOverlay.querySelector('.lookup-result');
const errorBox = lookupOverlay.querySelector('.lookup-error');
const resultTitle = lookupOverlay.querySelector('.lookup-result-title');
const descriptionBox = lookupOverlay.querySelector('.lookup-description');
const imageBox = lookupOverlay.querySelector('.lookup-image');
const noImageBox = lookupOverlay.querySelector('.lookup-no-image');
const sourceBox = lookupOverlay.querySelector('.lookup-source');
const speakButton = lookupOverlay.querySelector('.lookup-speak-button');

function getSelectedLookupText() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return '';

  const text = selection.toString().trim();
  if (!text || text.length > LOOKUP_MAX_LENGTH) return '';

  const range = selection.getRangeAt(0);
  let node = range.commonAncestorContainer;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
  if (!node) return '';

  if (node.closest("input, textarea, select, button, [contenteditable='true'], .lookup-popup")) return '';
  return text;
}

function positionLookupButton() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return hideLookupButton();
  const rect = selection.getRangeAt(0).getBoundingClientRect();
  if (!rect.width && !rect.height) return hideLookupButton();

  const buttonSize = 48;
  let left = rect.left + rect.width / 2 - buttonSize / 2;
  let top = rect.top - buttonSize - 10;
  if (top < 8) top = rect.bottom + 10;
  left = Math.max(8, Math.min(window.innerWidth - buttonSize - 8, left));
  lookupButton.style.left = `${left}px`;
  lookupButton.style.top = `${top}px`;
}

function showLookupButton() {
  const text = getSelectedLookupText();
  if (!text) return hideLookupButton();
  currentLookupText = text;
  lookupButton.hidden = false;
  requestAnimationFrame(() => {
    lookupButton.classList.add('show');
    positionLookupButton();
  });
}

function hideLookupButton() {
  lookupButton.classList.remove('show');
  lookupButton.hidden = true;
}

function showLookupError(message) {
  resultBox.hidden = true;
  errorBox.hidden = false;
  errorBox.querySelector('p').textContent = message;
}

function renderLookupResult(data) {
  errorBox.hidden = true;
  resultBox.hidden = false;
  currentLookupTitle = data.title || '';
  currentLookupDescription = data.description || '';
  resultTitle.textContent = currentLookupTitle;
  descriptionBox.textContent = currentLookupDescription;

  if (data.image) {
    imageBox.src = data.image;
    imageBox.alt = `Hình minh họa ${data.title}`;
    imageBox.hidden = false;
    noImageBox.hidden = true;
  } else {
    imageBox.removeAttribute('src');
    imageBox.hidden = true;
    noImageBox.hidden = false;
  }

  sourceBox.textContent = `Nguồn: ${data.source}`;
  speakButton.disabled = !currentLookupDescription;
  updateSpeakButton();
}

function openLookupPopup(term) {
  const cleanTerm = String(term || '').trim();
  if (!cleanTerm) return;

  stopLookupSpeech();
  currentLookupText = cleanTerm;
  currentLookupTitle = '';
  currentLookupDescription = '';
  hideLookupButton();

  lookupOverlay.hidden = false;
  requestAnimationFrame(() => lookupOverlay.classList.add('show'));

  const prepared = loadPreparedLookup(cleanTerm);
  if (!prepared) {
    showLookupError(`Chưa có nghĩa và hình cho “${cleanTerm}”. Hãy thêm trước khi chơi ở màn hình chuẩn bị vòng quay.`);
    return;
  }

  renderLookupResult(prepared);
}

function closeLookupPopup() {
  stopLookupSpeech();
  lookupOverlay.classList.remove('show');
  setTimeout(() => { lookupOverlay.hidden = true; }, 180);
}

function getVietnameseVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  return voices.find(v => v.lang === 'vi-VN') || voices.find(v => v.lang?.toLowerCase().startsWith('vi')) || null;
}

function updateSpeakButton() {
  if (!speakButton) return;
  if (lookupSpeaking) {
    speakButton.textContent = '⏹ DỪNG ĐỌC';
    speakButton.setAttribute('aria-pressed', 'true');
  } else {
    speakButton.textContent = '🔊 ĐỌC CHO EM NGHE';
    speakButton.setAttribute('aria-pressed', 'false');
  }
}

function stopLookupSpeech() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  lookupUtterance = null;
  lookupSpeaking = false;
  updateSpeakButton();
}

function speakLookupResult() {
  if (!('speechSynthesis' in window) || !currentLookupDescription) return;
  if (lookupSpeaking) return stopLookupSpeech();

  const utterance = new SpeechSynthesisUtterance(`${currentLookupTitle}. ${currentLookupDescription}`);
  utterance.lang = 'vi-VN';
  utterance.rate = 0.85;
  utterance.pitch = 1.05;
  utterance.volume = 1;
  const voice = getVietnameseVoice();
  if (voice) utterance.voice = voice;

  utterance.onstart = () => { lookupSpeaking = true; updateSpeakButton(); };
  utterance.onend = utterance.onerror = () => {
    lookupSpeaking = false;
    lookupUtterance = null;
    updateSpeakButton();
  };

  lookupUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

document.addEventListener('mouseup', () => setTimeout(showLookupButton, 10));
document.addEventListener('touchend', () => setTimeout(showLookupButton, 120));

lookupButton.addEventListener('pointerdown', event => {
  event.preventDefault();
  event.stopPropagation();
  const text = currentLookupText;
  if (text) openLookupPopup(text);
});

closeButton.addEventListener('click', closeLookupPopup);
lookupOverlay.addEventListener('click', event => { if (event.target === lookupOverlay) closeLookupPopup(); });
popup.addEventListener('click', event => event.stopPropagation());
speakButton.addEventListener('click', speakLookupResult);

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !lookupOverlay.hidden) {
    event.preventDefault();
    event.stopPropagation();
    closeLookupPopup();
  }
}, true);

window.addEventListener('resize', hideLookupButton);
window.addEventListener('scroll', hideLookupButton, true);

if ('speechSynthesis' in window) {
  window.speechSynthesis.addEventListener?.('voiceschanged', getVietnameseVoice);
} else {
  speakButton.hidden = true;
}

document.documentElement.classList.add('lookup-enabled');
