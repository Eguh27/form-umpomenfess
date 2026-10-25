/**
 * PreviewPane.tsx — bingkai pratinjau HP 390px / desktop 640px (T-73).
 * Pane yang sempit memakai scroll internal; pratinjau tidak mengecil sendiri.
 */
import { useState } from 'react';
import type { FormSchemaData } from '../../lib/forms/schema';
import { IconMonitor, IconPhone } from './builderIcons';
import PreviewForm from './PreviewForm';

interface Props {
  form: FormSchemaData | null;
  cloudName: string;
  invalid?: boolean;
}

type Device = 'hp' | 'desktop';

export default function PreviewPane({ form, cloudName, invalid = false }: Props) {
  const [device, setDevice] = useState<Device>('hp');

  return (
    <section className="b-previewpane" aria-label="Pratinjau form">
      <div className="b-previewpane__head">
        <h2 className="b-previewpane__title">Pratinjau</h2>
        <div className="b-device" role="group" aria-label="Lebar pratinjau">
          <button
            type="button"
            onClick={() => setDevice('hp')}
            aria-pressed={device === 'hp'}
          >
            <IconPhone />
            HP
          </button>
          <button
            type="button"
            onClick={() => setDevice('desktop')}
            aria-pressed={device === 'desktop'}
          >
            <IconMonitor />
            Desktop
          </button>
        </div>
      </div>

      {invalid && form !== null && (
        <p className="b-inline-alert" role="alert">
          Draf belum valid. Pratinjau menampilkan versi valid terakhir.
        </p>
      )}

      <div className="b-preview-scroll">
        {form === null ? (
          <p className="b-preview__empty">
            Pratinjau muncul setelah form punya isi yang valid.
          </p>
        ) : (
          <div className={`b-preview-frame b-preview-frame--${device}`}>
            <PreviewForm form={form} cloudName={cloudName} />
          </div>
        )}
      </div>
    </section>
  );
}
