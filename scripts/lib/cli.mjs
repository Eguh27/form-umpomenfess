/** Parser argumen CLI sederhana (tanpa dependency) untuk skrip ops. */

/**
 * @param {string[]} argv
 */
export function parseCli(argv) {
  const flags = new Set();
  const options = new Map();
  const unknown = [];

  for (const raw of argv) {
    if (!raw.startsWith('--')) {
      unknown.push(raw);
      continue;
    }
    const body = raw.slice(2);
    const eq = body.indexOf('=');
    if (eq === -1) flags.add(body);
    else options.set(body.slice(0, eq), body.slice(eq + 1));
  }

  return { flags, options, unknown };
}

/**
 * Baca opsi bilangan bulat dengan batas aman.
 * @param {Map<string, string>} options
 * @param {string} name
 * @param {number} fallback
 * @param {{min?: number, max?: number}} [bounds]
 */
export function intOption(options, name, fallback, bounds = {}) {
  if (!options.has(name)) return fallback;
  const raw = options.get(name);
  const value = Number(raw);
  const min = bounds.min ?? 0;
  const max = bounds.max ?? Number.MAX_SAFE_INTEGER;
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`opsi --${name} harus bilangan bulat ${min}..${max}`);
  }
  return value;
}

/**
 * Tolak opsi yang tidak dikenal agar salah ketik tidak diam-diam diabaikan
 * (penting untuk skrip destruktif).
 * @param {Map<string, string>} options
 * @param {string[]} allowed
 */
export function rejectUnknownOptions(options, allowed) {
  const known = new Set(allowed);
  for (const name of options.keys()) {
    if (!known.has(name)) throw new Error(`opsi tidak dikenal: --${name}`);
  }
}
