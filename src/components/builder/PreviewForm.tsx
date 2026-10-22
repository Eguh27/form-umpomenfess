/**
 * PreviewForm.tsx — render simulasi form builder dengan navigasi multi-halaman (T-43/T-45, Zona B).
 *
 * Mendukung simulasi alur responden:
 * - Halaman 1 (Perkenalan) -> Tombol Lanjut -> Halaman 2 (Kuesioner/Survei) -> Kirim.
 * - Tombol beralih antara "Mode Bertahap" vs "Semua Halaman".
 * - React otomatis meng-escape teks user — tidak ada jalur HTML mentah.
 */
import { useState } from 'react';
import type { FormSchemaData } from '../../lib/forms/schema';
import { isSensitiveLabel } from './sensitive';
import { cloudinaryUrl, HEADING_SIZE_REM, themeToStyle } from './themeUtils';
import { splitIntoPages } from './pages';
import type { BlockDraft } from './defaults';

interface Props {
  form: FormSchemaData;
  cloudName: string;
}

export default function PreviewForm({ form, cloudName }: Props) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'paged' | 'all'>('paged');

  // Pisahkan blok menjadi halaman-halaman
  const pages = splitIntoPages(form.blocks as BlockDraft[]);
  const totalPages = pages.length;

  // Pastikan currentPage tidak out of bound jika halaman dikurangi
  const activePageIndex = Math.min(Math.max(currentPage, 1), totalPages) - 1;
  const activePage = pages[activePageIndex] ?? pages[0];

  const displayedBlocks = viewMode === 'paged' && totalPages > 1 ? activePage.blocks : form.blocks;

  return (
    <div style={{ ...themeToStyle(form.theme), padding: 'var(--space-5)', borderRadius: form.theme.radius }}>
      {/* Banner / Header Bar Multi-Halaman */}
      {totalPages > 1 && (
        <div
          style={{
            marginBottom: 'var(--space-4)',
            padding: '8px 12px',
            background: 'rgba(0,0,0,0.04)',
            borderRadius: 8,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>
              Halaman {activePageIndex + 1} dari {totalPages}
            </span>
            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({activePage.title})</span>
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            style={{ fontSize: '0.7rem', padding: '2px 8px' }}
            onClick={() => setViewMode((m) => (m === 'paged' ? 'all' : 'paged'))}
          >
            {viewMode === 'paged' ? '👁 Lihat Semua Halaman' : '📑 Mode Bertahap (Per Halaman)'}
          </button>
        </div>
      )}

      {/* Progress Step Pills jika mode paged */}
      {totalPages > 1 && viewMode === 'paged' && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 'var(--space-4)', overflowX: 'auto', paddingBottom: 4 }}>
          {pages.map((p) => {
            const isCurrent = p.pageNumber === activePageIndex + 1;
            return (
              <button
                key={`pill-${p.pageNumber}`}
                type="button"
                onClick={() => setCurrentPage(p.pageNumber)}
                style={{
                  border: 0,
                  borderRadius: 20,
                  padding: '4px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: isCurrent ? 'currentColor' : 'rgba(0,0,0,0.06)',
                  color: isCurrent ? form.theme.bg : 'inherit',
                  opacity: isCurrent ? 1 : 0.65,
                  whiteSpace: 'nowrap',
                }}
              >
                {p.pageNumber}. {p.title}
              </button>
            );
          })}
        </div>
      )}

      {form.blocks.length === 0 && (
        <p style={{ fontStyle: 'italic', opacity: 0.7 }}>Belum ada blok — tambahkan dari panel kiri.</p>
      )}

      {/* Render Blok Form */}
      {displayedBlocks.map((block) => {
        switch (block.type) {
          case 'heading':
            return (
              <h2
                key={block.id}
                style={{
                  fontSize: HEADING_SIZE_REM[block.size],
                  textAlign: block.align as React.CSSProperties['textAlign'],
                  margin: '0 0 var(--space-3)',
                }}
              >
                {block.text}
              </h2>
            );
          case 'text':
            return (
              <p key={block.id} style={{ margin: 'var(--space-2) 0', lineHeight: 1.5 }}>
                {block.text}
              </p>
            );
          case 'image':
            return (
              <div
                key={block.id}
                style={{
                  textAlign: block.align as React.CSSProperties['textAlign'],
                  margin: 'var(--space-3) 0',
                }}
              >
                {block.publicId !== '' && cloudName !== '' && (
                  <img
                    src={cloudinaryUrl(block.publicId, cloudName)}
                    alt=""
                    style={{ borderRadius: Math.min(form.theme.radius, 24), maxWidth: '100%' }}
                  />
                )}
              </div>
            );
          case 'divider':
            return (
              <div key={block.id} style={{ margin: 'var(--space-4) 0' }}>
                <hr
                  style={{
                    border: 0,
                    borderTop: '1.5px dashed currentColor',
                    opacity: 0.35,
                    margin: 0,
                  }}
                />
                {block.id.startsWith('page_') && viewMode === 'all' && (
                  <div
                    style={{
                      textAlign: 'center',
                      marginTop: 6,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      opacity: 0.6,
                      letterSpacing: '0.05em',
                    }}
                  >
                    ── BATAS HALAMAN BERIKUTNYA ──
                  </div>
                )}
              </div>
            );
          case 'question':
            return (
              <div key={block.id} style={{ margin: 'var(--space-4) 0' }}>
                <label style={{ fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  {block.label}
                  {block.required && <span aria-hidden="true" style={{ color: 'var(--danger, #ef4444)' }}> *</span>}
                </label>
                {isSensitiveLabel(block.label) && (
                  <p style={{ fontSize: '0.8rem', fontWeight: 600, opacity: 0.75, color: 'var(--danger, #ef4444)' }}>
                    Peringatan: jangan minta data sensitif di sini.
                  </p>
                )}
                <QuestionSkeleton block={block as Extract<FormSchemaData['blocks'][number], { type: 'question' }>} />
              </div>
            );
        }
      })}

      {/* Navigasi Multi-Halaman Simulasi Responden */}
      {totalPages > 1 && viewMode === 'paged' ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 'var(--space-5)' }}>
          {activePageIndex > 0 ? (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              style={{ borderColor: 'currentColor', opacity: 0.85 }}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            >
              ← Kembali
            </button>
          ) : (
            <span />
          )}

          {activePageIndex < totalPages - 1 ? (
            <button
              type="button"
              className="btn btn--accent btn--sm"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            >
              Lanjut ke Halaman {activePageIndex + 2} ➔
            </button>
          ) : (
            <button type="button" className="btn btn--accent btn--sm" disabled>
              Kirim Jawaban ✓
            </button>
          )}
        </div>
      ) : (
        <button type="button" className="btn btn--accent" style={{ marginTop: 'var(--space-4)', width: '100%' }} disabled>
          Kirim Jawaban
        </button>
      )}

      <p style={{ fontSize: '0.72rem', opacity: 0.65, marginTop: 'var(--space-3)', textAlign: 'center' }}>
        Pratinjau responsif · simulasi pengisian oleh responden
      </p>
    </div>
  );
}

