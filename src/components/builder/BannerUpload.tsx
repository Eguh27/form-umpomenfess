/**
 * BannerUpload.tsx — pilih banner/gambar via upload ber-tanda tangan (T-42).
 * Alur: cek ukuran/jenis di client → POST /api/uploads/sign (milik @C) →
 * Upload langsung ke Cloudinary dengan hasil tanda tangan → publicId.
 * Kredensial rahasia TIDAK PERNAH menyentuh browser.
 */
import { useRef, useState } from 'react';
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
          try {
            const errJson = (await signRes.json()) as { error?: string };
            if (errJson.error === 'terlalu_banyak_upload_form') {
              throw new Error('Batas 5 gambar per form tercapai.');
            }
          } catch (e) {
            if (e instanceof Error && e.message.startsWith('Batas')) throw e;
          }
          throw new Error('Batas unggahan sementara tercapai. Coba beberapa saat lagi.');
        }
        throw new Error(
          signRes.status === 404
            ? 'Endpoint /api/uploads/sign belum tersedia (dibuat @C). Banner menunggu itu.'
            : `Gagal minta tanda tangan (${signRes.status}).`,
        );
      }
      const sig = parseSignResponse(await signRes.json());

      if (sig === null) throw new Error('Respons tanda tangan tidak valid (schema berubah?).');

      const data = new FormData();
      data.append('file', file);
      data.append('api_key', sig.apiKey);
      data.append('timestamp', String(sig.timestamp));
      data.append('signature', sig.signature);
      data.append('public_id', sig.publicId);
      data.append('folder', sig.folder);
      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
        { method: 'POST', body: data },
      );
      if (!uploadRes.ok) throw new Error(`Cloudinary menolak upload (${uploadRes.status}).`);
      const result = (await uploadRes.json()) as { public_id?: string };
      if (!result.public_id) throw new Error('public_id tidak dikembalikan Cloudinary.');
      onUploaded(result.public_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="eyebrow">Banner (opsional)</p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_MIME.join(',')}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
        disabled={busy}
        style={{ fontSize: '0.85rem' }}
      />
      {busy && <p className="help">Mengunggah…</p>}
      {error && (
        <p role="alert" className="help" style={{ color: 'var(--danger)', fontWeight: 600 }}>
          {error}
        </p>
      )}
      <p className="help">jpg/png/webp/gif · maks {(LIMITS.maxImageBytes / (1024 * 1024)).toFixed(0)} MB · maks {LIMITS.maxImagesPerForm} gambar per form.</p>
    </div>
  );
}
