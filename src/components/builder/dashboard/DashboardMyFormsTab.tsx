/**
 * DashboardMyFormsTab.tsx — Tampilan tab utama "Formulir Saya" (Zona B).
 * Layout 2 kolom ala E-Tutor: kolom kartu formulir & kolom analitik/aktivitas.
 */
import type { FormRow } from '../dashboardForms';
import type { StatusFilter } from './types';
import DashboardFormCard from './DashboardFormCard';
import DashboardStatSummary from './DashboardStatSummary';
import DashboardFeaturedCard from './DashboardFeaturedCard';
import DashboardRecentActivity from './DashboardRecentActivity';
import { PREBUILT_TEMPLATES, type PrebuiltTemplate } from '../defaultTemplates';
import { summarizeForms } from './templateHelper';

interface MyFormsTabProps {
  forms: FormRow[];
  filteredForms: FormRow[];
  statusFilter: StatusFilter;
  onStatusFilterChange: (s: StatusFilter) => void;
  searchQuery: string;
  onCopyLink: (slug: string) => void;
  copiedSlug: string | null;
  onDuplicate: (form: FormRow) => void;
  onCloseForm: (form: FormRow) => void;
  onDeleteForm: (form: FormRow) => void;
  onOpenCreateModal: () => void;
  onGoToTemplates: () => void;
  onUseTemplate: (tpl: PrebuiltTemplate) => void;
  isBusy: boolean;
}

export default function DashboardMyFormsTab({
  forms,
  filteredForms,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onCopyLink,
  copiedSlug,
  onDuplicate,
  onCloseForm,
  onDeleteForm,
  onOpenCreateModal,
  onGoToTemplates,
  onUseTemplate,
  isBusy,
}: MyFormsTabProps) {
  const summary = summarizeForms(forms);
  const { publishedCount, draftCount, closedCount, totalResponses } = summary;
  // Template andalan: cari by id agar urutan array tak mengubah tampilan.
  const featuredTemplate =
    PREBUILT_TEMPLATES.find((t) => t.id === 'tpl-skripsi-multipage') ?? PREBUILT_TEMPLATES[0];

  return (
    <div className="db-grid-main">
      {/* ================= KOLOM KIRI: DAFTAR FORMULIR ================= */}
      <section className="db-col-primary">
        <div className="db-section-head">
          <h2>
            <span>📁</span> Formulir Kamu ({filteredForms.length})
          </h2>

          <div className="db-filter-pills">
            <button
              type="button"
              className={`db-filter-pill ${statusFilter === 'all' ? 'is-active' : ''}`}
              onClick={() => onStatusFilterChange('all')}
            >
              Semua ({summary.total})
            </button>
            <button
              type="button"
              className={`db-filter-pill ${statusFilter === 'published' ? 'is-active' : ''}`}
              onClick={() => onStatusFilterChange('published')}
            >
              🟢 Aktif ({publishedCount})
            </button>
            <button
              type="button"
              className={`db-filter-pill ${statusFilter === 'draft' ? 'is-active' : ''}`}
              onClick={() => onStatusFilterChange('draft')}
            >
              🟡 Draft ({draftCount})
            </button>
            {closedCount > 0 && (
              <button
                type="button"
                className={`db-filter-pill ${statusFilter === 'closed' ? 'is-active' : ''}`}
                onClick={() => onStatusFilterChange('closed')}
              >
                ⚪ Tutup ({closedCount})
              </button>
            )}
          </div>
        </div>

        {/* Daftar Kartu Form */}
        {filteredForms.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filteredForms.map((form) => (
              <DashboardFormCard
                key={form.id}
                form={form}
                onCopyLink={onCopyLink}
                copiedSlug={copiedSlug}
                onDuplicate={onDuplicate}
                onCloseForm={onCloseForm}
                onDeleteForm={onDeleteForm}
                isBusy={isBusy}
              />
            ))}
          </div>
        ) : (
          /* Empty State Ramah Pemula */
          <div
            className="db-card"
            style={{
              padding: '36px 24px',
              textAlign: 'center',
              borderStyle: 'dashed',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📋</div>
            <h3 style={{ fontSize: '1.15rem', margin: '0 0 6px' }}>
              {searchQuery
                ? `Tidak ada formulir yang cocok dengan "${searchQuery}".`
                : 'Belum ada formulir di bagian ini.'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: 420, margin: '0 auto 20px' }}>
              Mulai kumpulkan respons sekarang! Kamu bisa pilih template siap pakai dengan pertanyaan terstruktur atau buat dari awal.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn--accent btn--sm"
                onClick={onGoToTemplates}
              >
                ✨ Lihat Katalog Template ➔
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={onOpenCreateModal}
              >
                + Buat Form Kosong
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ================= KOLOM KANAN: STATISTIK & REKOMENDASI ================= */}
      <aside className="db-col-secondary">
        <DashboardStatSummary
          totalForms={summary.total}
          publishedCount={publishedCount}
          draftCount={draftCount}
          totalResponses={totalResponses}
        />

        {featuredTemplate && (
          <DashboardFeaturedCard
            template={featuredTemplate}
            onUseTemplate={onUseTemplate}
            isBusy={isBusy}
          />
        )}

        <DashboardRecentActivity forms={forms} />
      </aside>
    </div>
  );
}
