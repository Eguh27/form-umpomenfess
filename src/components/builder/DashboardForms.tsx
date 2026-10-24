/**
 * DashboardForms.tsx — Island dashboard pengguna ala E-Tutor (Zona B).
 *
 * Struktur arsitektur bersih & modular:
 * 1. DashboardSidebar: Navigasi samping dengan logo, badge, dan panduan cepat.
 * 2. DashboardTopbar: Sambutan hangat, pencarian instan, tema, dan profil.
 * 3. DashboardMyFormsTab: Daftar formulir 2-kolom dengan kartu & statistik ringkas.
 * 4. DashboardTemplatesTab: Katalog template dengan contoh nyata pertanyaan.
 * 5. DashboardStatsTab: Ringkasan statistik & ekspor respons (CSV/Excel).
 * 6. DashboardGuideTab: Panduan visual 4-langkah untuk pengguna pemula.
 */
import { useMemo, useState } from 'react';
import './dashboard/dashboard.css';
import type { DashboardProps, DashboardTab, StatusFilter } from './dashboard/types';
import DashboardSidebar from './dashboard/DashboardSidebar';
import DashboardTopbar from './dashboard/DashboardTopbar';
import DashboardMyFormsTab from './dashboard/DashboardMyFormsTab';
import DashboardTemplatesTab from './dashboard/DashboardTemplatesTab';
import DashboardStatsTab from './dashboard/DashboardStatsTab';
import DashboardGuideTab from './dashboard/DashboardGuideTab';
import DashboardCreateModal from './dashboard/DashboardCreateModal';
import DashboardToast from './dashboard/DashboardToast';
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
import type { PrebuiltTemplate } from './defaultTemplates';

export default function DashboardForms({
  initialForms,
  templates: dbTemplates,
  user,
  pendingReportsCount = 0,
}: DashboardProps) {
  const [forms, setForms] = useState<FormRow[]>(initialForms);
  const [mainTab, setMainTab] = useState<DashboardTab>('my-forms');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

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

  const createBlank = (title: string) =>
    insertAndOpen(() => blankPayload(title.trim() || 'Formulir Baru'));

  const createFromPrebuilt = (tpl: PrebuiltTemplate) =>
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
      showToast(`Formulir "${row.title}" berhasil diduplikasi!`);
    });

  const close = (row: FormRow) =>
    run(`close-${row.id}`, async () => {
      await closeForm(getSupabaseBrowserClient(), row.id);
      await refresh();
      showToast(`Penerimaan jawaban untuk "${row.title}" telah ditutup.`);
    });

  const remove = (row: FormRow) =>
    run(`del-${row.id}`, async () => {
      if (!window.confirm(`Pindahkan formulir "${row.title}" ke sampah?`)) return;
      await deleteForm(getSupabaseBrowserClient(), row.id);
      await refresh();
      showToast(`Formulir "${row.title}" telah dipindahkan ke sampah.`);
    });

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}/f/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    showToast('Tautan formulir disalin! Siap dibagikan ke responden.');
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  // Filter Formulir Berdasarkan Tab Status & Pencarian
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

  const displayName = user?.name || 'Pengguna';

  return (
    <div className="db-app">
      {/* 1. Sidebar Navigasi ala E-Tutor */}
      <DashboardSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={mainTab}
        onSelectTab={setMainTab}
        formsCount={forms.length}
        isAdmin={user?.isAdmin}
        pendingReportsCount={pendingReportsCount}
      />

      {/* 2. Area Konten Utama */}
      <main className="db-main" id="main">
        <DashboardTopbar
          onOpenSidebar={() => setSidebarOpen(true)}
          displayName={displayName}
          userEmail={user?.email}
          isAdmin={user?.isAdmin}
          searchQuery={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onOpenCreateModal={() => setCreateModalOpen(true)}
        />

        {error && (
          <div
            role="alert"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1.5px solid var(--danger, #ef4444)',
              color: 'var(--danger, #ef4444)',
              borderRadius: 14,
              padding: '12px 16px',
              fontWeight: 600,
              fontSize: '0.88rem',
              marginBottom: 20,
            }}
          >
            {error}
          </div>
        )}

        {/* 3. Tampilan Konten Sesuai Tab Aktif */}
        {mainTab === 'my-forms' && (
          <DashboardMyFormsTab
            forms={forms}
            filteredForms={filteredForms}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            searchQuery={search}
            onCopyLink={handleCopyLink}
            copiedSlug={copiedSlug}
            onDuplicate={duplicate}
            onCloseForm={close}
            onDeleteForm={remove}
            onOpenCreateModal={() => setCreateModalOpen(true)}
            onGoToTemplates={() => setMainTab('templates')}
            onUseTemplate={createFromPrebuilt}
            isBusy={busy !== null}
          />
        )}

        {mainTab === 'templates' && (
          <DashboardTemplatesTab
            onUsePrebuilt={createFromPrebuilt}
            onUseDbTemplate={createFromDbTemplate}
            onCreateBlank={createBlank}
            dbTemplates={dbTemplates}
            isBusy={busy !== null}
          />
        )}

        {mainTab === 'stats' && <DashboardStatsTab forms={forms} />}

        {mainTab === 'guide' && (
          <DashboardGuideTab
            onGoToTemplates={() => setMainTab('templates')}
            onOpenCreateModal={() => setCreateModalOpen(true)}
          />
        )}
      </main>

      {/* 4. Modal Buat Formulir Cepat */}
      <DashboardCreateModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreateBlank={(title) => {
          setCreateModalOpen(false);
          createBlank(title);
        }}
        onGoToTemplates={() => {
          setCreateModalOpen(false);
          setMainTab('templates');
        }}
        isBusy={busy !== null}
      />

      {/* 5. Notifikasi Melayang Ramah */}
      <DashboardToast message={toastMessage} />
    </div>
  );
}
