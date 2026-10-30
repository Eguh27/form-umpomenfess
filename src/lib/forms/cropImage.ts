/**
 * src/lib/forms/cropImage.ts — Helper HTML5 Canvas untuk pemotongan gambar banner (T-87).
 *
 * Menerima URL gambar dan koordinat piksel potong dari react-easy-crop,
 * menggambar area yang dipilih ke elemen canvas berdimensi proporsional,
 * dan menghasilkan objek File siap unggah (format WebP atau JPEG fallback).
 */
import type { Area } from 'react-easy-crop';

export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

/** Menghitung dimensi canvas akhir dengan membatasi lebar maksimal agar memori & ukuran berkas efisien. */
export function computeCropDimensions(
  cropWidth: number,
  cropHeight: number,
  maxWidth = 1600,
): { width: number; height: number } {
  let targetWidth = Math.max(1, Math.round(cropWidth));
  let targetHeight = Math.max(1, Math.round(cropHeight));

  if (targetWidth > maxWidth) {
    const scale = maxWidth / targetWidth;
    targetWidth = maxWidth;
    targetHeight = Math.max(1, Math.round(targetHeight * scale));
  }

  return { width: targetWidth, height: targetHeight };
}

/**
 * Memotong gambar menggunakan HTML5 Canvas berdasarkan koordinat piksel dari react-easy-crop.
 * Mengembalikan objek File terkompresi (format WebP) siap unggah.
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  fileName = 'banner.webp',
  mimeType = 'image/webp',
  quality = 0.85,
): Promise<File> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context tidak tersedia.');
  }

  const { width: targetWidth, height: targetHeight } = computeCropDimensions(
    pixelCrop.width,
    pixelCrop.height,
  );

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetWidth,
    targetHeight,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Gagal memproses crop gambar pada canvas.'));
          return;
        }
        const file = new File([blob], fileName, { type: blob.type || mimeType });
        resolve(file);
      },
      mimeType,
      quality,
    );
  });
}
