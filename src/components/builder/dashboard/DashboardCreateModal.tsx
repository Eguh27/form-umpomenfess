/**
 * DashboardCreateModal.tsx — Dialog pop-up buat formulir baru (Zona B).
 * Menyediakan dua jalur jelas: Template Siap Pakai (pemula) atau Lembar Kosong.
 * Contoh judul cepat menyisipkan teks bersih (tanpa emoji di judul tersimpan).
 */
import { useState, type SyntheticEvent } from 'react';

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateBlank: (title: string) => void;
  onGoToTemplates: () => void;
  isBusy: boolean;
}

export const TITLE_SUGGESTIONS = [
  { icon: '🎓', title: 'Kuesioner Penelitian Skripsi', category: 'Skripsi' },
  { icon: '📋', title: 'Formulir Pendaftaran Kegiatan', category: 'Pendaftaran' },
  { icon: '⭐', title: 'Survei Kepuasan Mahasiswa', category: 'Evaluasi' },
  { icon: '💬', title: 'Kotak Masukan & Saran', category: 'Feedback' },
  { icon: '🏆', title: 'Pendaftaran Lomba Kampus', category: 'Kompetisi' },
] as const;

export default function DashboardCreateModal({
  isOpen,
  onClose,
  onCreateBlank,
  onGoToTemplates,
  isBusy,
}: CreateModalProps) {
  const [title, setTitle] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    onCreateBlank(title.trim() || 'Formulir Baru');
  };

  return (
    <div
      className="db-modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="db-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header Modal */}
        <div className="db-modal-head">
          <div>
            <h3>Buat Formulir Baru ✨</h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Pilih cara termudah untuk memulai formulir barumu:
            </p>
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            style={{ minHeight: 32, width: 32, padding: 0, borderRadius: 8 }}
            onClick={onClose}
            aria-label="Tutup dialog"
          >
            ✕
          </button>
        </div>

        {/* Pilihan 1 (Rekomendasi Pemula): Template Siap Pakai */}
        <div
          style={{
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--coral) 12%, var(--surface)), var(--surface-soft))',
            border: '1.5px solid color-mix(in srgb, var(--coral) 30%, var(--border))',
            borderRadius: 16,
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <span className="pill pill--coral" style={{ fontSize: '0.66rem', marginBottom: 4 }}>
              ⭐ Disarankan untuk Pemula
            </span>
            <strong style={{ display: 'block', fontSize: '0.94rem', margin: '4px 0 2px' }}>
              Pilih dari Template Siap Pakai
            </strong>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.35 }}>
              Ada contoh pertanyaan terstruktur (skripsi, pendaftaran, kepuasan). Tinggal pakai dalam 1-klik!
            </p>
          </div>
          <button
            type="button"
            className="btn btn--accent btn--sm"
            style={{ fontWeight: 700, whiteSpace: 'nowrap' }}
            onClick={onGoToTemplates}
            disabled={isBusy}
          >
            Buka Katalog Template ➔
          </button>
        </div>

        {/* Pemisah atau */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '2px 0' }}>
          <div style={{ flex: 1, borderTop: '1px dashed var(--border)' }} />
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            atau rancang dari nol
          </span>
          <div style={{ flex: 1, borderTop: '1px dashed var(--border)' }} />
        </div>

        {/* Pilihan 2: Mulai dari Lembar Kosong */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 6 }}>
              Judul Formulir Kosong
            </label>
            <input
              className="input"
              style={{ width: '100%', fontSize: '0.9rem' }}
              placeholder="Contoh: Kuesioner Kepuasan Mahasiswa UMPO..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              disabled={isBusy}
            />
          </div>

          {/* Chip Saran Judul Ramah Pemula */}
          <div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              💡 Contoh judul cepat (klik untuk mengisi otomatis):
            </span>
            <div className="db-suggestion-chips">
              {TITLE_SUGGESTIONS.map((sug) => (
                <button
                  key={sug.title}
                  type="button"
                  className="db-chip"
                  onClick={() => setTitle(sug.title)}
                  disabled={isBusy}
                  title={`Gunakan judul: ${sug.title}`}
                >
                  <span>{sug.icon}</span> {sug.title}
                </button>
              ))}
            </div>
          </div>

          {/* Tombol Aksi Bawah */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={onClose}
              disabled={isBusy}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn btn--accent btn--sm"
              disabled={isBusy}
              style={{ fontWeight: 700 }}
            >
              + Buat Lembar Kosong ➔
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
