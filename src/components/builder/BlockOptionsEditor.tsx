/**
 * BlockOptionsEditor.tsx — editor daftar pilihan jawaban untuk single_choice,
 * multiple_choice, dan dropdown ("Menu pilihan") di panel properti (T-73).
 */
import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { SCHEMA_LIMITS } from '../../lib/forms/schema';
import {
  addOption,
  hasDuplicateOptions,
  hasEmptyOption,
  parsePastedOptions,
  removeOption,
  updateOption,
} from './blockOptions';
import { IconPlus, IconTrash } from './builderIcons';

interface Props {
  prefix: string;
  options: string[];
  onChange: (options: string[]) => void;
}

export default function BlockOptionsEditor({ prefix, options, onChange }: Props) {
  const safeOptions = options.length > 0 ? options : ['Opsi 1'];
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const focusInput = (index: number) => {
    setTimeout(() => {
      const el = inputsRef.current[index];
      if (el) {
        el.focus();
        el.select();
      }
    }, 0);
  };

  const handleAdd = (afterIndex?: number) => {
    if (safeOptions.length >= SCHEMA_LIMITS.maxOptions) return;
    const next = addOption(safeOptions, afterIndex);
    onChange(next);
    const targetIdx = typeof afterIndex === 'number' ? afterIndex + 1 : next.length - 1;
    focusInput(targetIdx);
  };

  const handleRemove = (index: number) => {
    if (safeOptions.length <= 1) return;
    const next = removeOption(safeOptions, index);
    onChange(next);
    focusInput(Math.max(0, index - 1));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAdd(index);
    } else if (event.key === 'Backspace' && safeOptions[index].trim() === '' && safeOptions.length > 1) {
      event.preventDefault();
      handleRemove(index);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>, index: number) => {
    const text = event.clipboardData.getData('text');
    if (text.includes('\n')) {
      event.preventDefault();
      const lines = parsePastedOptions(text);
      if (lines.length > 0) {
        const next = [...safeOptions];
        next.splice(index, 1, ...lines);
        onChange(next.slice(0, SCHEMA_LIMITS.maxOptions));
      }
    }
  };

  return (
    <div className="b-field">
      <div className="b-options-header">
        <label className="b-field__label" htmlFor={`${prefix}-opt-0`}>
          Pilihan jawaban
        </label>
        <span className="b-options-count">
          {safeOptions.length}/{SCHEMA_LIMITS.maxOptions}
        </span>
      </div>

      <div className="b-options-list">
        {safeOptions.map((opt, idx) => (
          <div className="b-option-row" key={idx}>
            <span className="b-option-num" aria-hidden="true">{idx + 1}</span>
            <input
              ref={(el) => { inputsRef.current[idx] = el; }}
              id={`${prefix}-opt-${idx}`}
              className="input b-option-input"
              value={opt}
              maxLength={SCHEMA_LIMITS.maxOptionLength}
              placeholder={`Pilihan ${idx + 1}`}
              onChange={(e) => onChange(updateOption(safeOptions, idx, e.target.value))}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              onPaste={(e) => handlePaste(e, idx)}
            />
            <button
              type="button"
              className="b-option-action"
              onClick={() => handleRemove(idx)}
              disabled={safeOptions.length <= 1}
              title="Hapus pilihan"
              aria-label={`Hapus pilihan ${idx + 1}`}
            >
              <IconTrash />
            </button>
          </div>
        ))}

        <div className="b-options-footer">
          <button
            type="button"
            className="b-options-add"
            onClick={() => handleAdd()}
            disabled={safeOptions.length >= SCHEMA_LIMITS.maxOptions}
          >
            <IconPlus />
            Tambah pilihan
          </button>
        </div>
      </div>

      {hasDuplicateOptions(safeOptions) && (
        <p className="b-warning" role="alert">Pilihan tidak boleh duplikat.</p>
      )}
      {hasEmptyOption(safeOptions) && (
        <p className="b-warning" role="alert">Pilihan tidak boleh kosong.</p>
      )}
    </div>
  );
}
