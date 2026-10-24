/**
 * templateHelper.ts — Helper untuk dashboard UX ramah pemula (Zona B).
 * Membantu pengguna awam memahami isi template & metrik kuota formulir.
 */

import type { QuestionKind } from '../../../lib/forms/schema';
import type { FormRow } from '../dashboardForms';

export interface SampleQuestion {
  label: string;
  kindText: string;
}

export interface ProgressInfo {
  hasQuota: boolean;
  ratio: number;
  label: string;
}

const KIND_NAMES: Record<QuestionKind, string> = {
  short_text: 'Teks Singkat',
  paragraph: 'Teks Panjang / Uraian',
  single_choice: 'Pilihan Tunggal (Radio)',
  multiple_choice: 'Pilihan Ganda (Kotak Centang)',
  dropdown: 'Pilihan Dropdown',
  scale: 'Skala Nilai',
};

/** Ekstrak contoh pertanyaan nyata dari schema blocks template. */
export function extractSampleQuestions(blocks: unknown[], max = 4): SampleQuestion[] {
  if (!Array.isArray(blocks)) return [];
  return blocks
    .filter(
      (b): b is Record<string, unknown> =>
        typeof b === 'object' && b !== null && 'type' in b && (b as Record<string, unknown>).type === 'question',
    )
    .slice(0, max)
    .map((q) => {
      const rawKind = String(q.kind ?? '');
      let kindText = KIND_NAMES[rawKind as QuestionKind] ?? 'Pertanyaan';

      if (rawKind === 'scale') {
        const min = typeof q.min === 'number' ? q.min : 1;
        const maxVal = typeof q.max === 'number' ? q.max : 5;
        kindText = `Skala Nilai ${min}-${maxVal}`;
      } else if (rawKind === 'single_choice' || rawKind === 'multiple_choice' || rawKind === 'dropdown') {
        if (Array.isArray(q.options) && q.options.length > 0) {
          kindText = `${KIND_NAMES[rawKind as QuestionKind] ?? 'Pilihan'} (${q.options.length} opsi)`;
        }
      }

      return {
        label: String(q.label || 'Pertanyaan tanpa judul'),
        kindText,
      };
    });
}

/** Hitung progres kuota respons secara akurat tanpa membuat bar palsu saat tanpa batas. */
export function calculateProgress(responses: number, maxResponses: number | null): ProgressInfo {
  const safeResponses = Math.max(0, responses || 0);
  if (typeof maxResponses === 'number' && maxResponses > 0) {
    const ratio = Math.min(100, Math.round((safeResponses / maxResponses) * 100));
    return {
      hasQuota: true,
      ratio,
      label: `${safeResponses} / ${maxResponses} kuota terisi (${ratio}%)`,
    };
  }

  return {
    hasQuota: false,
    ratio: 0,
    label: `${safeResponses} jawaban masuk · Tanpa batas kuota`,
  };
}

export interface FormsSummary {
  total: number;
  publishedCount: number;
  draftCount: number;
  closedCount: number;
  totalResponses: number;
}

/** Rekap status & total respons form milik pengguna (dipakai tab Formulir Saya & Statistik). */
export function summarizeForms(forms: FormRow[]): FormsSummary {
  return {
    total: forms.length,
    publishedCount: forms.filter((f) => f.status === 'published').length,
    draftCount: forms.filter((f) => f.status === 'draft').length,
    closedCount: forms.filter((f) => f.status === 'closed').length,
    totalResponses: forms.reduce((acc, f) => acc + (f.responses || 0), 0),
  };
}
