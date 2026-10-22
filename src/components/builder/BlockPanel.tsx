/**
 * BlockPanel.tsx — panel properti blok terpilih (T-41).
 * Mengedit draft apa adanya; validasi batas dilakukan saat autosave/publish
 * lewat parseFormSchema (serialize.ts) — nilai nakal TIDAK tersimpan.
 */
import { QUESTION_KINDS, SCHEMA_LIMITS, CHOICE_KINDS, type QuestionKind } from '../../lib/forms/schema';
import type { BlockDraft, BuilderState } from './defaults';
import { parseOptionsTextarea, optionsToTextarea } from './serialize';
import { isSensitiveLabel } from './sensitive';

interface Props {
  block: BlockDraft;
  onPatch: (patch: Partial<BlockDraft>) => void;
}

const inputStyle = {
  display: 'block',
  width: '100%',
  background: 'var(--surface)',
  color: 'var(--text)',
  border: '1.5px solid var(--border)',
  borderRadius: 8,
  padding: '7px 10px',
  font: '600 0.9rem/1.4 var(--font-sans)',
} as const;

export default function BlockPanel({ block: b, onPatch }: Props) {
  if (b.type === 'divider') {
    return (
      <section aria-label="Panel pembatas">
        <p className="eyebrow">Pembatas</p>
        <p className="help">Garis putus-putus tanpa properti.</p>
      </section>
    );
  }

  if (b.type === 'image') {
    return (
      <section aria-label="Panel gambar">
        <p className="eyebrow">Gambar (publicId Cloudinary)</p>
        <input
          style={inputStyle}
          value={b.publicId}
          onChange={(e) => onPatch({ publicId: e.target.value })}
          placeholder="mis. form/uniqnotation"
        />
        <p className="help">Hanya publicId milik project ini (bukan URL bebas). Banner: panel teman.</p>
      </section>
    );
  }

  if (b.type === 'heading') {
    return (
      <section aria-label="Panel judul">
        <p className="eyebrow">Judul</p>
        <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>
          Teks
          <input style={inputStyle} value={b.text} onChange={(e) => onPatch({ text: e.target.value })} />
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            Ukuran
            <select style={inputStyle} value={b.size} onChange={(e) => onPatch({ size: e.target.value as typeof b.size })}>
              {(['s', 'm', 'l', 'xl'] as const).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            Perataan
            <select style={inputStyle} value={b.align} onChange={(e) => onPatch({ align: e.target.value as typeof b.align })}>
              {(['left', 'center', 'right'] as const).map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
        </div>
      </section>
    );
  }

  if (b.type === 'text') {
    return (
      <section aria-label="Panel teks">
        <p className="eyebrow">Teks</p>
        <textarea style={{ ...inputStyle, minHeight: 90 }} value={b.text} onChange={(e) => onPatch({ text: e.target.value })} />
        <p className="help">{b.text.length} karakter— batas diperiksa saat simpan.</p>
      </section>
    );
  }

  // question
  return (
    <section aria-label="Panel pertanyaan">
      <p className="eyebrow">Pertanyaan</p>
      <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>
        Label
        <input style={inputStyle} value={b.label} onChange={(e) => onPatch({ label: e.target.value })} />
      </label>
      {isSensitiveLabel(b.label) && (
        <p role="alert" className="help" style={{ color: 'var(--danger)', fontWeight: 700 }}>
          Peringatan: berisiko data sensitif (sandi/NIK/rekening dsb.) — mohon ganti.
        </p>
      )}
      <label style={{ display: 'flex', gap: 8, marginTop: 8, fontSize: '0.9rem', fontWeight: 600 }}>
        <input
          type="checkbox"
          checked={b.required}
          onChange={(e) => onPatch({ required: e.target.checked })}
        />
        Wajib diisi
      </label>
      <label style={{ marginTop: 8, fontSize: '0.9rem', fontWeight: 600 }}>
        Jenis
        <select style={inputStyle} value={b.kind} onChange={(e) => onPatch({ kind: e.target.value as QuestionKind })}>
          {QUESTION_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </label>

      {(CHOICE_KINDS as readonly string[]).includes(b.kind) && (
        <label style={{ display: 'block', marginTop: 8, fontSize: '0.9rem', fontWeight: 600 }}>
          Opsi (satu per baris)
          <textarea
            style={{ ...inputStyle, minHeight: 80 }}
            value={optionsToTextarea(b.options)}
            onChange={(e) => onPatch({ options: parseOptionsTextarea(e.target.value) })}
          />
        </label>
      )}

      {b.kind === 'scale' && (
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            Min
            <input type="number" style={inputStyle} value={b.min ?? 1}
              onChange={(e) => onPatch({ min: Number(e.target.value) })}
              min={SCHEMA_LIMITS.scaleValueMin} max={SCHEMA_LIMITS.scaleValueMax}
            />
          </label>
          <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            Max
            <input type="number" style={inputStyle} value={b.max ?? 5}
              onChange={(e) => onPatch({ max: Number(e.target.value) })}
              min={1} max={SCHEMA_LIMITS.scaleValueMax}
            />
          </label>
        </div>
      )}

      {(b.kind === 'short_text' || b.kind === 'paragraph') && (
        <label style={{ display: 'block', marginTop: 8, fontSize: '0.9rem', fontWeight: 600 }}>
          Batas karakter (opsional)
          <input
            type="number"
            style={inputStyle}
            value={b.maxLength ?? ''}
            onChange={(e) => onPatch({ maxLength: e.target.value === '' ? null : Number(e.target.value) })}
            min={1}
            placeholder="mis. 200"
          />
        </label>
      )}
    </section>
  );
}

export type { BuilderState };
