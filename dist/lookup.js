/* =========================================================
   TRA CỨU NHANH - WIKIPEDIA + WIKIDATA
   Không cần API key / không cần backend
   ========================================================= */

const LOOKUP_MAX_LENGTH = 80;
const lookupCache = new Map();

let currentLookupText = "";
let currentLookupTitle = "";
let currentLookupDescription = "";
let lookupSpeaking = false;
let lookupUtterance = null;

/* =========================
   TẠO NÚT KÍNH LÚP
   ========================= */

const lookupButton = document.createElement("button");

lookupButton.type = "button";
lookupButton.className = "lookup-selection-button";
lookupButton.setAttribute(
  "aria-label",
  "Tra cứu nội dung đã chọn"
);

lookupButton.innerHTML = "🔍";
lookupButton.hidden = true;

document.body.appendChild(lookupButton);


/* =========================
   TẠO POPUP
   ========================= */

const lookupOverlay = document.createElement("div");

lookupOverlay.className = "lookup-overlay";
lookupOverlay.hidden = true;

lookupOverlay.innerHTML = `
  <section
    class="lookup-popup"
    role="dialog"
    aria-modal="true"
    aria-labelledby="lookup-title"
  >

    <button
      type="button"
      class="lookup-close"
      aria-label="Đóng tra cứu"
    >
      ×
    </button>

    <div class="lookup-heading">
      <span class="lookup-heading-icon">🔎</span>
      <h2 id="lookup-title">TRA CỨU NHANH</h2>
    </div>

    <div class="lookup-body">

      <div class="lookup-loading">
        <div class="lookup-loading-icon">🔍✨</div>
        <p>Đang tra cứu...</p>
      </div>

      <div class="lookup-result" hidden>

        <div class="lookup-image-box">
          <img
            class="lookup-image"
            alt=""
            hidden
          >

          <div class="lookup-no-image" hidden>
            <span>🖼️</span>
            <p>Chưa có hình minh họa</p>
          </div>
        </div>

        <h3 class="lookup-result-title"></h3>

        <p class="lookup-description"></p>

        <button
          type="button"
          class="lookup-speak-button"
          aria-label="Đọc nội dung tra cứu"
          aria-pressed="false"
        >
          🔊 ĐỌC CHO EM NGHE
        </button>

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


const popup = lookupOverlay.querySelector(".lookup-popup");
const closeButton = lookupOverlay.querySelector(".lookup-close");

const loadingBox = lookupOverlay.querySelector(".lookup-loading");
const resultBox = lookupOverlay.querySelector(".lookup-result");
const errorBox = lookupOverlay.querySelector(".lookup-error");

const resultTitle = lookupOverlay.querySelector(".lookup-result-title");
const descriptionBox = lookupOverlay.querySelector(".lookup-description");

const imageBox = lookupOverlay.querySelector(".lookup-image");
const noImageBox = lookupOverlay.querySelector(".lookup-no-image");

const sourceBox = lookupOverlay.querySelector(".lookup-source");

const speakButton = lookupOverlay.querySelector(".lookup-speak-button");


/* =========================
   LẤY VĂN BẢN ĐANG TÔ ĐEN
   ========================= */

function getSelectedLookupText() {

  const selection = window.getSelection();

  if (
    !selection ||
    selection.rangeCount === 0 ||
    selection.isCollapsed
  ) {
    return "";
  }

  let text = selection.toString().trim();

  if (!text) return "";

  if (text.length > LOOKUP_MAX_LENGTH) {
    return "";
  }

  const range = selection.getRangeAt(0);

  let node = range.commonAncestorContainer;

  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentElement;
  }

  if (!node) return "";

  /*
    Không tra cứu chữ trong các khu vực nhập liệu
  */

  if (
    node.closest(
      "input, textarea, select, button, [contenteditable='true'], .lookup-popup"
    )
  ) {
    return "";
  }

  return text;
}


/* =========================
   VỊ TRÍ KÍNH LÚP
   ========================= */

function positionLookupButton() {

  const selection = window.getSelection();

  if (
    !selection ||
    selection.rangeCount === 0
  ) {
    hideLookupButton();
    return;
  }

  const range = selection.getRangeAt(0);

  const rect = range.getBoundingClientRect();

  if (!rect.width && !rect.height) {
    hideLookupButton();
    return;
  }

  const buttonSize = 48;

  let left =
    rect.left +
    rect.width / 2 -
    buttonSize / 2;

  let top =
    rect.top -
    buttonSize -
    10;

  /*
    Nếu phía trên không đủ chỗ
    thì cho kính lúp xuống dưới.
  */

  if (top < 8) {
    top =
      rect.bottom +
      10;
  }

  left = Math.max(
    8,
    Math.min(
      window.innerWidth - buttonSize - 8,
      left
    )
  );

  lookupButton.style.left =
    `${left}px`;

  lookupButton.style.top =
    `${top}px`;
}


/* =========================
   HIỆN / ẨN KÍNH LÚP
   ========================= */

function showLookupButton() {

  const text = getSelectedLookupText();

  if (!text) {

    hideLookupButton();

    return;
  }

  currentLookupText = text;

  lookupButton.hidden = false;

  requestAnimationFrame(() => {

    lookupButton.classList.add("show");

    positionLookupButton();

  });
}


function hideLookupButton() {

  lookupButton.classList.remove("show");

  lookupButton.hidden = true;
}


/* =========================
   TÓM TẮT NỘI DUNG
   ========================= */

function shortenText(text, maxLength = 380) {

  if (!text) return "";

  text = text
    .replace(/\s+/g, " ")
    .trim();

  /*
    Ưu tiên 2–3 câu đầu.
  */

  const sentences =
    text.match(/[^.!?]+[.!?]+/g) || [];

  if (sentences.length) {

    let result = "";

    for (const sentence of sentences.slice(0, 3)) {

      if (
        (result + sentence).length >
        maxLength
      ) {
        break;
      }

      result += sentence;
    }

    if (result.trim()) {
      return result.trim();
    }
  }

  if (text.length <= maxLength) {
    return text;
  }

  const cut =
    text.slice(0, maxLength);

  const lastSpace =
    cut.lastIndexOf(" ");

  return (
    cut.slice(
      0,
      lastSpace > 0
        ? lastSpace
        : maxLength
    ) + "…"
  );
}


/* =========================
   TRA WIKIPEDIA
   ========================= */

async function searchWikipedia(term) {

  const params =
    new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",

      generator: "search",
      gsrsearch: term,
      gsrlimit: "1",

      prop: "extracts|pageimages|info",

      exintro: "1",
      explaintext: "1",

      piprop: "thumbnail",
      pithumbsize: "700",

      inprop: "url",

      redirects: "1"
    });

  const url =
    "https://vi.wikipedia.org/w/api.php?" +
    params.toString();

  const response =
    await fetch(url);

  if (!response.ok) {
    throw new Error(
      "Wikipedia request failed"
    );
  }

  const data =
    await response.json();

  const pages =
    data?.query?.pages;

  if (!pages) {
    return null;
  }

  const page =
    Object.values(pages)[0];

  if (!page) {
    return null;
  }

  const description =
    shortenText(page.extract || "");

  /*
    Nếu tìm được trang nhưng không có
    nội dung giải thích thì thử Wikidata.
  */

  if (!description) {
    return null;
  }

  return {
    title:
      page.title || term,

    description,

    image:
      page.thumbnail?.source || "",

    source:
      "Wikipedia",

    url:
      page.fullurl || ""
  };
}


/* =========================
   TRA WIKIDATA DỰ PHÒNG
   ========================= */

async function searchWikidata(term) {

  const params =
    new URLSearchParams({
      action: "wbsearchentities",
      search: term,
      language: "vi",
      uselang: "vi",
      type: "item",
      limit: "1",
      format: "json",
      origin: "*"
    });

  const url =
    "https://www.wikidata.org/w/api.php?" +
    params.toString();

  const response =
    await fetch(url);

  if (!response.ok) {
    throw new Error(
      "Wikidata request failed"
    );
  }

  const data =
    await response.json();

  const item =
    data?.search?.[0];

  if (!item) {
    return null;
  }

  /*
    Lấy thêm dữ liệu của thực thể
    để tìm hình P18.
  */

  let image = "";

  try {

    const entityParams =
      new URLSearchParams({
        action: "wbgetentities",
        ids: item.id,
        props: "claims",
        format: "json",
        origin: "*"
      });

    const entityURL =
      "https://www.wikidata.org/w/api.php?" +
      entityParams.toString();

    const entityResponse =
      await fetch(entityURL);

    const entityData =
      await entityResponse.json();

    const entity =
      entityData?.entities?.[item.id];

    const filename =
      entity
        ?.claims
        ?.P18
        ?.[0]
        ?.mainsnak
        ?.datavalue
        ?.value;

    if (filename) {

      image =
        "https://commons.wikimedia.org/wiki/Special:FilePath/" +
        encodeURIComponent(filename) +
        "?width=700";
    }

  } catch (error) {

    /*
      Không có ảnh vẫn cho hiển thị
      thông tin văn bản.
    */

  }

  const description =
    item.description
      ? item.description.trim()
      : "";

  if (!description) {
    return null;
  }

  return {
    title:
      item.label || term,

    description:
      shortenText(
        description,
        300
      ),

    image,

    source:
      "Wikidata",

    url:
      item.concepturi || ""
  };
}


/* =========================
   TRA CỨU CHUNG
   ========================= */

async function lookupTerm(term) {

  const key =
    term
      .trim()
      .toLocaleLowerCase("vi");

  /*
    Dùng cache nếu đã tra trước đó.
  */

  if (lookupCache.has(key)) {
    return lookupCache.get(key);
  }

  let result = null;

  /*
    Ưu tiên Wikipedia.
  */

  try {

    result =
      await searchWikipedia(term);

  } catch (error) {

    console.warn(
      "Wikipedia:",
      error
    );
  }

  /*
    Không tìm được thì dùng Wikidata.
  */

  if (!result) {

    try {

      result =
        await searchWikidata(term);

    } catch (error) {

      console.warn(
        "Wikidata:",
        error
      );
    }
  }

  if (result) {
    lookupCache.set(
      key,
      result
    );
  }

  return result;
}


/* =========================
   LOADING
   ========================= */

function showLookupLoading() {

  loadingBox.hidden = false;

  resultBox.hidden = true;

  errorBox.hidden = true;
}


/* =========================
   LỖI
   ========================= */

function showLookupError(message) {

  loadingBox.hidden = true;

  resultBox.hidden = true;

  errorBox.hidden = false;

  errorBox.querySelector("p")
    .textContent =
      message;
}


/* =========================
   HIỂN THỊ KẾT QUẢ
   ========================= */

function renderLookupResult(data) {

  loadingBox.hidden = true;

  errorBox.hidden = true;

  resultBox.hidden = false;

  currentLookupTitle =
    data.title || "";

  currentLookupDescription =
    data.description || "";

  resultTitle.textContent =
    currentLookupTitle;

  descriptionBox.textContent =
    currentLookupDescription;

  if (data.image) {

    imageBox.src =
      data.image;

    imageBox.alt =
      `Hình minh họa ${data.title}`;

    imageBox.hidden = false;

    noImageBox.hidden = true;

  } else {

    imageBox.removeAttribute(
      "src"
    );

    imageBox.hidden = true;

    noImageBox.hidden = false;
  }

  sourceBox.textContent =
    `Nguồn: ${data.source}`;

  speakButton.disabled = false;

  updateSpeakButton();
}


/* =========================
   MỞ POPUP
   ========================= */

async function openLookupPopup(term) {

  if (!term) return;

  stopLookupSpeech();

  currentLookupText =
    term.trim();

  currentLookupTitle = "";

  currentLookupDescription = "";

  hideLookupButton();

  lookupOverlay.hidden = false;

  requestAnimationFrame(() => {

    lookupOverlay
      .classList
      .add("show");

  });

  showLookupLoading();

  speakButton.disabled = true;

  try {

    const result =
      await lookupTerm(
        currentLookupText
      );

    if (!result) {

      showLookupError(
        `Chưa tìm thấy thông tin phù hợp cho “${currentLookupText}”.`
      );

      return;
    }

    renderLookupResult(
      result
    );

  } catch (error) {

    console.error(error);

    showLookupError(
      "Chưa thể tra cứu lúc này. Em thử lại sau nhé!"
    );
  }
}


/* =========================
   ĐÓNG POPUP
   ========================= */

function closeLookupPopup() {

  stopLookupSpeech();

  lookupOverlay
    .classList
    .remove("show");

  setTimeout(() => {

    lookupOverlay.hidden = true;

  }, 180);
}


/* =========================
   GIỌNG TIẾNG VIỆT
   ========================= */

function getVietnameseVoice() {

  if (
    !("speechSynthesis" in window)
  ) {
    return null;
  }

  const voices =
    window.speechSynthesis
      .getVoices();

  return (
    voices.find(
      voice =>
        voice.lang === "vi-VN"
    ) ||

    voices.find(
      voice =>
        voice.lang
          ?.toLowerCase()
          .startsWith("vi")
    ) ||

    null
  );
}


/* =========================
   NÚT ĐỌC
   ========================= */

function updateSpeakButton() {

  if (!speakButton) return;

  if (lookupSpeaking) {

    speakButton.textContent =
      "⏹ DỪNG ĐỌC";

    speakButton.setAttribute(
      "aria-label",
      "Dừng đọc nội dung tra cứu"
    );

    speakButton.setAttribute(
      "aria-pressed",
      "true"
    );

  } else {

    speakButton.textContent =
      "🔊 ĐỌC CHO EM NGHE";

    speakButton.setAttribute(
      "aria-label",
      "Đọc nội dung tra cứu"
    );

    speakButton.setAttribute(
      "aria-pressed",
      "false"
    );
  }
}


function stopLookupSpeech() {

  if (
    "speechSynthesis" in window
  ) {

    window.speechSynthesis
      .cancel();
  }

  lookupUtterance = null;

  lookupSpeaking = false;

  updateSpeakButton();
}


function speakLookupResult() {

  if (
    !("speechSynthesis" in window)
  ) {
    return;
  }

  if (lookupSpeaking) {

    stopLookupSpeech();

    return;
  }

  if (
    !currentLookupTitle ||
    !currentLookupDescription
  ) {
    return;
  }

  window.speechSynthesis.cancel();

  const text =
    `${currentLookupTitle}. ${currentLookupDescription}`;

  const utterance =
    new SpeechSynthesisUtterance(
      text
    );

  utterance.lang =
    "vi-VN";

  utterance.rate =
    0.85;

  utterance.pitch =
    1.05;

  utterance.volume =
    1;

  const voice =
    getVietnameseVoice();

  if (voice) {
    utterance.voice = voice;
  }

  utterance.onstart = () => {

    lookupSpeaking = true;

    updateSpeakButton();
  };

  utterance.onend = () => {

    lookupSpeaking = false;

    lookupUtterance = null;

    updateSpeakButton();
  };

  utterance.onerror = () => {

    lookupSpeaking = false;

    lookupUtterance = null;

    updateSpeakButton();
  };

  lookupUtterance =
    utterance;

  window.speechSynthesis
    .speak(utterance);
}


/* =========================
   EVENTS
   ========================= */

document.addEventListener(
  "mouseup",
  () => {

    setTimeout(
      showLookupButton,
      10
    );
  }
);


document.addEventListener(
  "touchend",
  () => {

    setTimeout(
      showLookupButton,
      120
    );
  }
);


/*
  pointerdown thay vì click
  để selection không bị mất
  trước khi mở popup.
*/

lookupButton.addEventListener(
  "pointerdown",
  event => {

    event.preventDefault();

    event.stopPropagation();

    const text =
      currentLookupText;

    if (text) {
      openLookupPopup(text);
    }
  }
);


closeButton.addEventListener(
  "click",
  closeLookupPopup
);


lookupOverlay.addEventListener(
  "click",
  event => {

    if (
      event.target === lookupOverlay
    ) {

      closeLookupPopup();
    }
  }
);


popup.addEventListener(
  "click",
  event => {

    event.stopPropagation();
  }
);


speakButton.addEventListener(
  "click",
  speakLookupResult
);


document.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Escape" &&
      !lookupOverlay.hidden
    ) {

      /*
        Chặn Escape truyền tới app.js để không thoát
        khỏi chế độ CHƠI khi chỉ muốn đóng popup.
      */
      event.preventDefault();
      event.stopPropagation();

      closeLookupPopup();
    }
  },
  true
);


window.addEventListener(
  "resize",
  hideLookupButton
);


window.addEventListener(
  "scroll",
  hideLookupButton,
  true
);


/*
  Cho phép tải danh sách voice
  chậm trên Chrome/Safari.
*/

if (
  "speechSynthesis" in window
) {

  window.speechSynthesis
    .addEventListener?.(
      "voiceschanged",
      () => {
        getVietnameseVoice();
      }
    );

} else {

  speakButton.hidden = true;
}


/* =========================
   CHO PHÉP TÔ ĐEN KẾT QUẢ
   ========================= */

document.documentElement
  .classList
  .add("lookup-enabled");