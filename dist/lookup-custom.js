/* DỮ LIỆU TRA CỨU TỰ THÊM CỦA GIÁO VIÊN
   Bản nhẹ: không MutationObserver, không vòng lặp DOM.
   - Nhập/copy-paste nghĩa
   - Ctrl+V ảnh hoặc link ảnh
   - Lưu trên trình duyệt
   - Dữ liệu tự thêm được ưu tiên khi tra lại
*/

const CUSTOM_LOOKUP_STORAGE = 'lucky-lookup-custom-v1';
const CUSTOM_LOOKUP_MAX_TERM = 80;
let customLookupTerm = '';
let lastLookupSelection = '';
let pastedImageSource = '';
let activeCustomRecord = null;

/* Giới hạn thời gian gọi Wikipedia/Wikidata để mạng chậm không treo tra cứu. */
const nativeFetch = window.fetch.bind(window);
window.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input?.url || '';
  const isLookupApi = /https:\/\/(?:vi\.wikipedia\.org|www\.wikidata\.org)\//i.test(url);
  if (!isLookupApi || init.signal) return nativeFetch(input, init);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    return await nativeFetch(input, {...init, signal: controller.signal});
  } finally {
    clearTimeout(timer);
  }
};

const normalizeLookupKey = text =>
  String(text || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('vi');

function loadCustomLookupStore() {
  try {
    const raw = localStorage.getItem(CUSTOM_LOOKUP_STORAGE);
    const data = raw ? JSON.parse(raw) : {};
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

function saveCustomLookupStore(store) {
  localStorage.setItem(CUSTOM_LOOKUP_STORAGE, JSON.stringify(store));
}

function getCustomLookup(term) {
  return loadCustomLookupStore()[normalizeLookupKey(term)] || null;
}

function setCustomLookup(term, record) {
  const key = normalizeLookupKey(term);
  if (!key) return;
  const store = loadCustomLookupStore();
  store[key] = {
    term: String(term).trim(),
    meaning: String(record.meaning || '').trim(),
    image: String(record.image || ''),
    updatedAt: Date.now()
  };
  saveCustomLookupStore(store);
}

function deleteCustomLookup(term) {
  const key = normalizeLookupKey(term);
  const store = loadCustomLookupStore();
  delete store[key];
  saveCustomLookupStore(store);
}

function selectedLookupText() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.rangeCount) return '';
  const text = selection.toString().trim();
  if (!text || text.length > CUSTOM_LOOKUP_MAX_TERM) return '';
  let node = selection.getRangeAt(0).commonAncestorContainer;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
  if (!node || node.closest("input,textarea,select,button,[contenteditable='true'],.lookup-popup")) return '';
  return text;
}

function imageBlobToDataURL(blob, maxSide = 900) {
  return new Promise((resolve, reject) => {
    const objectURL = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const maxDimension = Math.max(img.naturalWidth || 1, img.naturalHeight || 1);
        const scale = Math.min(1, maxSide / maxDimension);
        const width = Math.max(1, Math.round(img.naturalWidth * scale));
        const height = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(objectURL);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      } catch (error) {
        URL.revokeObjectURL(objectURL);
        reject(error);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectURL);
      reject(new Error('Không đọc được ảnh'));
    };
    img.src = objectURL;
  });
}

