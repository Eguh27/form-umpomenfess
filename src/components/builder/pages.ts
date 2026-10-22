/**
 * pages.ts — manajemen multi-halaman/multi-step pada builder (T-45, Zona B).
 *
 * Sesuai kontrak schema.ts, blok divider adalah { id, type: 'divider' }.
 * Pemisah halaman (page break) dimodelkan sebagai divider dengan ID berawalan 'page_'.
 * Ini 100% valid terhadap parseFormSchema() (idPattern: /^[A-Za-z0-9_-]{1,32}$/).
 */
import type { BlockDraft } from './defaults';

export interface FormPage {
  pageNumber: number; // 1-indexed (1, 2, 3, ...)
  title: string;
  blocks: BlockDraft[];
  breakBlockId: string | null; // null untuk Halaman 1
}

/** Periksa apakah suatu blok adalah pemisah halaman antar seksi/page. */
export function isPageBreak(block: BlockDraft): boolean {
  return block.type === 'divider' && block.id.startsWith('page_');
}

/** Ekstrak judul halaman dari heading pertama di dalam halaman, atau fallback deskriptif. */
function derivePageTitle(blocks: BlockDraft[], pageNumber: number): string {
  const firstHeading = blocks.find((b) => b.type === 'heading');
  if (firstHeading && firstHeading.type === 'heading' && firstHeading.text.trim()) {
    return firstHeading.text.trim();
  }
  return pageNumber === 1 ? 'Halaman 1: Perkenalan' : `Halaman ${pageNumber}: Kuesioner`;
}

/** Membagi daftar blok flat menjadi array halaman (pages). */
export function splitIntoPages(blocks: BlockDraft[]): FormPage[] {
  if (blocks.length === 0) {
    return [{ pageNumber: 1, title: 'Halaman 1', blocks: [], breakBlockId: null }];
  }

  const pages: FormPage[] = [];
  let currentBlocks: BlockDraft[] = [];
  let currentBreakId: string | null = null;
  let pageNumber = 1;

  for (const block of blocks) {
    if (isPageBreak(block)) {
      // Halaman sebelumnya ditutup
      pages.push({
        pageNumber,
        title: derivePageTitle(currentBlocks, pageNumber),
        blocks: currentBlocks,
        breakBlockId: currentBreakId,
      });
      pageNumber++;
      currentBlocks = [];
      currentBreakId = block.id;
    } else {
      currentBlocks.push(block);
    }
  }

  // Masukkan halaman terakhir
  pages.push({
    pageNumber,
    title: derivePageTitle(currentBlocks, pageNumber),
    blocks: currentBlocks,
    breakBlockId: currentBreakId,
  });

  return pages;
}

/** Hitung total halaman yang ada pada blok. */
export function countPages(blocks: BlockDraft[]): number {
  return 1 + blocks.filter(isPageBreak).length;
}

/** Menghasilkan ID unik aman yang lolos schema regex. */
export function generateBlockId(prefix = 'b'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Tambahkan halaman baru di akhir daftar blok. */
export function appendNewPage(
  blocks: BlockDraft[],
  pageTitle = 'Bagian Baru'
): { blocks: BlockDraft[]; breakId: string; headingId: string } {
  const breakId = generateBlockId('page');
  const headingId = generateBlockId('h');

  const pageBreakBlock: BlockDraft = {
    id: breakId,
    type: 'divider',
  };

  const pageHeadingBlock: BlockDraft = {
    id: headingId,
    type: 'heading',
    text: pageTitle,
    size: 'l',
    align: 'left',
  };

  return {
    blocks: [...blocks, pageBreakBlock, pageHeadingBlock],
    breakId,
    headingId,
  };
}

/** Hapus pemisah halaman (menggabungkan halaman dengan halaman sebelumnya). */
export function removePageBreak(blocks: BlockDraft[], breakId: string): BlockDraft[] {
  return blocks.filter((b) => b.id !== breakId);
}
