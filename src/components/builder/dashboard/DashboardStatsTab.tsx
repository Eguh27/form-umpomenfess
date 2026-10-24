/**
 * DashboardStatsTab.tsx — Ringkasan statistik & ekspor data formulir.
 * Memberikan gambaran performa formulir dan akses cepat unduh respons.
 */
import type { FormRow } from '../dashboardForms';
import { summarizeForms } from './templateHelper';

interface StatsTabProps {
  forms: FormRow[];
}

/** Badge status tabel: label & class persis satu sumber, status tak dikenal jatuh ke Ditutup. */
const STATUS_BADGES: Record<string, { label: string; badgeClass: string }> = {
  published: { label: '🟢 Aktif', badgeClass: 'status-published' },
  draft: { label: '🟡 Draft', badgeClass: 'status-draft' },
};
const STATUS_BADGES_FALLBACK = { label: '⚪ Tutup', badgeClass: 'status-closed' };

export default function DashboardStatsTab({ forms }: StatsTabProps) {
  const summary = summarizeForms(forms);
  const { publishedCount, draftCount, closedCount, totalResponses } = summary;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ================= STATISTIK UTAMA (GRID KARTU) ================= */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 16px' }}>
          Statistik Penggunaan & Jawaban 📊
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
          <div className="db-card" style={{ padding: 18 }}>
            <span className="db-stat-label">Total Formulir</span>
            <strong className="db-stat-number">{summary.total}</strong>
            <small style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>Seluruh form yang pernah dibuat</small>
          </div>

          <div className="db-card" style={{ padding: 18 }}>
            <span className="db-stat-label">Form Aktif</span>
            <strong className="db-stat-number" style={{ color: 'var(--brand-strong)' }}>
              {publishedCount}
            </strong>
            <small style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>Sedang aktif menerima respons</small>
          </div>

          <div className="db-card" style={{ padding: 18 }}>
            <span className="db-stat-label">Total Jawaban Masuk</span>
            <strong className="db-stat-number" style={{ color: 'var(--accent)' }}>
              {totalResponses}
            </strong>
            <small style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>Respon terkumpul dari pengguna</small>
          </div>

          <div className="db-card" style={{ padding: 18 }}>
            <span className="db-stat-label">Draft & Tutup</span>
            <strong className="db-stat-number" style={{ color: '#b45309' }}>
              {draftCount + closedCount}
            </strong>
            <small style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
              {draftCount} draft · {closedCount} tutup
            </small>
          </div>
        </div>
      </div>

      {/* ================= TABEL SEMUA FORMULIR & EKSPOR DATA ================= */}
      <div className="db-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>
              Daftar Formulir & Unduh Jawaban
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Kamu bisa mengunduh data jawaban responden dalam format CSV untuk diolah di Microsoft Excel atau Google Sheets.
            </p>
          </div>
        </div>

        {forms.length > 0 ? (
          <div className="db-table-scroll">
            <table className="db-table">
              <thead>
                <tr>
                  <th>Judul Formulir</th>
                  <th>Status</th>
                  <th>Jawaban Terkumpul</th>
                  <th>Terakhir Diubah</th>
                  <th>Aksi Cepat</th>
                </tr>
              </thead>
              <tbody>
                {forms.map((f) => (
                  <tr key={`stat-row-${f.id}`}>
                    <td>
                      <strong style={{ fontSize: '0.9rem' }}>{f.title}</strong>
                      <span style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        /f/{f.slug}
                      </span>
                    </td>
                    <td>
                      <span className={`db-fc-status ${(STATUS_BADGES[f.status] ?? STATUS_BADGES_FALLBACK).badgeClass}`}>
                        {(STATUS_BADGES[f.status] ?? STATUS_BADGES_FALLBACK).label}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--brand-strong)' }}>{f.responses}</strong> respons
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {new Date(f.updatedAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <a
                          href={`/dashboard/${f.id}/respons`}
                          className="btn btn--ghost btn--sm"
                          style={{ minHeight: 30, padding: '2px 10px', fontSize: '0.75rem' }}
                        >
                          📊 Lihat Grafik
                        </a>
                        <a
                          href={`/api/forms/${f.id}/export.csv`}
                          className="btn btn--accent btn--sm"
                          style={{ minHeight: 30, padding: '2px 10px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                          title="Unduh data jawaban responden dalam format file Excel / Spreadsheet (.csv)"
                        >
                          📥 Unduh Excel / CSV
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>
            Belum ada formulir yang dibuat.
          </p>
        )}
      </div>
    </div>
  );
}
