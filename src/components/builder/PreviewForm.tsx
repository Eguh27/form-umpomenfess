/**
 * PreviewForm.tsx — pratinjau form memakai kelas halaman publik (T-73).
 * Parity: cardStyle, aksen, radius, bg/text/font, ukuran heading publik,
 * dan banner legacy. Stepper multi-halaman tetap dipertahankan.
 */
import { useState, type CSSProperties } from 'react';
import type { FormSchemaData } from '../../lib/forms/schema';
import { contrastRatio } from '../../lib/design/contrast';
import { splitIntoPages } from './pages';
import type { BlockDraft } from './defaults';
import { cloudinaryUrl, fontStack, HEADING_SIZE_REM } from './themeUtils';
import PreviewQuestion from './PreviewQuestion';

interface Props {
  form: FormSchemaData;
  cloudName: string;
}

type ThemeVars = CSSProperties & {
  '--accent': string;
  '--accent-strong': string;
  '--accent-hover': string;
  '--on-accent': string;
  '--focus': string;
  '--preview-accent': string;
  '--preview-on-accent': string;
};

function readableOn(background: string): string {
  const white = contrastRatio('#ffffff', background);
  const ink = contrastRatio('#131c1a', background);
  return ink >= white ? '#131c1a' : '#ffffff';
}

export default function PreviewForm({ form, cloudName }: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'paged' | 'all'>('paged');

  const pages = splitIntoPages(form.blocks as BlockDraft[]);
  const totalPages = pages.length;
  const activePageIndex = Math.min(Math.max(currentPage, 1), totalPages) - 1;
  const activePage = pages[activePageIndex] ?? pages[0];
  const blocks = viewMode === 'paged' && totalPages > 1 ? activePage.blocks : form.blocks;
  const isLastPage = activePageIndex >= totalPages - 1;
  const onAccent = readableOn(form.theme.accent);

  const themeStyle: ThemeVars = {
    background: form.theme.bg,
    color: form.theme.text,
    fontFamily: fontStack(form.theme.font),
    borderRadius: form.theme.radius,
    '--accent': form.theme.accent,
    '--accent-strong': form.theme.accent,
    '--accent-hover': form.theme.accent,
    '--on-accent': onAccent,
    '--focus': form.theme.accent,
    '--preview-accent': form.theme.accent,
    '--preview-on-accent': onAccent,
  };

  return (
    <div className="b-preview__surface" style={themeStyle}>
      {form.theme.bannerPublicId !== null && cloudName !== '' && (
        <img
          className="b-preview__banner"
          src={cloudinaryUrl(form.theme.bannerPublicId, cloudName)}
          alt="Banner form"
          style={{ borderRadius: Math.min(form.theme.radius, 24) }}
        />
      )}

      <div className={`card card--${form.theme.cardStyle} b-preview__card`}>
        {totalPages > 1 && (
          <div className="b-preview__pagebar">
            <span>Halaman {activePageIndex + 1} dari {totalPages}</span>
            <button
              type="button"
              className="b-preview__mode"
              onClick={() => setViewMode((mode) => (mode === 'paged' ? 'all' : 'paged'))}
            >
              {viewMode === 'paged' ? 'Tampilkan semua halaman' : 'Tampilkan per halaman'}
            </button>
          </div>
        )}

        {totalPages > 1 && viewMode === 'paged' && (
          <div className="b-preview__pills" role="group" aria-label="Pilih halaman">
            {pages.map((page) => {
              const current = page.pageNumber === activePageIndex + 1;
              return (
                <button
                  key={`pill-${page.pageNumber}`}
                  type="button"
                  className={`b-preview__pill${current ? ' is-active' : ''}`}
                  onClick={() => setCurrentPage(page.pageNumber)}
                  aria-current={current ? 'page' : undefined}
                >
                  {page.pageNumber}. {page.title}
                </button>
              );
            })}
          </div>
        )}

        {form.blocks.length === 0 && (
          <p className="b-help">Belum ada isi form. Tambahkan blok dari panel Properti.</p>
        )}

        {blocks.map((block) => {
          if (block.type === 'heading') {
            return (
              <h2
                key={block.id}
                className="b-preview__heading"
                style={{
                  fontSize: HEADING_SIZE_REM[block.size],
                  textAlign: block.align as CSSProperties['textAlign'],
                }}
              >
                {block.text}
              </h2>
            );
          }
          if (block.type === 'text') {
            return (
              <p key={block.id} className="b-preview__text">
                {block.text}
              </p>
            );
          }
          if (block.type === 'image') {
            return (
              <div
                key={block.id}
                className="b-preview__imagewrap"
                style={{ textAlign: block.align as CSSProperties['textAlign'] }}
              >
                {block.publicId !== '' && cloudName !== '' && (
                  <img
                    className="b-preview__img"
                    src={cloudinaryUrl(block.publicId, cloudName)}
                    alt=""
                    style={{ borderRadius: Math.min(form.theme.radius, 24) }}
                  />
                )}
              </div>
            );
          }
          if (block.type === 'divider') {
            if (block.id.startsWith('page_')) {
              return viewMode === 'all' ? (
                <p className="b-preview__pagebreak" key={block.id}>
                  Halaman berikutnya
                </p>
              ) : null;
            }
            return <hr className="b-preview__rule" key={block.id} />;
          }
          return (
            <PreviewQuestion
              key={block.id}
              block={block as Extract<FormSchemaData['blocks'][number], { type: 'question' }>}
            />
          );
        })}

        {totalPages > 1 && viewMode === 'paged' ? (
          <div className="b-preview__actions">
            {activePageIndex > 0 ? (
              <button
                type="button"
                className="b-preview__navbtn"
                onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
              >
                Kembali
              </button>
            ) : (
              <span aria-hidden="true" />
            )}
            {!isLastPage ? (
              <button
                type="button"
                className="btn btn--accent btn--sm"
                onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
              >
                Lanjut
              </button>
            ) : (
              <button type="button" className="btn btn--accent btn--sm" disabled>
                Kirim jawaban
              </button>
            )}
          </div>
        ) : (
          <button type="button" className="btn btn--accent b-preview__submit" disabled>
            Kirim jawaban
          </button>
        )}

        <p className="b-preview__note">Pratinjau · jawaban tidak dikirim.</p>
      </div>
    </div>
  );
}
