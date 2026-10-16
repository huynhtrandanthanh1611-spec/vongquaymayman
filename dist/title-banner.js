/* Rebuild the title as live HTML, group wheel + button into one machine,
   then fit the complete desktop UI as one 1920x1080 stage. App IDs and logic stay intact. */
(() => {
  const BASE_W = 1920;
  const BASE_H = 1080;

  const fitStage = () => {
    const shell = document.querySelector('.site-shell');
    if (!shell) return;

    if (window.matchMedia('(max-width: 900px)').matches) {
      shell.style.removeProperty('--stage-scale');
      return;
    }

    const viewportW = window.innerWidth || document.documentElement.clientWidth || BASE_W;
    const viewportH = window.innerHeight || document.documentElement.clientHeight || BASE_H;
    const scale = Math.min(viewportW / BASE_W, viewportH / BASE_H);
    shell.style.setProperty('--stage-scale', String(Math.max(.45, Math.min(1.25, scale))));
  };

  const run = () => {
    const title = document.querySelector('.page-title');
    const scene = document.getElementById('wheel-scene');
    const assembly = document.getElementById('wheel-assembly');
    const spin = document.getElementById('spin-start');
    if (!scene || !assembly || !spin) return;

    const titleMarkup = '<span class="word vong">VÒNG</span><span class="word quay">QUAY</span><span class="word may">MAY</span><span class="word man">MẮN</span>';

    if (title && !title.querySelector('.lucky-title')) {
      title.replaceChildren();
      const liveTitle = document.createElement('div');
      liveTitle.className = 'lucky-title';
      liveTitle.setAttribute('aria-label', 'VÒNG QUAY MAY MẮN');
      liveTitle.innerHTML = titleMarkup;
      title.append(liveTitle);
    }

    if (!scene.querySelector('.play-title')) {
      const playTitle = document.createElement('div');
      playTitle.className = 'lucky-title play-title';
      playTitle.setAttribute('aria-hidden', 'true');
      playTitle.innerHTML = titleMarkup;
      scene.prepend(playTitle);
    }

    if (!scene.querySelector('.lucky-wheel-machine')) {
      const machine = document.createElement('div');
      machine.className = 'lucky-wheel-machine';
      scene.insertBefore(machine, assembly);
      machine.append(assembly, spin);
    }

    fitStage();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, {once:true});
  } else {
    run();
  }

  window.addEventListener('resize', fitStage, {passive:true});
  window.visualViewport?.addEventListener('resize', fitStage, {passive:true});
})();
