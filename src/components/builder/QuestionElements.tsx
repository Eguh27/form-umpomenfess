/**
 * QuestionElements.tsx — palet elemen & pertanyaan ala Canva (T-45, Zona B).
 *
 * Pengguna tidak perlu drag and drop: cukup TAP pada salah satu kartu elemen,
 * sistem otomatis menempatkannya ke form (pada halaman aktif/akhir form).
 */
import { useState } from 'react';
import type { BlockDraft } from './defaults';
import { generateBlockId } from './pages';

interface Props {
  onAddBlock: (block: BlockDraft, labelFeedback: string) => void;
  onAddPage: () => void;
  disabled?: boolean;
}

interface PaletteItem {
  id: string;
  category: 'question' | 'preset' | 'layout';
  icon: string;
  badge?: string;
  title: string;
  subtitle: string;
  createBlock: () => BlockDraft;
}

export default function QuestionElements({ onAddBlock, onAddPage, disabled = false }: Props) {
  const [activeCategory, setActiveCategory] = useState<'all' | 'question' | 'preset' | 'layout'>('question');
  const [feedback, setFeedback] = useState<string | null>(null);

  const triggerFeedback = (title: string) => {
    setFeedback(`Ditambahkan: ${title}`);
    setTimeout(() => setFeedback(null), 2000);
  };

  const ITEMS: PaletteItem[] = [
    // Elemen Tanya Doang (Pertanyaan Murni)
    {
      id: 'q-short-text',
      category: 'question',
      icon: '✍️',
      title: 'Teks Singkat',
      subtitle: 'Jawaban satu baris (mis. nama, inisial, NPM)',
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
      category: 'question',
      icon: '📝',
      title: 'Paragraf Panjang',
      subtitle: 'Jawaban uraian / esai (mis. alasan, masukan)',
      createBlock: () => ({
        id: generateBlockId('q'),
        type: 'question',
        kind: 'paragraph',
        label: 'Tuliskan pendapat atau masukan Anda di sini',
        required: false,
        options: [],
        min: null,
        max: null,
        maxLength: 1000,
      }),
    },
    {
      id: 'q-single-choice',
      category: 'question',
      icon: '🔘',
      title: 'Pilihan Tunggal (Radio)',
      subtitle: 'Responden memilih salah satu dari beberapa opsi',
      createBlock: () => ({
        id: generateBlockId('q'),
        type: 'question',
        kind: 'single_choice',
        label: 'Pilihlah salah satu opsi di bawah ini',
        required: true,
        options: ['Opsi 1', 'Opsi 2', 'Opsi 3'],
        min: null,
        max: null,
        maxLength: null,
      }),
    },
    {
      id: 'q-multiple-choice',
      category: 'question',
      icon: '☑️',
      title: 'Pilihan Ganda (Checkbox)',
      subtitle: 'Responden dapat memilih lebih dari satu opsi',
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
      category: 'question',
      icon: '▾',
      title: 'Menu Dropdown',
      subtitle: 'Menu tarik-turun, rapi untuk opsi yang banyak',
      createBlock: () => ({
        id: generateBlockId('q'),
        type: 'question',
        kind: 'dropdown',
        label: 'Pilih dari daftar dropdown',
        required: true,
        options: ['Opsi 1', 'Opsi 2', 'Opsi 3'],
        min: null,
        max: null,
        maxLength: null,
      }),
    },
    {
      id: 'q-scale',
      category: 'question',
      icon: '⭐',
      badge: 'Skripsi',
      title: 'Skala Likert (1 - 5)',
      subtitle: 'Rentang nilai (Sangat Tidak Setuju s/d Setuju)',
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

    // Preset Pertanyaan Siap Pakai (Sekali Tap Jadi)
    {
      id: 'pre-nama',
      category: 'preset',
      icon: '👤',
      badge: 'Siap Pakai',
      title: 'Nama / Inisial',
      subtitle: 'Teks singkat wajib isi untuk identitas responden',
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
      category: 'preset',
      icon: '🎂',
      badge: 'Siap Pakai',
      title: 'Kelompok Usia',
      subtitle: 'Opsi kelompok usia standar kuesioner mahasiswa',
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
      category: 'preset',
      icon: '⚧',
      badge: 'Siap Pakai',
      title: 'Jenis Kelamin',
      subtitle: 'Pilihan Laki-laki / Perempuan',
      createBlock: () => ({
        id: generateBlockId('q'),
        type: 'question',
        kind: 'single_choice',
        label: 'Jenis Kelamin',
        required: true,
        options: ['Laki-laki', 'Perempuan'],
        min: null,
        max: null,
        maxLength: null,
      }),
    },
    {
      id: 'pre-kepuasan',
      category: 'preset',
      icon: '📊',
      badge: 'Skripsi',
      title: 'Skala Kepuasan Layanan',
      subtitle: 'Skala 1-5 Sangat Tidak Puas s/d Sangat Puas',
      createBlock: () => ({
        id: generateBlockId('q'),
        type: 'question',
        kind: 'scale',
        label: 'Tingkat kepuasan Anda terhadap kemudahan layanan ini',
        required: true,
        options: [],
        min: 1,
        max: 5,
        maxLength: null,
      }),
    },

    // Elemen Tata Letak & Struktur
    {
      id: 'lay-heading',
      category: 'layout',
      icon: 'H',
      title: 'Judul Bagian (Heading)',
      subtitle: 'Judul besar untuk memisahkan topik/seksi form',
      createBlock: () => ({
        id: generateBlockId('h'),
        type: 'heading',
        text: 'Judul Bagian Baru',
        size: 'l',
        align: 'left',
      }),
    },
    {
      id: 'lay-text',
      category: 'layout',
      icon: '📄',
      title: 'Teks Pengantar / Deskripsi',
      subtitle: 'Paragraf keterangan atau petunjuk pengerjaan',
      createBlock: () => ({
        id: generateBlockId('t'),
        type: 'text',
        text: 'Tuliskan petunjuk atau informasi pengantar kuesioner Anda di sini.',
      }),
    },
    {
      id: 'lay-divider',
      category: 'layout',
      icon: '—',
      title: 'Garis Pembatas (Divider)',
      subtitle: 'Garis putus-putus untuk memisahkan antar pertanyaan',
      createBlock: () => ({
        id: generateBlockId('d'),
        type: 'divider',
      }),
    },
  ];

  const filteredItems = activeCategory === 'all'
    ? ITEMS
    : ITEMS.filter((item) => item.category === activeCategory);

  const handleTap = (item: PaletteItem) => {
    if (disabled) return;
    const block = item.createBlock();
    onAddBlock(block, item.title);
    triggerFeedback(item.title);
  };

  return (
    <section aria-label="Palet Elemen Canva" style={{ display: 'grid', gap: 'var(--space-3)' }}>
      {/* Category Pills ala Canva */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn--sm"
          style={{
            background: activeCategory === 'question' ? 'var(--brand)' : 'var(--surface)',
            color: activeCategory === 'question' ? '#fff' : 'inherit',
            border: '1px solid var(--border)',
            padding: '4px 10px',
            fontSize: '0.8rem',
          }}
          onClick={() => setActiveCategory('question')}
        >
          ❓ Tanya Doang
        </button>
        <button
          type="button"
          className="btn btn--sm"
          style={{
            background: activeCategory === 'preset' ? 'var(--brand)' : 'var(--surface)',
            color: activeCategory === 'preset' ? '#fff' : 'inherit',
            border: '1px solid var(--border)',
            padding: '4px 10px',
            fontSize: '0.8rem',
          }}
          onClick={() => setActiveCategory('preset')}
        >
          ⚡ Pertanyaan Siap Pakai
        </button>
        <button
          type="button"
          className="btn btn--sm"
          style={{
            background: activeCategory === 'layout' ? 'var(--brand)' : 'var(--surface)',
            color: activeCategory === 'layout' ? '#fff' : 'inherit',
            border: '1px solid var(--border)',
            padding: '4px 10px',
            fontSize: '0.8rem',
          }}
          onClick={() => setActiveCategory('layout')}
        >
          📐 Judul & Teks
        </button>
        <button
          type="button"
          className="btn btn--sm"
          style={{
            background: activeCategory === 'all' ? 'var(--brand)' : 'var(--surface)',
            color: activeCategory === 'all' ? '#fff' : 'inherit',
            border: '1px solid var(--border)',
            padding: '4px 10px',
            fontSize: '0.8rem',
          }}
          onClick={() => setActiveCategory('all')}
        >
          Semua
        </button>
      </div>

      {/* Action Khusus Multi-Halaman */}
      <div
        style={{
          background: 'var(--accent-soft)',
          border: '1.5px dashed var(--brand)',
          borderRadius: 12,
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div>
          <strong style={{ fontSize: '0.85rem', display: 'block' }}>📄 Pemisah Halaman (Page Break)</strong>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Buat form bertahap: Halaman 1 Perkenalan ➔ Halaman 2 Survei
          </span>
        </div>
        <button
          type="button"
          className="btn btn--accent btn--sm"
          style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}
          onClick={() => {
            onAddPage();
            triggerFeedback('Halaman Baru');
          }}
          disabled={disabled}
        >
          + Tambah Halaman
        </button>
      </div>

      {feedback && (
        <div
          role="status"
          style={{
            background: 'var(--success, #10b981)',
            color: '#fff',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: '0.82rem',
            fontWeight: 700,
            textAlign: 'center',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          ✓ {feedback} ditempatkan otomatis!
        </div>
      )}

      {/* Grid Kartu Elemen ala Canva (Tinggal Tap!) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: 8,
          maxHeight: 380,
          overflowY: 'auto',
          padding: 2,
        }}
      >
        {filteredItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className="card card--plain"
            style={{
              padding: '10px 8px',
              textAlign: 'left',
              cursor: disabled ? 'not-allowed' : 'pointer',
              border: '1.5px solid var(--border)',
              borderRadius: 10,
              background: 'var(--surface)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              transition: 'transform 0.15s ease, border-color 0.15s ease',
            }}
            onClick={() => handleTap(item)}
            disabled={disabled}
            title={`Tap untuk menempatkan ${item.title}`}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
              {item.badge && (
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    background: 'var(--accent-soft)',
                    color: 'var(--brand)',
                    padding: '2px 5px',
                    borderRadius: 6,
                  }}
                >
                  {item.badge}
                </span>
              )}
            </div>
            <strong style={{ fontSize: '0.82rem', lineHeight: 1.2, marginTop: 2 }}>{item.title}</strong>
            <span
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                lineHeight: 1.25,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {item.subtitle}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
