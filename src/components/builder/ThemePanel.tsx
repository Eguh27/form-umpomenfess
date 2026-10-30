/**
 * ThemePanel.tsx — properti tema dan preset (T-41/T-45, diperbarui T-73).
 * Preset hanya memakai nilai whitelist schema; banner tidak ikut terhapus.
 */
import { useId, useState, type CSSProperties } from 'react';
import {
  CARD_STYLE_PRESETS,
  FONT_WHITELIST,
  SCHEMA_LIMITS,
  type FormFont,
} from '../../lib/forms/schema';
import { isReadable } from '../../lib/design/contrast';
import type { ThemeVariant } from '../../lib/forms/themePresets';
import type { ThemeDraft } from './defaults';
import { CARD_STYLE_LABELS, FONT_LABELS } from './blockLabels';
import { cloudinaryUrl } from './themeUtils';
import BannerUpload, { uploadBanner } from './BannerUpload';
import { BannerCropModal } from './BannerCropModal';
import { PRESET_THEMES, applyThemePreset, type ThemePreset } from './presetThemes';

interface Props {
  formId?: string;
  theme: ThemeDraft;
  onChange: (patch: Partial<ThemeDraft>) => void;
  cloudName?: string;
}

const COLORS: Array<{ key: 'bg' | 'accent' | 'text'; label: string }> = [
  { key: 'bg', label: 'Latar' },
  { key: 'accent', label: 'Aksen' },
  { key: 'text', label: 'Teks' },
];