function QuestionSkeleton({ block }: { block: Extract<FormSchemaData['blocks'][number], { type: 'question' }> }) {
  const inputStyle = {
    background: 'transparent',
    color: 'inherit',
    border: '1.5px solid currentColor',
    opacity: 0.85,
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: '0.9rem',
  } as const;

  if (block.kind === 'paragraph') return <textarea style={{ ...inputStyle, width: '100%', minHeight: 70 }} readOnly placeholder="Jawaban panjang responden..." />;
  if (block.kind === 'short_text') return <input style={{ ...inputStyle, width: '100%' }} readOnly placeholder="Jawaban singkat..." />;

  if (block.kind === 'single_choice' || block.kind === 'multiple_choice' || block.kind === 'dropdown') {
    return block.kind === 'dropdown'
      ? <select style={{ ...inputStyle, width: '100%' }} disabled><option>— pilih salah satu opsi —</option></select>
      : (
        <div style={{ display: 'grid', gap: 6, marginTop: 4 }}>
          {block.options?.map((opt) => (
            <span key={opt} style={{ display: 'flex', gap: 8, alignItems: 'center', opacity: 0.9, fontSize: '0.88rem' }}>
              <input type={block.kind === 'multiple_choice' ? 'checkbox' : 'radio'} disabled /> {opt}
            </span>
          ))}
        </div>
      );
  }

  // scale
  const steps = Array.from(
    { length: Math.abs((block.max ?? 5) - (block.min ?? 1)) + 1 },
    (_, i) => (block.min ?? 1) + i * (block.min !== undefined && block.max !== undefined && block.max < block.min ? -1 : 1)
  );
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6, opacity: 0.9 }}>
      {steps.map((n) => (
        <span key={n} style={{ display: 'flex', gap: 4, alignItems: 'center', fontWeight: 600, fontSize: '0.88rem' }}>
          <input type="radio" disabled /> {n}
        </span>
      ))}
    </div>
  );
}
