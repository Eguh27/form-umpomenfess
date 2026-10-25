/**
 * BannerUpload.tsx — unggah banner lewat tanda tangan server (T-42/T-73).
 * Alur: validasi klien → POST /api/uploads/sign → upload langsung ke Cloudinary.
 * Kredensial rahasia tidak pernah menyentuh browser.
 */
import { useId, useRef, useState } from 'react';
import { LIMITS } from '../../lib/config/limits';
import { ACCEPTED_MIME, checkFile, parseSignResponse } from './uploadRules';

interface Props {
  formId?: string;
  onUploaded: (publicId: string) => void;
}

export default function BannerUpload({ formId, onUploaded }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const handleFile = async (file: File) => {
    setError(null);
    const check = checkFile({ bytes: file.size, mime: file.type });
    if (!check.ok) {
      setError(check.reason);
      return;
    }
    if (inputRef.current) inputRef.current.value = '';

    setBusy(true);
    try {
      const signRes = await fetch('/api/uploads/sign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          bytes: file.size,
          mime: file.type,
          ...(formId ? { formId } : {}),
        }),
      });

      if (!signRes.ok) {
        if (signRes.status === 429) {
          let quotaReached = false;
          try {
            const payload = (await signRes.json()) as { error?: string };
            quotaReached = payload.error === 'terlalu_banyak_upload_form';
          } catch {
            // Respons bukan JSON: pakai pesan umum di bawah.
          }
          throw new Error(
            quotaReached
              ? `Batas ${LIMITS.maxImagesPerForm} gambar per form sudah tercapai.`
              : 'Batas unggahan sementara tercapai. Coba beberapa saat lagi.',
          );
        }
        if (signRes.status === 404) {
          throw new Error('Layanan unggah belum siap. Coba lagi nanti.');
        }
        throw new Error('Gagal menyiapkan unggahan. Coba lagi.');
      }

      const signature = parseSignResponse(await signRes.json());
      if (signature === null) {
        throw new Error('Layanan unggah memberi respons yang tidak dikenali. Coba lagi.');
      }

      const data = new FormData();
      data.append('file', file);
      data.append('api_key', signature.apiKey);
      data.append('timestamp', String(signature.timestamp));
      data.append('signature', signature.signature);
      data.append('public_id', signature.publicId);
      data.append('folder', signature.folder);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
        { method: 'POST', body: data },
      );
      if (!uploadRes.ok) throw new Error('Banner gagal diunggah. Coba lagi.');
      const result = (await uploadRes.json()) as { public_id?: string };
      if (!result.public_id) throw new Error('Banner gagal diunggah. Coba lagi.');
      onUploaded(result.public_id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Gagal mengunggah banner. Coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="b-field">
      <label className="b-field__label" htmlFor={inputId}>
        Unggah banner (opsional)
      </label>
      <input
        ref={inputRef}
        id={inputId}
        className="b-file"
        type="file"
        accept={ACCEPTED_MIME.join(',')}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
        disabled={busy}
        aria-describedby={`${inputId}-help`}
      />
      <p className="b-help" id={`${inputId}-help`}>
        JPG, PNG, WEBP, atau GIF. Maksimal {(LIMITS.maxImageBytes / (1024 * 1024)).toFixed(0)} MB
        {' '}dan {LIMITS.maxImagesPerForm} gambar per form.
      </p>
      {busy && <p className="b-help" role="status">Mengunggah banner…</p>}
      {error && (
        <p className="b-warning" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
