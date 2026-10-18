import { createRoot, type Root } from 'react-dom/client';
import { SentinelAlert } from '../../ui/components/SentinelAlert.js';
import {
  adapterHealthBannerCopy,
  blockModalCopy,
  feedbackCopy,
  resolveLocale,
  type BlockModalCopy,
} from '../../ui/i18n/messages.js';
import { resolveLlmHost } from '../../core/llm-hosts.js';
import type { FeedbackContextChoice, Locale, RuleType } from '../../core/types.js';
import { reportFalsePositive } from './reporting.js';

const HOST_ID = 'shadow-ai-sentinel-ui-host';

let reactRoot: Root | null = null;
let locale: Locale = 'fr';

function ensureHost(): { shadow: ShadowRoot; mount: HTMLElement } {
  let host = document.getElementById(HOST_ID);
  if (!host) {
    host = document.createElement('div');
    host.id = HOST_ID;
    document.documentElement.appendChild(host);
  }

  const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  let mount = shadow.querySelector<HTMLElement>('[data-sentinel-mount]');
  if (!mount) {
    mount = document.createElement('div');
    mount.setAttribute('data-sentinel-mount', 'true');
    shadow.appendChild(mount);
  }

  reactRoot ??= createRoot(mount);

  return { shadow, mount };
}

export function showBlockAlert(ruleType: RuleType, copyOverride?: BlockModalCopy): void {
  locale = resolveLocale();
  ensureHost();

  const close = () => {
    reactRoot?.render(null);
  };

  const copy = copyOverride ?? blockModalCopy(ruleType, locale);
  const fbCopy = feedbackCopy(locale);
  const llmHost = resolveLlmHost(globalThis.location?.hostname ?? '');

  reactRoot?.render(
    <SentinelAlert
      title={copy.title}
      headline={copy.headline}
      message={copy.body}
      hint={copy.hint}
      closeLabel={copy.closeLabel}
      onClose={close}
      feedback={
        llmHost
          ? {
              copy: fbCopy,
              onSubmit: (choice: FeedbackContextChoice) => {
                void reportFalsePositive(ruleType, choice, llmHost);
              },
            }
          : undefined
      }
    />,
  );
}

export function hideAlert(): void {
  reactRoot?.render(null);
}

const ADAPTER_BANNER_ID = 'shadow-ai-sentinel-adapter-banner';
let adapterBannerHost: HTMLDivElement | null = null;

/** Bannière discrète (pas de shadow DOM ni de React) — adaptateur cassé, R1. */
export function showAdapterBrokenBanner(): void {
  const copy = adapterHealthBannerCopy(resolveLocale());

  if (!adapterBannerHost) {
    adapterBannerHost = document.createElement('div');
    adapterBannerHost.id = ADAPTER_BANNER_ID;
    Object.assign(adapterBannerHost.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      zIndex: '2147483647',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      padding: '10px 16px',
      background: '#7c2d12',
      color: '#fff7ed',
      fontSize: '13px',
      fontFamily: 'system-ui, sans-serif',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    });

    const text = document.createElement('span');
    text.dataset.role = 'text';

    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.dataset.role = 'dismiss';
    Object.assign(dismiss.style, {
      background: 'transparent',
      border: '1px solid rgba(255,255,255,0.5)',
      color: 'inherit',
      borderRadius: '4px',
      padding: '2px 8px',
      cursor: 'pointer',
      fontSize: '12px',
    });
    dismiss.addEventListener('click', () => hideAdapterBrokenBanner());

    adapterBannerHost.append(text, dismiss);
    document.documentElement.appendChild(adapterBannerHost);
  }

  const text = adapterBannerHost.querySelector<HTMLSpanElement>('[data-role="text"]');
  const dismiss = adapterBannerHost.querySelector<HTMLButtonElement>('[data-role="dismiss"]');
  if (text) text.textContent = copy.title;
  if (dismiss) dismiss.textContent = copy.dismissLabel;
  adapterBannerHost.style.display = 'flex';
}

export function hideAdapterBrokenBanner(): void {
  adapterBannerHost?.remove();
  adapterBannerHost = null;
}
