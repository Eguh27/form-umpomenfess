/**
 * DashboardSidebar.tsx — satu-satunya navigasi di desktop, drawer di mobile.
 * Tenang: tanpa kartu bantuan, badge ber-border, atau pemisah dekoratif.
 */
import { useEffect, useRef } from 'react';
import { DASHBOARD_TABS, type DashboardTab } from './types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  formsCount: number;
  deletedFormsCount?: number;
  isAdmin?: boolean;
  pendingReportsCount?: number;
}

export default function DashboardSidebar({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  formsCount,
  deletedFormsCount = 0,
  isAdmin = false,
  pendingReportsCount = 0,
}: SidebarProps) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', handleKey);

    const desktopQuery = window.matchMedia('(min-width: 1081px)');
    const handleViewportChange = (event: MediaQueryListEvent) => {
      if (event.matches) closeRef.current();
    };
    desktopQuery.addEventListener('change', handleViewportChange);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKey);
      desktopQuery.removeEventListener('change', handleViewportChange);
    };
  }, [isOpen]);

  const handleNav = (tab: DashboardTab) => {
    onSelectTab(tab);
    onClose();
  };

  return (
    <>
      <aside id="db-sidebar" className={`db-sidebar ${isOpen ? 'is-open' : ''}`} aria-label="Navigasi dashboard">
        <button
          type="button"
          className="db-sidebar-close"
          onClick={onClose}
          aria-label="Tutup menu navigasi"
        >
          ×
        </button>

        <a href="/dashboard" className="db-brand" aria-label="Dashboard umpomenfess form">
          <span className="db-brand-logo" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="4.5" y="3" width="15" height="18" rx="3" />
              <path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4" />
            </svg>
          </span>
          <span className="db-brand-text">
            <span className="db-brand-name">umpomenfess</span>
            <span className="db-brand-sub">form</span>
          </span>
        </a>

        <nav className="db-nav" aria-label="Menu utama">
          {DASHBOARD_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`db-nav-item ${activeTab === tab.id ? 'is-active' : ''}`}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              onClick={() => handleNav(tab.id)}
            >
              <span>{tab.label}</span>
              {tab.id === 'my-forms' && <span className="db-nav-count">{formsCount}</span>}
              {tab.id === 'trash' && deletedFormsCount > 0 && (
                <span className="db-nav-count" style={{ background: 'var(--coral, #f43f5e)', color: '#fff' }}>
                  {deletedFormsCount}
                </span>
              )}
            </button>
          ))}

          {isAdmin && (
            <a href="/dashboard/admin/laporan" className="db-nav-item db-nav-admin">
              <span>Moderasi Laporan</span>
              {pendingReportsCount > 0 && (
                <span className="db-nav-count">{pendingReportsCount}</span>
              )}
            </a>
          )}
        </nav>

        <div className="db-sidebar-links">
          <a href="/">Beranda</a>
          <a href="https://umpomenfess.my.id" target="_blank" rel="noreferrer">
            Menfess
          </a>
        </div>
      </aside>

      <div
        className={`db-overlay ${isOpen ? 'is-open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
    </>
  );
}
