/**
 * DashboardForms.tsx — island dashboard ala Canva dengan pemisahan tata letak (T-40/T-45, Zona B).
 *
 * Tata letak terpisah rapi (tidak ditumpuk jadi satu):
 * 1. Tab "📁 Form Saya" — daftar form, pencarian, filter status, tautan publik & aksi.
 * 2. Tab "✨ Buat & Template" — katalog template skripsi/survei + form kosong.
 * 3. Tab "📊 Statistik" — ringkasan total respons dan performa form.
 *
 * Mutasi tetap lewat client Supabase browser (RLS owner-only).
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

type MainTab = 'my-forms' | 'templates' | 'stats';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  published: 'Published',
  closed: 'Tutup',
};

export default function DashboardForms({ initialForms, templates: dbTemplates }: Props) {
  const [forms, setForms] = useState<FormRow[]>(initialForms);
  const [mainTab, setMainTab] = useState<MainTab>('my-forms');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'closed'>('all');
  const [templateCategory, setTemplateCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
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

  const createBlank = (title = createTitle) =>
    insertAndOpen(() => blankPayload(title.trim() || 'Form tanpa judul'));

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

  // Statistik Form
  const publishedCount = useMemo(() => forms.filter((f) => f.status === 'published').length, [forms]);
  const draftCount = useMemo(() => forms.filter((f) => f.status === 'draft').length, [forms]);
  const closedCount = useMemo(() => forms.filter((f) => f.status === 'closed').length, [forms]);
  const totalResponses = useMemo(() => forms.reduce((acc, f) => acc + (f.responses || 0), 0), [forms]);

  // Filter Form Saya
  const filteredForms = useMemo(() => {
    return forms.filter((f) => {
      if (statusFilter === 'published' && f.status !== 'published') return false;
      if (statusFilter === 'draft' && f.status !== 'draft') return false;
      if (statusFilter === 'closed' && f.status !== 'closed') return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return f.title.toLowerCase().includes(q) || f.slug.toLowerCase().includes(q);
      }
      return true;
    });
  }, [forms, statusFilter, search]);

  // Filter Templates
  const filteredTemplates = useMemo(() => {
    if (templateCategory === 'all') return PREBUILT_TEMPLATES;
    return PREBUILT_TEMPLATES.filter((t) => t.tag.toLowerCase() === templateCategory.toLowerCase());
  }, [templateCategory]);

  return (
    <section style={{ display: 'grid', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
      {/* 1. Bar Navigasi Utama Dashboard (Memisahkan Halaman ala Canva/SaaS) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
          borderBottom: '1.5px solid var(--border)',
          paddingBottom: 'var(--space-3)',
        }}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn--sm"
            style={{
              background: mainTab === 'my-forms' ? 'var(--brand)' : 'var(--surface)',
              color: mainTab === 'my-forms' ? '#fff' : 'inherit',
              border: '1.5px solid var(--border)',
              fontWeight: 700,
              fontSize: '0.88rem',
              padding: '6px 14px',
              borderRadius: 10,
            }}
            onClick={() => setMainTab('my-forms')}
          >
            📁 Form Saya ({forms.length})
          </button>
          <button
            type="button"
            className="btn btn--sm"
            style={{
              background: mainTab === 'templates' ? 'var(--brand)' : 'var(--surface)',
              color: mainTab === 'templates' ? '#fff' : 'inherit',
              border: '1.5px solid var(--border)',
              fontWeight: 700,
              fontSize: '0.88rem',
              padding: '6px 14px',
              borderRadius: 10,
            }}
            onClick={() => setMainTab('templates')}
          >
            ✨ Buat & Template
          </button>
          <button
            type="button"
            className="btn btn--sm"
            style={{
              background: mainTab === 'stats' ? 'var(--brand)' : 'var(--surface)',
              color: mainTab === 'stats' ? '#fff' : 'inherit',
              border: '1.5px solid var(--border)',
              fontWeight: 700,
              fontSize: '0.88rem',
              padding: '6px 14px',
              borderRadius: 10,
            }}
            onClick={() => setMainTab('stats')}
          >
            📊 Ringkasan Statistik
          </button>
        </div>

        <button
          type="button"
          className="btn btn--accent btn--sm"
          style={{ fontWeight: 700, padding: '6px 16px', borderRadius: 10 }}
          onClick={() => setCreateModalOpen(true)}
          disabled={busy !== null}
        >
          + Buat Form Baru
        </button>
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
            fontSize: '0.88rem',
          }}
        >
          {error}
        </div>
      )}

      {/* =========================================================================
          TAB 1: FORM SAYA (Fokus utama pengguna yang sudah punya form)
          ========================================================================= */}
      {mainTab === 'my-forms' && (
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {/* Sub-header Form Saya: Search & Filter Status */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 'var(--space-3)',
            }}
          >
            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn--sm"
                style={{
                  background: statusFilter === 'all' ? 'var(--accent-soft)' : 'transparent',
                  color: statusFilter === 'all' ? 'var(--brand)' : 'var(--text-muted)',
                  border: statusFilter === 'all' ? '1px solid var(--brand)' : '1px solid var(--border)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
                onClick={() => setStatusFilter('all')}
              >
                Semua ({forms.length})
              </button>
              <button
                type="button"
                className="btn btn--sm"
                style={{
                  background: statusFilter === 'published' ? 'var(--accent-soft)' : 'transparent',
                  color: statusFilter === 'published' ? 'var(--brand)' : 'var(--text-muted)',
                  border: statusFilter === 'published' ? '1px solid var(--brand)' : '1px solid var(--border)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
                onClick={() => setStatusFilter('published')}
              >
                Published ({publishedCount})
              </button>
              <button
                type="button"
                className="btn btn--sm"
                style={{
                  background: statusFilter === 'draft' ? 'var(--accent-soft)' : 'transparent',
                  color: statusFilter === 'draft' ? 'var(--brand)' : 'var(--text-muted)',
                  border: statusFilter === 'draft' ? '1px solid var(--brand)' : '1px solid var(--border)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
                onClick={() => setStatusFilter('draft')}
              >
                Draft ({draftCount})
              </button>
              {closedCount > 0 && (
                <button
                  type="button"
                  className="btn btn--sm"
                  style={{
                    background: statusFilter === 'closed' ? 'var(--accent-soft)' : 'transparent',
                    color: statusFilter === 'closed' ? 'var(--brand)' : 'var(--text-muted)',
                    border: statusFilter === 'closed' ? '1px solid var(--brand)' : '1px solid var(--border)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                  onClick={() => setStatusFilter('closed')}
                >
                  Tutup ({closedCount})
                </button>
              )}
            </div>

            {/* Kotak Pencarian */}
            <div style={{ flex: '0 1 280px', position: 'relative' }}>
              <input
                className="input"
                style={{ width: '100%', paddingLeft: 32, fontSize: '0.85rem' }}
                placeholder="Cari form saya..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
                🔍
              </span>
            </div>
          </div>

          {/* Grid Kartu Form */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
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
                  border: '1.5px solid var(--border)',
                  background: 'var(--surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 'var(--space-3)',
                  transition: 'box-shadow 0.15s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <strong style={{ fontSize: '1.02rem', lineHeight: 1.35 }}>
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

                  {/* Tautan Publik & Salin Link */}
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

                  {/* Respons Counter & Waktu Update */}
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

                {/* Tombol Aksi */}
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
                    style={{ flex: '1 1 auto', textAlign: 'center', textDecoration: 'none', fontWeight: 600 }}
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
                      title="Tutup penerimaan respons"
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
                border: '1.5px dashed var(--border)',
                color: 'var(--text-muted)',
                marginTop: 'var(--space-3)',
              }}
            >
              <p style={{ margin: 0, fontSize: '0.95rem' }}>
                {search
                  ? `Tidak ada form yang sesuai dengan "${search}".`
                  : 'Belum ada form di bagian ini.'}
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 'var(--space-3)' }}>
                <button
                  type="button"
                  className="btn btn--accent"
                  onClick={() => setMainTab('templates')}
                >
                  Pilih Template Siap Pakai ➔
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setCreateModalOpen(true)}
                >
                  + Buat Form Kosong
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: BUAT & TEMPLATE (Studio pembuatan form & katalog template)
          ========================================================================= */}
      {mainTab === 'templates' && (
        <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
          {/* Bagian Cepat: Form Kosong */}
          <div
            className="card card--plain"
            style={{
              padding: 'var(--space-4)',
              borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(74, 154, 139, 0.1), rgba(232, 96, 76, 0.08))',
              border: '1.5px solid var(--border)',
            }}
          >
            <strong style={{ fontSize: '1rem', display: 'block', marginBottom: 4 }}>
              ➕ Mulai dari Lembar Kosong
            </strong>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 10px' }}>
              Buat form baru dari nol lalu tambahkan elemen tanya & layout sesuai keinginanmu.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                className="input"
                style={{ flex: '1 1 260px', background: 'var(--surface)' }}
                placeholder="Ketik judul form (mis. Survei Kepuasan Kantin Kampus)"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                disabled={busy !== null}
              />
              <button
                type="button"
                className="btn btn--accent"
                onClick={() => createBlank()}
                disabled={busy !== null}
              >
                + Buat Form Kosong ➔
              </button>
            </div>
          </div>

          {/* Bagian Katalog Template */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 'var(--space-3)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Katalog Template Siap Pakai ✨</h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Sudah diformat dengan struktur pertanyaan yang tepat, siap kamu pakai dalam 1-klik.
                </p>
              </div>

              {/* Filter Kategori Template */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(['all', 'Skripsi', 'Survei', 'Pendaftaran', 'Evaluasi', 'Cepat'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className="btn btn--sm"
                    style={{
                      background: templateCategory.toLowerCase() === cat.toLowerCase() ? 'var(--brand)' : 'var(--surface)',
                      color: templateCategory.toLowerCase() === cat.toLowerCase() ? '#fff' : 'inherit',
                      border: '1px solid var(--border)',
                      fontSize: '0.78rem',
                      padding: '4px 10px',
                    }}
                    onClick={() => setTemplateCategory(cat)}
                  >
                    {cat === 'all' ? 'Semua Kategori' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid Template */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 'var(--space-3)',
              }}
            >
              {filteredTemplates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="card card--plain"
                  style={{
                    borderRadius: 16,
                    border: '1.5px solid var(--border)',
                    background: 'var(--surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}
                >
                  {/* Header visual template */}
                  <div
                    style={{
                      height: 42,
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
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: tpl.schema.theme.accent,
                        background: 'rgba(255,255,255,0.8)',
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}
                    >
                      {tpl.tag}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: tpl.schema.theme.text, fontWeight: 700 }}>
                      {tpl.pagesCount > 1 ? `📄 ${tpl.pagesCount} Halaman` : '📄 1 Halaman'} · ❓ {tpl.questionCount} Q
                    </span>
                  </div>

                  <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <strong style={{ fontSize: '0.92rem', lineHeight: 1.3, marginBottom: 4 }}>
                      {tpl.name}
                    </strong>
                    <p
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)',
                        margin: '0 0 var(--space-4)',
                        lineHeight: 1.4,
                        flex: 1,
                      }}
                    >
                      {tpl.description}
                    </p>
                    <button
                      type="button"
                      className="btn btn--accent btn--sm"
                      style={{ width: '100%', fontWeight: 700, fontSize: '0.82rem' }}
                      onClick={() => createFromPrebuilt(tpl)}
                      disabled={busy !== null}
                    >
                      Gunakan Template Ini ➔
                    </button>
                  </div>
                </div>
              ))}

              {/* Database Templates */}
              {dbTemplates
                .filter((dbt) => !PREBUILT_TEMPLATES.some((p) => p.name === dbt.name))
                .map((t) => (
                  <div
                    key={`dbt-${t.id}`}
                    className="card card--plain"
                    style={{
                      borderRadius: 16,
                      border: '1.5px solid var(--border)',
                      background: 'var(--surface)',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <span className="pill" style={{ fontSize: '0.65rem' }}>Template DB</span>
                      <strong style={{ display: 'block', fontSize: '0.92rem', margin: '6px 0 4px' }}>{t.name}</strong>
                    </div>
                    <button
                      type="button"
                      className="btn btn--accent btn--sm"
                      style={{ width: '100%', marginTop: 12 }}
                      onClick={() => createFromDbTemplate(t)}
                      disabled={busy !== null}
                    >
                      Gunakan Template ➔
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: STATISTIK & RINGKASAN
          ========================================================================= */}
      {mainTab === 'stats' && (
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Ringkasan Akun & Respons 📊</h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 'var(--space-3)',
            }}
          >
            <div className="card card--plain" style={{ padding: 'var(--space-4)', borderRadius: 14 }}>
              <span className="eyebrow">Total Form</span>
              <strong style={{ fontSize: '1.6rem', display: 'block', margin: '4px 0' }}>{forms.length}</strong>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Seluruh form yang kamu buat</span>
            </div>
            <div className="card card--plain" style={{ padding: 'var(--space-4)', borderRadius: 14 }}>
              <span className="eyebrow">Form Published</span>
              <strong style={{ fontSize: '1.6rem', display: 'block', margin: '4px 0', color: '#059669' }}>
                {publishedCount}
              </strong>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Sedang aktif menerima respons</span>
            </div>
            <div className="card card--plain" style={{ padding: 'var(--space-4)', borderRadius: 14 }}>
              <span className="eyebrow">Total Respons Masuk</span>
              <strong style={{ fontSize: '1.6rem', display: 'block', margin: '4px 0', color: 'var(--brand)' }}>
                {totalResponses}
              </strong>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Jawaban terkumpul dari responden</span>
            </div>
            <div className="card card--plain" style={{ padding: 'var(--space-4)', borderRadius: 14 }}>
              <span className="eyebrow">Draft Belum Terbit</span>
              <strong style={{ fontSize: '1.6rem', display: 'block', margin: '4px 0', color: '#b45309' }}>
                {draftCount}
              </strong>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Sedang dirancang</span>
            </div>
          </div>

          {/* Form Teraktif */}
          <div className="card card--plain" style={{ padding: 'var(--space-4)', borderRadius: 16 }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '0.95rem' }}>Daftar Form & Unduhan CSV</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
              {forms.map((f) => (
                <li
                  key={f.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'var(--surface-soft, rgba(0,0,0,0.02))',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div>
                    <strong>{f.title}</strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>
                      /f/{f.slug} · {f.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="pill" style={{ fontSize: '0.75rem' }}>
                      {f.responses} respons
                    </span>
                    <a
                      className="btn btn--ghost btn--sm"
                      href={`/api/forms/${f.id}/export.csv`}
                      style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                    >
                      Unduh CSV
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Modal Cepat Buat Form Baru */}
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
              maxWidth: 460,
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
              <label style={{ fontWeight: 600, fontSize: '0.88rem', display: 'block', marginBottom: 6 }}>
                Judul Form
              </label>
              <input
                className="input"
                style={{ width: '100%' }}
                placeholder="mis. Survei Skripsi Kepuasan Pengguna"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setCreateModalOpen(false);
                  setMainTab('templates');
                }}
              >
                Lihat Katalog Template
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
