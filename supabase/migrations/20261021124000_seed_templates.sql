-- ============================================================================
-- T-14 (Agent A): Seed katalog template awal (TASK.md 6 poin 6: 5-10 template)
--
-- Semua schema/theme di sini HARUS lolos parseFormSchema() dari
-- src/lib/forms/schema.ts (whitelist font/cardStyle, hex #rrggbb, radius 0-48).
-- preview_url dibiarkan NULL sampai Agent D punya screenshot dari design/.
-- Idempoten: dipasang ulang (db push ulang) tidak menduplikasi — berdasarkan
-- unique index templates_name_unique.
-- Data dummy form/respons (milik user sungguhan) dibuat lewat tests/rls.sql.
-- ============================================================================

insert into public.templates (name, preview_url, schema, theme) values
(
  'Survei Skripsi',
  null,
  '{
    "schemaVersion": 1,
    "theme": {"bg": "#fdf2f8", "accent": "#ec4899", "text": "#1f2937",
              "font": "Poppins", "radius": 16, "cardStyle": "menfess",
              "bannerPublicId": null},
    "blocks": [
      {"id": "b1", "type": "heading", "text": "Survei Skripsi: Judul Aplikasi", "size": "xl", "align": "center"},
      {"id": "b2", "type": "text", "text": "Halo! Saya mahasiswa yang sedang menulis skripsi. Mohon bantuannya mengisi survei singkat ini ya, sekitar 3 menit."},
      {"id": "q1", "type": "question", "kind": "short_text", "label": "Nama panggilan", "required": true},
      {"id": "q2", "type": "question", "kind": "single_choice", "label": "Usia kamu?", "options": ["<20", "20-25", ">25"]},
      {"id": "q3", "type": "question", "kind": "single_choice", "label": "Pernah pakai aplikasi semacam ini?", "options": ["Sering", "Pernah", "Belum pernah"]}
    ]
  }'::jsonb,
  '{"bg": "#fdf2f8", "accent": "#ec4899", "text": "#1f2937", "font": "Poppins", "radius": 16, "cardStyle": "menfess", "bannerPublicId": null}'::jsonb
),
(
  'Skala Likert 1-5',
  null,
  '{
    "schemaVersion": 1,
    "theme": {"bg": "#f7fcfc", "accent": "#7cc7cb", "text": "#1f2937",
              "font": "Inter", "radius": 12, "cardStyle": "plain",
              "bannerPublicId": null},
    "blocks": [
      {"id": "b1", "type": "heading", "text": "Penggunaan Aplikasi", "size": "l", "align": "center"},
      {"id": "b2", "type": "divider"},
      {"id": "q1", "type": "question", "kind": "scale", "label": "Aplikasi mudah digunakan", "min": 1, "max": 5},
      {"id": "q2", "type": "question", "kind": "scale", "label": "Fitur sesuai kebutuhan saya", "min": 1, "max": 5},
      {"id": "q3", "type": "question", "kind": "scale", "label": "Desain tampilan menarik", "min": 1, "max": 5},
      {"id": "q4", "type": "question", "kind": "paragraph", "label": "Saran kamu?", "required": false, "maxLength": 500}
    ]
  }'::jsonb,
  '{"bg": "#f7fcfc", "accent": "#7cc7cb", "text": "#1f2937", "font": "Inter", "radius": 12, "cardStyle": "plain", "bannerPublicId": null}'::jsonb
),
(
  'Undangan Responden Wawancara',
  null,
  '{
    "schemaVersion": 1,
    "theme": {"bg": "#f8f5ff", "accent": "#8b5cf6", "text": "#1f2937",
              "font": "Poppins", "radius": 24, "cardStyle": "soft",
              "bannerPublicId": null},
    "blocks": [
      {"id": "b1", "type": "heading", "text": "Diwawancarai untuk skripsi?", "size": "xl", "align": "center"},
      {"id": "b2", "type": "text", "text": "Wawancara ±15 menit secara daring/onsite, tanpa biaya. Data dijaga kerahasiaannya untuk keperluan skripsi saja."},
      {"id": "q1", "type": "question", "kind": "short_text", "label": "Nama panggilan", "required": true},
      {"id": "q2", "type": "question", "kind": "short_text", "label": "Kontak (WA/email)", "required": true},
      {"id": "q3", "type": "question", "kind": "single_choice", "label": "Waktu yang nyaman buat kamu?", "options": ["Pagi (09-12)", "Siang (12-15)", "Sore (15-18)", "Malam (18-21)"]}
    ]
  }'::jsonb,
  '{"bg": "#f8f5ff", "accent": "#8b5cf6", "text": "#1f2937", "font": "Poppins", "radius": 24, "cardStyle": "soft", "bannerPublicId": null}'::jsonb
),
(
  'Pendaftaran Responden Uji Coba',
  null,
  '{
    "schemaVersion": 1,
    "theme": {"bg": "#fff7ed", "accent": "#f97316", "text": "#1f2937",
              "font": "Inter", "radius": 16, "cardStyle": "menfess",
              "bannerPublicId": null},
    "blocks": [
      {"id": "b1", "type": "heading", "text": "Ayo Jadi Penguji Coba!", "size": "l", "align": "left"},
      {"id": "b2", "type": "text", "text": "Dibutuhkan 10 penguji beta aplikasi. Penuhi data berikut, kami kirim link trial via kontakmu."},
      {"id": "q1", "type": "question", "kind": "short_text", "label": "Nama lengkap", "required": true},
      {"id": "q2", "type": "question", "kind": "dropdown", "label": "Status kamu", "required": true, "options": ["Mahasiswa", "Dosen", "Umum"]},
      {"id": "q3", "type": "question", "kind": "multiple_choice", "label": "Perangkat yang kamu punya", "required": true, "options": ["Android", "iPhone", "Laptop Windows", "Laptop Mac"]}
    ]
  }'::jsonb,
  '{"bg": "#fff7ed", "accent": "#f97316", "text": "#1f2937", "font": "Inter", "radius": 16, "cardStyle": "menfess", "bannerPublicId": null}'::jsonb
),
(
  'Kuesioner Pendahuluan Skripsi',
  null,
  '{
    "schemaVersion": 1,
    "theme": {"bg": "#f8f8f8", "accent": "#dc2626", "text": "#1f2937",
              "font": "Georgia", "radius": 8, "cardStyle": "plain",
              "bannerPublicId": null},
    "blocks": [
      {"id": "b1", "type": "heading", "text": "Kuesioner Pendahuluan", "size": "m", "align": "center"},
      {"id": "b2", "type": "text", "text": "Isi benar-benar singkat: 4 pertanyaan. Terima kasih atas waktu kamu."},
      {"id": "q1", "type": "question", "kind": "single_choice", "label": "Bagaimana kamu mengetahui masalah ini?", "required": true, "options": ["Pengalaman sendiri", "Teman/kerabat", "Media sosial", "Lainnya"]},
      {"id": "q2", "type": "question", "kind": "scale", "label": "Seberapa sering terjadi?", "min": 1, "max": 5},
      {"id": "q3", "type": "question", "kind": "paragraph", "label": "Ceritakan singkat pengalamanmu", "required": false, "maxLength": 1000}
    ]
  }'::jsonb,
  '{"bg": "#f8f8f8", "accent": "#dc2626", "text": "#1f2937", "font": "Georgia", "radius": 8, "cardStyle": "plain", "bannerPublicId": null}'::jsonb
);

-- NOTE: ganti qty/isi template kapan saja di sini; dashboard menarik dari tabel
-- ini (T-40 Agent B). Semua penulis service role — tidak ada policy write.
