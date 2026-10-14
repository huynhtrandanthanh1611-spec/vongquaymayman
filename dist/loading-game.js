/* =========================================================
   MINI GAME KHỦNG LONG TRONG LÚC TẢI WEBSITE
   Space / ArrowUp / chạm màn hình để nhảy.
   Tự dừng ngay khi app chính tải xong.
   ========================================================= */

(() => {
  const loading = document.querySelector('.startup-loading');
  if (!loading || document.documentElement.dataset.loading !== 'true') return;

  const style = document.createElement('style');
  style.textContent = `
    [data-loading=true] .startup-loading.interactive-dino{
      position:relative;
      display:block;
      width:min(560px,92vw);
      height:300px;
      padding:18px 18px 14px;
      box-sizing:border-box;
      overflow:hidden;
      border:3px solid #f4cf72;
      border-radius:26px;
      background:linear-gradient(180deg,#d8f2ff 0 68%,#fff8e7 68% 80%,#f5e6b9 80% 100%);
      color:#76501e;
      box-shadow:0 14px 34px rgba(116,92,48,.16);
      font-family:"Quicksand",system-ui,sans-serif;
      user-select:none;
      touch-action:manipulation;
    }
    [data-loading=true] .startup-loading.interactive-dino::before,
    [data-loading=true] .startup-loading.interactive-dino::after{
      content:none!important;
      animation:none!important;
    }
    .loading-game-title{
      font-size:20px;
      font-weight:900;
      text-align:center;
      color:#8a5d1f;
      margin:0 0 6px;
    }
    .loading-game-subtitle{
      font-size:12px;
      font-weight:800;
      text-align:center;
      color:#8f7a5d;
      margin-bottom:7px;
    }
    .dino-game{
      position:relative;
      height:225px;
      overflow:hidden;
      border-radius:18px;
      outline:none;
      cursor:pointer;
    }
    .dino-score{
      position:absolute;
      top:4px;
      right:8px;
      z-index:5;
      min-width:82px;
      padding:5px 9px;
      border-radius:12px;
      background:rgba(255,255,255,.72);
      color:#72552c;
      font-size:12px;
      font-weight:900;
      text-align:center;
    }
    .dino-hint{
      position:absolute;
      top:5px;
      left:8px;
      z-index:5;
      padding:5px 9px;
      border-radius:12px;
      background:rgba(255,255,255,.72);
      color:#6f7e66;
      font-size:11px;
      font-weight:800;
    }
    .dino-world{
      position:absolute;
      inset:0;
    }
    .dino-cloud{
      position:absolute;
      font-size:26px;
      opacity:.78;
      animation:dinoCloudMove 7s linear infinite;
    }
    .dino-cloud.c1{top:38px;left:18%;animation-duration:8s}
    .dino-cloud.c2{top:62px;left:70%;animation-duration:10s;animation-delay:-4s}
    @keyframes dinoCloudMove{
      0%{transform:translateX(40px)}
      50%{transform:translateX(-18px)}
      100%{transform:translateX(40px)}
    }
    .dino-ground{
      position:absolute;
      left:0;
      right:0;
      bottom:25px;
      height:4px;
      border-radius:999px;
      background:#bfa36c;
      box-shadow:0 7px 0 rgba(191,163,108,.24);
    }
    .dino-character{
      position:absolute;
      left:58px;
      bottom:29px;
      z-index:3;
      width:54px;
      height:54px;
      display:grid;
      place-items:center;
      font-size:48px;
      line-height:1;
      transform-origin:center bottom;
      filter:drop-shadow(0 4px 0 rgba(63,93,64,.13));
      will-change:transform;
    }
    .dino-character.running{
      animation:dinoBob .22s ease-in-out infinite alternate;
    }
    @keyframes dinoBob{
      from{transform:translateY(0) rotate(-1deg)}
      to{transform:translateY(-2px) rotate(1deg)}
    }
    .dino-obstacle{
      position:absolute;
      bottom:29px;
      z-index:2;
      width:42px;
      height:46px;
      display:grid;
      place-items:center;
      font-size:40px;
      line-height:1;
      will-change:transform;
    }
    .dino-game-over{
      position:absolute;
      inset:0;
      z-index:10;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      gap:7px;
      background:rgba(255,250,236,.82);
      backdrop-filter:blur(2px);
      color:#885a20;
      text-align:center;
      font-size:18px;
      font-weight:900;
    }
    .dino-game-over[hidden]{display:none}
    .dino-game-over small{
      font-size:11px;
      font-weight:800;
      color:#8d7657;
    }
    .dino-jump-pulse{
      position:absolute;
      left:75px;
      bottom:24px;
      z-index:1;
      width:22px;
      height:8px;
      border-radius:50%;
      background:rgba(113,92,56,.14);
      transform:scale(1);
      opacity:.75;
    }
    @media(max-width:580px){
      [data-loading=true] .startup-loading.interactive-dino{
        height:275px;
        padding:15px 12px 12px;
      }
      .loading-game-title{font-size:18px}
      .loading-game-subtitle{font-size:10px}
      .dino-game{height:205px}
      .dino-character{left:38px;font-size:43px;width:50px;height:50px}
      .dino-hint{font-size:9px;max-width:160px}
      .dino-score{font-size:10px;min-width:68px}
    }
  `;
  document.head.appendChild(style);

  loading.classList.add('interactive-dino');
  loading.innerHTML = `
    <div class="loading-game-title">Đang mở vòng quay…</div>
    <div class="loading-game-subtitle">Chơi một chút trong lúc chờ nhé!</div>
    <div class="dino-game" tabindex="0" role="application" aria-label="Trò chơi khủng long. Nhấn Space, mũi tên lên hoặc chạm để nhảy.">
      <div class="dino-score">Điểm: <span>0</span></div>
      <div class="dino-hint">Space / ↑ / chạm để nhảy</div>
      <div class="dino-world">
        <span class="dino-cloud c1" aria-hidden="true">☁️</span>
        <span class="dino-cloud c2" aria-hidden="true">☁️</span>
        <div class="dino-ground" aria-hidden="true"></div>
        <div class="dino-jump-pulse" aria-hidden="true"></div>
        <div class="dino-character running" aria-hidden="true">🦖</div>
        <div class="dino-obstacle" aria-hidden="true">🌵</div>
      </div>
      <div class="dino-game-over" hidden>
        <span>Ối! Khủng long va vào xương rồng.</span>
        <small>Nhấn Space / ↑ / chạm để chơi lại</small>
      </div>
    </div>
  `;

  const game = loading.querySelector('.dino-game');
  const dino = loading.querySelector('.dino-character');
  const obstacle = loading.querySelector('.dino-obstacle');
  const scoreNode = loading.querySelector('.dino-score span');
  const gameOverBox = loading.querySelector('.dino-game-over');
  const pulse = loading.querySelector('.dino-jump-pulse');

  let running = true;
  let gameOver = false;
  let y = 0;
  let velocity = 0;
  let obstacleX = 560;
  let lastTime = performance.now();
  let score = 0;
  let passed = false;
  let raf = 0;

  const gravity = 1850;
  const jumpVelocity = 700;
  const groundY = 0;

  function obstacleSpeed() {
    return Math.min(430, 260 + score * 4.5);
  }

  function resetObstacle() {
    const width = game.clientWidth || 520;
    obstacleX = width + 50 + Math.random() * 120;
    passed = false;
  }

  function resetGame() {
    gameOver = false;
    y = 0;
    velocity = 0;
    score = 0;
    scoreNode.textContent = '0';
    gameOverBox.hidden = true;
    dino.classList.add('running');
    resetObstacle();
  }

  function jump() {
    if (!running) return;
    if (gameOver) {
      resetGame();
      return;
    }

    if (y <= groundY + 2) {
      velocity = jumpVelocity;
      dino.classList.remove('running');
      pulse.animate(
        [
          {transform:'scale(1)',opacity:.65},
          {transform:'scale(1.8)',opacity:0}
        ],
        {duration:260,easing:'ease-out'}
      );
    }
  }

  function rectsCollide() {
    const d = dino.getBoundingClientRect();
    const o = obstacle.getBoundingClientRect();

    /* Hitbox hơi nhỏ hơn emoji để trò chơi dễ chịu với học sinh. */
    const dBox = {
      left:d.left + 10,
      right:d.right - 9,
      top:d.top + 9,
      bottom:d.bottom - 6
    };
    const oBox = {
      left:o.left + 9,
      right:o.right - 7,
      top:o.top + 6,
      bottom:o.bottom - 4
    };

    return !(
      dBox.right < oBox.left ||
      dBox.left > oBox.right ||
      dBox.bottom < oBox.top ||
      dBox.top > oBox.bottom
    );
  }

  function finishGame() {
    gameOver = true;
    dino.classList.remove('running');
    gameOverBox.hidden = false;
  }

  function frame(now) {
    if (!running) return;

    const dt = Math.min(.035, Math.max(.001, (now - lastTime) / 1000));
    lastTime = now;

    if (!gameOver) {
      if (y > groundY || velocity > 0) {
        velocity -= gravity * dt;
        y += velocity * dt;
        if (y <= groundY) {
          y = groundY;
          velocity = 0;
          dino.classList.add('running');
        }
      }

      obstacleX -= obstacleSpeed() * dt;
      const dinoLeft = parseFloat(getComputedStyle(dino).left) || 58;

      if (!passed && obstacleX + 42 < dinoLeft) {
        passed = true;
        score += 1;
        scoreNode.textContent = String(score);
      }

      if (obstacleX < -60) resetObstacle();

      dino.style.transform = `translateY(${-y}px)`;
      obstacle.style.transform = `translateX(${obstacleX}px)`;

      if (rectsCollide()) finishGame();
    }

    raf = requestAnimationFrame(frame);
  }

  function input(event) {
    if (event.type === 'keydown') {
      if (!['Space','ArrowUp'].includes(event.code)) return;
      event.preventDefault();
    }
    jump();
  }

  game.addEventListener('pointerdown', event => {
    event.preventDefault();
    game.focus({preventScroll:true});
    input(event);
  });
  window.addEventListener('keydown', input, {capture:true});

  const stop = () => {
    if (!running) return;
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', input, {capture:true});
  };

  const loadingObserver = new MutationObserver(() => {
    if (document.documentElement.dataset.loading !== 'true') {
      stop();
      loadingObserver.disconnect();
    }
  });
  loadingObserver.observe(document.documentElement, {
    attributes:true,
    attributeFilter:['data-loading']
  });

  resetObstacle();
  raf = requestAnimationFrame(frame);
})();
