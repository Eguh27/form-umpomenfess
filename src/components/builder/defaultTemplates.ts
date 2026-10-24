/**
 * defaultTemplates.ts — katalog template bawaan kaya fitur (T-45, Zona B).
 *
 * Termasuk template multi-halaman (Halaman 1: Perkenalan -> Halaman 2: Kuesioner).
 * Semua template dipastikan 100% lolos validator parseFormSchema() dari schema.ts.
 */
import type { FormSchemaData } from '../../lib/forms/schema';

export interface PrebuiltTemplate {
  id: string;
  name: string;
  tag: 'Skripsi' | 'Survei' | 'Pendaftaran' | 'Evaluasi' | 'Cepat';
  description: string;
  pagesCount: number;
  questionCount: number;
  schema: FormSchemaData;
}

export const PREBUILT_TEMPLATES: PrebuiltTemplate[] = [
  {
    id: 'tpl-skripsi-multipage',
    name: 'Survei Skripsi Multi-Halaman',
    tag: 'Skripsi',
    description: 'Format standar skripsi: Halaman 1 Perkenalan & Demografi, Halaman 2 Kuesioner Inti, Halaman 3 Saran.',
    pagesCount: 3,
    questionCount: 6,
    schema: {
      schemaVersion: 1,
      theme: {
        bg: '#fdeeec',
        accent: '#e8604c',
        text: '#1f4d46',
        font: 'Quicksand',
        radius: 18,
        cardStyle: 'menfess',
        bannerPublicId: null,
      },
      blocks: [
        { id: 'b_intro', type: 'heading', text: 'Survei Penelitian Skripsi', size: 'xl', align: 'center' },
        {
          id: 'b_desc',
          type: 'text',
          text: 'Halo teman-teman! Saya sedang menyelesaikan penelitian skripsi. Kriteria responden: mahasiswa aktif. Pengisian kuesioner membutuhkan waktu ±3 menit. Semua jawaban bersifat anonim dan hanya digunakan untuk keperluan akademis.',
        },
        { id: 'q_nama', type: 'question', kind: 'short_text', label: 'Nama panggilan / Inisial', required: true },
        {
          id: 'q_usia',
          type: 'question',
          kind: 'single_choice',
          label: 'Kelompok Usia',
          required: true,
          options: ['< 20 tahun', '20 - 23 tahun', '> 23 tahun'],
        },
        {
          id: 'q_status',
          type: 'question',
          kind: 'dropdown',
          label: 'Fakultas / Program Studi',
          required: true,
          options: ['Teknik', 'Ekonomi & Bisnis', 'Ilmu Sosial & Politik', 'Keguruan & Ilmu Pendidikan', 'Kesehatan', 'Lainnya'],
        },
        { id: 'page_survei', type: 'divider' },
        { id: 'b_h2', type: 'heading', text: 'Bagian II: Kuesioner Pengalaman', size: 'l', align: 'left' },
        {
          id: 'q_freq',
          type: 'question',
          kind: 'single_choice',
          label: 'Seberapa sering Anda menggunakan aplikasi/layanan ini?',
          required: true,
          options: ['Setiap hari', 'Beberapa kali seminggu', 'Jarang (1-2 kali sebulan)', 'Baru pertama kali'],
        },
        {
          id: 'q_likert1',
          type: 'question',
          kind: 'scale',
          label: 'Antarmuka aplikasi mudah dipahami dan tidak membingungkan',
          required: true,
          min: 1,
          max: 5,
        },
        {
          id: 'q_likert2',
          type: 'question',
          kind: 'scale',
          label: 'Fitur-fitur yang disediakan memenuhi kebutuhan sehari-hari saya',
          required: true,
          min: 1,
          max: 5,
        },
        { id: 'page_penutup', type: 'divider' },
        { id: 'b_h3', type: 'heading', text: 'Bagian III: Saran & Masukan Akhir', size: 'l', align: 'left' },
        {
          id: 'q_saran',
          type: 'question',
          kind: 'paragraph',
          label: 'Apa saran atau perbaikan yang Anda harapkan untuk aplikasi ini?',
          required: false,
          maxLength: 1000,
        },
      ],
    },
  },
  {
    id: 'tpl-likert-penelitian',
    name: 'Kuesioner Skala Likert 1-5',
    tag: 'Survei',
    description: 'Cocok untuk uji kelayakan, kepuasan, atau evaluasi produk dengan skala 1-5 terstandar.',
    pagesCount: 1,
    questionCount: 5,
    schema: {
      schemaVersion: 1,
      theme: {
        bg: '#edfbf7',
        accent: '#2f7263',
        text: '#123831',
        font: 'Quicksand',
        radius: 20,
        cardStyle: 'menfess',
        bannerPublicId: null,
      },
      blocks: [
        { id: 'b_h', type: 'heading', text: 'Kuesioner Evaluasi & Kepuasan', size: 'xl', align: 'center' },
        {
          id: 'b_t',
          type: 'text',
          text: 'Pilihlah angka 1 (Sangat Tidak Setuju) sampai 5 (Sangat Setuju) yang paling mewakili pengalaman Anda.',
        },
        { id: 'b_d', type: 'divider' },
        { id: 'q_l1', type: 'question', kind: 'scale', label: 'Proses penggunaan layanan berjalan cepat dan responsif', required: true, min: 1, max: 5 },
        { id: 'q_l2', type: 'question', kind: 'scale', label: 'Informasi yang ditampilkan jelas dan mudah ditemukan', required: true, min: 1, max: 5 },
        { id: 'q_l3', type: 'question', kind: 'scale', label: 'Saya merasa aman saat bertransaksi / berinteraksi di platform', required: true, min: 1, max: 5 },
        { id: 'q_l4', type: 'question', kind: 'scale', label: 'Secara keseluruhan, saya puas dengan kualitas layanan', required: true, min: 1, max: 5 },
        { id: 'q_crit', type: 'question', kind: 'paragraph', label: 'Kritik dan saran perbaikan', required: false, maxLength: 500 },
      ],
    },
  },
  {
    id: 'tpl-quick-poll',
    name: 'Quick Poll Mahasiswa (Singkat)',
    tag: 'Cepat',
    description: 'Hanya butuh 30 detik untuk diisi: 3 pertanyaan cepat to-the-point.',
    pagesCount: 1,
    questionCount: 3,
    schema: {
      schemaVersion: 1,
      theme: {
        bg: '#fff7ed',
        accent: '#ea580c',
        text: '#431407',
        font: 'Baloo 2',
        radius: 16,
        cardStyle: 'menfess',
        bannerPublicId: null,
      },
      blocks: [
        { id: 'b_h', type: 'heading', text: 'Polling Singkat Mahasiswa', size: 'l', align: 'center' },
        { id: 'q_tanya1', type: 'question', kind: 'single_choice', label: 'Format perkuliahan mana yang Anda sukai semester ini?', required: true, options: ['Tatap Muka Penuh (Offline)', 'Hybrid (Campuran)', 'Daring Penuh (Online)'] },
        { id: 'q_tanya2', type: 'question', kind: 'single_choice', label: 'Apakah jam buka perpustakaan saat ini sudah memadai?', required: true, options: ['Sudah Cukup', 'Perlu Diperpanjang sampai Malam', 'Perlu Buka di Akhir Pekan'] },
        { id: 'q_tanya3', type: 'question', kind: 'paragraph', label: 'Catatan singkat tambahan (opsional)', required: false, maxLength: 300 },
      ],
    },
  },
];
