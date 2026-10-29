/**
 * BlockPanel.tsx — properti blok terpilih (T-73).
 * Label, jenis, dan ukuran memakai bahasa Indonesia dari blockLabels.ts.
 */
import {
  ALIGNMENTS,
  CHOICE_KINDS,
  HEADING_SIZES,
  QUESTION_KINDS,
  SCHEMA_LIMITS,
  type QuestionKind,
} from '../../lib/forms/schema';
import type { BlockDraft } from './defaults';
import { isCriticalLabel, isSensitiveLabel } from './sensitive';
import BlockOptionsEditor from './BlockOptionsEditor';
import {
  ALIGN_LABELS,
  HEADING_SIZE_LABELS,
  QUESTION_KIND_LABELS,
} from './blockLabels';

interface Props {
  block: BlockDraft;
  onPatch: (patch: Partial<BlockDraft>) => void;
}

export default function BlockPanel({ block: b, onPatch }: Props) {
  const prefix = `b-panel-${b.id}`;

  if (b.type === 'divider') {
    return (
      <section className="b-panel" aria-label="Properti garis pembatas">
        <h3 className="b-section__title">Garis pembatas</h3>
        <p className="b-help">Blok ini hanya memberi jarak visual antarbagian form.</p>
      </section>
    );
  }

  if (b.type === 'image') {
    return (
      <section className="b-panel" aria-label="Properti gambar">
        <h3 className="b-section__title">Gambar</h3>
        <div className="b-field">
          <label className="b-field__label" htmlFor={`${prefix}-public-id`}>
            ID gambar Cloudinary
          </label>
          <input
            id={`${prefix}-public-id`}
            className="input"
            value={b.publicId}
            onChange={(event) => onPatch({ publicId: event.target.value })}
            placeholder="form/contoh"
            autoComplete="off"
          />
          <p className="b-help">Gunakan gambar yang diunggah lewat builder ini, bukan URL bebas.</p>
        </div>
        <div className="b-field">
          <label className="b-field__label" htmlFor={`${prefix}-align`}>Perataan</label>
          <select
            id={`${prefix}-align`}
            className="select"
            value={b.align}
            onChange={(event) => onPatch({ align: event.target.value })}
          >
            {ALIGNMENTS.map((align) => (
              <option key={align} value={align}>{ALIGN_LABELS[align]}</option>
            ))}
          </select>
        </div>
      </section>
    );
  }

  if (b.type === 'heading') {
    return (
      <section className="b-panel" aria-label="Properti judul">
        <h3 className="b-section__title">Judul</h3>
        <div className="b-field">
          <label className="b-field__label" htmlFor={`${prefix}-text`}>Teks judul</label>
          <input
            id={`${prefix}-text`}
            className="input"
            value={b.text}
            onChange={(event) => onPatch({ text: event.target.value })}
          />
        </div>
        <div className="b-grid2">
          <div className="b-field">
            <label className="b-field__label" htmlFor={`${prefix}-size`}>Ukuran</label>
            <select
              id={`${prefix}-size`}
              className="select"
              value={b.size}
              onChange={(event) => onPatch({ size: event.target.value as typeof b.size })}
            >
              {HEADING_SIZES.map((size) => (
                <option key={size} value={size}>{HEADING_SIZE_LABELS[size]}</option>
              ))}
            </select>
          </div>
          <div className="b-field">
            <label className="b-field__label" htmlFor={`${prefix}-align`}>Perataan</label>
            <select
              id={`${prefix}-align`}
              className="select"
              value={b.align}
              onChange={(event) => onPatch({ align: event.target.value as typeof b.align })}
            >
              {ALIGNMENTS.map((align) => (
                <option key={align} value={align}>{ALIGN_LABELS[align]}</option>
              ))}
            </select>
          </div>
        </div>
      </section>
    );
  }

  if (b.type === 'text') {
    return (
      <section className="b-panel" aria-label="Properti teks">
        <h3 className="b-section__title">Teks</h3>
        <div className="b-field">
          <label className="b-field__label" htmlFor={`${prefix}-text`}>Isi teks</label>
          <textarea
            id={`${prefix}-text`}
            className="textarea"
            value={b.text}
            onChange={(event) => onPatch({ text: event.target.value })}
          />
          <p className="b-counter">{b.text.length} karakter</p>
        </div>
      </section>
    );
  }

  return (
    <section className="b-panel" aria-label="Properti pertanyaan">
      <h3 className="b-section__title">Pertanyaan</h3>

      <div className="b-field">
        <label className="b-field__label" htmlFor={`${prefix}-label`}>Label pertanyaan</label>
        <input
          id={`${prefix}-label`}
          className="input"
          value={b.label}
          onChange={(event) => onPatch({ label: event.target.value })}
        />
      </div>

      {isCriticalLabel(b.label) ? (
        <div className="b-warning b-warning--phishing" role="alert">
          <strong>⛔ Pelanggaran Kritis (Simpan &amp; Publikasi Diblokir):</strong>{' '}
          <span>Dilarang meminta kata sandi, password, PIN ATM, CVV, atau kode OTP. Perubahan form TIDAK akan disimpan sampai pertanyaan ini dihapus.</span>
        </div>
      ) : isSensitiveLabel(b.label) ? (
        <div className="b-warning b-warning--phishing" role="alert">
          <strong>⚠️ Peringatan Data Sensitif (Publikasi Diblokir):</strong>{' '}
          <span>Formulir tidak dapat dipublikasikan selama meminta NIK, rekening, atau data sensitif. Draft Anda tetap tersimpan.</span>
        </div>
      ) : null}

      <label className="b-check">
        <input
          type="checkbox"
          checked={b.required}
          onChange={(event) => onPatch({ required: event.target.checked })}
        />
        Wajib diisi
      </label>

      <div className="b-field">
        <label className="b-field__label" htmlFor={`${prefix}-kind`}>Jenis pertanyaan</label>
        <select
          id={`${prefix}-kind`}
          className="select"
          value={b.kind}
          onChange={(event) => {
            const nextKind = event.target.value as QuestionKind;
            const patch: Partial<BlockDraft> = { kind: nextKind };
            if ((CHOICE_KINDS as readonly string[]).includes(nextKind)) {
              if (!b.options || b.options.length === 0) {
                patch.options = ['Opsi 1', 'Opsi 2', 'Opsi 3'];
              }
            }
            onPatch(patch);
          }}
        >
          {QUESTION_KINDS.map((kind) => (
            <option key={kind} value={kind}>{QUESTION_KIND_LABELS[kind]}</option>
          ))}
        </select>
      </div>

      {(CHOICE_KINDS as readonly string[]).includes(b.kind) && (
        <BlockOptionsEditor
          prefix={prefix}
          options={b.options ?? []}
          onChange={(options) => onPatch({ options })}
        />
      )}

      {b.kind === 'scale' && (
        <div className="b-grid2">
          <div className="b-field">
            <label className="b-field__label" htmlFor={`${prefix}-min`}>Nilai minimum</label>
            <input
              id={`${prefix}-min`}
              type="number"
              className="input"
              value={b.min ?? 1}
              onChange={(event) => onPatch({ min: Number(event.target.value) })}
              min={SCHEMA_LIMITS.scaleValueMin}
              max={SCHEMA_LIMITS.scaleValueMax}
            />
          </div>
          <div className="b-field">
            <label className="b-field__label" htmlFor={`${prefix}-max`}>Nilai maksimum</label>
            <input
              id={`${prefix}-max`}
              type="number"
              className="input"
              value={b.max ?? 5}
              onChange={(event) => onPatch({ max: Number(event.target.value) })}
              min={1}
              max={SCHEMA_LIMITS.scaleValueMax}
            />
          </div>
        </div>
      )}

      {(b.kind === 'short_text' || b.kind === 'paragraph') && (
        <div className="b-field">
          <label className="b-field__label" htmlFor={`${prefix}-max-length`}>Batas karakter (opsional)</label>
          <input
            id={`${prefix}-max-length`}
            type="number"
            className="input"
            value={b.maxLength ?? ''}
            onChange={(event) => onPatch({ maxLength: event.target.value === '' ? null : Number(event.target.value) })}
            min={1}
            placeholder="mis. 200"
          />
        </div>
      )}
    </section>
  );
}
