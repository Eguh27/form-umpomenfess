/**
 * DashboardFeaturedCard.tsx — Kartu template rekomendasi terpopuler (Zona B).
 * Memberikan jalan pintas ramah bagi mahasiswa/peneliti yang ingin survei siap pakai.
 */
import type { PrebuiltTemplate } from '../defaultTemplates';

interface FeaturedCardProps {
  template: PrebuiltTemplate;
  onUseTemplate: (tpl: PrebuiltTemplate) => void;
  isBusy: boolean;
}

export default function DashboardFeaturedCard({
  template,
  onUseTemplate,
  isBusy,
}: FeaturedCardProps) {
  return (
    <div
      className="db-card"
      style={{
        background: 'linear-gradient(135deg, color-mix(in srgb, var(--coral) 12%, var(--surface)), var(--surface))',
        borderColor: 'color-mix(in srgb, var(--coral) 30%, var(--border))',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span className="pill pill--coral" style={{ fontSize: '0.66rem' }}>
          ⭐ Rekomendasi
        </span>
        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Paling sering dipakai mahasiswa</span>
      </div>
      <h4 style={{ fontSize: '0.98rem', margin: '0 0 6px', fontWeight: 700 }}>
        {template.name}
      </h4>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 14px', lineHeight: 1.4 }}>
        {template.description}
      </p>
      <button
        type="button"
        className="btn btn--accent btn--sm"
        style={{ width: '100%', fontWeight: 700 }}
        onClick={() => onUseTemplate(template)}
        disabled={isBusy}
      >
        Gunakan Template Ini ➔
      </button>
    </div>
  );
}
