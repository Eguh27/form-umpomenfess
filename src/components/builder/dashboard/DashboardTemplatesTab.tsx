/**
 * DashboardTemplatesTab.tsx — Katalog template dengan pratinjau contoh pertanyaan.
 * Menyediakan contoh konkret isi formulir agar pengguna awam tidak bingung.
 */
import { useState, useMemo } from 'react';
import { PREBUILT_TEMPLATES, type PrebuiltTemplate } from '../defaultTemplates';
import type { TemplateRow } from '../dashboardForms';
import { extractSampleQuestions } from './templateHelper';

interface TemplatesTabProps {
  onUsePrebuilt: (tpl: PrebuiltTemplate) => void;
  onUseDbTemplate: (tpl: TemplateRow) => void;
  onCreateBlank: (title: string) => void;
  dbTemplates: TemplateRow[];
  isBusy: boolean;
}

const CATEGORIES = ['all', 'Skripsi', 'Survei', 'Cepat'] as const;

export default function DashboardTemplatesTab({
  onUsePrebuilt,
  onUseDbTemplate,
  onCreateBlank,
  dbTemplates,
  isBusy,
}: TemplatesTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [blankTitle, setBlankTitle] = useState('');

  const filteredTemplates = useMemo(() => {
    if (selectedCategory === 'all') return PREBUILT_TEMPLATES;
    return PREBUILT_TEMPLATES.filter((t) => t.tag.toLowerCase() === selectedCategory.toLowerCase());
  }, [selectedCategory]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ================= HERO: MULAI DARI FORM KOSONG ================= */}
      <div
        className="db-card"
        style={{
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--brand) 12%, var(--surface)), var(--surface))',
          borderColor: 'color-mix(in srgb, var(--brand) 30%, var(--border))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: '1.25rem' }}>➕</span>
          <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>
            Mulai dari Lembar Kosong
          </h3>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 14px' }}>
          Buat formulir dari awal lalu bebas tambahkan pertanyaan pilihan ganda, skala nilai, teks, hingga penomoran halaman.
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            className="input"
            style={{ flex: '1 1 280px', background: 'var(--surface)' }}
            placeholder="Ketik judul form (mis. Survei Kepuasan Mahasiswa UMPO)..."
            value={blankTitle}
            onChange={(e) => setBlankTitle(e.target.value)}
            disabled={isBusy}
          />
          <button
            type="button"
            className="btn btn--accent btn--sm"
            onClick={() => onCreateBlank(blankTitle)}
            disabled={isBusy}
          >
            + Buat Form Kosong ➔
          </button>
        </div>
      </div>

      {/* ================= HEADER KATALOG & KATEGORI ================= */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 16,
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
              Katalog Template Siap Pakai ✨
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Format pertanyaan sudah tersusun rapi. Pilih template yang cocok, lalu gunakan dalam 1-klik.
            </p>
          </div>

          {/* Filter Kategori */}
          <div className="db-filter-pills">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`db-filter-pill ${selectedCategory === cat ? 'is-active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === 'all' ? 'Semua Kategori' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* ================= GRID TEMPLATE CARDS ================= */}
        <div className="db-template-grid">
          {filteredTemplates.map((tpl) => {
            const sampleQuestions = extractSampleQuestions(tpl.schema?.blocks ?? []);

            return (
              <article key={tpl.id} className="db-template-card">
                {/* Header Template */}
                <div
                  className="db-tpl-header"
                  style={{
                    background: tpl.schema.theme.bg || 'var(--surface-soft)',
                    borderBottom: '1.5px solid var(--border)',
                  }}
                >
                  <span
                    className="db-tpl-tag"
                    style={{
                      background: 'rgba(255, 255, 255, 0.85)',
                      color: tpl.schema.theme.accent,
                    }}
                  >
                    {tpl.tag}
                  </span>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: tpl.schema.theme.text }}>
                    {tpl.pagesCount > 1 ? `📄 ${tpl.pagesCount} Halaman` : '📄 1 Halaman'} · ❓ {tpl.questionCount} Pertanyaan
                  </span>
                </div>

                {/* Konten & Deskripsi */}
                <div className="db-tpl-body">
                  <h3 className="db-tpl-title">{tpl.name}</h3>
                  <p className="db-tpl-desc">{tpl.description}</p>

                  {/* Contoh Pertanyaan di dalam Template (UX Ramah Pemula) */}
                  {sampleQuestions.length > 0 && (
                    <div className="db-sample-box">
                      <div className="db-sample-title">
                        <span>🔍</span> Contoh Pertanyaan di Dalamnya:
                      </div>
                      <ul className="db-sample-list">
                        {sampleQuestions.map((q, idx) => (
                          <li key={`sq-${idx}`} className="db-sample-item">
                            <span className="db-sample-bullet">•</span>
                            <span>
                              <strong>"{q.label}"</strong>{' '}
                              <small style={{ color: 'var(--text-muted)' }}>({q.kindText})</small>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div style={{ marginTop: 'auto', paddingTop: 10 }}>
                    <button
                      type="button"
                      className="btn btn--accent btn--sm"
                      style={{ width: '100%', fontWeight: 700 }}
                      onClick={() => onUsePrebuilt(tpl)}
                      disabled={isBusy}
                    >
                      Gunakan Template Ini ➔
                    </button>
                  </div>
                </div>
              </article>
            );
          })}

          {/* Template Tambahan dari Database */}
          {dbTemplates
            .filter((dbt) => !PREBUILT_TEMPLATES.some((p) => p.name === dbt.name))
            .map((t) => (
              <article key={`dbt-${t.id}`} className="db-template-card">
                <div className="db-tpl-header">
                  <span className="db-tpl-tag pill">Database Template</span>
                </div>
                <div className="db-tpl-body">
                  <h3 className="db-tpl-title">{t.name}</h3>
                  <p className="db-tpl-desc">Template tersimpan di sistem.</p>
                  <div style={{ marginTop: 'auto', paddingTop: 10 }}>
                    <button
                      type="button"
                      className="btn btn--accent btn--sm"
                      style={{ width: '100%' }}
                      onClick={() => onUseDbTemplate(t)}
                      disabled={isBusy}
                    >
                      Gunakan Template Ini ➔
                    </button>
                  </div>
                </div>
              </article>
            ))}
        </div>
      </div>
    </div>
  );
}
