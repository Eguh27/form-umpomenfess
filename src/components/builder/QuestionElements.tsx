/**
 * QuestionElements.tsx — palet tunggal untuk menambah blok (T-45/T-73).
 * Tiga kelompok, 13 jenis, tanpa filter kategori dan tanpa feedback lokal:
 * konfirmasi/kesalahan ditampilkan oleh Editor lewat satu notice global.
 */
import type { ReactNode } from 'react';
import type { BlockDraft } from './defaults';
import { generateBlockId } from './pages';
import {
  IconChevronDown,
  IconDivider,
  IconHeading,
  IconPage,
  IconQuestion,
  IconSliders,
  IconText,
} from './builderIcons';

interface Props {
  onAddBlock: (block: BlockDraft, label: string) => void;
  onAddPage: () => void;
  disabled?: boolean;
  pageDisabled?: boolean;
}

interface PaletteItem {
  id: string;
  label: string;
  hint: string;
  icon: ReactNode;
  createBlock: () => BlockDraft;
}

const GROUPS: Array<{ title: string; items: PaletteItem[] }> = [
  {
    title: 'Pertanyaan',
    items: [
      {
        id: 'q-short-text',
        label: 'Teks singkat',
        hint: 'Jawaban satu baris, mis. nama atau NPM.',
        icon: <IconText />,
        createBlock: () => ({
          id: generateBlockId('q'),
          type: 'question',
          kind: 'short_text',
          label: 'Pertanyaan teks singkat baru',
          required: false,
          options: [],
          min: null,
          max: null,
          maxLength: null,
        }),
      },
      {
        id: 'q-paragraph',
        label: 'Paragraf',
        hint: 'Jawaban uraian atau esai.',
        icon: <IconText />,
        createBlock: () => ({
          id: generateBlockId('q'),
          type: 'question',
          kind: 'paragraph',
          label: 'Tuliskan pendapat atau masukan Anda',
          required: false,
          options: [],
          min: null,
          max: null,
          maxLength: 1000,
        }),
      },
      {
        id: 'q-single-choice',
        label: 'Pilihan tunggal',
        hint: 'Responden memilih satu opsi.',
        icon: <IconQuestion />,
        createBlock: () => ({
          id: generateBlockId('q'),
          type: 'question',
          kind: 'single_choice',
          label: 'Pilih salah satu opsi',
          required: true,
          options: ['Opsi 1', 'Opsi 2', 'Opsi 3'],
          min: null,
          max: null,
          maxLength: null,
        }),
      },
      {
        id: 'q-multiple-choice',
        label: 'Pilihan ganda',
        hint: 'Responden boleh memilih lebih dari satu.',
        icon: <IconQuestion />,
        createBlock: () => ({
          id: generateBlockId('q'),
          type: 'question',
          kind: 'multiple_choice',
          label: 'Pilih semua opsi yang relevan',
          required: false,
          options: ['Pilihan A', 'Pilihan B', 'Pilihan C'],
          min: null,
          max: null,
          maxLength: null,
        }),
      },
      {
        id: 'q-dropdown',
        label: 'Menu pilihan',
        hint: 'Daftar tarik-turun untuk opsi yang banyak.',
        icon: <IconChevronDown />,
        createBlock: () => ({
          id: generateBlockId('q'),
          type: 'question',
          kind: 'dropdown',
          label: 'Pilih dari daftar',
          required: true,
          options: ['Opsi 1', 'Opsi 2', 'Opsi 3'],
          min: null,
          max: null,
          maxLength: null,
        }),
      },
      {
        id: 'q-scale',
        label: 'Skala',
        hint: 'Rentang nilai 1 sampai 5.',
        icon: <IconSliders />,
        createBlock: () => ({
          id: generateBlockId('q'),
          type: 'question',
          kind: 'scale',
          label: 'Seberapa setuju Anda dengan pernyataan ini?',
          required: true,
          options: [],
          min: 1,
          max: 5,
          maxLength: null,
        }),
      },
    ],
  },
  {
    title: 'Siap pakai',
    items: [
      {
        id: 'pre-nama',
        label: 'Nama atau inisial',
        hint: 'Teks singkat wajib isi.',
        icon: <IconText />,
        createBlock: () => ({
          id: generateBlockId('q'),
          type: 'question',
          kind: 'short_text',
          label: 'Nama lengkap atau nama panggilan Anda',
          required: true,
          options: [],
          min: null,
          max: null,
          maxLength: 100,
        }),
      },
      {
        id: 'pre-usia',
        label: 'Kelompok usia',
        hint: 'Empat rentang usia standar.',
        icon: <IconQuestion />,
        createBlock: () => ({
          id: generateBlockId('q'),
          type: 'question',
          kind: 'single_choice',
          label: 'Berapa usia Anda saat ini?',
          required: true,
          options: ['< 18 tahun', '18 - 22 tahun', '23 - 26 tahun', '> 26 tahun'],
          min: null,
          max: null,
          maxLength: null,
        }),
      },
      {
        id: 'pre-gender',
        label: 'Jenis kelamin',
        hint: 'Pilihan laki-laki atau perempuan.',
        icon: <IconQuestion />,
        createBlock: () => ({
          id: generateBlockId('q'),
          type: 'question',
          kind: 'single_choice',
          label: 'Jenis kelamin',
          required: true,
          options: ['Laki-laki', 'Perempuan'],
          min: null,
          max: null,
          maxLength: null,
        }),
      },
      {
        id: 'pre-kepuasan',
        label: 'Kepuasan layanan',
        hint: 'Skala 1 sampai 5.',
        icon: <IconSliders />,
        createBlock: () => ({
          id: generateBlockId('q'),
          type: 'question',
          kind: 'scale',
          label: 'Tingkat kepuasan Anda terhadap layanan ini',
          required: true,
          options: [],
          min: 1,
          max: 5,
          maxLength: null,
        }),
      },
    ],
  },
  {
    title: 'Judul & teks',
    items: [
      {
        id: 'lay-heading',
        label: 'Judul bagian',
        hint: 'Memisahkan topik atau seksi form.',
        icon: <IconHeading />,
        createBlock: () => ({
          id: generateBlockId('h'),
          type: 'heading',
          text: 'Judul bagian baru',
          size: 'l',
          align: 'left',
        }),
      },
      {
        id: 'lay-text',
        label: 'Teks pengantar',
        hint: 'Petunjuk atau deskripsi singkat.',
        icon: <IconText />,
        createBlock: () => ({
          id: generateBlockId('t'),
          type: 'text',
          text: 'Tuliskan petunjuk atau informasi pengantar di sini.',
        }),
      },
      {
        id: 'lay-divider',
        label: 'Garis pembatas',
        hint: 'Memberi jarak antarbagian.',
        icon: <IconDivider />,
        createBlock: () => ({
          id: generateBlockId('d'),
          type: 'divider',
        }),
      },
    ],
  },
];

export default function QuestionElements({
  onAddBlock,
  onAddPage,
  disabled = false,
  pageDisabled = false,
}: Props) {
  return (
    <section className="b-palette" aria-label="Tambah blok">
      <p className="b-palette__intro">Pilih jenis blok. Blok baru langsung dapat diatur di panel ini.</p>
      <button type="button" className="b-addpage" onClick={onAddPage} disabled={pageDisabled}>
        <IconPage />
        Halaman baru
      </button>

      {GROUPS.map((group) => (
        <div className="b-palette__group" key={group.title}>
          <h3 className="b-section__title">{group.title}</h3>
          <div className="b-palette__grid">
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="b-palette__item"
                onClick={() => onAddBlock(item.createBlock(), item.label)}
                disabled={disabled}
                title={item.hint}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
