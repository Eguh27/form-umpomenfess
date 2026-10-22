/**
 * ThemePanel.tsx — panel properti tema + preset tema siap pakai (T-41/T-45, Zona B).
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
import { PRESET_THEMES, applyThemePreset, type ThemePreset } from './presetThemes';

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

  const handleSelectPreset = (preset: ThemePreset) => {
    const applied = applyThemePreset(preset, theme.bannerPublicId);
    onChange(applied);
  };

  return (
    <section aria-label="Panel tema" style={{ display: 'grid', gap: 'var(--space-3)' }}>
      {/* Bagian Preset Tema 1-Klik ala Canva */}
      <div>
        <p className="eyebrow" style={{ margin: '0 0 6px' }}>Preset Tema Siap Pakai</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 6 }}>
          {PRESET_THEMES.map((preset) => {
            const isCurrent =
              theme.bg.toLowerCase() === preset.theme.bg.toLowerCase() &&
              theme.accent.toLowerCase() === preset.theme.accent.toLowerCase();

            return (
              <button
                key={preset.id}
                type="button"
                className="card card--plain"
                style={{
                  padding: '8px 10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderRadius: 8,
                  border: isCurrent ? '2px solid var(--brand)' : '1px solid var(--border)',
                  background: preset.theme.bg,
                  color: preset.theme.text,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  boxShadow: isCurrent ? '0 0 0 2px var(--accent-soft)' : 'none',
                }}
                onClick={() => handleSelectPreset(preset)}
                title={`Pilih preset ${preset.name}: ${preset.description}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: preset.theme.accent,
                      border: '1px solid rgba(0,0,0,0.15)',
                    }}
                  />
                  <strong style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {preset.name}
                  </strong>
                </div>
                <span style={{ fontSize: '0.68rem', opacity: 0.75 }}>
                  {preset.theme.font} · {preset.theme.cardStyle}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <hr className="dashed-divider" style={{ margin: 'var(--space-2) 0' }} />

      {/* Kontrol Kustomisasi Lanjutan */}
      <p className="eyebrow" style={{ margin: 0 }}>Penyesuaian Detail</p>
      <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
        {COLORS.map(({ key, label }) => (
          <label key={key} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: '0.9rem', fontWeight: 600 }}>
            <input
              type="color"
              value={theme[key]}
              onChange={(e) => onChange({ [key]: e.target.value })}
              aria-label={`Warna ${label}`}
              style={{ cursor: 'pointer', border: 'none', width: 32, height: 32, borderRadius: 6 }}
            />
            <span>{label} <code>{theme[key]}</code></span>
          </label>
        ))}

        <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>
          Font
          <select
            className="select"
            value={theme.font}
            onChange={(e) => onChange({ font: e.target.value as FormFont })}
            style={{ display: 'block', width: '100%', marginTop: 4 }}
          >
            {FONT_WHITELIST.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </label>

        <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>
          Radius sudut: {theme.radius}px
          <input
            type="range"
            min={SCHEMA_LIMITS.radiusMin}
            max={SCHEMA_LIMITS.radiusMax}
            value={theme.radius}
            onChange={(e) => onChange({ radius: Number(e.target.value) })}
            style={{ display: 'block', width: '100%', marginTop: 4 }}
          />
        </label>

        <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>
          Gaya kartu
          <select
            className="select"
            value={theme.cardStyle}
            onChange={(e) => onChange({ cardStyle: e.target.value as ThemeDraft['cardStyle'] })}
            style={{ display: 'block', width: '100%', marginTop: 4 }}
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
            <p className="eyebrow" style={{ margin: '0 0 4px' }}>Banner Terpasang</p>
            <code>{theme.bannerPublicId}</code>{' '}
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              style={{ padding: '3px 8px', fontSize: '0.78rem' }}
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
