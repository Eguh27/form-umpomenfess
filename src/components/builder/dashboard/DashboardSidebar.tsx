/**
 * DashboardSidebar.tsx — Navigasi samping ala E-Tutor.
 * Bertanggung jawab atas menu tab utama, badge penghitung, dan kartu panduan.
 */
import type { DashboardTab } from './types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  formsCount: number;
  isAdmin?: boolean;
  pendingReportsCount?: number;
}

export default function DashboardSidebar({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  formsCount,
  isAdmin = false,
  pendingReportsCount = 0,
}: SidebarProps) {
  const handleNav = (tab: DashboardTab) => {
    onSelectTab(tab);
    onClose();
  };

  return (
    <>
      <aside className={`db-sidebar ${isOpen ? 'is-open' : ''}`} aria-label="Navigasi Dashboard">
        {/* Tombol tutup sidebar di layar mobile */}
        <button
          type="button"
          className="db-sidebar-close"
          onClick={onClose}
          aria-label="Tutup menu navigasi"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Brand Header */}
        <a href="/dashboard" className="db-brand" aria-label="Dashboard umpomenfess form">
          <div className="db-brand-logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4.5" y="3" width="15" height="18" rx="3" />
              <path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4" />
            </svg>
          </div>
          <div className="db-brand-text">
            <span className="db-brand-name">umpomenfess</span>
            <span className="db-brand-sub">Form Studio</span>
          </div>
        </a>

        {/* Daftar Navigasi Utama */}
        <nav className="db-nav">
          <button
            type="button"
            className={`db-nav-item ${activeTab === 'my-forms' ? 'is-active' : ''}`}
            onClick={() => handleNav('my-forms')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span>Formulir Saya</span>
            <span className="db-nav-badge">{formsCount}</span>
          </button>

          <button
            type="button"
            className={`db-nav-item ${activeTab === 'templates' ? 'is-active' : ''}`}
            onClick={() => handleNav('templates')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z" />
            </svg>
            <span>Katalog Template</span>
          </button>

          <button
            type="button"
            className={`db-nav-item ${activeTab === 'stats' ? 'is-active' : ''}`}
            onClick={() => handleNav('stats')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <span>Statistik & Jawaban</span>
          </button>

          <button
            type="button"
            className={`db-nav-item ${activeTab === 'guide' ? 'is-active' : ''}`}
            onClick={() => handleNav('guide')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>Panduan Pemula</span>
          </button>

          {isAdmin && (
            <a href="/dashboard/admin/laporan" className="db-nav-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Moderasi Laporan</span>
              {pendingReportsCount > 0 && (
                <span className="db-nav-badge" style={{ background: 'var(--coral)', color: '#fff' }}>
                  {pendingReportsCount}
                </span>
              )}
            </a>
          )}

          <div style={{ margin: '14px 0 6px', borderTop: '1px dashed var(--border)' }} />

          <a href="/" className="db-nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span>Ke Beranda</span>
          </a>

          <a href="https://umpomenfess.my.id" target="_blank" rel="noreferrer" className="db-nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>Menfess Utama ↗</span>
          </a>
        </nav>

        {/* Kartu Bantuan / Panduan Cepat di Bawah Sidebar */}
        <div className="db-help-card">
          <h4>💡 Butuh Bantuan?</h4>
          <p>Pelajari 4 langkah mudah menyusun pertanyaan survei & menyebar tautan.</p>
          <button type="button" className="db-help-btn" onClick={() => handleNav('guide')}>
            Buka Panduan ➔
          </button>
        </div>
      </aside>

      {/* Latar Belakang Gelap Saat Menu Terbuka di HP */}
      <div
        className={`db-overlay ${isOpen ? 'is-open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
    </>
  );
}
