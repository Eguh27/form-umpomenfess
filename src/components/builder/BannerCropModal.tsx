/**
 * src/components/builder/BannerCropModal.tsx — Modal interaktif crop & zoom banner (T-87).
 *
 * Menggunakan react-easy-crop untuk interaksi drag/zoom berasio 16:9,
 * lalu memotong gambar via getCroppedImg (HTML5 Canvas) sebelum dikirim ke Cloudinary.
 */
import React, { useState, useCallback } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import { getCroppedImg } from '../../lib/forms/cropImage';

interface Props {
  imageSrc: string | null;
  isOpen: boolean;
  onClose: () => void;
  onApplyCrop: (croppedFile: File) => Promise<void> | void;
}

export const BannerCropModal: React.FC<Props> = ({
  imageSrc,
  isOpen,
  onClose,
  onApplyCrop,
}) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropChange = useCallback((newCrop: Point) => {
    setCrop(newCrop);
  }, []);

  const onZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  const onCropAreaComplete = useCallback((_croppedArea: Area, pixelCrop: Area) => {
    setCroppedAreaPixels(pixelCrop);
  }, []);

  const handleApply = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setIsProcessing(true);
    setError(null);
    try {
      const croppedFile = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        'banner.webp',
        'image/webp',
        0.85,
      );
      await onApplyCrop(croppedFile);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memotong gambar. Coba lagi.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div
      className="b-crop-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="b-crop-modal-title"
    >
      <div className="b-crop-modal">
        <header className="b-crop-modal__head">
          <div>
            <h3 id="b-crop-modal-title" style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>
              Sesuaikan & Potong Banner
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Geser foto atau atur pembesaran (zoom) agar area penting pas dalam banner.
            </p>
            <span
              style={{
                display: 'inline-block',
                marginTop: '6px',
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '4px',
                background: 'rgba(47, 114, 99, 0.12)',
                color: 'var(--brand)',
              }}
            >
              🔒 Rasio 16:9 (Terkunci)
            </span>
          </div>
          <button
            type="button"
            className="b-btn b-btn--ghost b-btn--sm"
            onClick={onClose}
            disabled={isProcessing}
            aria-label="Tutup dialog"
            style={{ fontSize: '1rem', lineHeight: 1 }}
          >
            ✕
          </button>
        </header>

        {/* Cropper Container */}
        <div className="b-crop-modal__cropper-wrap">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={16 / 9}
            restrictPosition={true}
            onCropChange={onCropChange}
            onCropComplete={onCropAreaComplete}
            onZoomChange={onZoomChange}
            showGrid={true}
          />
        </div>

        {/* Zoom & Range Slider Controls */}
        <div className="b-crop-modal__controls">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600 }}>
            <label htmlFor="b-crop-zoom-slider" style={{ color: 'var(--text)' }}>
              Pembesaran (Zoom)
            </label>
            <span style={{ color: 'var(--brand)' }}>{Math.round(zoom * 100)}%</span>
          </div>
          <input
            id="b-crop-zoom-slider"
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            disabled={isProcessing}
            style={{ width: '100%', cursor: 'pointer' }}
          />
        </div>

        {error && (
          <p className="b-warning" role="alert" style={{ margin: 0 }}>
            {error}
          </p>
        )}

        {/* Footer Actions */}
        <footer className="b-crop-modal__actions">
          <button
            type="button"
            className="b-btn b-btn--ghost"
            onClick={onClose}
            disabled={isProcessing}
          >
            Batal
          </button>
          <button
            type="button"
            className="b-btn b-btn--primary"
            onClick={handleApply}
            disabled={isProcessing}
          >
            {isProcessing ? 'Memproses…' : '✓ Terapkan & Unggah'}
          </button>
        </footer>
      </div>
    </div>
  );
};