export default function ThemePanel({ formId, theme, onChange, cloudName = '' }: Props) {
  const prefix = useId();
  const [variant, setVariant] = useState<ThemeVariant>('light');
  const [recropSrc, setRecropSrc] = useState<string | null>(null);
  const [busyRecrop, setBusyRecrop] = useState(false);
  const [recropError, setRecropError] = useState<string | null>(null);
  const contrastOk = isReadable(theme.text, theme.bg);

  const usePreset = (preset: ThemePreset) => {
    onChange(applyThemePreset(preset, theme.bannerPublicId, variant));
  };

  const presetThemeFor = (preset: ThemePreset) =>
    variant === 'dark' ? (preset.darkTheme ?? preset.theme) : preset.theme;

  return (
    <div className="b-panel">
      <section className="b-section" aria-label="Preset tema">
        <h3 className="b-section__title">Preset</h3>
        <div className="b-variant" role="group" aria-label="Varian warna preset">
          <button type="button" aria-pressed={variant === 'light'} onClick={() => setVariant('light')}>
            Terang
          </button>
          <button type="button" aria-pressed={variant === 'dark'} onClick={() => setVariant('dark')}>
            Gelap
          </button>
        </div>
        <div className="b-presets">
          {PRESET_THEMES.map((preset) => {
            const target = presetThemeFor(preset);
            const active =
              theme.bg.toLowerCase() === target.bg.toLowerCase() &&
              theme.accent.toLowerCase() === target.accent.toLowerCase();
            const presetStyle = {
              background: target.bg,
              color: target.text,
            } as CSSProperties;

            return (
              <button
                key={preset.id}
                type="button"
                className="b-preset"
                style={presetStyle}
                aria-pressed={active}
                onClick={() => usePreset(preset)}
                title={preset.description}
              >
                <span className="b-preset__name">
                  <span
                    className="b-preset__dot"
                    style={{ background: target.accent }}
                    aria-hidden="true"
                  />
                  {preset.name}
                </span>
                <span className="b-preset__meta">
                  {preset.category} · {FONT_LABELS[target.font]}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="b-section" aria-label="Warna dan bentuk">
        <h3 className="b-section__title">Warna &amp; bentuk</h3>

        <div className="b-color-grid">
          {COLORS.map(({ key, label }) => (
            <label className="b-color" key={key} htmlFor={`${prefix}-${key}`}>
              <span>{label}</span>
              <input
                id={`${prefix}-${key}`}
                type="color"
                value={theme[key]}
                onChange={(event) => onChange({ [key]: event.target.value })}
              />
              <code>{theme[key]}</code>
            </label>
          ))}
        </div>

        <div className="b-field">
          <label className="b-field__label" htmlFor={`${prefix}-font`}>Font</label>
          <select
            id={`${prefix}-font`}
            className="select"
            value={theme.font}
            onChange={(event) => onChange({ font: event.target.value as FormFont })}
          >
            {FONT_WHITELIST.map((font) => (
              <option key={font} value={font}>{FONT_LABELS[font]}</option>
            ))}
          </select>
        </div>

        <div className="b-field">
          <label className="b-field__label" htmlFor={`${prefix}-radius`}>
            Sudut membulat: {theme.radius}px
          </label>
          <input
            id={`${prefix}-radius`}
            type="range"
            min={SCHEMA_LIMITS.radiusMin}
            max={SCHEMA_LIMITS.radiusMax}
            value={theme.radius}
            onChange={(event) => onChange({ radius: Number(event.target.value) })}
          />
        </div>

        <div className="b-field">
          <label className="b-field__label" htmlFor={`${prefix}-card-style`}>Gaya kartu</label>
          <select
            id={`${prefix}-card-style`}
            className="select"
            value={theme.cardStyle}
            onChange={(event) => onChange({ cardStyle: event.target.value as ThemeDraft['cardStyle'] })}
          >
            {CARD_STYLE_PRESETS.map((style) => (
              <option key={style} value={style}>{CARD_STYLE_LABELS[style]}</option>
            ))}
          </select>
        </div>

        {!contrastOk && (
          <p className="b-warning" role="alert">
            Kontras teks dan latar belum cukup (minimal 4.5:1). Perbaiki sebelum publikasi.
          </p>
        )}
      </section>

      <section className="b-section" aria-label="Banner form">
        <h3 className="b-section__title">Banner</h3>
        {theme.bannerPublicId === null ? (
          <BannerUpload formId={formId} onUploaded={(publicId) => onChange({ bannerPublicId: publicId })} />
        ) : (
          <div className="b-banner">
            {cloudName !== '' && (
              <img
                className="b-banner__img"
                src={cloudinaryUrl(theme.bannerPublicId, cloudName)}
                alt="Pratinjau banner form"
              />
            )}
            <div className="b-banner__row">
              <span className="b-banner__id" title={theme.bannerPublicId}>{theme.bannerPublicId}</span>
              <button
                type="button"
                className="b-btn b-btn--ghost b-btn--sm"
                onClick={() => setRecropSrc(cloudinaryUrl(theme.bannerPublicId!, cloudName))}
                disabled={busyRecrop}
              >
                ✏️ Crop Ulang
              </button>
              <button
                type="button"
                className="b-btn b-btn--ghost b-btn--sm"
                onClick={() => onChange({ bannerPublicId: null })}
                disabled={busyRecrop}
                style={{ color: 'var(--danger)' }}
              >
                Hapus banner
              </button>
            </div>
            {recropError && <p className="b-warning" role="alert">{recropError}</p>}
            {busyRecrop && <p className="b-help" role="status">Mengunggah banner baru…</p>}
          </div>
        )}

        {recropSrc && (
          <BannerCropModal
            imageSrc={recropSrc}
            isOpen={true}
            onClose={() => setRecropSrc(null)}
            onApplyCrop={async (croppedFile) => {
              setBusyRecrop(true);
              setRecropError(null);
              try {
                const publicId = await uploadBanner(croppedFile, formId);
                onChange({ bannerPublicId: publicId });
              } catch (err) {
                setRecropError(err instanceof Error ? err.message : 'Gagal memproses banner.');
              } finally {
                setBusyRecrop(false);
                setRecropSrc(null);
              }
            }}
          />
        )}
      </section>
    </div>
  );
}
