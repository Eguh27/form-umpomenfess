/**
 * DashboardTopbar.tsx — Bar atas dashboard (Zona B).
 * Dilengkapi sambutan hangat, kolom pencarian, filter status dengan keterangan,
 * pengalih tema (sun/moon icon), menu profil, dan tombol prominen "+ Buat Form Baru".
 */
import { useState, useRef, useEffect } from 'react';
import type { StatusFilter } from './types';

interface TopbarProps {
  onOpenSidebar: () => void;
  displayName: string;
  userEmail?: string;
  isAdmin?: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (s: StatusFilter) => void;
  onOpenCreateModal: () => void;
}

const FILTER_ITEMS: Array<{ id: StatusFilter; label: string; desc: string }> = [
  { id: 'all', label: '📁 Semua Formulir', desc: 'Tampilkan semua status' },
  { id: 'published', label: '🟢 Aktif', desc: 'Siap menerima jawaban' },
  { id: 'draft', label: '🟡 Draft', desc: 'Masih dalam proses edit' },
  { id: 'closed', label: '⚪ Tutup', desc: 'Penerimaan respons dihentikan' },
];

export default function DashboardTopbar({
  onOpenSidebar,
  displayName,
  userEmail,
  isAdmin = false,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onOpenCreateModal,
}: TopbarProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Sinkronkan status tema awal dari dataset DOM
    const currentTheme = document.documentElement.dataset.theme;
    setIsDark(currentTheme === 'dark');

    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
      if (filterRef.current && !filterRef.current.contains(target)) {
        setFilterMenuOpen(false);
      }
    };
    document.addEventListener('click', handleOutside);
    return () => document.removeEventListener('click', handleOutside);
  }, []);

  const handleToggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    setIsDark(!isDark);
    try {
      localStorage.setItem('theme', next);
    } catch {
      // Abaikan jika storage diblokir di private window
    }
    const meta = document.querySelector('meta[name="theme-color"]:not([media])');
    if (meta) {
      meta.setAttribute('content', next === 'dark' ? '#131C1A' : '#FDEEEC');
    }
  };

  const firstLetter = displayName.trim().charAt(0).toUpperCase() || 'U';
  const activeFilter = FILTER_ITEMS.find((f) => f.id === statusFilter) ?? FILTER_ITEMS[0];

  return (
    <header className="db-topbar">
      {/* Tombol hamburger untuk HP */}
      <button
        type="button"
        className="db-hamburger"
        onClick={onOpenSidebar}
        aria-label="Buka navigasi samping"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Sambutan Pengguna */}
      <div className="db-welcome">
        <h1>
          Selamat datang, <span>{displayName}</span>! 👋
        </h1>
        <p>Kelola formulir dan pantau respon surveimu dengan mudah.</p>
      </div>

      {/* Aksi Topbar: Pencarian, Filter Status, Tema, Profil, Tombol Buat */}
      <div className="db-topbar-actions">
        {/* Kolom Pencarian */}
        <div className="db-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Cari form (mis. Skripsi)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Cari formulir"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', opacity: 0.6 }}
              aria-label="Hapus kata kunci"
            >
              ✕
            </button>
          )}
        </div>

        {/* Dropdown Filter Status Cepat */}
        <div className="db-profile-wrap" ref={filterRef}>
          <button
            type="button"
            className="db-profile-btn"
            onClick={() => setFilterMenuOpen((prev) => !prev)}
            aria-label="Filter status formulir"
            style={{ borderRadius: 12, padding: '6px 12px' }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{activeFilter.label}</span>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {filterMenuOpen && (
            <div className="db-dropdown" style={{ right: 0, minWidth: 200 }} role="menu">
              {FILTER_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={statusFilter === item.id ? 'is-active' : ''}
                  onClick={() => {
                    onStatusFilterChange(item.id);
                    setFilterMenuOpen(false);
                  }}
                  role="menuitem"
                >
                  <div>
                    <strong>{item.label}</strong>
                    <small style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                      {item.desc}
                    </small>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tombol Pengalih Tema Terang/Gelap Selaras Base.astro */}
        <button
          type="button"
          className="theme-toggle"
          data-theme-toggle
          onClick={handleToggleTheme}
          aria-label={isDark ? 'Aktifkan tema terang' : 'Aktifkan tema gelap'}
          aria-pressed={isDark}
          title={isDark ? 'Tema terang' : 'Tema gelap'}
        >
          <svg className="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 2v2.4M12 19.6V22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2 12h2.4M19.6 12H22M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7" />
          </svg>
          <svg className="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20.3 14.2A8.4 8.4 0 0 1 9.8 3.7a8.5 8.5 0 1 0 10.5 10.5z" />
          </svg>
        </button>

        {/* Menu Profil Pengguna */}
        <div className="db-profile-wrap" ref={profileRef}>
          <button
            type="button"
            className="db-profile-btn"
            onClick={() => setProfileOpen((prev) => !prev)}
            aria-expanded={profileOpen}
            aria-label="Menu akun pengguna"
          >
            <div className="db-avatar">{firstLetter}</div>
            <span className="db-profile-name">{displayName}</span>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {profileOpen && (
            <div className="db-dropdown" role="menu">
              <div className="db-dropdown-header">
                <strong>{displayName}</strong>
                {userEmail && <small>{userEmail}</small>}
                {isAdmin && (
                  <span className="pill" style={{ marginTop: 6, fontSize: '0.62rem', background: 'var(--brand)', color: '#fff' }}>
                    🛡️ Admin Aktif
                  </span>
                )}
              </div>

              {isAdmin && (
                <a href="/dashboard/admin/laporan" role="menuitem">
                  🛡️ Moderasi Laporan
                </a>
              )}

              <a href="/" role="menuitem">
                🌐 Halaman Beranda
              </a>

              <a href="https://umpomenfess.my.id" target="_blank" rel="noreferrer" role="menuitem">
                💬 Forum Menfess UMPO
              </a>

              <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />

              <a href="/auth/logout" className="is-danger" role="menuitem">
                🚪 Keluar (Logout)
              </a>
            </div>
          )}
        </div>

        {/* Tombol Buat Form Baru Prominen */}
        <button
          type="button"
          className="btn btn--accent btn--sm"
          onClick={onOpenCreateModal}
          style={{ minHeight: 38, borderRadius: 12, fontWeight: 700 }}
        >
          <span>+</span> Buat Form Baru
        </button>
      </div>
    </header>
  );
}
