/**
 * DashboardStatSummary.tsx — satu panel datar berisi empat metrik utama.
 * Dipakai di tab Formulir Saya dan Statistik; tanpa ikon dan tanpa kartu dalam kartu.
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
    <section className="db-stats-strip" aria-label="Ringkasan formulir">
      <div className="db-stat">
        <strong className="db-stat-number">{totalForms}</strong>
        <span className="db-stat-label">Total formulir</span>
      </div>
      <div className="db-stat">
        <strong className="db-stat-number">{publishedCount}</strong>
        <span className="db-stat-label">Aktif</span>
      </div>
      <div className="db-stat">
        <strong className="db-stat-number">{draftCount}</strong>
        <span className="db-stat-label">Draft</span>
      </div>
      <div className="db-stat">
        <strong className="db-stat-number">{totalResponses}</strong>
        <span className="db-stat-label">Jawaban</span>
      </div>
    </section>
  );
}
