/**
 * DashboardForms.tsx — island dashboard ala Canva (T-40/T-45, Zona B).
 *
 * Tampilan modern, visual, dan kaya fitur:
 * - Hero bar "Mau buat form apa hari ini?" dengan pencarian instan & statistik ringkas.
 * - Galeri template bawaan & database (Survei Skripsi, Skala Likert, Multi-Halaman, dll).
 * - Filter tab: Semua, Published, Draft, Tutup.
 * - Kartu form dengan tautan publik /f/[slug], tombol salin link, dan tombol respons & CSV.
 * - Mutasi tetap lewat client Supabase browser (RLS owner-only).
 */
import { useMemo, useState } from 'react';
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
import { PREBUILT_TEMPLATES } from './defaultTemplates';

interface Props {
  initialForms: FormRow[];
  templates: TemplateRow[];
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  published: 'Published',
  closed: 'Tutup',
};

export default function DashboardForms({ initialForms, templates: dbTemplates }: Props) {
  const [forms, setForms] = useState<FormRow[]>(initialForms);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'draft' | 'closed'>('all');
  const [createTitle, setCreateTitle] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
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
    insertAndOpen(() => blankPayload(createTitle.trim() || 'Form tanpa judul'));

  const createFromPrebuilt = (tpl: (typeof PREBUILT_TEMPLATES)[number]) =>
    insertAndOpen(() =>
      templatePayload({
        id: tpl.id,
        name: tpl.name,
        title: tpl.name,
        schemaJson: tpl.schema as unknown as Record<string, unknown>,
        previewUrl: null,
      })
    );

  const createFromDbTemplate = (t: TemplateRow) =>
    insertAndOpen(() => templatePayload(t));

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

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}/f/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  // Statistik Cepat
  const publishedCount = useMemo(() => forms.filter((f) => f.status === 'published').length, [forms]);
  const draftCount = useMemo(() => forms.filter((f) => f.status === 'draft').length, [forms]);
  const closedCount = useMemo(() => forms.filter((f) => f.status === 'closed').length, [forms]);
  const totalResponses = useMemo(() => forms.reduce((acc, f) => acc + (f.responses || 0), 0), [forms]);

  // Filter Form
  const filteredForms = useMemo(() => {
    return forms.filter((f) => {
      if (activeTab === 'published' && f.status !== 'published') return false;
      if (activeTab === 'draft' && f.status !== 'draft') return false;
      if (activeTab === 'closed' && f.status !== 'closed') return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return f.title.toLowerCase().includes(q) || f.slug.toLowerCase().includes(q);
      }
      return true;
    });
  }, [forms, activeTab, search]);

  return (
    <section style={{ display: 'grid', gap: 'var(--space-6)', marginTop: 'var(--space-4)' }}>
      {/* 1. Hero Banner ala Canva */}
      <div
        className="card card--plain"
        style={{
          background: 'linear-gradient(135deg, rgba(74, 154, 139, 0.12), rgba(232, 96, 76, 0.08))',
          border: '1.5px solid var(--border)',
          borderRadius: 20,
          padding: 'var(--space-5)',
          display: 'grid',
          gap: 'var(--space-4)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800 }}>
              Mau buat form apa hari ini? ✨
            </h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Pilih template skripsi siap pakai atau rancang form kustom kamu sendiri.
            </p>
          </div>
          <button
            type="button"
            className="btn btn--accent"
            style={{ padding: '8px 18px', fontWeight: 700 }}
            onClick={() => setCreateModalOpen(true)}
            disabled={busy !== null}
          >
            + Buat Form Baru
          </button>
        </div>

        {/* Bar Pencarian & Statistik */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 260px', position: 'relative' }}>
            <input
              className="input"
              style={{ width: '100%', paddingLeft: 34, background: 'var(--surface)' }}
              placeholder="Cari berdasarkan judul atau /f/slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
              🔍
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="pill" style={{ fontSize: '0.8rem', background: 'var(--surface)' }}>
              📋 {forms.length} Total Form
            </span>
            <span className="pill" style={{ fontSize: '0.8rem', background: 'var(--surface)' }}>
              🚀 {publishedCount} Aktif
            </span>
            <span className="pill" style={{ fontSize: '0.8rem', background: 'var(--surface)' }}>
              💬 {totalResponses} Respons
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1.5px solid var(--danger, #ef4444)',
            color: 'var(--danger, #ef4444)',
            borderRadius: 12,
            padding: '10px 14px',
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      {/* 2. Galeri Template Bawaan ala Canva */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Mulai dari Template Siap Pakai 📑</h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Dirancang khusus untuk survei skripsi, skala Likert, dan rekrutmen responden.
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
            gap: 'var(--space-3)',
          }}
        >
          {/* Kartu Form Kosong */}
          <button
            type="button"
            className="card card--plain"
            style={{
              padding: 'var(--space-4)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 8,
              border: '2px dashed var(--border)',
              borderRadius: 16,
              background: 'var(--surface)',
              cursor: busy !== null ? 'not-allowed' : 'pointer',
              minHeight: 150,
            }}
            onClick={() => setCreateModalOpen(true)}
            disabled={busy !== null}
          >
            <span style={{ fontSize: '2rem' }}>➕</span>
            <strong style={{ fontSize: '0.9rem' }}>Form Kosong</strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mulai dari awal tanpa blok</span>
          </button>

          {/* Kartu Template Prebuilt */}
          {PREBUILT_TEMPLATES.map((tpl) => (
            <div
              key={tpl.id}
              className="card card--plain"
              style={{
                borderRadius: 16,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                transition: 'transform 0.15s ease',
              }}
            >
              {/* Mini Preview Header Warna */}
              <div
                style={{
                  height: 38,
                  background: tpl.schema.theme.bg,
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  justifyContent: 'space-between',
                }}
              >
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: tpl.schema.theme.accent,
                    background: 'rgba(255,255,255,0.7)',
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}
                >
                  {tpl.tag}
                </span>
                <span style={{ fontSize: '0.7rem', color: tpl.schema.theme.text, fontWeight: 600 }}>
                  {tpl.pagesCount > 1 ? `📄 ${tpl.pagesCount} Hal` : '📄 1 Hal'} · ❓ {tpl.questionCount} Q
                </span>
              </div>

              <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <strong style={{ fontSize: '0.88rem', lineHeight: 1.3, marginBottom: 4 }}>
                  {tpl.name}
                </strong>
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    margin: '0 0 var(--space-3)',
                    lineHeight: 1.35,
                    flex: 1,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {tpl.description}
                </p>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  style={{ width: '100%', fontSize: '0.8rem', fontWeight: 700 }}
                  onClick={() => createFromPrebuilt(tpl)}
                  disabled={busy !== null}
                >
                  Gunakan Template ➔
                </button>
              </div>
            </div>
          ))}

          {/* Database Templates (jika ada yang unik) */}
          {dbTemplates
            .filter((dbt) => !PREBUILT_TEMPLATES.some((p) => p.name === dbt.name))
            .map((t) => (
              <div
                key={`db-${t.id}`}
                className="card card--plain"
                style={{
                  borderRadius: 16,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <span className="pill" style={{ fontSize: '0.65rem', marginBottom: 4 }}>Template DB</span>
                  <strong style={{ display: 'block', fontSize: '0.88rem', margin: '4px 0' }}>{t.name}</strong>
                </div>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  style={{ width: '100%', fontSize: '0.8rem', marginTop: 10 }}
                  onClick={() => createFromDbTemplate(t)}
                  disabled={busy !== null}
                >
                  Gunakan Template ➔
                </button>
              </div>
            ))}
        </div>
      </div>

      <hr className="dashed-divider" />

      {/* 3. Daftar Form Pengguna dengan Filter Tab */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 'var(--space-3)' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Daftar Form Kamu 📂</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="btn btn--sm"
              style={{
                background: activeTab === 'all' ? 'var(--brand)' : 'var(--surface)',
                color: activeTab === 'all' ? '#fff' : 'inherit',
                border: '1px solid var(--border)',
                fontSize: '0.8rem',
              }}
              onClick={() => setActiveTab('all')}
            >
              Semua ({forms.length})
            </button>
            <button
              type="button"
              className="btn btn--sm"
              style={{
                background: activeTab === 'published' ? 'var(--brand)' : 'var(--surface)',
                color: activeTab === 'published' ? '#fff' : 'inherit',
                border: '1px solid var(--border)',
                fontSize: '0.8rem',
              }}
              onClick={() => setActiveTab('published')}
            >
              Published ({publishedCount})
            </button>
            <button
              type="button"
              className="btn btn--sm"
              style={{
                background: activeTab === 'draft' ? 'var(--brand)' : 'var(--surface)',
                color: activeTab === 'draft' ? '#fff' : 'inherit',
                border: '1px solid var(--border)',
                fontSize: '0.8rem',
              }}
              onClick={() => setActiveTab('draft')}
            >
              Draft ({draftCount})
            </button>
            {closedCount > 0 && (
              <button
                type="button"
                className="btn btn--sm"
                style={{
                  background: activeTab === 'closed' ? 'var(--brand)' : 'var(--surface)',
                  color: activeTab === 'closed' ? '#fff' : 'inherit',
                  border: '1px solid var(--border)',
                  fontSize: '0.8rem',
                }}
                onClick={() => setActiveTab('closed')}
              >
                Tutup ({closedCount})
              </button>
            )}
          </div>
        </div>

        {/* Grid Kartu Form Pengguna */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
            gap: 'var(--space-3)',
          }}
        >
          {filteredForms.map((row) => (
            <div
              key={row.id}
              className="card card--plain"
              style={{
                padding: 'var(--space-4)',
                borderRadius: 16,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 'var(--space-3)',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <strong style={{ fontSize: '1rem', lineHeight: 1.3 }}>
                    <a href={`/dashboard/${row.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      {row.title}
                    </a>
                  </strong>
                  <span
                    className="pill"
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background:
                        row.status === 'published'
                          ? 'rgba(16, 185, 129, 0.15)'
                          : row.status === 'draft'
                          ? 'rgba(234, 179, 8, 0.15)'
                          : 'rgba(156, 163, 175, 0.2)',
                      color:
                        row.status === 'published'
                          ? '#059669'
                          : row.status === 'draft'
                          ? '#b45309'
                          : '#4b5563',
                    }}
                  >
                    {STATUS_LABEL[row.status] ?? row.status}
                  </span>
                </div>

                {/* Tautan Publik & Aksi Salin */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <code style={{ fontSize: '0.78rem', opacity: 0.85 }}>/f/{row.slug}</code>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    style={{ padding: '2px 6px', fontSize: '0.72rem' }}
                    onClick={() => handleCopyLink(row.slug)}
                    title="Salin tautan form publik"
                  >
                    {copiedSlug === row.slug ? 'Tersalin ✓' : 'Salin link'}
                  </button>
                  {row.status === 'published' && (
                    <a
                      href={`/f/${row.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '0.78rem', textDecoration: 'none' }}
                      title="Buka form di tab baru"
                    >
                      ↗
                    </a>
                  )}
                </div>

                {/* Counter Respons & Tanggal */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <a
                    href={`/dashboard/${row.id}/respons`}
                    style={{
                      color: 'var(--brand)',
                      fontWeight: 700,
                      textDecoration: 'none',
                      background: 'var(--accent-soft)',
                      padding: '2px 8px',
                      borderRadius: 6,
                    }}
                  >
                    📊 {row.responses} respons
                  </a>
                  <span>
                    Diubah {new Date(row.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  flexWrap: 'wrap',
                  paddingTop: 8,
                  borderTop: '1px solid var(--border)',
                }}
              >
                <a
                  className="btn btn--accent btn--sm"
                  href={`/dashboard/${row.id}`}
                  style={{ flex: '1 1 auto', textAlign: 'center', textDecoration: 'none' }}
                >
                  ✏️ Edit
                </a>
                <a
                  className="btn btn--ghost btn--sm"
                  href={`/dashboard/${row.id}/respons`}
                  style={{ textDecoration: 'none' }}
                >
                  Respons
                </a>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => duplicate(row)}
                  disabled={busy !== null}
                  title="Duplikat form ini"
                >
                  ⎘
                </button>
                {row.status === 'published' && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => close(row)}
                    disabled={busy !== null}
                    title="Tutup penerimaan respons form"
                  >
                    Tutup
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  style={{ color: 'var(--danger)' }}
                  onClick={() => remove(row)}
                  disabled={busy !== null}
                  title="Hapus form (soft delete)"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredForms.length === 0 && (
          <div
            className="card card--plain"
            style={{
              padding: 'var(--space-6)',
              textAlign: 'center',
              borderRadius: 16,
              color: 'var(--text-muted)',
              marginTop: 'var(--space-4)',
            }}
          >
            <p style={{ margin: 0, fontSize: '1rem' }}>
              {search ? `Tidak ada form yang cocok dengan pencarian "${search}".` : 'Belum ada form di kategori ini.'}
            </p>
            <button
              type="button"
              className="btn btn--accent"
              style={{ marginTop: 'var(--space-3)' }}
              onClick={() => setCreateModalOpen(true)}
            >
              + Buat Form Baru Sekarang
            </button>
          </div>
        )}
      </div>

      {/* Modal Dialog Buat Form Baru */}
      {createModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => setCreateModalOpen(false)}
        >
          <div
            className="card card--plain"
            style={{
              width: '100%',
              maxWidth: 480,
              background: 'var(--surface)',
              borderRadius: 20,
              padding: 'var(--space-5)',
              border: '1.5px solid var(--border)',
              display: 'grid',
              gap: 'var(--space-4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Buat Form Baru ✨</h3>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setCreateModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div>
              <label style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block', marginBottom: 6 }}>
                Judul Form
              </label>
              <input
                className="input"
                style={{ width: '100%' }}
                placeholder="mis. Survei Skripsi Kepuasan Pengguna Aplikasi"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setCreateModalOpen(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn--accent"
                onClick={() => {
                  createBlank();
                  setCreateModalOpen(false);
                }}
                disabled={busy !== null}
              >
                Buat Form Kosong ➔
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
