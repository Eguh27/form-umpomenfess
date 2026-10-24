/**
 * DashboardStatSummary.tsx — Ringkasan 4 metrik utama formulir (Zona B).
 * Menggunakan token semantik agar kontras tinggi di mode terang maupun gelap.
 */
interface StatSummaryProps {
  totalForms: number;
  publishedCount: number;
  draftCount: number;
  totalResponses: number;
}

export default function DashboardStatSummary({
  totalForms,
  publishedCount,
  draftCount,
  totalResponses,
}: StatSummaryProps) {
  return (
    <div className="db-card">
      <h3 style={{ fontSize: '1.05rem', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>📊</span> Ringkasan Formulir
      </h3>
      <div className="db-stat-grid">
        <div className="db-stat-item">
          <span className="db-stat-label">Total Form</span>
          <strong className="db-stat-number">{totalForms}</strong>
          <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Dibuat di akunmu</small>
        </div>

        <div className="db-stat-item">
          <span className="db-stat-label">Form Aktif</span>
          <strong className="db-stat-number" style={{ color: 'var(--brand-strong)' }}>
            {publishedCount}
          </strong>
          <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Siap menerima jawaban</small>
        </div>

        <div className="db-stat-item">
          <span className="db-stat-label">Total Jawaban</span>
          <strong className="db-stat-number" style={{ color: 'var(--accent)' }}>
            {totalResponses}
          </strong>
          <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Jawaban terkumpul</small>
        </div>

        <div className="db-stat-item">
          <span className="db-stat-label">Draft</span>
          <strong className="db-stat-number" style={{ color: 'var(--coral)' }}>
            {draftCount}
          </strong>
          <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Belum dipublikasikan</small>
        </div>
      </div>
    </div>
  );
}
