/** Modale alerte — styles inline pour Shadow DOM (sans Tailwind). */
type SentinelAlertProps = {
  title: string;
  message: string;
  closeLabel: string;
  onClose?: () => void;
};

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 2147483647,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: '16px',
    fontFamily:
      'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  } as const,
  card: {
    maxWidth: '28rem',
    width: '100%',
    borderRadius: '8px',
    backgroundColor: '#fff',
    padding: '24px',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
  } as const,
  title: {
    margin: 0,
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#111827',
  } as const,
  body: {
    margin: '8px 0 0',
    fontSize: '0.875rem',
    lineHeight: 1.5,
    color: '#4b5563',
  } as const,
  button: {
    marginTop: '16px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#111827',
    color: '#fff',
    padding: '8px 16px',
    fontSize: '0.875rem',
    cursor: 'pointer',
  } as const,
};

export function SentinelAlert({ title, message, closeLabel, onClose }: SentinelAlertProps) {
  return (
    <div
      role="alertdialog"
      aria-labelledby="sentinel-alert-title"
      aria-modal="true"
      style={styles.overlay}
    >
      <div style={styles.card}>
        <h2 id="sentinel-alert-title" style={styles.title}>
          {title}
        </h2>
        <p style={styles.body}>{message}</p>
        {onClose && (
          <button type="button" style={styles.button} onClick={onClose}>
            {closeLabel}
          </button>
        )}
      </div>
    </div>
  );
}
