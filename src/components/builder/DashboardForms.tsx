/**
 * DashboardForms.tsx — island dashboard T-40 (client:load) di zona B.
 * Daftar form + buat dari template/kosong + duplikat + tutup + soft delete.
 * Mutasi jalan lewat client Supabase browser — RLS yang menjaga kepemilikan;
 * data awal dari server (.astro) supaya halaman terlihat berisi langsung.
 */
import { useState } from 'react';
import {
  blankPayload,
  closeForm,
  deleteForm,
  duplicatePayload,
  insertForm,
  listForms,
  templatePayload,
  type FormRow,
  type TemplateRow,
} from './dashboardForms';
import { getSupabaseBrowserClient } from './browserClient';

interface Props {
  initialForms: FormRow[];
  templates: TemplateRow[];
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'draft',
  published: 'published',
  closed: 'tutup',
};

export default function DashboardForms({ initialForms, templates }: Props) {
  const [forms, setForms] = useState<FormRow[]>(initialForms);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const refresh = () => run('refresh', async () => setForms(await listForms(getSupabaseBrowserClient())));

  const insertAndOpen = (payload: () => Parameters<typeof insertForm>[1]) =>
    run('create', async () => {
      const created = await insertForm(getSupabaseBrowserClient(), payload());
      window.location.assign(`/dashboard/${created.id}`);
    });

  const createBlank = () =>
    insertAndOpen(() => blankPayload(title.trim() || 'Form tanpa judul'));

  const createFromTemplate = (t: TemplateRow) => insertAndOpen(() => templatePayload(t));

  const duplicate = (row: FormRow) =>
    run(`dup-${row.id}`, async () => {
      const supa = getSupabaseBrowserClient();
      const { data, error: fetchError } = await supa
        .from('forms')
        .select('title, schema, theme')
        .eq('id', row.id)
        .single();
      if (fetchError) throw new Error(fetchError.message);
      await insertForm(
        supa,
        duplicatePayload({
          title: String(data?.title ?? row.title),
          schemas: data?.schema ?? null,
          theme: data?.theme ?? null,
        }),
      );
      await refresh();
    });

  const close = (row: FormRow) =>
    run(`close-${row.id}`, async () => {
      await closeForm(getSupabaseBrowserClient(), row.id);
      await refresh();
    });

  const remove = (row: FormRow) =>
    run(`del-${row.id}`, async () => {
      if (!window.confirm(`Pindahkan "${row.title}" ke sampah (soft delete)?`)) return;
      await deleteForm(getSupabaseBrowserClient(), row.id);
      await refresh();
    });

  return (
    <section style={{ marginTop: 'var(--space-5)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center' }}>
        <button
          type="button"
          className="btn"
          onClick={() => setCreateOpen((v) => !v)}
          disabled={busy !== null}
        >
          + Buat form
        </button>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          {forms.length} form · maks aktif batas tetap ada
        </span>
      </div>

      {error && (
        <p role="alert" style={{ color: 'var(--danger)', fontWeight: 600 }}>
          {error}
        </p>
      )}

      {createOpen && (
        <div className="card card--soft" style={{ marginTop: 'var(--space-4)' }}>
          <p className="eyebrow">Awali dari</p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginTop: 'var(--space-3)' }}>
            <input
              className="input"
              style={{ flex: '1 1 240px' }}
              placeholder="Judul form (mis. Survei Kepuasan Kantin)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={busy !== null}
            />
            <button type="button" className="btn btn--accent" onClick={createBlank} disabled={busy !== null}>
              Form kosong
            </button>
          </div>
          {templates.length > 0 && (
            <>
              <hr className="dashed-divider" />
              <p className="eyebrow">Atau pakai template siap pakai</p>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="btn btn--ghost"
                    disabled={busy !== null}
                    onClick={() => createFromTemplate(t)}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <ul
        className="grid"
        style={{ listStyle: 'none', margin: 'var(--space-5) 0 0', padding: 0, gap: 'var(--space-3)' }}
      >
        {forms.map((row) => (
          <li key={row.id} className="card card--plain" style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center' }}>
              <div style={{ flex: '1 1 220px' }}>
                <strong>
                  <a href={`/dashboard/${row.id}`} style={{ textDecoration: 'none' }}>
                    {row.title}
                  </a>
                </strong>
                <div className="help">
                  /f/{row.slug} · {row.responses} respons
                  {row.maxResponses != null ? ` dari maks ${row.maxResponses}` : ''} · diubah{' '}
                  {new Date(row.updatedAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                </div>
              </div>
              <span className={`pill ${row.status === 'published' ? '' : ''}`}>{STATUS_LABEL[row.status] ?? row.status}</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a className="btn btn--ghost" href={`/dashboard/${row.id}`} style={{ padding: '7px 14px', fontSize: '0.85rem' }}>
                  Edit
                </a>
                <button type="button" className="btn btn--ghost" onClick={() => duplicate(row)} disabled={busy !== null}>
                  Duplikat
                </button>
                {row.status === 'published' && (
                  <button type="button" className="btn btn--ghost" onClick={() => close(row)} disabled={busy !== null}>
                    Tutup
                  </button>
                )}
                <button type="button" className="btn btn--ghost" onClick={() => remove(row)} disabled={busy !== null}>
                  Hapus
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {forms.length === 0 && !createOpen && (
        <p style={{ color: 'var(--text-muted)', marginTop: 'var(--space-5)' }}>
          Belum ada form — tekan <strong>Buat form</strong> untuk memulai.
        </p>
      )}
    </section>
  );
}
