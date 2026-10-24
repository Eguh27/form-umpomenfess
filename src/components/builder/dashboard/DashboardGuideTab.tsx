/**
 * DashboardGuideTab.tsx — panduan empat langkah dan tips singkat.
 * List bernomor polos, tanpa kartu, ikon, atau emoji.
 */
interface GuideTabProps {
  onOpenCreateModal: () => void;
}

const STEPS = [
  {
    title: 'Pilih template atau mulai kosong',
    desc: 'Template menyiapkan pertanyaan inti; lembar kosong memberi kebebasan penuh.',
  },
  {
    title: 'Susun pertanyaan',
    desc: 'Tambahkan teks singkat, pilihan ganda, skala nilai, atau uraian di editor.',
  },
  {
    title: 'Terbitkan dan bagikan',
    desc: 'Setelah terbit, salin tautan /f/... dan kirim ke responden.',
  },
  {
    title: 'Baca jawaban',
    desc: 'Pantau respons di dashboard, lalu unduh CSV bila perlu diolah lebih lanjut.',
  },
];

const TIPS = [
  {
    lead: 'Tulis tujuan dengan jelas.',
    desc: 'Sebutkan keperluan penelitian dan perkiraan waktu pengisian.',
  },
  {
    lead: 'Wajibkan seperlunya.',
    desc: 'Pertanyaan opsional membuat responden lebih nyaman menyelesaikan form.',
  },
  {
    lead: 'Pakai skala 1-5.',
    desc: 'Skala mudah dijawab di ponsel dan rapi saat direkap.',
  },
];

export default function DashboardGuideTab({ onOpenCreateModal }: GuideTabProps) {
  return (
    <div className="db-tab db-guide">
      <h2 className="db-section-title">Panduan</h2>

      <section aria-labelledby="db-guide-steps-title">
        <h3 id="db-guide-steps-title" className="db-section-title">
          Empat langkah
        </h3>
        <ol className="db-steps">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <span className="db-step-num" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <h4>{step.title}</h4>
                <p>{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="db-guide-tips-title">
        <h3 id="db-guide-tips-title" className="db-section-title">
          Tips agar form diisi
        </h3>
        <ul className="db-tips">
          {TIPS.map((tip) => (
            <li key={tip.lead}>
              <strong>{tip.lead}</strong> {tip.desc}
            </li>
          ))}
        </ul>
      </section>

      <div>
        <button type="button" className="db-btn db-btn--primary" onClick={onOpenCreateModal}>
          Buat form pertamamu
        </button>
      </div>
    </div>
  );
}
