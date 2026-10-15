/* =========================================================
   TIÊU ĐỀ VÒNG QUAY MAY MẮN - HTML/CSS NỀN TRONG SUỐT
   Dựng trực tiếp trong giao diện để hòa với website và responsive.
   ========================================================= */

(() => {
  const host = document.querySelector('.page-title');
  if (!host || host.dataset.upgradedTitle === 'true') return;

  host.dataset.upgradedTitle = 'true';
  host.classList.add('lucky-title-upgraded');
  host.innerHTML = `
    <div class="lucky-title-art" role="img" aria-label="Vòng quay may mắn">
      <span class="lucky-title-rainbow" aria-hidden="true"></span>
      <span class="lucky-title-cloud cloud-left" aria-hidden="true"></span>
      <span class="lucky-title-cloud cloud-right" aria-hidden="true"></span>
      <span class="lucky-title-smile-star star-left" aria-hidden="true"><i>•ᴗ•</i></span>
      <span class="lucky-title-smile-star star-right" aria-hidden="true"><i>•ᴗ•</i></span>
      <span class="lucky-title-spark spark-a" aria-hidden="true">✦</span>
      <span class="lucky-title-spark spark-b" aria-hidden="true">✧</span>
      <span class="lucky-title-spark spark-c" aria-hidden="true">✦</span>
      <span class="lucky-title-mini-star mini-a" aria-hidden="true">★</span>
      <span class="lucky-title-mini-star mini-b" aria-hidden="true">★</span>
      <div class="lucky-title-words" aria-hidden="true">
        <span class="lucky-title-word word-vong">VÒNG</span>
        <span class="lucky-title-word word-quay">QUAY</span>
        <span class="lucky-title-word word-may">MAY</span>
        <span class="lucky-title-word word-man">MẮN</span>
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.dataset.luckyTitleStyles = 'true';
  style.textContent = `
    .page-title.lucky-title-upgraded{
      position:relative;
      width:calc(100% - 390px);
      min-height:112px;
      margin:10px 0 14px;
      display:flex;
      align-items:center;
      justify-content:center;
      overflow:visible;
      isolation:isolate;
    }
    .lucky-title-art{
      position:relative;
      width:min(94%,790px);
      height:108px;
      display:flex;
      align-items:center;
      justify-content:center;
      pointer-events:none;
      transform-origin:center center;
    }
    .lucky-title-words{
      position:relative;
      z-index:5;
      display:flex;
      align-items:center;
      justify-content:center;
      gap:.22em;
      white-space:nowrap;
      line-height:1;
      transform:translateY(5px) scaleX(.97);
      transform-origin:center;
    }
    .lucky-title-word{
      position:relative;
      display:inline-block;
      font-family:"Arial Rounded MT Bold","Trebuchet MS","Quicksand",sans-serif;
      font-size:clamp(31px,3.55vw,54px);
      font-weight:900;
      letter-spacing:-.055em;
      -webkit-text-stroke:5px #fffaf0;
      paint-order:stroke fill;
      text-shadow:0 2px 0 rgba(255,255,255,.92),0 5px 0 #efb82e,0 8px 10px rgba(110,73,31,.18);
      filter:drop-shadow(0 1px 0 rgba(255,255,255,.8));
    }
    .word-vong{background:linear-gradient(180deg,#fff24c 0%,#ffb000 42%,#ff7b00 76%,#e75600 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
    .word-quay{background:linear-gradient(180deg,#70eaff 0%,#21b9f5 42%,#1685ec 72%,#075fc5 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
    .word-may{background:linear-gradient(180deg,#ff82a9 0%,#ff4779 45%,#e91855 78%,#c80f45 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
    .word-man{background:linear-gradient(180deg,#b6fa65 0%,#58dc4d 43%,#24b83c 76%,#0b8e31 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
    .lucky-title-rainbow{
      position:absolute;z-index:1;width:126px;height:72px;left:8%;top:-1px;border-radius:126px 126px 0 0;
      background:radial-gradient(ellipse at 50% 100%,transparent 0 35%,#8b78ef 36% 42%,#67d5dc 43% 49%,#63df80 50% 56%,#ffe056 57% 63%,#ff8fa8 64% 70%,transparent 71%);
      filter:drop-shadow(0 3px 3px rgba(75,128,159,.12));opacity:.96;transform:rotate(-4deg)
    }
    .lucky-title-cloud{position:absolute;z-index:2;width:76px;height:29px;border-radius:999px;background:linear-gradient(180deg,#fffef6,#eef8ff);box-shadow:0 4px 8px rgba(83,139,169,.12);opacity:.98}
    .lucky-title-cloud::before,.lucky-title-cloud::after{content:"";position:absolute;bottom:7px;border-radius:50%;background:inherit}
    .lucky-title-cloud::before{width:39px;height:39px;left:10px}.lucky-title-cloud::after{width:49px;height:49px;right:4px}
    .cloud-left{left:4%;bottom:8px;transform:rotate(-3deg)}.cloud-right{right:2%;bottom:8px;transform:rotate(4deg)}
    .lucky-title-smile-star{position:absolute;z-index:6;width:34px;height:34px;display:grid;place-items:center;background:linear-gradient(180deg,#fff45c,#ffbf26);clip-path:polygon(50% 0%,61% 34%,98% 35%,68% 56%,79% 94%,50% 72%,21% 94%,32% 56%,2% 35%,39% 34%);filter:drop-shadow(0 3px 2px rgba(172,115,12,.2));color:#b46b23}
    .lucky-title-smile-star i{font-style:normal;font-family:Arial,sans-serif;font-size:9px;font-weight:900;transform:translateY(1px) scaleX(.8)}
    .star-left{left:.8%;bottom:17px;transform:rotate(-12deg)}.star-right{right:.2%;bottom:16px;transform:rotate(12deg)}
    .lucky-title-spark,.lucky-title-mini-star{position:absolute;z-index:4;line-height:1;text-shadow:0 2px 0 #fff}
    .lucky-title-spark{color:#fff;font-size:25px}.spark-a{left:20%;top:2px;transform:rotate(11deg)}.spark-b{right:20%;top:7px;color:#fffef2;font-size:21px}.spark-c{right:9%;top:27px;color:#f6a6ef;font-size:18px}
    .lucky-title-mini-star{color:#ffd834;font-size:19px}.mini-a{left:33%;top:8px;transform:rotate(-9deg)}.mini-b{right:31%;bottom:3px;color:#d887f4;transform:rotate(8deg)}
    @media(max-width:1100px){
      .page-title.lucky-title-upgraded{width:calc(100% - 342px);min-height:98px}
      .lucky-title-art{height:94px;width:96%}
      .lucky-title-word{font-size:clamp(25px,3.35vw,42px);-webkit-text-stroke-width:4px}
      .lucky-title-rainbow{width:104px;height:61px}.lucky-title-cloud{transform:scale(.88)}.lucky-title-smile-star{width:29px;height:29px}
    }
    @media(max-width:850px){
      .page-title.lucky-title-upgraded{width:100%;min-height:88px;margin:8px 0 10px}
      .lucky-title-art{width:min(98%,720px);height:84px}
      .lucky-title-word{font-size:clamp(24px,6vw,39px);-webkit-text-stroke-width:4px}
      .lucky-title-rainbow{width:88px;height:52px;left:7%;top:0}.lucky-title-cloud{transform:scale(.75)}.lucky-title-smile-star{transform:scale(.82)}
    }
    @media(max-width:560px){
      .page-title.lucky-title-upgraded{min-height:72px;margin:5px 0 7px}
      .lucky-title-art{height:70px;width:100%}
      .lucky-title-words{gap:.12em;transform:translateY(4px) scaleX(.94)}
      .lucky-title-word{font-size:clamp(18px,6.8vw,29px);-webkit-text-stroke-width:3px;text-shadow:0 2px 0 #fff,0 3px 0 #efb82e,0 5px 7px rgba(110,73,31,.16)}
      .lucky-title-rainbow{width:68px;height:40px;left:5%;top:1px}.lucky-title-cloud{display:none}.lucky-title-smile-star{width:23px;height:23px}.lucky-title-smile-star i{font-size:7px}.lucky-title-spark{font-size:15px}.lucky-title-mini-star{font-size:13px}
    }
  `;
  document.head.appendChild(style);
})();
