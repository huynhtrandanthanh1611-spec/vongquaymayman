/* =========================================================
   KHÔI PHỤC MỘT CHỮ ĐÃ QUAY
   - Đưa chữ trở lại vòng quay / danh sách nội dung.
   - Không để chữ biến mất do chỉ xóa khỏi lịch sử.
   - Sau reload vẫn quay lại đúng tab Lịch sử.
   ========================================================= */

const HISTORY_RETURN_KEY = 'lucky-return-to-history-v2';
const WHEEL_LOCAL_KEY = 'classroom-lucky-wheel-v1';
const WHEEL_DB = 'lucky-classroom-images';

const normalizeRestoreText = text =>
  String(text || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('vi');

function sameEntry(entry, text) {
  return !!entry && normalizeRestoreText(entry.text) === normalizeRestoreText(text);
}

function cleanRestoredEntry(entry) {
  if (!entry) return null;
  const copy = {...entry};
  delete copy.at;
  return copy;
}

function patchRecord(record, text, savedAt) {
  if (!record || typeof record !== 'object') return record;

  const history = Array.isArray(record.history) ? [...record.history] : [];
  let index = -1;

  /* Lịch sử hiển thị mới nhất trước, nên khôi phục lần xuất hiện gần nhất. */
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (sameEntry(history[i], text)) {
      index = i;
      break;
    }
  }

  if (index < 0) return {...record, _savedAt: savedAt};

  const [historyEntry] = history.splice(index, 1);
  const restored = cleanRestoredEntry(historyEntry);
  const restoredId = restored?.id;

  const items = Array.isArray(record.items) ? [...record.items] : [];
  const draft = Array.isArray(record.draft) ? [...record.draft] : [];

  /* Bảo đảm chữ thực sự tồn tại lại trong nội dung và vòng quay. */
  const hasItem = restoredId
    ? items.some(item => item?.id === restoredId)
    : items.some(item => sameEntry(item, text));

  const hasDraft = restoredId
    ? draft.some(item => item?.id === restoredId)
    : draft.some(item => sameEntry(item, text));

  if (restored && !hasItem) items.push({...restored});
  if (restored && !hasDraft) draft.push({...restored});

  let last = record.last;
  if (
    last &&
    ((restoredId && last.id === restoredId) || sameEntry(last, text))
  ) {
    last = null;
  }

  return {
    ...record,
    items,
    draft,
    history,
    last,
    _savedAt: savedAt
  };
}

function openWheelDB() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error('IndexedDB không khả dụng'));
      return;
    }

    const request = indexedDB.open(WHEEL_DB, 1);

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('sessions')) {
        request.result.createObjectStore('sessions');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Không mở được bộ nhớ'));
  });
}

async function patchIndexedRecord(text, savedAt) {
  const db = await openWheelDB();

  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction('sessions', 'readwrite');
      const store = tx.objectStore('sessions');
      const request = store.get('teacher');

      request.onsuccess = () => {
        const record = request.result;
        if (record) store.put(patchRecord(record, text, savedAt), 'teacher');
      };

      tx.oncomplete = resolve;
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('Không lưu được'));
    });
  } finally {
    db.close();
  }
}

async function restorePersistedEntry(text) {
  const savedAt = Date.now() + 10000;
  let restoredSomewhere = false;

  try {
    const raw = localStorage.getItem(WHEEL_LOCAL_KEY);
    const record = raw ? JSON.parse(raw) : null;

    if (record) {
      const next = patchRecord(record, text, savedAt);
      localStorage.setItem(WHEEL_LOCAL_KEY, JSON.stringify(next));
      restoredSomewhere = true;
    }
  } catch (error) {
    console.warn('Không cập nhật được localStorage:', error);
  }

  try {
    await patchIndexedRecord(text, savedAt);
    restoredSomewhere = true;
  } catch (error) {
    console.warn('Không cập nhật được IndexedDB:', error);
  }

  if (!restoredSomewhere) {
    throw new Error('Không tìm thấy dữ liệu vòng quay đã lưu.');
  }
}

/*
  Chặn handler cũ của lookup-custom.js ở capture phase.
  Nhờ vậy chỉ có MỘT cơ chế khôi phục chạy, tránh ghi đè dữ liệu lẫn nhau.
*/
document.addEventListener('click', async event => {
  const button = event.target.closest?.('.restore-history-button');
  if (!button) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  const row = button.closest('.history-item');
  const title = row?.querySelector('strong');
  const text = String(title?.textContent || '').trim();

  if (!text) return;

  button.disabled = true;
  button.textContent = 'ĐANG KHÔI PHỤC…';

  try {
    sessionStorage.setItem(HISTORY_RETURN_KEY, '1');
  } catch {}

  try {
    await restorePersistedEntry(text);
    location.reload();
  } catch (error) {
    console.error(error);
    button.disabled = false;
    button.textContent = '↩ KHÔI PHỤC';
    try { sessionStorage.removeItem(HISTORY_RETURN_KEY); } catch {}
  }
}, true);

/*
  Sau reload, chờ app.js khởi tạo XONG rồi mới ép tab Lịch sử.
  Tiếp tục giữ tab trong một khoảng ngắn để không bị app.js đổi lại Nội dung.
*/
function returnToHistoryTab() {
  let shouldReturn = false;

  try {
    shouldReturn = sessionStorage.getItem(HISTORY_RETURN_KEY) === '1';
  } catch {}

  if (!shouldReturn) return;

  let attempts = 0;
  let stableHits = 0;

  const enforceHistory = () => {
    attempts += 1;

    const tab = document.getElementById('history-tab');
    const workspace = document.getElementById('workspace');

    if (tab && typeof tab.onclick === 'function') {
      if (workspace?.dataset.editorTab !== 'history') {
        tab.click();
      }

      if (workspace?.dataset.editorTab === 'history') {
        stableHits += 1;
        tab.focus?.({preventScroll:true});
      } else {
        stableHits = 0;
      }

      /* Giữ đúng tab qua vài nhịp render rồi mới bỏ cờ. */
      if (stableHits >= 5) {
        try { sessionStorage.removeItem(HISTORY_RETURN_KEY); } catch {}
        return;
      }
    }

    if (attempts < 120) setTimeout(enforceHistory, 100);
  };

  setTimeout(enforceHistory, 120);
}

returnToHistoryTab();
