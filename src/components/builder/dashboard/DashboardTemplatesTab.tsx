/**
 * DashboardTemplatesTab.tsx — mulai dari kosong dan katalog template.
 * Tanpa hero bergradien; kategori berupa tombol teks dan kartu tanpa border.
 */
import { useMemo, useState, type SyntheticEvent } from 'react';
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

function themeSwatches(schema: Record<string, unknown> | null) {
  const theme = schema?.theme as Record<string, unknown> | undefined;
  if (!theme) return null;
  const { bg, accent, text } = theme;
  if (typeof bg !== 'string' || typeof accent !== 'string' || typeof text !== 'string') return null;
  return [bg, accent, text];
}

function Swatches({ colors }: { colors: string[] }) {
  return (
    <span className="db-swatches" aria-hidden="true">
      {colors.map((color, index) => (
        <span key={`${color}-${index}`} style={{ background: color }} />
      ))}
    </span>
  );
}

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
    return PREBUILT_TEMPLATES.filter(
      (template) => template.tag.toLowerCase() === selectedCategory.toLowerCase(),
    );
  }, [selectedCategory]);

  const visibleDbTemplates =
    selectedCategory === 'all'
      ? dbTemplates.filter(
          (template) => !PREBUILT_TEMPLATES.some((prebuilt) => prebuilt.name === template.name),
        )
      : [];

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    onCreateBlank(blankTitle);
  };

  return (
    <div className="db-tab">
      <section className="db-panel db-blank-row" aria-labelledby="db-blank-title">
        <div>
          <h2 id="db-blank-title" className="db-section-title">
            Mulai dari kosong
          </h2>
          <p className="db-muted">Beri judul, lalu susun pertanyaan sendiri di editor.</p>
        </div>
        <form className="db-blank-form" onSubmit={handleSubmit}>
          <input
            className="input"
            value={blankTitle}
            onChange={(event) => setBlankTitle(event.target.value)}
            placeholder="Judul formulir"
            aria-label="Judul formulir baru"
            disabled={isBusy}
          />
          <button type="submit" className="db-btn db-btn--primary" disabled={isBusy}>
            Buat
          </button>
        </form>
      </section>

      <section className="db-catalog" aria-labelledby="db-catalog-title">
        <div className="db-catalog-head">
          <h2 id="db-catalog-title" className="db-section-title">
            Template
          </h2>
          <div className="db-segmented" role="group" aria-label="Kategori template">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                className={selectedCategory === category ? 'is-active' : ''}
                aria-pressed={selectedCategory === category}
                onClick={() => setSelectedCategory(category)}
              >
                {category === 'all' ? 'Semua' : category}
              </button>
            ))}
          </div>
        </div>

        <div className="db-template-grid">
          {filteredTemplates.map((template) => {
            const samples = extractSampleQuestions(template.schema?.blocks ?? [], 3);
            return (
              <article key={template.id} className="db-template-card">
                <Swatches
                  colors={[
                    template.schema.theme.bg,
                    template.schema.theme.accent,
                    template.schema.theme.text,
                  ]}
                />
                <h3>{template.name}</h3>
                <p className="db-template-meta">
                  {template.pagesCount} halaman, {template.questionCount} pertanyaan
                </p>
                <p className="db-template-desc">{template.description}</p>
                {samples.length > 0 && (
                  <ul className="db-sample-list">
                    {samples.map((sample, index) => (
                      <li key={`${template.id}-sample-${index}`}>
                        <span>{sample.label}</span>
                        <small>{sample.kindText}</small>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  className="db-btn db-btn--soft"
                  onClick={() => onUsePrebuilt(template)}
                  disabled={isBusy}
                >
                  Gunakan
                </button>
              </article>
            );
          })}

          {visibleDbTemplates.map((template) => {
            const colors = themeSwatches(template.schemaJson);
            const blocks = template.schemaJson?.blocks;
            const samples = extractSampleQuestions(Array.isArray(blocks) ? blocks : [], 3);
            return (
              <article key={`db-${template.id}`} className="db-template-card">
                {colors && <Swatches colors={colors} />}
                <h3>{template.name}</h3>
                <p className="db-template-source">Dari database</p>
                <p className="db-template-desc">Template tersimpan di sistem.</p>
                {samples.length > 0 && (
                  <ul className="db-sample-list">
                    {samples.map((sample, index) => (
                      <li key={`${template.id}-db-sample-${index}`}>
                        <span>{sample.label}</span>
                        <small>{sample.kindText}</small>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  className="db-btn db-btn--soft"
                  onClick={() => onUseDbTemplate(template)}
                  disabled={isBusy}
                >
                  Gunakan
                </button>
              </article>
            );
          })}
        </div>

        {filteredTemplates.length === 0 && visibleDbTemplates.length === 0 && (
          <div className="db-empty db-empty--inline">
            <h3>Belum ada template untuk kategori ini</h3>
            <button
              type="button"
              className="db-btn db-btn--soft"
              onClick={() => setSelectedCategory('all')}
            >
              Lihat semua
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
