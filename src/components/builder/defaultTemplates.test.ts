import { describe, expect, it } from 'vitest';
import { parseFormSchema } from '../../lib/forms/schema';
import { PREBUILT_TEMPLATES } from './defaultTemplates';
import { splitIntoPages } from './pages';

describe('defaultTemplates', () => {
  it('semua prebuilt template lolos parseFormSchema() tanpa exception/issues', () => {
    for (const t of PREBUILT_TEMPLATES) {
      const result = parseFormSchema(t.schema);
      if (!result.ok) {
        console.error(`Template gagal: ${t.name}`, result.issues);
      }
      expect(result.ok, `Template "${t.name}" harus valid`).toBe(true);
    }
  });

  it('template multi-halaman terbagi menjadi lebih dari 1 halaman di splitIntoPages', () => {
    const multiPage = PREBUILT_TEMPLATES.find((t) => t.id === 'tpl-skripsi-multipage');
    expect(multiPage).toBeDefined();
    if (multiPage) {
      // cast blocks to BlockDraft format
      const pages = splitIntoPages(multiPage.schema.blocks as never);
      expect(pages.length).toBe(3);
      expect(pages[0].title).toBe('Survei Penelitian Skripsi');
      expect(pages[1].title).toBe('Bagian II: Kuesioner Pengalaman');
      expect(pages[2].title).toBe('Bagian III: Saran & Masukan Akhir');
    }
  });
});
