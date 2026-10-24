/**
 * DashboardStatsTab.tsx — ringkasan metrik dan satu tabel semua formulir.
 */
import type { FormRow } from '../dashboardForms';
import DashboardStatSummary from './DashboardStatSummary';
import { statusMeta } from './types';
import { summarizeForms } from './templateHelper';

interface StatsTabProps {
  forms: FormRow[];
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function DashboardStatsTab({ forms }: StatsTabProps) {
  const summary = summarizeForms(forms);

  return (
    <div className="db-tab">
      <h2 className="db-section-title">Statistik</h2>

      <DashboardStatSummary
        totalForms={summary.total}
        publishedCount={summary.publishedCount}
        draftCount={summary.draftCount}
        totalResponses={summary.totalResponses}
      />

      <section className="db-panel" aria-labelledby="db-stats-table-title">
        <h3 id="db-stats-table-title" className="db-section-title">
          Semua formulir
        </h3>

        {forms.length > 0 ? (
          <div className="db-table-scroll">
            <table className="db-table">
              <thead>
                <tr>
                  <th scope="col">Formulir</th>
                  <th scope="col">Status</th>
                  <th scope="col">Diperbarui</th>
                  <th scope="col">Jawaban</th>
                  <th scope="col">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {forms.map((form) => {
                  const meta = statusMeta(form.status);
                  return (
                    <tr key={`stat-${form.id}`}>
                      <td>
                        <a href={`/dashboard/${form.id}`} className="db-table-title">
                          {form.title}
                        </a>
                        <span className="db-table-slug">/f/{form.slug}</span>
                      </td>
                      <td>
                        <span className={`db-status db-status--${meta.tone}`}>
                          {meta.short}
                        </span>
                      </td>
                      <td>{formatDate(form.updatedAt)}</td>
                      <td>{form.responses}</td>
                      <td>
                        <div className="db-table-actions">
                          <a href={`/dashboard/${form.id}/respons`}>Lihat</a>
                          <a href={`/api/forms/${form.id}/export.csv`}>CSV</a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="db-empty db-empty--inline">
            <h3>Belum ada formulir</h3>
            <p>Statistik akan muncul setelah formulir pertama dibuat.</p>
          </div>
        )}
      </section>
    </div>
  );
}
