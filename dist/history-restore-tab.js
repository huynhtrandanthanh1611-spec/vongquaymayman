/* Giữ người dùng ở tab Lịch sử sau khi bấm KHÔI PHỤC. */
const HISTORY_RETURN_KEY = 'lucky-return-to-history-v1';

/* Ghi nhớ trước khi lookup-custom.js cập nhật dữ liệu và reload trang. */
document.addEventListener('pointerdown', event => {
  const button = event.target.closest?.('.restore-history-button');
  if (!button) return;
  try {
    sessionStorage.setItem(HISTORY_RETURN_KEY, '1');
  } catch {}
}, true);

function returnToHistoryTab() {
  let shouldReturn = false;
  try {
    shouldReturn = sessionStorage.getItem(HISTORY_RETURN_KEY) === '1';
  } catch {}
  if (!shouldReturn) return;

  let attempts = 0;
  const openHistory = () => {
    attempts += 1;
    const tab = document.getElementById('history-tab');

    /* app.js gắn onclick khi giao diện đã khởi tạo xong. */
    if (tab && typeof tab.onclick === 'function') {
      try { sessionStorage.removeItem(HISTORY_RETURN_KEY); } catch {}
      tab.click();
      requestAnimationFrame(() => tab.focus?.({preventScroll:true}));
      return;
    }

    if (attempts < 80) setTimeout(openHistory, 50);
  };

  openHistory();
}

returnToHistoryTab();
