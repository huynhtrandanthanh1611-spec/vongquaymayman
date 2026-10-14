/* =========================================================
   GIỌNG ĐỌC MẪU TIẾNG VIỆT RÕ, TỰ NHIÊN HƠN
   - Chỉ can thiệp nút .sample-word-button.
   - Ưu tiên Hoài My Online/Natural/Neural, sau đó Google Tiếng Việt.
   - Tránh Nam Minh / giọng nam.
   - Tốc độ và cao độ gần giọng nói tự nhiên.
   ========================================================= */

let qualitySpeaking = false;
let qualityUtterance = null;

function vietnameseVoices() {
  if (!('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices().filter(voice =>
    String(voice.lang || '').toLowerCase().startsWith('vi')
  );
}

function voiceLabel(voice) {
  return `${voice?.name || ''} ${voice?.voiceURI || ''}`.toLocaleLowerCase('vi');
}

function isKnownMaleVoice(voice) {
  return /nam\s*minh|namminh|male|giọng\s*nam|giong\s*nam/.test(voiceLabel(voice));
}

function pickClearVietnameseFemaleVoice() {
  const voices = vietnameseVoices().filter(voice => !isKnownMaleVoice(voice));
  if (!voices.length) return null;

  const ranked = voices.map(voice => {
    const label = voiceLabel(voice);
    const exactVi = String(voice.lang || '').toLowerCase() === 'vi-vn';
    let score = exactVi ? 100 : 60;

    /* Ưu tiên cao nhất: giọng nữ tự nhiên/neural/online. */
    if (/hoai\s*my|hoài\s*mỹ|hoa[iì]\s*my/.test(label) && /natural|neural|online/.test(label)) score += 1000;

    /* Google Tiếng Việt thường mượt hơn các voice cục bộ đời cũ. */
    if (/google.*(?:tiếng\s*việt|vietnamese)|(?:tiếng\s*việt|vietnamese).*google/.test(label)) score += 800;

    /* Hoài My thông thường vẫn ưu tiên hơn voice không xác định. */
    if (/hoai\s*my|hoài\s*mỹ|hoa[iì]\s*my/.test(label)) score += 650;

    if (/female|nữ/.test(label)) score += 500;
    if (/natural|neural|online/.test(label)) score += 300;
    if (/microsoft/.test(label)) score += 40;

    /* Voice local cũ thường kém tự nhiên hơn bản online/natural. */
    if (voice.localService && !/natural|neural|online/.test(label)) score -= 25;

    return {voice, score};
  }).sort((a, b) => b.score - a.score);

  return ranked[0]?.voice || null;
}

function waitForVietnameseVoice(timeout = 900) {
  const immediate = pickClearVietnameseFemaleVoice();
  if (immediate) return Promise.resolve(immediate);

  return new Promise(resolve => {
    const started = performance.now();
    let timer = null;

    const finish = () => {
      const voice = pickClearVietnameseFemaleVoice();
      if (voice || performance.now() - started >= timeout) {
        if (timer) clearInterval(timer);
        window.speechSynthesis?.removeEventListener?.('voiceschanged', check);
        resolve(voice || null);
        return true;
      }
      return false;
    };

    const check = () => finish();
    window.speechSynthesis?.addEventListener?.('voiceschanged', check);
    timer = setInterval(finish, 80);
    finish();
  });
}

function sampleButton() {
  return document.querySelector('.sample-word-button');
}

function sampleText() {
  const resultText = document.getElementById('result-text');
  if (!resultText || resultText.hidden) return '';
  return String(resultText.textContent || '').trim();
}

function setSampleButtonState(speaking) {
  const button = sampleButton();
  if (!button) return;
  qualitySpeaking = speaking;
  button.textContent = speaking ? '⏹ DỪNG ĐỌC' : '🔊 ĐỌC MẪU';
  button.setAttribute('aria-pressed', speaking ? 'true' : 'false');
}

function stopQualitySpeech() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  qualityUtterance = null;
  setSampleButtonState(false);
}

async function speakClearSample() {
  const text = sampleText();
  if (!text || !('speechSynthesis' in window)) return;

  if (qualitySpeaking) {
    stopQualitySpeech();
    return;
  }

  window.speechSynthesis.cancel();
  setSampleButtonState(true);

  const voice = await waitForVietnameseVoice();
  if (!qualitySpeaking) return;

  /* Dấu chấm giúp TTS phát âm tròn tiếng hơn đối với từ/cụm từ ngắn. */
  const spokenText = /[.!?…]$/.test(text) ? text : `${text}.`;
  const utterance = new SpeechSynthesisUtterance(spokenText);
  utterance.lang = 'vi-VN';
  utterance.rate = 0.88;
  utterance.pitch = 1.0;
  utterance.volume = 1;
  if (voice) utterance.voice = voice;

  utterance.onstart = () => setSampleButtonState(true);
  utterance.onend = () => {
    qualityUtterance = null;
    setSampleButtonState(false);
  };
  utterance.onerror = () => {
    qualityUtterance = null;
    setSampleButtonState(false);
  };

  qualityUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

/*
  Chặn handler đọc mẫu cũ trước khi sự kiện tới nút,
  để chỉ có một giọng đọc chạy và không bị hai utterance chồng nhau.
*/
document.addEventListener('click', event => {
  const button = event.target.closest?.('.sample-word-button');
  if (!button) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  speakClearSample();
}, true);

/* Sang lượt khác hoặc rời kết quả thì dừng ngay giọng cũ. */
document.getElementById('spin-main')?.addEventListener('click', stopQualitySpeech, true);
document.getElementById('spin-start')?.addEventListener('click', stopQualitySpeech, true);

window.addEventListener('pagehide', stopQualitySpeech);
