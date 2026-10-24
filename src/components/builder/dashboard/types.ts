/**
 * types.ts — tipe data dashboard pengguna: kontrak data antar-komponen dashboard.
 */
import type { FormRow, TemplateRow } from '../dashboardForms';

export type DashboardTab = 'my-forms' | 'templates' | 'stats' | 'guide';

export type StatusFilter = 'all' | 'published' | 'draft' | 'closed';

/** Satu sumber label tab untuk sidebar dan tab bar mobile. */
export const DASHBOARD_TABS: ReadonlyArray<{ id: DashboardTab; label: string }> = [
  { id: 'my-forms', label: 'Formulir Saya' },
  { id: 'templates', label: 'Template' },
  { id: 'stats', label: 'Statistik' },
  { id: 'guide', label: 'Panduan' },
];

export interface UserSummary {
  email?: string;
  name: string;
  isAdmin: boolean;
}

export interface DashboardProps {
  initialForms: FormRow[];
  templates: TemplateRow[];
  user?: UserSummary;
  pendingReportsCount?: number;
}

export const STATUS_LABELS: Record<
  string,
  { label: string; short: string; tone: 'published' | 'draft' | 'closed'; badgeClass: string; desc: string }
> = {
  published: {
    label: 'Aktif Menerima Jawaban',
    short: 'Aktif',
    tone: 'published',
    badgeClass: 'status-published',
    desc: 'Formulir sedang aktif dan bisa diisi responden',
  },
  draft: {
    label: 'Draft (Belum Terbit)',
    short: 'Draft',
    tone: 'draft',
    badgeClass: 'status-draft',
    desc: 'Hanya bisa dilihat olehmu, belum bisa diisi publik',
  },
  closed: {
    label: 'Ditutup',
    short: 'Ditutup',
    tone: 'closed',
    badgeClass: 'status-closed',
    desc: 'Penerimaan respons dihentikan sementara',
  },
};

/** Status tak dikenal jatuh ke tampilan netral "Ditutup". */
export function statusMeta(status: string) {
  return STATUS_LABELS[status] ?? STATUS_LABELS.closed;
}
