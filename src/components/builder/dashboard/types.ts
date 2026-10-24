/**
 * types.ts — tipe data dashboard pengguna: kontrak data antar-komponen dashboard.
 */
import type { FormRow, TemplateRow } from '../dashboardForms';

export type DashboardTab = 'my-forms' | 'templates' | 'stats' | 'guide';

export type StatusFilter = 'all' | 'published' | 'draft' | 'closed';

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

export interface QuickSuggestion {
  title: string;
  category: string;
  tag: string;
}

export const STATUS_LABELS: Record<string, { label: string; badgeClass: string; desc: string }> = {
  published: {
    label: '🟢 Aktif Menerima Jawaban',
    badgeClass: 'status-published',
    desc: 'Formulir sedang aktif dan bisa diisi responden',
  },
  draft: {
    label: '🟡 Draft (Belum Terbit)',
    badgeClass: 'status-draft',
    desc: 'Hanya bisa dilihat olehmu, belum bisa diisi publik',
  },
  closed: {
    label: '⚪ Ditutup',
    badgeClass: 'status-closed',
    desc: 'Penerimaan respons dihentikan sementara',
  },
};
