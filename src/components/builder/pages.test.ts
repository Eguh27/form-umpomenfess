import { describe, expect, it } from 'vitest';
import {
  appendNewPage,
  countPages,
  isPageBreak,
  removePageBreak,
  splitIntoPages,
} from './pages';
import type { BlockDraft } from './defaults';

describe('pages.ts — multi-page segmentation & helpers', () => {
  it('isPageBreak mendeteksi divider berawalan page_', () => {
    const pageBreak: BlockDraft = { id: 'page_123', type: 'divider' };
    const normalDivider: BlockDraft = { id: 'd_123', type: 'divider' };
    const heading: BlockDraft = { id: 'page_head', type: 'heading', text: 'Judul', size: 'l', align: 'left' };

    expect(isPageBreak(pageBreak)).toBe(true);
    expect(isPageBreak(normalDivider)).toBe(false);
    expect(isPageBreak(heading)).toBe(false);
  });

  it('splitIntoPages membagi blok flat menjadi beberapa halaman dengan judul tepat', () => {
    const blocks: BlockDraft[] = [
      { id: 'h1', type: 'heading', text: 'Bagian I: Identitas', size: 'l', align: 'left' },
      { id: 'q1', type: 'question', kind: 'short_text', label: 'Nama', required: true, options: [], min: null, max: null, maxLength: null },
      { id: 'page_break_1', type: 'divider' },
      { id: 'h2', type: 'heading', text: 'Bagian II: Kuesioner', size: 'l', align: 'left' },
      { id: 'q2', type: 'question', kind: 'scale', label: 'Skala', required: true, options: [], min: 1, max: 5, maxLength: null },
    ];

    const pages = splitIntoPages(blocks);
    expect(pages).toHaveLength(2);

    expect(pages[0].pageNumber).toBe(1);
    expect(pages[0].title).toBe('Bagian I: Identitas');
    expect(pages[0].blocks).toHaveLength(2);
    expect(pages[0].breakBlockId).toBeNull();

    expect(pages[1].pageNumber).toBe(2);
    expect(pages[1].title).toBe('Bagian II: Kuesioner');
    expect(pages[1].blocks).toHaveLength(2);
    expect(pages[1].breakBlockId).toBe('page_break_1');
  });

  it('appendNewPage menambahkan divider dan heading baru', () => {
    const initial: BlockDraft[] = [
      { id: 'q1', type: 'question', kind: 'short_text', label: 'Nama', required: false, options: [], min: null, max: null, maxLength: null },
    ];

    const result = appendNewPage(initial, 'Kuesioner Lanjutan');
    expect(result.blocks).toHaveLength(3);
    expect(result.blocks[1].id).toBe(result.breakId);
    expect(result.blocks[1].type).toBe('divider');
    expect(isPageBreak(result.blocks[1])).toBe(true);
    expect(result.blocks[2].type).toBe('heading');
    expect((result.blocks[2] as { text: string }).text).toBe('Kuesioner Lanjutan');

    expect(countPages(result.blocks)).toBe(2);
  });

  it('removePageBreak menggabungkan halaman kembali', () => {
    const blocks: BlockDraft[] = [
      { id: 'q1', type: 'question', kind: 'short_text', label: 'Nama', required: false, options: [], min: null, max: null, maxLength: null },
      { id: 'page_break_del', type: 'divider' },
      { id: 'q2', type: 'question', kind: 'short_text', label: 'Alamat', required: false, options: [], min: null, max: null, maxLength: null },
    ];

    expect(countPages(blocks)).toBe(2);
    const merged = removePageBreak(blocks, 'page_break_del');
    expect(merged).toHaveLength(2);
    expect(countPages(merged)).toBe(1);
  });
});
