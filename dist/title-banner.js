/* Rebuild the title as live HTML and group wheel + button into one visual machine.
   This only changes DOM structure/visual layout; IDs and app logic stay intact. */
(() => {
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
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, {once:true});
  } else {
    run();
  }
})();
