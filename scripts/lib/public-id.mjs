/**
 * Aturan publicId Cloudinary yang boleh disentuh job cleanup.
 * Hanya folder `form/` milik project ini; tolak path aneh agar job destruktif
 * tidak pernah menghapus aset di luar folder yang dikelola.
 */

const MAX_PUBLIC_ID_LENGTH = 200;

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isManagedPublicId(value) {
  if (typeof value !== 'string') return false;
  if (value.length === 0 || value.length > MAX_PUBLIC_ID_LENGTH) return false;
  if (!value.startsWith('form/')) return false;
  if (value.includes('..') || value.includes('//')) return false;
  return /^[A-Za-z0-9][A-Za-z0-9/_-]*$/.test(value);
}
