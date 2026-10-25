/**
 * PreviewQuestion.tsx — kerangka pertanyaan memakai kelas form publik.
 * Input readOnly/disabled: ini pratinjau, bukan form yang dikirim.
 */
import type { FormSchemaData } from '../../lib/forms/schema';
import { isSensitiveLabel } from './sensitive';

type QuestionBlock = Extract<FormSchemaData['blocks'][number], { type: 'question' }>;

interface Props {
  block: QuestionBlock;
}

export default function PreviewQuestion({ block }: Props) {
  const inputId = `preview-${block.id}`;
  const labelId = `${inputId}-label`;

  return (
    <div className="b-preview__question">
      <span className="b-preview__label" id={labelId}>
        {block.label}
        {block.required && <span aria-hidden="true"> *</span>}
      </span>

      {isSensitiveLabel(block.label) && (
        <p className="b-preview__sensitive">Jangan minta data sensitif di sini.</p>
      )}

      {block.kind === 'short_text' && (
        <input
          className="input"
          id={inputId}
          readOnly
          placeholder="Jawaban singkat"
          aria-labelledby={labelId}
        />
      )}

      {block.kind === 'paragraph' && (
        <textarea
          className="textarea"
          id={inputId}
          readOnly
          placeholder="Jawaban panjang"
          aria-labelledby={labelId}
        />
      )}

      {block.kind === 'dropdown' && (
        <select className="select" id={inputId} disabled aria-labelledby={labelId}>
          <option>— pilih —</option>
          {(block.options ?? []).map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      )}

      {(block.kind === 'single_choice' || block.kind === 'multiple_choice') && (
        <fieldset className="b-preview__choices" aria-labelledby={labelId}>
          {(block.options ?? []).map((option) => (
            <label className="b-preview__choice" key={option}>
              <input
                type={block.kind === 'multiple_choice' ? 'checkbox' : 'radio'}
                disabled
              />
              {option}
            </label>
          ))}
        </fieldset>
      )}

      {block.kind === 'scale' && (
        <fieldset className="b-preview__scale" aria-labelledby={labelId}>
          {Array.from(
            { length: Math.max((block.max ?? 5) - (block.min ?? 1) + 1, 1) },
            (_, index) => (block.min ?? 1) + index,
          ).map((value) => (
            <label className="b-preview__choice" key={value}>
              <input type="radio" disabled />
              {value}
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
}
