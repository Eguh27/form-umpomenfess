/**
 * DashboardTopbar.tsx — sambutan, meta singkat, tema, profil, dan satu CTA.
 * Pencarian & filter status berada kontekstual di tab Formulir Saya.
 */
import { useEffect, useRef, useState } from 'react';

interface TopbarProps {
  onOpenSidebar: () => void;
  sidebarOpen: boolean;
  displayName: string;
  userEmail?: string;
  formsCount: number;
  totalResponses: number;
  onOpenCreateModal: () => void;
}

export default function DashboardTopbar({
  onOpenSidebar,
  sidebarOpen,
  displayName,
  userEmail,
  formsCount,
  totalResponses,
  onOpenCreateModal,
}: TopbarProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsDark(document.documentElement.dataset.theme === 'dark');

    const handleOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProfileOpen(false);
    };

    document.addEventListener('click', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('click', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  const handleToggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    setIsDark(!isDark);
    try {
      localStorage.setItem('theme', next);
    } catch {
      // Abaikan bila storage diblokir di private window.
    }
    const meta = document.querySelector('meta[name="theme-color"]:not([media])');
    if (meta) meta.setAttribute('content', next === 'dark' ? '#131C1A' : '#FDEEEC');
  };

  const firstLetter = displayName.trim().charAt(0).toUpperCase() || 'U';

  return (
    <header className="db-topbar">
      <button
        type="button"
        className="db-hamburger"
        onClick={onOpenSidebar}
        aria-label="Buka navigasi samping"
        aria-expanded={sidebarOpen}
        aria-controls="db-sidebar"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      <div className="db-welcome">
        <h1>Halo, {displayName}. Mau bikin form apa hari ini?</h1>
        <p>
          {formsCount} form · {totalResponses} jawaban
        </p>
      </div>

      <div className="db-topbar-actions">
        <button
          type="button"
          className="theme-toggle"
          onClick={handleToggleTheme}
          aria-label={isDark ? 'Aktifkan tema terang' : 'Aktifkan tema gelap'}
          aria-pressed={isDark}
          title={isDark ? 'Tema terang' : 'Tema gelap'}
        >
          <svg
            className="icon-sun"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 2v2.4M12 19.6V22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2 12h2.4M19.6 12H22M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7" />
          </svg>
          <svg
            className="icon-moon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20.3 14.2A8.4 8.4 0 0 1 9.8 3.7a8.5 8.5 0 1 0 10.5 10.5z" />
          </svg>
        </button>

        <div className="db-profile-wrap" ref={profileRef}>
          <button
            type="button"
            className="db-profile-btn"
            onClick={() => setProfileOpen((prev) => !prev)}
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            aria-label="Menu akun pengguna"
          >
            <span className="db-avatar" aria-hidden="true">
              {firstLetter}
            </span>
            <span className="db-profile-name">{displayName}</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {profileOpen && (
            <div className="db-dropdown" role="menu" aria-label="Akun">
              <div className="db-dropdown-header">
                <strong>{displayName}</strong>
                {userEmail && <small>{userEmail}</small>}
              </div>
              <a href="/" role="menuitem">
                Beranda
              </a>
              <a href="https://umpomenfess.my.id" target="_blank" rel="noreferrer" role="menuitem">
                Menfess
              </a>
              <a href="/auth/logout" className="is-danger" role="menuitem">
                Keluar
              </a>
            </div>
          )}
        </div>

        <button type="button" className="db-btn db-btn--primary" onClick={onOpenCreateModal}>
          Buat form
        </button>
      </div>
    </header>
  );
}
