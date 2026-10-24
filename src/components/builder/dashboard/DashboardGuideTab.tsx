/**
 * DashboardGuideTab.tsx — Panduan pemula visual 4 langkah mudah.
 * Dirancang agar pengguna non-teknis / mahasiswa tidak bingung.
 */
interface GuideTabProps {
  onGoToTemplates: () => void;
  onOpenCreateModal: () => void;
}

export default function DashboardGuideTab({ onGoToTemplates, onOpenCreateModal }: GuideTabProps) {
  const steps = [
    {
      num: 1,
      icon: '✨',
      title: 'Pilih Template atau Buat Kosong',
      desc: 'Jika kamu pemula, gunakan Template Siap Pakai (seperti Skripsi, Pendaftaran Acara, atau Evaluasi). Pertanyaan sudah tersusun rapi!',
    },
    {
      num: 2,
      icon: '✍️',
      title: 'Atur Pertanyaan di Editor Visual',
      desc: 'Tambahkan jenis pertanyaan yang kamu inginkan: Teks Singkat (untuk Nama/NIM), Pilihan Ganda, Skala Nilai 1-5, atau Kotak Centang.',
    },
    {
      num: 3,
      icon: '🚀',
      title: 'Terbitkan & Sebar Tautan Form',
      desc: 'Klik tombol "Terbitkan Form". Kamu akan mendapatkan tautan ramah (mis. /f/survei-skripsi) yang siap dibagikan ke WhatsApp & media sosial.',
    },
    {
      num: 4,
      icon: '📊',
      title: 'Pantau Jawaban & Unduh ke Excel',
      desc: 'Setiap kali ada responden yang mengisi, data langsung masuk ke dashboard. Kamu bisa melihat diagram hasil atau mengunduh file CSV/Excel.',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header Panduan */}
      <div className="db-card">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px' }}>
          💡 Panduan Praktis Membuat Formulir
        </h2>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
          Tidak perlu mengerti coding sama sekali! Ikuti 4 langkah mudah berikut untuk mulai mengumpulkan data responden:
        </p>

        {/* 4 Langkah Visual */}
        <div className="db-guide-grid">
          {steps.map((st) => (
            <div key={st.num} className="db-step-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="db-step-num">{st.num}</div>
                <span style={{ fontSize: '1.4rem' }}>{st.icon}</span>
              </div>
              <h3 className="db-step-title">{st.title}</h3>
              <p className="db-step-desc">{st.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn--accent btn--sm" onClick={onGoToTemplates}>
            ✨ Pilih dari Katalog Template ➔
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onOpenCreateModal}>
            + Buat Form Kosong Baru
          </button>
        </div>
      </div>

      {/* Tips Penting & FAQ */}
      <div className="db-card">
        <h3 style={{ fontSize: '1.08rem', margin: '0 0 12px', fontWeight: 700 }}>
          📌 Tips Agar Formulirmu Ramai Diisi Responden
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
          <div style={{ background: 'var(--surface-soft)', padding: 14, borderRadius: 14, border: '1px solid var(--border)' }}>
            <strong style={{ fontSize: '0.86rem', display: 'block', marginBottom: 4 }}>
              1. Tulis Deskripsi yang Jelas
            </strong>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
              Jelaskan untuk apa formulir ini dibuat (mis. penelitian tugas akhir skripsi, pendaftaran lomba) dan berapa menit waktu pengisiannya.
            </p>
          </div>

          <div style={{ background: 'var(--surface-soft)', padding: 14, borderRadius: 14, border: '1px solid var(--border)' }}>
            <strong style={{ fontSize: '0.86rem', display: 'block', marginBottom: 4 }}>
              2. Gunakan Pertanyaan Wajib Seperlunya
            </strong>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
              Jangan tandai semua pertanyaan sebagai 'Wajib Diisi'. Pertanyaan opsional membuat responden merasa lebih santai dan tidak cepat keluar.
            </p>
          </div>

          <div style={{ background: 'var(--surface-soft)', padding: 14, borderRadius: 14, border: '1px solid var(--border)' }}>
            <strong style={{ fontSize: '0.86rem', display: 'block', marginBottom: 4 }}>
              3. Manfaatkan Skala Nilai 1-5
            </strong>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
              Untuk mengukur tingkat kepuasan atau kesetujuan, jenis pertanyaan Skala Nilai (Likert) sangat mudah dijawab responden di layar ponsel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
