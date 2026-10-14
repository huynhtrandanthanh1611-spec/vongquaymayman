/* DỮ LIỆU TRA CỨU TỰ THÊM CỦA GIÁO VIÊN
   - Tự nhập nghĩa
   - Dán ảnh trực tiếp bằng Ctrl+V
   - Lưu trên trình duyệt hiện tại
   - Ưu tiên dữ liệu tự thêm hơn Wikipedia/Wikidata
*/

const CUSTOM_LOOKUP_STORAGE = 'lucky-lookup-custom-v1';
const CUSTOM_LOOKUP_MAX_TERM = 80;
let customLookupTerm = '';
let lastLookupSelection = '';
let pastedImageSource = '';
let applyingCustomLookup = false;

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

function rememberLookupSelection() {
  const text = selectedLookupText();
  if (text) lastLookupSelection = text;
}

document.addEventListener('mouseup', () => setTimeout(rememberLookupSelection, 0));
document.addEventListener('touchend', () => setTimeout(rememberLookupSelection, 80));
document.addEventListener('pointerdown', event => {
  if (event.target.closest?.('.lookup-selection-button')) {
    const text = selectedLookupText() || lastLookupSelection;
    if (text) customLookupTerm = text;
  }
}, true);

function imageBlobToDataURL(blob, maxSide = 900) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxSide / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
        const width = Math.max(1, Math.round(img.naturalWidth * scale));
        const height = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.84));
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không đọc được ảnh'));
    };
    img.src = url;
  });
}

function isImageText(text) {
  return /^data:image\//i.test(text) || /^https?:\/\//i.test(text);
}