function setupCustomLookup() {
  const overlay = document.querySelector('.lookup-overlay');
  const body = overlay?.querySelector('.lookup-body');
  const lookupButton = document.querySelector('.lookup-selection-button');
  const closeButton = overlay?.querySelector('.lookup-close');
  const loadingBox = overlay?.querySelector('.lookup-loading');
  const resultBox = overlay?.querySelector('.lookup-result');
  const errorBox = overlay?.querySelector('.lookup-error');
  const resultTitle = overlay?.querySelector('.lookup-result-title');
  const description = overlay?.querySelector('.lookup-description');
  const image = overlay?.querySelector('.lookup-image');
  const noImage = overlay?.querySelector('.lookup-no-image');
  const source = overlay?.querySelector('.lookup-source');
  const speakButton = overlay?.querySelector('.lookup-speak-button');

  if (!overlay || !body || !lookupButton || !resultBox || !resultTitle || !description || !image || !source) {
    setTimeout(setupCustomLookup, 150);
    return;
  }

  const canEdit = !/^#w[23]=/.test(location.hash);

  if (body.querySelector('.lookup-custom-tools')) return;

  const tools = document.createElement('div');
  tools.className = 'lookup-custom-tools';
  tools.innerHTML = `
    <button type="button" class="lookup-custom-open" ${canEdit ? '' : 'hidden'}>✏️ TỰ THÊM NGHĨA & ẢNH</button>
    <div class="lookup-custom-editor" hidden>
      <div class="lookup-custom-title">DỮ LIỆU CỦA GIÁO VIÊN</div>
      <div class="lookup-custom-term"></div>
      <label class="lookup-custom-label" for="lookup-custom-meaning">Nghĩa của từ</label>
      <textarea id="lookup-custom-meaning" class="lookup-custom-meaning" rows="5" placeholder="Copy nghĩa rồi Ctrl+V vào đây, hoặc tự nhập..."></textarea>
      <div class="lookup-custom-label">Hình minh họa</div>
      <div class="lookup-custom-paste" tabindex="0" role="button" aria-label="Dán hình ảnh từ clipboard">
        <div class="lookup-custom-paste-icon">📋🖼️</div>
        <strong>Nhấp vào đây rồi nhấn Ctrl+V để dán ảnh</strong>
        <span>Có thể copy ảnh trực tiếp hoặc copy link ảnh.</span>
      </div>
      <div class="lookup-custom-preview" hidden>
        <img alt="Ảnh tự thêm cho từ tra cứu">
        <button type="button" class="lookup-custom-remove-image">XÓA ẢNH</button>
      </div>
      <div class="lookup-custom-status" role="status"></div>
      <div class="lookup-custom-actions">
        <button type="button" class="lookup-custom-cancel">HỦY</button>
        <button type="button" class="lookup-custom-delete">XÓA DỮ LIỆU</button>
        <button type="button" class="lookup-custom-save">✓ LƯU</button>
      </div>
    </div>
  `;
  body.appendChild(tools);

  const openButton = tools.querySelector('.lookup-custom-open');
  const editor = tools.querySelector('.lookup-custom-editor');
  const termBox = tools.querySelector('.lookup-custom-term');
  const meaningBox = tools.querySelector('.lookup-custom-meaning');
  const pasteBox = tools.querySelector('.lookup-custom-paste');
  const previewBox = tools.querySelector('.lookup-custom-preview');
  const previewImg = previewBox.querySelector('img');
  const removeImageButton = tools.querySelector('.lookup-custom-remove-image');
  const cancelButton = tools.querySelector('.lookup-custom-cancel');
  const deleteButton = tools.querySelector('.lookup-custom-delete');
  const saveButton = tools.querySelector('.lookup-custom-save');
  const statusBox = tools.querySelector('.lookup-custom-status');

  function resolveTerm() {
    return String(customLookupTerm || lastLookupSelection || resultTitle.textContent || '')
      .trim()
      .slice(0, CUSTOM_LOOKUP_MAX_TERM);
  }

  function setPreview(src) {
    pastedImageSource = src || '';
    if (pastedImageSource) {
      previewImg.src = pastedImageSource;
      previewBox.hidden = false;
      pasteBox.classList.add('has-image');
    } else {
      previewImg.removeAttribute('src');
      previewBox.hidden = true;
      pasteBox.classList.remove('has-image');
    }
  }

  function resetEditor() {
    editor.hidden = true;
    if (canEdit) openButton.hidden = false;
    statusBox.textContent = '';
  }

  function renderCustom(record) {
    activeCustomRecord = record;
    customLookupTerm = record.term || resolveTerm();

    if (loadingBox) loadingBox.hidden = true;
    if (errorBox) errorBox.hidden = true;
    resultBox.hidden = false;
    resultTitle.textContent = customLookupTerm;
    description.textContent = record.meaning || '';

    if (record.image) {
      image.src = record.image;
      image.alt = `Hình minh họa ${customLookupTerm}`;
      image.hidden = false;
      if (noImage) noImage.hidden = true;
    } else {
      image.removeAttribute('src');
      image.hidden = true;
      if (noImage) noImage.hidden = false;
    }

    source.textContent = 'Nguồn: Dữ liệu giáo viên tự thêm';
    if (speakButton) speakButton.disabled = false;
    openButton.textContent = '✏️ CHỈNH NGHĨA & ẢNH';
  }

  function openOverlayWithCustom(record) {
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('show'));
    renderCustom(record);
  }

  function openEditor() {
    const term = resolveTerm();
    if (!term) {
      statusBox.textContent = 'Hãy chọn một từ để tra cứu trước.';
      return;
    }

    customLookupTerm = term;
    const saved = getCustomLookup(term);
    termBox.textContent = `Từ: “${term}”`;
    meaningBox.value = saved?.meaning || description.textContent.trim() || '';
    setPreview(saved?.image || (!image.hidden ? (image.currentSrc || image.src) : ''));
    statusBox.textContent = saved ? 'Đang chỉnh dữ liệu đã lưu.' : 'Bạn có thể copy–paste nghĩa và ảnh.';
    deleteButton.hidden = !saved;
    editor.hidden = false;
    openButton.hidden = true;
    meaningBox.focus();
  }

  async function handleImagePaste(event) {
    const items = [...(event.clipboardData?.items || [])];
    const imageItem = items.find(item => item.type.startsWith('image/'));

    if (imageItem) {
      event.preventDefault();
      statusBox.textContent = 'Đang xử lý ảnh...';
      try {
        const file = imageItem.getAsFile();
        setPreview(await imageBlobToDataURL(file));
        statusBox.textContent = '✓ Đã dán ảnh. Nhấn LƯU để ghi nhớ.';
      } catch {
        statusBox.textContent = 'Không dán được ảnh này. Hãy thử ảnh khác.';
      }
      return;
    }

    const text = event.clipboardData?.getData('text/plain')?.trim() || '';
    if (/^(?:data:image\/|https?:\/\/)/i.test(text)) {
      event.preventDefault();
      setPreview(text);
      statusBox.textContent = '✓ Đã nhận link ảnh. Nhấn LƯU để ghi nhớ.';
    }
  }

  /* Ghi nhớ từ trước khi lookup.js làm mất vùng bôi đen. */
  document.addEventListener('mouseup', () => {
    setTimeout(() => {
      const text = selectedLookupText();
      if (text) lastLookupSelection = text;
    }, 0);
  });

  document.addEventListener('touchend', () => {
    setTimeout(() => {
      const text = selectedLookupText();
      if (text) lastLookupSelection = text;
    }, 80);
  });

  /* Nếu từ đã có dữ liệu giáo viên, mở ngay, không gọi mạng. */
  lookupButton.addEventListener('pointerdown', event => {
    const term = selectedLookupText() || lastLookupSelection;
    if (!term) return;

    customLookupTerm = term;
    const saved = getCustomLookup(term);
    if (!saved) {
      activeCustomRecord = null;
      openButton.textContent = '✏️ TỰ THÊM NGHĨA & ẢNH';
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    openOverlayWithCustom(saved);
  }, true);

  openButton.addEventListener('click', openEditor);
  cancelButton.addEventListener('click', resetEditor);

  pasteBox.addEventListener('click', () => {
    pasteBox.focus();
    statusBox.textContent = 'Nhấn Ctrl+V để dán ảnh.';
  });
  pasteBox.addEventListener('paste', handleImagePaste);
  editor.addEventListener('paste', event => {
    if (event.target !== meaningBox) handleImagePaste(event);
  });

  removeImageButton.addEventListener('click', () => {
    setPreview('');
    statusBox.textContent = 'Đã bỏ ảnh. Nhấn LƯU để cập nhật.';
  });

  saveButton.addEventListener('click', () => {
    const term = resolveTerm();
    const meaning = meaningBox.value.trim();
    if (!term) {
      statusBox.textContent = 'Không xác định được từ cần lưu.';
      return;
    }
    if (!meaning && !pastedImageSource) {
      statusBox.textContent = 'Hãy nhập nghĩa hoặc dán ảnh trước khi lưu.';
      return;
    }

    try {
      setCustomLookup(term, {meaning, image: pastedImageSource});
      const saved = getCustomLookup(term);
      statusBox.textContent = '✓ Đã lưu.';
      renderCustom(saved);
      setTimeout(resetEditor, 450);
    } catch (error) {
      console.error(error);
      statusBox.textContent = 'Bộ nhớ trình duyệt đã đầy. Hãy dùng ảnh nhỏ hơn.';
    }
  });

  deleteButton.addEventListener('click', () => {
    const term = resolveTerm();
    if (!term) return;
    deleteCustomLookup(term);
    activeCustomRecord = null;
    resetEditor();
    overlay.classList.remove('show');
    setTimeout(() => { overlay.hidden = true; }, 180);
  });

  /* Đọc dữ liệu tự thêm mà không phụ thuộc biến nội bộ của lookup.js. */
  speakButton?.addEventListener('click', event => {
    if (!activeCustomRecord) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      `${activeCustomRecord.term}. ${activeCustomRecord.meaning || ''}`
    );
    utterance.lang = 'vi-VN';
    utterance.rate = 0.85;
    utterance.pitch = 1.05;
    window.speechSynthesis.speak(utterance);
  }, true);

  closeButton?.addEventListener('click', () => {
    activeCustomRecord = null;
    customLookupTerm = '';
    resetEditor();
  });

  overlay.addEventListener('click', event => {
    if (event.target === overlay) {
      activeCustomRecord = null;
      customLookupTerm = '';
      resetEditor();
    }
  });
}

setupCustomLookup();
