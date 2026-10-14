/* =========================================================
   CÔNG CỤ GIÁO VIÊN: CHUẨN BỊ NGHĨA/ẢNH + KHÔI PHỤC LƯỢT
   - Thêm nghĩa và ảnh TRƯỚC KHI CHƠI, ngay tại từng dòng nội dung.
   - Ctrl+V ảnh hoặc link ảnh.
   - Khôi phục riêng từng chữ đã quay mà không cần gõ lại.
   - Không gọi API mạng, tránh lag.
   ========================================================= */

const CUSTOM_LOOKUP_STORAGE = 'lucky-lookup-custom-v1';
const WHEEL_LOCAL_KEY = 'classroom-lucky-wheel-v1';
const WHEEL_DB = 'lucky-classroom-images';

const normalizeLookupKey = text =>
  String(text || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');

function loadLookupStore() {
  try {
    const raw = localStorage.getItem(CUSTOM_LOOKUP_STORAGE);
    const data = raw ? JSON.parse(raw) : {};
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

function saveLookupRecord(term, meaning, image) {
  const key = normalizeLookupKey(term);
  if (!key) return;
  const store = loadLookupStore();
  store[key] = {
    term: String(term).trim(),
    meaning: String(meaning || '').trim(),
    image: String(image || ''),
    updatedAt: Date.now()
  };
  localStorage.setItem(CUSTOM_LOOKUP_STORAGE, JSON.stringify(store));
}

function deleteLookupRecord(term) {
  const key = normalizeLookupKey(term);
  const store = loadLookupStore();
  delete store[key];
  localStorage.setItem(CUSTOM_LOOKUP_STORAGE, JSON.stringify(store));
}

function getLookupRecord(term) {
  return loadLookupStore()[normalizeLookupKey(term)] || null;
}

function blobToDataURL(blob, maxSide = 900) {
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
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', .82));
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

/* ---------- HỘP SOẠN NGHĨA / ẢNH ---------- */

const editorOverlay = document.createElement('div');
editorOverlay.className = 'prep-lookup-overlay';
editorOverlay.hidden = true;
editorOverlay.innerHTML = `
  <section class="prep-lookup-card" role="dialog" aria-modal="true" aria-labelledby="prep-lookup-heading">
    <button type="button" class="prep-lookup-close" aria-label="Đóng">×</button>
    <h2 id="prep-lookup-heading">CHUẨN BỊ TRA CỨU</h2>
    <div class="prep-lookup-term"></div>
    <label class="prep-lookup-label" for="prep-lookup-meaning">NGHĨA CỦA TỪ</label>
    <textarea id="prep-lookup-meaning" class="prep-lookup-meaning" rows="5" placeholder="Nhập hoặc Ctrl+V nghĩa của từ..."></textarea>
    <div class="prep-lookup-label">HÌNH MINH HỌA</div>
    <div class="prep-lookup-paste" tabindex="0">
      <span class="prep-lookup-paste-icon">📋🖼️</span>
      <strong>Bấm vào đây rồi Ctrl+V để dán ảnh</strong>
      <small>Hoặc dán link ảnh công khai</small>
    </div>
    <div class="prep-lookup-preview" hidden><img alt="Ảnh minh họa đã dán"><button type="button">XÓA ẢNH</button></div>
    <div class="prep-lookup-status" role="status"></div>
    <div class="prep-lookup-actions">
      <button type="button" class="prep-lookup-delete">XÓA DỮ LIỆU</button>
      <button type="button" class="prep-lookup-save">✓ LƯU</button>
    </div>
  </section>
`;
document.body.appendChild(editorOverlay);

const editorCard = editorOverlay.querySelector('.prep-lookup-card');
const closeEditorButton = editorOverlay.querySelector('.prep-lookup-close');
const termLabel = editorOverlay.querySelector('.prep-lookup-term');
const meaningInput = editorOverlay.querySelector('.prep-lookup-meaning');
const pasteArea = editorOverlay.querySelector('.prep-lookup-paste');
const preview = editorOverlay.querySelector('.prep-lookup-preview');
const previewImage = preview.querySelector('img');
const removePreview = preview.querySelector('button');
const statusBox = editorOverlay.querySelector('.prep-lookup-status');
const deleteButton = editorOverlay.querySelector('.prep-lookup-delete');
const saveButton = editorOverlay.querySelector('.prep-lookup-save');

let editingTerm = '';
let editingImage = '';

function setImagePreview(src) {
  editingImage = src || '';
  if (editingImage) {
    previewImage.src = editingImage;
    preview.hidden = false;
  } else {
    previewImage.removeAttribute('src');
    preview.hidden = true;
  }
}

function openPrepEditor(term) {
  const clean = String(term || '').trim();
  if (!clean) return;
  editingTerm = clean;
  const saved = getLookupRecord(clean);
  termLabel.textContent = `Từ: “${clean}”`;
  meaningInput.value = saved?.meaning || '';
  setImagePreview(saved?.image || '');
  deleteButton.hidden = !saved;
  statusBox.textContent = saved ? 'Đang chỉnh dữ liệu đã lưu.' : 'Nhập nghĩa và ảnh trước khi chơi.';
  editorOverlay.hidden = false;
  requestAnimationFrame(() => editorOverlay.classList.add('show'));
  meaningInput.focus({preventScroll:true});
}

function closePrepEditor() {
  editorOverlay.classList.remove('show');
  setTimeout(() => { editorOverlay.hidden = true; }, 160);
}

async function handleImagePaste(event) {
  const items = [...(event.clipboardData?.items || [])];
  const imageItem = items.find(item => item.type.startsWith('image/'));
  if (imageItem) {
    event.preventDefault();
    statusBox.textContent = 'Đang xử lý ảnh...';
    try {
      const data = await blobToDataURL(imageItem.getAsFile());
      setImagePreview(data);
      statusBox.textContent = '✓ Đã dán ảnh.';
    } catch {
      statusBox.textContent = 'Không đọc được ảnh này.';
    }
    return;
  }
  const text = event.clipboardData?.getData('text/plain')?.trim() || '';
  if (/^(?:data:image\/|https?:\/\/)/i.test(text)) {
    event.preventDefault();
    setImagePreview(text);
    statusBox.textContent = '✓ Đã nhận link ảnh.';
  }
}

pasteArea.addEventListener('click', () => {
  pasteArea.focus();
  statusBox.textContent = 'Nhấn Ctrl+V để dán ảnh.';
});
pasteArea.addEventListener('paste', handleImagePaste);
editorCard.addEventListener('paste', event => {
  if (event.target !== meaningInput) handleImagePaste(event);
});
removePreview.addEventListener('click', () => {
  setImagePreview('');
  statusBox.textContent = 'Đã bỏ ảnh.';
});
closeEditorButton.addEventListener('click', closePrepEditor);
editorOverlay.addEventListener('click', event => {
  if (event.target === editorOverlay) closePrepEditor();
});

saveButton.addEventListener('click', () => {
  const meaning = meaningInput.value.trim();
  if (!meaning && !editingImage) {
    statusBox.textContent = 'Hãy nhập nghĩa hoặc dán ảnh trước khi lưu.';
    return;
  }
  try {
    saveLookupRecord(editingTerm, meaning, editingImage);
    statusBox.textContent = '✓ Đã lưu. Khi chơi, tra cứu sẽ dùng dữ liệu này.';
    refreshEntryButtons();
    setTimeout(closePrepEditor, 500);
  } catch {
    statusBox.textContent = 'Không lưu được. Hãy thử ảnh nhỏ hơn.';
  }
});

deleteButton.addEventListener('click', () => {
  deleteLookupRecord(editingTerm);
  statusBox.textContent = 'Đã xóa dữ liệu tra cứu của từ này.';
  refreshEntryButtons();
  setTimeout(closePrepEditor, 450);
});

/* ---------- NÚT NGHĨA & ẢNH NGAY Ở DANH SÁCH ---------- */

function refreshEntryButtons() {
  const rows = document.querySelectorAll('#entry-list .entry-row');
  rows.forEach(row => {
    const input = row.querySelector('input[type="text"]');
    if (!input) return;

    let button = row.querySelector('.prep-lookup-row-button');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'prep-lookup-row-button';
      button.addEventListener('click', () => openPrepEditor(input.value));
      const actions = row.querySelector('.row-actions');
      if (actions) actions.prepend(button);
      else row.append(button);
    }

    const hasData = !!getLookupRecord(input.value);
    button.classList.toggle('ready', hasData);
    button.textContent = hasData ? '✓ NGHĨA & ẢNH' : '＋ NGHĨA & ẢNH';
    button.title = hasData ? 'Chỉnh nghĩa và ảnh đã chuẩn bị' : 'Thêm nghĩa và ảnh trước khi chơi';
    button.disabled = !input.value.trim();
  });
}

const entryList = document.getElementById('entry-list');
if (entryList) {
  new MutationObserver(refreshEntryButtons).observe(entryList, {childList:true});
  entryList.addEventListener('input', () => setTimeout(refreshEntryButtons, 0));
  refreshEntryButtons();
}

/* ---------- KHÔI PHỤC RIÊNG MỘT CHỮ ĐÃ QUAY ---------- */

function openWheelDB() {
  return new Promise((resolve, reject) => {
    if (!indexedDB) return reject(new Error('Không có IndexedDB'));
    const request = indexedDB.open(WHEEL_DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('sessions')) request.result.createObjectStore('sessions');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function updateIndexedRecord(updater) {
  try {
    const db = await openWheelDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('sessions', 'readwrite');
      const store = tx.objectStore('sessions');
      const get = store.get('teacher');
      get.onsuccess = () => {
        const record = get.result;
        if (record) store.put(updater(record), 'teacher');
      };
      tx.oncomplete = resolve;
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
    db.close();
  } catch {}
}

function sameHistoryEntry(entry, id, text) {
  if (!entry) return false;
  if (id && entry.id === id) return true;
  return normalizeLookupKey(entry.text) === normalizeLookupKey(text);
}

async function restoreHistoryEntry(id, text) {
  const now = Date.now() + 1000;
  const patch = record => {
    const copy = {...record};
    copy.history = Array.isArray(copy.history)
      ? copy.history.filter(entry => !sameHistoryEntry(entry, id, text))
      : [];
    if (sameHistoryEntry(copy.last, id, text)) copy.last = null;
    copy._savedAt = Math.max(now, Number(copy._savedAt || 0) + 1);
    return copy;
  };

  try {
    const raw = localStorage.getItem(WHEEL_LOCAL_KEY);
    const localRecord = raw ? JSON.parse(raw) : null;
    if (localRecord) localStorage.setItem(WHEEL_LOCAL_KEY, JSON.stringify(patch(localRecord)));
  } catch {}

  await updateIndexedRecord(patch);
  location.reload();
}

function refreshHistoryButtons() {
  const items = document.querySelectorAll('#history-list .history-item');
  items.forEach(li => {
    if (li.querySelector('.restore-history-button')) return;
    const title = li.querySelector('strong');
    if (!title) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'restore-history-button';
    button.textContent = '↩ KHÔI PHỤC';
    button.title = 'Đưa chữ này trở lại vòng quay';
    button.addEventListener('click', async () => {
      button.disabled = true;
      button.textContent = 'ĐANG KHÔI PHỤC…';
      await restoreHistoryEntry('', title.textContent || '');
    });
    li.append(button);
  });
}

const historyList = document.getElementById('history-list');
if (historyList) {
  new MutationObserver(refreshHistoryButtons).observe(historyList, {childList:true});
  refreshHistoryButtons();
}
