/** Util array kecil untuk skrip ops (T-60/T-61). */

/**
 * Pecah array menjadi potongan berukuran tetap.
 * @template T
 * @param {T[]} items
 * @param {number} size
 * @returns {T[][]}
 */
export function chunk(items, size) {
  if (!Number.isInteger(size) || size < 1) throw new Error('ukuran chunk harus >= 1');
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
