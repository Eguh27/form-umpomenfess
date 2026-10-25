/**
 * useBuilderPreview.ts — versi valid terakhir untuk pratinjau (T-73).
 * Draft yang belum valid tidak mengosongkan pratinjau; hanya ditandai invalid.
 */
import { useEffect, useState } from 'react';
import type { FormSchemaData } from '../../lib/forms/schema';
import type { BuilderState } from './defaults';
import { serialize } from './serialize';

export interface BuilderPreview {
  form: FormSchemaData | null;
  invalid: boolean;
}

function initialPreview(state: BuilderState): BuilderPreview {
  const result = serialize(state);
  return result.ok
    ? { form: result.data, invalid: false }
    : { form: null, invalid: true };
}

export function useBuilderPreview(state: BuilderState): BuilderPreview {
  const [preview, setPreview] = useState<BuilderPreview>(() => initialPreview(state));

  useEffect(() => {
    const result = serialize(state);
    setPreview((current) =>
      result.ok
        ? { form: result.data, invalid: false }
        : { form: current.form, invalid: true },
    );
  }, [state]);

  return preview;
}
