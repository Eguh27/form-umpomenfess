/**
 * DashboardTrashTab.tsx — Tampilan tab Sampah (Recycle Bin) formulir (T-89).
 *
 * Menampilkan daftar form yang telah dihapus (soft-delete) oleh pengguna.
 * Pengguna dapat memulihkan form, mengunduh data respons (.xlsx/.csv),
 * atau menghapusnya secara permanen sebelum masa retensi 5 hari berakhir.
 */
import type { FormRow } from '../dashboardForms';

interface TrashTabProps {
  deletedForms: FormRow[];
  onRestoreForm: (form: FormRow) => void;
  onHardDeleteForm: (form: FormRow) => void;
  onEmptyTrash: () => void;
  isBusy: boolean;
}

export default function DashboardTrashTab({
  deletedForms,
  onRestoreForm,
  onHardDeleteForm,
  onEmptyTrash,
  isBusy,
}: TrashTabProps) {
  return (
    <div className="db-tab">
      <div className="db-tab-head" style={{ marginBottom: 'var(--space-4)' }}>
        <div>
          <h2 className="db-section-title" style={{ margin: 0 }}>
            Sampah
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Formulir disimpan sementara selama 5 hari sebelum otomatis dimusnahkan secara permanen.
          </p>
        </div>

        {deletedForms.length > 0 && (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={onEmptyTrash}
            disabled={isBusy}
            style={{ color: 'var(--danger, #e11d48)', borderColor: 'var(--danger, #e11d48)' }}
          >
            🗑️ Kosongkan Sampah
          </button>
        )}
      </div>

      {deletedForms.length === 0 ? (
        <div
          className="db-panel"
          style={{
            textAlign: 'center',
            padding: 'var(--space-8) var(--space-4)',
            background: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-2)' }}>🗑️</div>
          <h3 style={{ margin: '0 0 var(--space-1)', fontSize: '1.125rem', fontWeight: 700 }}>
            Kotak Sampah Kosong
          </h3>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.875rem' }}>
            Tidak ada formulir yang sedang dihapus.
          </p>
        </div>
      ) : (
        <div className="db-form-list">
          {deletedForms.map((form) => {
            const deletedTime = new Date(form.deletedAt || form.updatedAt).getTime();
            const elapsedDays = Math.floor((Date.now() - deletedTime) / (1000 * 60 * 60 * 24));
            const daysRemaining = Math.max(0, 5 - elapsedDays);

            return (
              <article
                key={`trash-${form.id}`}
                className="db-form-card"
                style={{ borderLeft: '4px solid var(--danger, #e11d48)' }}
              >
                <div
                  className="db-fc-head"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
                >
                  <div className="db-fc-info">
                    <h3 className="db-fc-title" style={{ margin: '0 0 4px', fontSize: '1.125rem' }}>
                      {form.title}
                    </h3>
                    <p
                      className="db-fc-meta"
                      style={{
                        margin: 0,
                        display: 'flex',
                        gap: '8px',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        fontSize: '0.8125rem',
                      }}
                    >
                      <span>{form.responses} jawaban tersimpan</span>
                      <span aria-hidden="true">•</span>
                      <span
                        style={{
                          color: daysRemaining <= 1 ? 'var(--danger, #e11d48)' : 'var(--text-muted)',
                          fontWeight: 600,
                        }}
                      >
                        ⏳ {daysRemaining === 0 ? 'Musnah hari ini' : `Musnah permanen dalam ${daysRemaining} hari`}
                      </span>
                    </p>
                  </div>
                </div>

                <div
                  className="db-fc-actions"
                  style={{
                    display: 'flex',
                    gap: 'var(--space-2)',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    marginTop: 'var(--space-3)',
                    paddingTop: 'var(--space-2)',
                    borderTop: '1px solid var(--border-soft, rgba(0,0,0,0.06))',
                  }}
                >
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => onRestoreForm(form)}
                    disabled={isBusy}
                  >
                    ↺ Pulihkan Form
                  </button>

                  <a
                    href={`/api/forms/${form.id}/export.xlsx`}
                    className="btn btn--ghost btn--sm"
                    download
                    title="Unduh jawaban ke berkas Excel (.xlsx)"
                  >
                    📊 Unduh .xlsx
                  </a>

                  <a
                    href={`/api/forms/${form.id}/export.csv`}
                    className="btn btn--ghost btn--sm"
                    download
                    title="Unduh jawaban ke berkas CSV"
                  >
                    📄 Unduh .csv
                  </a>

                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => onHardDeleteForm(form)}
                    disabled={isBusy}
                    style={{ color: 'var(--danger, #e11d48)', marginLeft: 'auto' }}
                  >
                    Hapus Permanen
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
