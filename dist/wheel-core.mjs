export const normalize = degree => ((degree % 360) + 360) % 360;
export function indexAtPointer(rotation, count) {
  if (!count) return -1;
  return Math.min(count - 1, Math.floor(normalize(-rotation) / (360 / count)));
}
export function targetRotation(current, index, count, turns = 5) {
  if (!Number.isInteger(index) || count < 1 || index < 0 || index >= count) throw new Error('Invalid wheel selection');
  const center = normalize(-(index + .5) * 360 / count);
  return current + turns * 360 + normalize(center - normalize(current));
}
export function randomIndex(count, cryptoSource = globalThis.crypto) {
  if (!Number.isInteger(count) || count < 1 || count > 0x100000000) throw new Error('Invalid item count');
  const limit = Math.floor(0x100000000 / count) * count;
  let value;
  do { value = cryptoSource.getRandomValues(new Uint32Array(1))[0]; } while (value >= limit);
  return value % count;
}
export const contentKey = text => text.normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('vi');
export const entryKey = entry => entry.image?.src ? 'image:'+entry.image.src : 'text:'+contentKey(entry.text||'');
export function remainingItems(items, history) {
  const used = new Set(history.map(entry => entry.id));
  const seen = new Set(history.map(entryKey));
  return items.filter(item => {
    const key=entryKey(item);
    if(used.has(item.id)||seen.has(key))return false;
    seen.add(key);return true;
  });
}
export function cleanLines(text) { return String(text).split(/\r?\n/).map(line => line.trim()).filter(Boolean); }
