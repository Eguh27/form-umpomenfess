/**
 * DashboardMyFormsTab.tsx — tab "Formulir Saya".
 * Ringkasan metrik, pencarian kontekstual, satu filter status, daftar kartu,
 * dan rail aktivitas terbaru.
 */
import type { FormRow } from '../dashboardForms';
import type { StatusFilter } from './types';
import DashboardFormCard from './DashboardFormCard';
import DashboardStatSummary from './DashboardStatSummary';
import DashboardRecentActivity from './DashboardRecentActivity';
import { summarizeForms } from './templateHelper';

interface MyFormsTabProps {
  forms: FormRow[];
  filteredForms: FormRow[];
  statusFilter: StatusFilter;
  onStatusFilterChange: (status: StatusFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCopyLink: (slug: string) => void;
  copiedSlug: string | null;
  onDuplicate: (form: FormRow) => void;
  onCloseForm: (form: FormRow) => void;
  onDeleteForm: (form: FormRow) => void;
  onOpenCreateModal: () => void;
  onGoToTemplates: () => void;
  isBusy: boolean;
}

export default function DashboardMyFormsTab({
  forms,
  filteredForms,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchChange,
  onCopyLink,
  copiedSlug,
  onDuplicate,
  onCloseForm,
  onDeleteForm,
  onOpenCreateModal,
  onGoToTemplates,
  isBusy,
}: MyFormsTabProps) {
  const summary = summarizeForms(forms);
  const filters: Array<{ id: StatusFilter; label: string; count: number }> = [
    { id: 'all', label: 'Semua', count: summary.total },
    { id: 'published', label: 'Aktif', count: summary.publishedCount },
    { id: 'draft', label: 'Draft', count: summary.draftCount },
    { id: 'closed', label: 'Ditutup', count: summary.closedCount },
  ];

  const emptyTitle = searchQuery
    ? 'Tidak ada formulir yang cocok'
    : statusFilter === 'all'
      ? 'Belum ada formulir'
      : 'Belum ada formulir di bagian ini';

  return (
    <div className="db-myforms">
      <DashboardStatSummary
        totalForms={summary.total}
        publishedCount={summary.publishedCount}
        draftCount={summary.draftCount}
        totalResponses={summary.totalResponses}
      />

      <div className={`db-grid-main ${forms.length === 0 ? 'db-grid-main--single' : ''}`}>
        <section className="db-col-primary" aria-labelledby="db-myforms-title">
          <div className="db-tab-head">
            <h2 id="db-myforms-title" className="db-section-title">
              Formulir kamu
              <span className="db-section-count">{filteredForms.length}</span>
            </h2>
          </div>

          <div className="db-toolbar">
            <div className="db-search">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Cari judul atau tautan"
                aria-label="Cari formulir"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="db-search-clear"
                  onClick={() => onSearchChange('')}
                  aria-label="Hapus kata kunci"
                >
                  ×
                </button>
              )}
            </div>

            <div className="db-segmented" role="group" aria-label="Filter status formulir">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className={statusFilter === filter.id ? 'is-active' : ''}
                  aria-pressed={statusFilter === filter.id}
                  onClick={() => onStatusFilterChange(filter.id)}
                >
                  {filter.label}
                  <span>{filter.count}</span>
                </button>
              ))}
            </div>
          </div>

          {filteredForms.length > 0 ? (
            <div className="db-form-list">
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
            <div className="db-empty">
              <h3>{emptyTitle}</h3>
              <p>
                {searchQuery
                  ? 'Coba kata kunci lain, atau mulai formulir baru.'
                  : 'Mulai dari template siap pakai atau rancang sendiri dari lembar kosong.'}
              </p>
              <div className="db-empty-actions">
                <button type="button" className="db-btn db-btn--primary" onClick={onGoToTemplates}>
                  Lihat template
                </button>
                <button type="button" className="db-btn db-btn--soft" onClick={onOpenCreateModal}>
                  Buat kosong
                </button>
              </div>
            </div>
          )}
        </section>

        {forms.length > 0 && (
          <aside className="db-col-secondary" aria-label="Aktivitas terbaru">
            <DashboardRecentActivity forms={forms} />
          </aside>
        )}
      </div>
    </div>
  );
}