function setupCustomLookup() {
  const overlay = document.querySelector('.lookup-overlay');
  const popup = overlay?.querySelector('.lookup-popup');
  const body = overlay?.querySelector('.lookup-body');
  const resultBox = overlay?.querySelector('.lookup-result');
  const loadingBox = overlay?.querySelector('.lookup-loading');
  const errorBox = overlay?.querySelector('.lookup-error');
  const resultTitle = overlay?.querySelector('.lookup-result-title');
  const description = overlay?.querySelector('.lookup-description');
  const image = overlay?.querySelector('.lookup-image');
  const noImage = overlay?.querySelector('.lookup-no-image');
  const source = overlay?.querySelector('.lookup-source');

  if (!overlay || !popup || !body || !resultBox || !resultTitle || !description || !image || !source) {
    setTimeout(setupCustomLookup, 120);
    return;
  }

  if (body.querySelector('.lookup-custom-tools')) return;

  const canEdit = !/^#w[23]=/.test(location.hash);
  const tools = document.createElement('div');
  tools.className = 'lookup-custom-tools';
  tools.innerHTML = `
    <button type="button" class="lookup-custom-open" ${canEdit ? '' : 'hidden'}>✏️ TỰ THÊM NGHĨA & ẢNH</button>
    <div class="lookup-custom-editor" hidden>
      <div class="lookup-custom-title">DỮ LIỆU CỦA GIÁO VIÊN</div>
      <div class="lookup-custom-term"></div>
      <label class="lookup-custom-label" for="lookup-custom-meaning">Nghĩa của từ</label>
      <textarea id="lookup-custom-meaning" class="lookup-custom-meaning" rows="5" placeholder="Copy nghĩa ở nơi khác rồi Ctrl+V vào đây, hoặc tự nhập..."></textarea>
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

  function resolveCurrentTerm() {
    const selection = selectedLookupText();
    if (selection) lastLookupSelection = selection;
    const titleText = resultTitle.textContent.trim();
    const candidate = customLookupTerm || lastLookupSelection || titleText;
    return String(candidate || '').trim().slice(0, CUSTOM_LOOKUP_MAX_TERM);
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

  function openEditor() {
    customLookupTerm = resolveCurrentTerm();
    if (!customLookupTerm) {
      statusBox.textContent = 'Hãy tra cứu một từ trước.';
      return;
    }
    const saved = getCustomLookup(customLookupTerm);
    termBox.textContent = `Từ: “${customLookupTerm}”`;
    meaningBox.value = saved?.meaning || description.textContent.trim() || '';
    setPreview(saved?.image || (!image.hidden ? image.currentSrc || image.src : ''));
    statusBox.textContent = saved ? 'Đang chỉnh dữ liệu đã lưu.' : 'Bạn có thể copy–paste nghĩa và ảnh.';
    deleteButton.hidden = !saved;
    editor.hidden = false;
    openButton.hidden = true;
    meaningBox.focus();
  }

  function closeEditor() {
    editor.hidden = true;
    if (canEdit) openButton.hidden = false;
    statusBox.textContent = '';
  }

  async function handleImagePaste(event) {
    const items = [...(event.clipboardData?.items || [])];
    const imageItem = items.find(item => item.type.startsWith('image/'));
    if (imageItem) {
      event.preventDefault();
      statusBox.textContent = 'Đang xử lý ảnh...';
      try {
        const blob = imageItem.getAsFile();
        const dataURL = await imageBlobToDataURL(blob);
        setPreview(dataURL);
        statusBox.textContent = 'Đã dán ảnh. Nhấn LƯU để ghi nhớ.';
      } catch {
        statusBox.textContent = 'Không dán được ảnh này. Hãy thử ảnh khác.';
      }
      return true;
    }
    const text = event.clipboardData?.getData('text/plain')?.trim() || '';
    if (isImageText(text)) {
      event.preventDefault();
      setPreview(text);
      statusBox.textContent = 'Đã nhận link ảnh. Nhấn LƯU để ghi nhớ.';
      return true;
    }
    return false;
  }

  pasteBox.addEventListener('paste', handleImagePaste);
  editor.addEventListener('paste', event => {
    if (event.target === meaningBox) return;
    handleImagePaste(event);
  });

  pasteBox.addEventListener('click', () => {
    pasteBox.focus();
    statusBox.textContent = 'Bây giờ nhấn Ctrl+V để dán ảnh.';
  });

  removeImageButton.addEventListener('click', () => {
    setPreview('');
    statusBox.textContent = 'Đã bỏ ảnh. Nhấn LƯU để cập nhật.';
  });

  openButton.addEventListener('click', openEditor);
  cancelButton.addEventListener('click', closeEditor);

  saveButton.addEventListener('click', () => {
    customLookupTerm = resolveCurrentTerm();
    const meaning = meaningBox.value.trim();
    if (!customLookupTerm) {
      statusBox.textContent = 'Không xác định được từ cần lưu.';
      return;
    }
    if (!meaning && !pastedImageSource) {
      statusBox.textContent = 'Hãy nhập nghĩa hoặc dán ảnh trước khi lưu.';
      return;
    }
    try {
      setCustomLookup(customLookupTerm, {meaning, image: pastedImageSource});
      statusBox.textContent = '✓ Đã lưu dữ liệu cho từ này.';
      applyCustomResult();
      setTimeout(closeEditor, 650);
    } catch (error) {
      console.error(error);
      statusBox.textContent = 'Bộ nhớ trình duyệt đã đầy. Hãy thử ảnh nhỏ hơn.';
    }
  });

  deleteButton.addEventListener('click', () => {
    const term = resolveCurrentTerm();
    if (!term) return;
    deleteCustomLookup(term);
    statusBox.textContent = 'Đã xóa dữ liệu tự thêm. Lần sau sẽ dùng kết quả tra cứu mặc định.';
    deleteButton.hidden = true;
    setTimeout(() => location.reload(), 650);
  });

  function applyCustomResult() {
    if (applyingCustomLookup || overlay.hidden) return;
    const term = resolveCurrentTerm();
    const saved = term ? getCustomLookup(term) : null;
    if (!saved) return;

    applyingCustomLookup = true;
    customLookupTerm = saved.term || term;
    if (loadingBox) loadingBox.hidden = true;
    if (errorBox) errorBox.hidden = true;
    resultBox.hidden = false;

    if (resultTitle.textContent !== customLookupTerm) resultTitle.textContent = customLookupTerm;
    if (description.textContent !== saved.meaning) description.textContent = saved.meaning;

    if (saved.image) {
      if (image.src !== saved.image) image.src = saved.image;
      image.alt = `Hình minh họa ${customLookupTerm}`;
      image.hidden = false;
      if (noImage) noImage.hidden = true;
    } else {
      image.removeAttribute('src');
      image.hidden = true;
      if (noImage) noImage.hidden = false;
    }

    source.textContent = 'Nguồn: Dữ liệu giáo viên tự thêm';
    openButton.textContent = '✏️ CHỈNH NGHĨA & ẢNH';
    applyingCustomLookup = false;
  }

  const observer = new MutationObserver(() => {
    if (applyingCustomLookup) return;
    if (!overlay.hidden && overlay.classList.contains('show')) {
      const titleText = resultTitle.textContent.trim();
      if (!customLookupTerm && titleText) customLookupTerm = titleText;
      const saved = getCustomLookup(resolveCurrentTerm());
      if (saved) queueMicrotask(applyCustomResult);
      else openButton.textContent = '✏️ TỰ THÊM NGHĨA & ẢNH';
    } else {
      customLookupTerm = '';
      closeEditor();
    }
  });

  observer.observe(overlay, {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true,
    attributeFilter: ['hidden', 'class', 'src']
  });

  overlay.addEventListener('transitionend', () => {
    if (!overlay.hidden) applyCustomResult();
  });
}

setupCustomLookup();
