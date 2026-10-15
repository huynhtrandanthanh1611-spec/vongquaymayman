/* =========================================================
   DANH SÁCH NỘI DUNG CUỘN LIÊN TỤC
   Giữ nguyên logic phân trang nội bộ của app.js nhưng gom tất cả
   các trang thành một danh sách cuộn duy nhất cho người dùng.
   ========================================================= */

(() => {
  if (window.__continuousWheelListActive) return;
  window.__continuousWheelListActive = true;

  const list = document.getElementById('entry-list');
  const prev = document.getElementById('entry-prev');
  const next = document.getElementById('entry-next');
  const page = document.getElementById('entry-page');

  if (!list || !prev || !next || !page) {
    window.__continuousWheelListActive = false;
    return;
  }

  const pagination = page.closest('.pagination');

  const style = document.createElement('style');
  style.dataset.continuousWheelList = 'true';
  style.textContent = `
    #content-panel > .pagination{
      display:none !important;
    }
    #entry-list{
      max-height:clamp(300px,52vh,610px) !important;
      overflow-y:auto !important;
      overflow-x:hidden !important;
      overscroll-behavior:contain;
      scrollbar-gutter:stable;
      padding-right:7px;
      scroll-behavior:smooth;
    }
    #entry-list::-webkit-scrollbar{width:10px}
    #entry-list::-webkit-scrollbar-track{
      background:rgba(221,207,184,.22);
      border-radius:999px;
    }
    #entry-list::-webkit-scrollbar-thumb{
      background:#d6bd87;
      border-radius:999px;
      border:2px solid transparent;
      background-clip:padding-box;
    }
    #entry-list::-webkit-scrollbar-thumb:hover{background:#c5a668}
    @media(max-width:739px){
      #entry-list{max-height:58vh !important;padding-right:4px}
    }
  `;
  document.head.appendChild(style);

  if (pagination) {
    pagination.hidden = true;
    pagination.style.display = 'none';
  }

  let rebuilding = false;
  let scheduled = false;
  const observer = new MutationObserver(() => scheduleRebuild());

  function parseTotalPages() {
    const match = String(page.textContent || '').match(/\/\s*(\d+)/);
    const total = Number(match?.[1] || 1);
    return Number.isFinite(total) && total > 0 ? total : 1;
  }

  function waitForApp() {
    if (
      typeof prev.onclick !== 'function' ||
      typeof next.onclick !== 'function' ||
      document.documentElement.dataset.loading === 'true'
    ) {
      setTimeout(waitForApp, 80);
      return;
    }

    observer.observe(list, {childList:true});
    scheduleRebuild();
  }

  function scheduleRebuild() {
    if (rebuilding || scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      rebuildAllPages();
    }, 0);
  }

  function activeRowState() {
    const active = document.activeElement;
    const row = active?.closest?.('.entry-row');
    if (!row || !list.contains(row)) return null;

    return {
      id: row.dataset.id || '',
      start: typeof active.selectionStart === 'number' ? active.selectionStart : null,
      end: typeof active.selectionEnd === 'number' ? active.selectionEnd : null
    };
  }

  function restoreActiveRow(state) {
    if (!state?.id) return;
    const input = [...list.querySelectorAll('.entry-row')]
      .find(row => row.dataset.id === state.id)
      ?.querySelector('input[type="text"]');
    if (!input) return;

    input.focus({preventScroll:true});
    if (state.start !== null && state.end !== null) {
      try { input.setSelectionRange(state.start, state.end); } catch {}
    }
  }

  function rebuildAllPages() {
    if (rebuilding) return;
    rebuilding = true;
    observer.disconnect();

    const previousScroll = list.scrollTop;
    const focusState = activeRowState();

    try {
      let guard = 0;
      while (!prev.disabled && guard < 200) {
        prev.click();
        guard += 1;
      }

      const totalPages = parseTotalPages();
      const collected = [];
      const seen = new Set();
      let emptyNode = null;

      for (let current = 0; current < totalPages; current += 1) {
        const rows = [...list.querySelectorAll(':scope > .entry-row')];
        for (const row of rows) {
          const id = row.dataset.id || `row-${current}-${collected.length}`;
          if (seen.has(id)) continue;
          seen.add(id);
          collected.push(row);
        }

        if (!rows.length && !emptyNode) {
          emptyNode = list.querySelector(':scope > .empty-list');
        }

        if (current >= totalPages - 1 || next.disabled) break;
        next.click();
      }

      list.replaceChildren();
      if (collected.length) {
        list.append(...collected);
      } else if (emptyNode) {
        list.append(emptyNode);
      }

      if (pagination) {
        pagination.hidden = true;
        pagination.style.display = 'none';
      }

      list.scrollTop = Math.min(
        previousScroll,
        Math.max(0, list.scrollHeight - list.clientHeight)
      );
      restoreActiveRow(focusState);
    } finally {
      observer.observe(list, {childList:true});
      rebuilding = false;
    }
  }

  waitForApp();
})();
