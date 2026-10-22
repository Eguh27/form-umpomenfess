/**
 * ThemePanel.tsx — panel properti tema (color picker, font, radius, cardStyle).
 * Peringatan kontras memakai util @D (isReadable) — TASK 7.
 * Banner upload → lihat BannerUpload.tsx (T-42).
 */
import {
  CARD_STYLE_PRESETS,
  FONT_WHITELIST,
  SCHEMA_LIMITS,
  type FormFont,
} from '../../lib/forms/schema';
import { isReadable } from '../../lib/design/contrast';
import type { ThemeDraft } from './defaults';
import BannerUpload from './BannerUpload';

interface Props {
  theme: ThemeDraft;
  onChange: (patch: Partial<ThemeDraft>) => void;
}

const COLORS: Array<{ key: 'bg' | 'accent' | 'text'; label: string }> = [
  { key: 'bg', label: 'Latar' },
  { key: 'accent', label: 'Aksen' },
  { key: 'text', label: 'Teks' },
];

export default function ThemePanel({ theme, onChange }: Props) {
  const contrastOk = isReadable(theme.text, theme.bg);

  return (
    <section aria-label="Panel tema">
      <p className="eyebrow">Tema</p>
      <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
        {COLORS.map(({ key, label }) => (
          <label key={key} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: '0.9rem', fontWeight: 600 }}>
            <input
              type="color"
              value={theme[key]}
              onChange={(e) => onChange({ [key]: e.target.value })}
              aria-label={`Warna ${label}`}
            />
            {label} <code>{theme[key]}</code>
          </label>
        ))}

        <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>
          Font
          <select
            value={theme.font}
            onChange={(e) => onChange({ font: e.target.value as FormFont })}
            style={{ display: 'block', width: '100%' }}
          >
            {FONT_WHITELIST.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <span className="help">Daftar mengikuti whitelist schema (diperbarui via kontrak).</span>
        </label>

        <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>
          Radius sudut: {theme.radius}
          <input
            type="range"
            min={SCHEMA_LIMITS.radiusMin}
            max={SCHEMA_LIMITS.radiusMax}
            value={theme.radius}
            onChange={(e) => onChange({ radius: Number(e.target.value) })}
            style={{ display: 'block', width: '100%' }}
          />
        </label>

        <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>
          Gaya kartu
          <select
            value={theme.cardStyle}
            onChange={(e) => onChange({ cardStyle: e.target.value as ThemeDraft['cardStyle'] })}
            style={{ display: 'block', width: '100%' }}
          >
            {CARD_STYLE_PRESETS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        {theme.bannerPublicId === null && (
          <BannerUpload onUploaded={(publicId) => onChange({ bannerPublicId: publicId })} />
        )}
        {theme.bannerPublicId !== null && (
          <div style={{ fontSize: '0.85rem' }}>
            <p className="eyebrow">Banner</p>
            <code>{theme.bannerPublicId}</code>{' '}
            <button
              type="button"
              className="btn btn--ghost"
              style={{ padding: '4px 10px', fontSize: '0.8rem' }}
              onClick={() => onChange({ bannerPublicId: null })}
            >
              Hapus banner
            </button>
          </div>
        )}
      </div>

      {!contrastOk && (
        <p role="alert" className="help" style={{ color: 'var(--danger)', fontWeight: 700 }}>
          ⚠ Kontras teks &lt; 4.5:1 — kombinasi ini akan DITOLAK saat dipublikasikan.
        </p>
      )}
    </section>
  );
}
