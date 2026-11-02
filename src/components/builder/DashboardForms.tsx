/**
 * DashboardForms.tsx — island dashboard pengguna.
 * Navigasi desktop lewat sidebar, mobile lewat drawer + tab bar ringkas.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DASHBOARD_TABS,
  type DashboardProps,
  type DashboardTab,
  type StatusFilter,
} from './dashboard/types';
import DashboardSidebar from './dashboard/DashboardSidebar';
import DashboardTopbar from './dashboard/DashboardTopbar';
import DashboardMyFormsTab from './dashboard/DashboardMyFormsTab';
import DashboardTemplatesTab from './dashboard/DashboardTemplatesTab';
import DashboardStatsTab from './dashboard/DashboardStatsTab';
import DashboardGuideTab from './dashboard/DashboardGuideTab';
import DashboardTrashTab from './dashboard/DashboardTrashTab';
import DashboardCreateModal from './dashboard/DashboardCreateModal';
import DashboardToast from './dashboard/DashboardToast';
import {
  blankPayload,
  closeForm,
  deleteForm,
  duplicatePayload,
  insertForm,
  listForms,
  listDeletedForms,
  restoreForm,
  hardDeleteForm,
  emptyTrash,
  templatePayload,
  type FormRow,
  type TemplateRow,
} from './dashboardForms';
import { summarizeForms } from './dashboard/templateHelper';
import { getSupabaseBrowserClient } from './browserClient';
import type { PrebuiltTemplate } from './defaultTemplates';

export function DashboardForms({
  initialForms,
  templates: dbTemplates,
  user,
  pendingReportsCount = 0,
}: DashboardProps) {
  const [forms, setForms] = useState<FormRow[]>(initialForms);
  const [deletedForms, setDeletedForms] = useState<FormRow[]>([]);
  const [mainTab, setMainTab] = useState<DashboardTab>('my-forms');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;
    listDeletedForms(getSupabaseBrowserClient())
      .then((data) => {
        if (isMounted) setDeletedForms(data);
      })
      .catch(() => undefined);
    return () => {
      isMounted = false;
      clearTimeout(toastTimer.current);
    };
  }, []);

  const summary = useMemo(() => summarizeForms(forms), [forms]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(null), 3000);
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

  const refresh = () =>
    run('refresh', async () => {
      const client = getSupabaseBrowserClient();
      const [active, deleted] = await Promise.all([listForms(client), listDeletedForms(client)]);
      setForms(active);
      setDeletedForms(deleted);
    });

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
      showToast(`Formulir "${row.title}" berhasil diduplikasi.`);
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

  const restore = (row: FormRow) =>
    run(`restore-${row.id}`, async () => {
      await restoreForm(getSupabaseBrowserClient(), row.id);
      await refresh();
      showToast(`Formulir "${row.title}" berhasil dipulihkan.`);
    });

  const purge = (row: FormRow) =>
    run(`purge-${row.id}`, async () => {
      if (
        !window.confirm(
          `Hapus permanen formulir "${row.title}" beserta seluruh data jawabannya? Tindakan ini tidak dapat dibatalkan.`,
        )
      )
        return;
      await hardDeleteForm(getSupabaseBrowserClient(), row.id, row.bannerPublicId);
      await refresh();
      showToast(`Formulir "${row.title}" berhasil dihapus permanen.`);
    });

  const clearAllTrash = () =>
    run('empty-trash', async () => {
      if (deletedForms.length === 0) return;
      if (
        !window.confirm(
          `Kosongkan kotak sampah? Semua (${deletedForms.length}) formulir akan dimusnahkan secara permanen.`,
        )
      )
        return;
      await emptyTrash(getSupabaseBrowserClient(), deletedForms);
      await refresh();
      showToast('Kotak sampah berhasil dikosongkan.');
    });

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}/f/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    showToast('Tautan formulir disalin.');
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  const filteredForms = useMemo(() => {
    return forms.filter((form) => {
      if (statusFilter !== 'all' && form.status !== statusFilter) return false;
      if (search.trim()) {
        const query = search.toLowerCase();
        return (
          form.title.toLowerCase().includes(query) || form.slug.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [forms, statusFilter, search]);

  const displayName = user?.name || 'Pengguna';

  return (
    <div className="db-app">
      <DashboardSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={mainTab}
        onSelectTab={setMainTab}
        formsCount={summary.total}
        deletedFormsCount={deletedForms.length}
        isAdmin={user?.isAdmin}
        pendingReportsCount={pendingReportsCount}
      />

      <main className="db-main" id="main">
        <div className="db-main-inner">
          <DashboardTopbar
            onOpenSidebar={() => setSidebarOpen(true)}
            sidebarOpen={sidebarOpen}
            displayName={displayName}
            userEmail={user?.email}
            formsCount={summary.total}
            totalResponses={summary.totalResponses}
            onOpenCreateModal={() => setCreateModalOpen(true)}
          />

          <nav className="db-mobile-tabs" aria-label="Tab dashboard">
            {DASHBOARD_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={mainTab === tab.id ? 'is-active' : ''}
                aria-current={mainTab === tab.id ? 'page' : undefined}
                onClick={() => setMainTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {error && (
            <div role="alert" className="db-alert">
              {error}
            </div>
          )}

          {mainTab === 'my-forms' && (
            <DashboardMyFormsTab
              forms={forms}
              filteredForms={filteredForms}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              searchQuery={search}
              onSearchChange={setSearch}
              onCopyLink={handleCopyLink}
              copiedSlug={copiedSlug}
              onDuplicate={duplicate}
              onCloseForm={close}
              onDeleteForm={remove}
              onOpenCreateModal={() => setCreateModalOpen(true)}
              onGoToTemplates={() => setMainTab('templates')}
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
            <DashboardGuideTab onOpenCreateModal={() => setCreateModalOpen(true)} />
          )}

          {mainTab === 'trash' && (
            <DashboardTrashTab
              deletedForms={deletedForms}
              onRestoreForm={restore}
              onHardDeleteForm={purge}
              onEmptyTrash={clearAllTrash}
              isBusy={busy !== null}
            />
          )}
        </div>
      </main>

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

      <DashboardToast message={toastMessage} />
    </div>
  );
}

export default DashboardForms;
