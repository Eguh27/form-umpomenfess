/**
 * summary.ts — ringkasan respons utk halaman /dashboard/[id]/respons (T-53).
 * Murni & tak sadar-DB: menerima array jawaban yang sudah di-load pemilik.
 */
import type { FormAnswerValue, FormSchemaData, QuestionBlock } from './schema';

export interface QuestionSummary {
  id: string;
  label: string;
  kind: QuestionBlock['kind'];
  /** berapa respons yang menjawab pertanyaan ini. */
  answered: number;
  /** kind pilihan: frekuensi per opsi (urut: opsi schema dulu, lalu tulis-ins). */
  options?: { option: string; count: number }[];
  /** kind scale: rata-rata answered. */
  average?: number | null;
  /** kind scale: histogram per nilai dalam rentang min..max. */
  histogram?: { value: number; count: number }[];
}

const CHOICE_KINDS = new Set(['single_choice', 'multiple_choice', 'dropdown']);

export function summarizeAnswers(
  schema: FormSchemaData,
  answersList: Record<string, FormAnswerValue>[],
): QuestionSummary[] {
  const questions = schema.blocks.filter((b): b is QuestionBlock => b.type === 'question');
  return questions.map((q) => {
    const values = answersList
      .map((a) => a[q.id])
      .filter((v): v is FormAnswerValue => v !== undefined);

    const base: QuestionSummary = {
      id: q.id,
      label: q.label,
      kind: q.kind,
      answered: values.length,
    };

    if (CHOICE_KINDS.has(q.kind)) {
      const OptionSets = new Set<string>(q.options);
      const freq = new Map<string, number>();
      for (const v of values) {
        const list = Array.isArray(v) ? v : [v];
        for (const item of list) {
          const key = String(item);
          freq.set(key, (freq.get(key) ?? 0) + 1);
          OptionSets.add(key); // jawaban di luar opsi tetap tampil, jadi terlihat
        }
      }
      base.options = [...OptionSets].map((option) => ({ option, count: freq.get(option) ?? 0 }));
      return base;
    }

    if (q.kind === 'scale') {
      const numbers = values.map(Number).filter((n) => Number.isInteger(n));
      const min = q.min ?? 1;
      const max = q.max ?? 5;
      const hist = new Map<string, number>();
      for (let n = min; n <= max; n++) hist.set(String(n), 0);
      for (const n of numbers) {
        const key = String(n);
        if (hist.has(key)) hist.set(key, (hist.get(key) ?? 0) + 1);
      }
      base.histogram = [...hist].map(([value, count]) => ({ value: Number(value), count }));
      base.average = numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) / numbers.length : null;
      return base;
    }

    return base; // teks: hitung saja
  });
}
