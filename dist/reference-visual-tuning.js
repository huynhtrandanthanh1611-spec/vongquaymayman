/* Visual-only canvas tuning. It does not change wheel selection, history or spin logic. */
(() => {
  const proto = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  if (!proto || proto.__luckyReferenceTuned) return;

  const fontDescriptor = Object.getOwnPropertyDescriptor(proto, 'font');
  const fillDescriptor = Object.getOwnPropertyDescriptor(proto, 'fillStyle');
  if (!fontDescriptor?.get || !fontDescriptor?.set || !fillDescriptor?.get || !fillDescriptor?.set) return;

  const paletteMap = new Map([
    ['#f7d27e','#ffd45b'],
    ['#b9dfd1','#55d978'],
    ['#c6c3e8','#8b69f4'],
    ['#f5b8aa','#ff7f99'],
    ['#f2dfa4','#ffe36f'],
    ['#b8d7e8','#48c8f0'],
    ['#d5dcad','#79dc83'],
    ['#dfc6e4','#c27aea']
  ]);

  Object.defineProperty(proto, 'font', {
    configurable: true,
    enumerable: fontDescriptor.enumerable,
    get: fontDescriptor.get,
    set(value) {
      let next = value;
      if (this.canvas?.id === 'wheel' && typeof value === 'string' && /Quicksand/i.test(value)) {
        next = value.replace(/(\d+(?:\.\d+)?)px/, (_, raw) => {
          const size = Number(raw);
          if (!Number.isFinite(size)) return `${raw}px`;
          const boosted = Math.min(68, Math.max(size, size * 1.24));
          return `${Math.round(boosted)}px`;
        });
      }
      fontDescriptor.set.call(this, next);
    }
  });

  Object.defineProperty(proto, 'fillStyle', {
    configurable: true,
    enumerable: fillDescriptor.enumerable,
    get: fillDescriptor.get,
    set(value) {
      const next = this.canvas?.id === 'wheel' && typeof value === 'string'
        ? (paletteMap.get(value.toLowerCase()) || value)
        : value;
      fillDescriptor.set.call(this, next);
    }
  });

  Object.defineProperty(proto, '__luckyReferenceTuned', {value:true});

  const redraw = () => window.dispatchEvent(new Event('resize'));
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => requestAnimationFrame(redraw), {once:true});
  } else {
    requestAnimationFrame(redraw);
  }
})();
