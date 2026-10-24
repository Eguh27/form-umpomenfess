/**
 * DashboardRecentActivity.tsx — tiga formulir terbaru sebagai daftar ringkas.
 * Tanpa tabel, tombol CSV, atau ikon.
 */
import type { FormRow } from '../dashboardForms';

interface RecentActivityProps {
  forms: FormRow[];
}

export default function DashboardRecentActivity({ forms }: RecentActivityProps) {
  if (forms.length === 0) return null;

  return (
    <section className="db-panel db-activity" aria-labelledby="db-activity-title">
      <h3 id="db-activity-title" className="db-section-title">
        Aktivitas terbaru
      </h3>
      <ul>
        {forms.slice(0, 3).map((form) => (
          <li key={`activity-${form.id}`}>
            <a href={`/dashboard/${form.id}`}>{form.title}</a>
            <span>{form.responses} jawaban</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
