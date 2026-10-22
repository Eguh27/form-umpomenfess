/**
 * PreviewForm.tsx — render read-only blok form utk preview builder (T-43).
 * React otomatis meng-escape teks user — tidak ada jalur HTML mentah.
 * Renderer resmi halaman publik dibuat @C (T-50) secara terpisah di zona C.
 */
import type { FormSchemaData } from '../../lib/forms/schema';
import { isSensitiveLabel } from './sensitive';
import { cloudinaryUrl, HEADING_SIZE_REM, themeToStyle } from './themeUtils';

interface Props {
  form: FormSchemaData;
  cloudName: string;
}

export default function PreviewForm({ form, cloudName }: Props) {
  return (
    <div style={{ ...themeToStyle(form.theme), padding: 'var(--space-5)', borderRadius: form.theme.radius }}>
      {form.blocks.length === 0 && (
        <p style={{ fontStyle: 'italic', opacity: 0.7 }}>Belum ada blok — tambahkan dari panel kiri.</p>
      )}
      {form.blocks.map((block) => {
        switch (block.type) {
          case 'heading':
            return (
              <h2
                key={block.id}
                style={{
                  fontSize: HEADING_SIZE_REM[block.size],
                  textAlign: block.align,
                  margin: '0 0 var(--space-3)',
                }}
              >
                {block.text}
              </h2>
            );
          case 'text':
            return (
              <p key={block.id} style={{ margin: 'var(--space-2) 0' }}>
                {block.text}
              </p>
            );
          case 'image':
            return (
              <div key={block.id} style={{ textAlign: block.align, margin: 'var(--space-3) 0' }}>
                {block.publicId !== '' && cloudName !== '' && (
                  <img
                    src={cloudinaryUrl(block.publicId, cloudName)}
                    alt=""
                    style={{ borderRadius: Math.min(form.theme.radius, 24) }}
                  />
                )}
              </div>
            );
          case 'divider':
            return (
              <hr
                key={block.id}
                style={{
                  border: 0,
                  borderTop: '1.5px dashed currentColor',
                  opacity: 0.35,
                  margin: 'var(--space-4) 0',
                }}
              />
            );
          case 'question':
            return (
              <div key={block.id} style={{ margin: 'var(--space-4) 0' }}>
                <label style={{ fontWeight: 700, display: 'block' }}>
                  {block.label}
                  {block.required && <span aria-hidden="true"> *</span>}
                </label>
                {isSensitiveLabel(block.label) && (
                  <p style={{ fontSize: '0.8rem', fontWeight: 600, opacity: 0.75 }}>
                    ⚠ Jangan minta data sensitif di sini.
                  </p>
                )}
                <QuestionSkeleton block={block} />
              </div>
            );
        }
      })}
      <button type="button" className="btn" style={{ marginTop: 'var(--space-4)' }} disabled>
        Kirim
      </button>
      <p style={{ fontSize: '0.72rem', opacity: 0.65, marginTop: 'var(--space-2)' }}>
        Jawaban anonim dipakai hanya untuk form ini.
      </p>
    </div>
  );
}

function QuestionSkeleton({ block }: { block: Extract<FormSchemaData['blocks'][number], { type: 'question' }> }) {
  const inputStyle = {
    background: 'transparent',
    color: 'inherit',
    border: '1.5px solid currentColor',
    opacity: 0.85,
    borderRadius: 8,
    padding: '8px 12px',
  } as const;

  if (block.kind === 'paragraph') return <textarea style={{ ...inputStyle, width: '100%', minHeight: 80 }} readOnly />;
  if (block.kind === 'short_text') return <input style={{ ...inputStyle, width: '100%' }} readOnly />;

  if (block.kind === 'single_choice' || block.kind === 'multiple_choice' || block.kind === 'dropdown') {
    return block.kind === 'dropdown'
      ? <select style={{ ...inputStyle, width: '100%' }} disabled><option>—pilih—</option></select>
      : (
        <div style={{ display: 'grid', gap: 6 }}>
          {block.options?.map((opt) => (
            <span key={opt} style={{ display: 'flex', gap: 8, alignItems: 'center', opacity: 0.9 }}>
              <input type={block.kind === 'multiple_choice' ? 'checkbox' : 'radio'} disabled /> {opt}
            </span>
          ))}
        </div>
      );
  }

  // scale
  const steps = Array.from({ length: Math.abs((block.max ?? 5) - (block.min ?? 1)) + 1 }, (_, i) => (block.min ?? 1) + i * (block.min !== undefined && block.max !== undefined && block.max < block.min ? -1 : 1));
  return (
    <span style={{ display: 'flex', gap: 10, opacity: 0.9 }}>
      {steps.map((n) => (
        <span key={n} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input type="radio" disabled /> {n}
        </span>
      ))}
    </span>
  );
}
