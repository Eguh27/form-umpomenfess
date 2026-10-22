/**
 * PreviewPane.tsx — bingkai preview HP / desktop (T-43).
 * HP = bingkai sempit 390px mewakili layar ponsel; desktop = lebar penuh.
 */
import { useState } from 'react';
import type { FormSchemaData } from '../../lib/forms/schema';
import PreviewForm from './PreviewForm';

interface Props {
  form: FormSchemaData | null;
  cloudName: string;
}

type Device = 'hp' | 'desktop';

export default function PreviewPane({ form, cloudName }: Props) {
  const [device, setDevice] = useState<Device>('hp');
  if (form === null) {
    return (
      <section aria-label="Preview live">
        <p className="eyebrow">Preview live</p>
        <p className="help" style={{ color: 'var(--danger)', fontWeight: 600 }}>
          Menunggu draft yang valid untuk di-preview — perbaiki bab merah.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Preview live">
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        <button
          type="button"
          className={`btn btn--sm ${device === 'hp' ? 'btn--accent' : 'btn--ghost'}`}
          onClick={() => setDevice('hp')}
          aria-pressed={device === 'hp'}
        >
          HP
        </button>
        <button
          type="button"
          className={`btn btn--sm ${device === 'desktop' ? 'btn--accent' : 'btn--ghost'}`}
          onClick={() => setDevice('desktop')}
          aria-pressed={device === 'desktop'}
        >
          Desktop
        </button>
      </div>
      <div
        style={{
          margin: '0 auto',
          width: device === 'hp' ? 390 : '100%',
          maxWidth: '100%',
          transition: 'width 0.15s ease',
        }}
      >
        <PreviewForm form={form} cloudName={cloudName} />
      </div>
    </section>
  );
}
