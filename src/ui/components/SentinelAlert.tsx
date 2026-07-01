/** Modale alerte — styles inline pour Shadow DOM (sans Tailwind). */
import { useState } from 'react';
import type { FeedbackContextChoice } from '../../core/types.js';
import type { FeedbackCopy } from '../i18n/messages.js';

type FeedbackOptions = {
  copy: FeedbackCopy;
  onSubmit: (choice: FeedbackContextChoice) => void;
};

type SentinelAlertProps = {
  title: string;
  headline?: string;
  message: string;
  hint?: string;
  closeLabel: string;
  onClose?: () => void;
  feedback?: FeedbackOptions;
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
  headline: {
    margin: '12px 0 0',
    fontSize: '0.9375rem',
    fontWeight: 600,
    lineHeight: 1.4,
    color: '#111827',
  } as const,
  body: {
    margin: '8px 0 0',
    fontSize: '0.875rem',
    lineHeight: 1.5,
    color: '#4b5563',
  } as const,
  hint: {
    margin: '12px 0 0',
    fontSize: '0.75rem',
    lineHeight: 1.45,
    color: '#6b7280',
  } as const,
  primaryButton: {
    marginTop: '16px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#111827',
    color: '#fff',
    padding: '8px 16px',
    fontSize: '0.875rem',
    cursor: 'pointer',
  } as const,
  feedbackTrigger: {
    marginTop: '12px',
    marginRight: '8px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#fff',
    color: '#374151',
    padding: '6px 12px',
    fontSize: '0.8125rem',
    cursor: 'pointer',
  } as const,
  feedbackPanel: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
  } as const,
  feedbackPrompt: {
    margin: 0,
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#111827',
  } as const,
  feedbackHint: {
    margin: '6px 0 12px',
    fontSize: '0.75rem',
    color: '#6b7280',
    fontStyle: 'italic' as const,
  } as const,
  select: {
    display: 'block',
    width: '100%',
    padding: '8px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '0.875rem',
    color: '#111827',
    backgroundColor: '#fff',
  } as const,
  feedbackActions: {
    marginTop: '12px',
    display: 'flex' as const,
    gap: '8px',
  } as const,
  feedbackSubmit: {
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#1d4ed8',
    color: '#fff',
    padding: '8px 16px',
    fontSize: '0.875rem',
    cursor: 'pointer',
  } as const,
  feedbackCancel: {
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#fff',
    color: '#374151',
    padding: '8px 16px',
    fontSize: '0.875rem',
    cursor: 'pointer',
  } as const,
  thanks: {
    marginTop: '12px',
    fontSize: '0.8125rem',
    color: '#15803d',
  } as const,
};

const CONTEXT_ORDER: FeedbackContextChoice[] = ['code', 'prose', 'json', 'url', 'other'];

export function SentinelAlert({
  title,
  headline,
  message,
  hint,
  closeLabel,
  onClose,
  feedback,
}: SentinelAlertProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [choice, setChoice] = useState<FeedbackContextChoice>('code');
  const [submitted, setSubmitted] = useState(false);

  const submitFeedback = () => {
    feedback?.onSubmit(choice);
    setSubmitted(true);
    setPanelOpen(false);
  };

  return (
    <div
      role="alertdialog"
      aria-labelledby="sentinel-alert-title"
      aria-describedby="sentinel-alert-desc"
      aria-modal="true"
      style={styles.overlay}
    >
      <div style={styles.card}>
        <h2 id="sentinel-alert-title" style={styles.title}>
          {title}
        </h2>
        {headline && (
          <p id="sentinel-alert-headline" style={styles.headline}>
            {headline}
          </p>
        )}
        <p id="sentinel-alert-desc" style={styles.body}>
          {message}
        </p>
        {hint && <p style={styles.hint}>{hint}</p>}

        {!panelOpen && (
          <div>
            {feedback && !submitted && (
              <button
                type="button"
                style={styles.feedbackTrigger}
                onClick={() => setPanelOpen(true)}
              >
                {feedback.copy.triggerLabel}
              </button>
            )}
            {onClose && (
              <button type="button" style={styles.primaryButton} onClick={onClose}>
                {closeLabel}
              </button>
            )}
            {submitted && feedback && (
              <p style={styles.thanks}>{feedback.copy.thanksLabel}</p>
            )}
          </div>
        )}

        {panelOpen && feedback && (
          <div style={styles.feedbackPanel}>
            <p style={styles.feedbackPrompt}>{feedback.copy.prompt}</p>
            <p style={styles.feedbackHint}>{feedback.copy.hint}</p>
            <select
              aria-label={feedback.copy.prompt}
              style={styles.select}
              value={choice}
              onChange={(e) => setChoice(e.target.value as FeedbackContextChoice)}
            >
              {CONTEXT_ORDER.map((c) => (
                <option key={c} value={c}>
                  {feedback.copy.choices[c]}
                </option>
              ))}
            </select>
            <div style={styles.feedbackActions}>
              <button
                type="button"
                style={styles.feedbackSubmit}
                onClick={submitFeedback}
              >
                {feedback.copy.submitLabel}
              </button>
              <button
                type="button"
                style={styles.feedbackCancel}
                onClick={() => setPanelOpen(false)}
              >
                {feedback.copy.cancelLabel}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
