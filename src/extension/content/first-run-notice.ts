import { STORAGE_KEYS } from '../../core/constants.js';
import { getExtensionApi } from '../platform/browser-api.js';
import {
  employeeNoticeAck,
  employeeNoticeSections,
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
  overlay.setAttribute('aria-labelledby', 'sentinel-notice-title');
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
    maxHeight: '85vh',
    overflowY: 'auto',
    background: '#fff',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
  });

  const title = document.createElement('h2');
  title.id = 'sentinel-notice-title';
  title.textContent = employeeNoticeTitle(locale);
  title.style.margin = '0 0 16px';
  title.style.fontSize = '1.125rem';
  card.append(title);

  for (const section of employeeNoticeSections(locale)) {
    const heading = document.createElement('h3');
    heading.textContent = section.heading;
    Object.assign(heading.style, {
      margin: '16px 0 8px',
      fontSize: '0.875rem',
      fontWeight: '600',
      color: '#111827',
    });
    card.append(heading);

    for (const paragraph of section.paragraphs ?? []) {
      const p = document.createElement('p');
      p.textContent = paragraph;
      Object.assign(p.style, {
        margin: '0 0 8px',
        fontSize: '14px',
        lineHeight: '1.5',
        color: '#4b5563',
      });
      card.append(p);
    }

    if (section.bullets?.length) {
      const ul = document.createElement('ul');
      Object.assign(ul.style, {
        margin: '0 0 8px',
        paddingLeft: '20px',
        fontSize: '14px',
        lineHeight: '1.5',
        color: '#4b5563',
      });
      for (const item of section.bullets) {
        const li = document.createElement('li');
        li.textContent = item;
        li.style.marginBottom = '4px';
        ul.append(li);
      }
      card.append(ul);
    }
  }

  const btn = document.createElement('button');
  btn.textContent = employeeNoticeAck(locale);
  Object.assign(btn.style, {
    marginTop: '16px',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    background: '#111827',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
  });

  btn.addEventListener('click', async () => {
    await api.storage.local.set({
      [STORAGE_KEYS.noticeAckAt]: new Date().toISOString(),
    });
    overlay.remove();
  });

  card.append(btn);
  overlay.append(card);
  shadow.append(overlay);
}
