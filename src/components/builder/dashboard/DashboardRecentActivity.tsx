/**
 * DashboardRecentActivity.tsx — Tabel aktivitas formulir terkini (Zona B).
 * Dilengkapi tombol unduh data dengan label ramah (Excel / CSV) untuk pengguna awam.
 */
import type { FormRow } from '../dashboardForms';

interface RecentActivityProps {
  forms: FormRow[];
}

export default function DashboardRecentActivity({ forms }: RecentActivityProps) {
  if (forms.length === 0) return null;

  return (
    <div className="db-card">
      <h3 style={{ fontSize: '1.02rem', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>🕒</span> Aktivitas Formulir Terkini
      </h3>
      <div className="db-table-scroll">
        <table className="db-table">
          <thead>
            <tr>
              <th>Formulir</th>
              <th>Jawaban</th>
              <th>Unduh Data</th>
            </tr>
          </thead>
          <tbody>
            {forms.slice(0, 5).map((f) => (
              <tr key={`act-${f.id}`}>
                <td>
                  <strong style={{ display: 'block', fontSize: '0.84rem' }}>{f.title}</strong>
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                    /f/{f.slug}
                  </small>
                </td>
                <td>
                  <span className="pill" style={{ fontSize: '0.68rem', fontWeight: 700 }}>
                    {f.responses}
                  </span>
                </td>
                <td>
                  <a
                    href={`/api/forms/${f.id}/export.csv`}
                    className="btn btn--ghost btn--sm"
                    style={{ minHeight: 28, padding: '2px 8px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}
                    title="Unduh data respons ke format file Excel / Spreadsheet (.csv)"
                  >
                    📥 Excel (CSV)
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
