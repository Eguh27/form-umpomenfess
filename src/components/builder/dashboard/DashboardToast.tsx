/**
 * DashboardToast.tsx — Notifikasi melayang ramah pengguna.
 */
interface ToastProps {
  message: string | null;
}

export default function DashboardToast({ message }: ToastProps) {
  return (
    <div
      className={`db-toast ${message ? 'is-show' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span style={{ fontSize: '1.1rem' }}>✓</span>
      <span>{message}</span>
    </div>
  );
}
