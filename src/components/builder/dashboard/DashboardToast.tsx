/**
 * DashboardToast.tsx — notifikasi melayang sederhana.
 */
interface ToastProps {
  message: string | null;
}

export default function DashboardToast({ message }: ToastProps) {
  return (
    <div className={`db-toast ${message ? 'is-show' : ''}`} role="status" aria-live="polite">
      {message && (
        <>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m5 12 5 5L20 7" />
          </svg>
          <span>{message}</span>
        </>
      )}
    </div>
  );
}
