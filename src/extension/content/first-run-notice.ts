import { STORAGE_KEYS } from '../../core/constants.js';
import { getExtensionApi } from '../platform/browser-api.js';
import {
  employeeNoticeAck,
  employeeNoticeBody,
  employeeNoticeTitle,
  resolveLocale,
} from '../../ui/i18n/messages.js';

/** Affiche la notice employé une fois par installation (RGPD — information). */
export async function showFirstRunNoticeIfNeeded(): Promise<void> {
  const api = getExtensionApi();
  const stored = await api.storage.local.get(STORAGE_KEYS.noticeAckAt);
  if (stored[STORAGE_KEYS.noticeAckAt]) {
    return;
  }

  const locale = resolveLocale();
  let host = document.getElementById('shadow-ai-sentinel-ui-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'shadow-ai-sentinel-ui-host';
    document.documentElement.appendChild(host);
  }

  const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });

  const overlay = document.createElement('div');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483647',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: '16px',
    fontFamily: 'system-ui, sans-serif',
  });

  const card = document.createElement('div');
  Object.assign(card.style, {
    maxWidth: '32rem',
    background: '#fff',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
  });

  const title = document.createElement('h2');
  title.textContent = employeeNoticeTitle(locale);
  title.style.margin = '0 0 8px';

  const body = document.createElement('p');
  body.textContent = employeeNoticeBody(locale);
  body.style.cssText = 'margin:0 0 16px;font-size:14px;line-height:1.5;color:#4b5563';

  const btn = document.createElement('button');
  btn.textContent = employeeNoticeAck(locale);
  Object.assign(btn.style, {
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    background: '#111827',
    color: '#fff',
    cursor: 'pointer',
  });

  btn.addEventListener('click', async () => {
    await api.storage.local.set({
      [STORAGE_KEYS.noticeAckAt]: new Date().toISOString(),
    });
    overlay.remove();
  });

  card.append(title, body, btn);
  overlay.append(card);
  shadow.append(overlay);
}
