import { createRoot, type Root } from 'react-dom/client';
import { SentinelAlert } from '../../ui/components/SentinelAlert.js';
import { blockModalCopy, resolveLocale, type BlockModalCopy } from '../../ui/i18n/messages.js';
import type { Locale, RuleType } from '../../core/types.js';

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

  reactRoot?.render(
    <SentinelAlert
      title={copy.title}
      headline={copy.headline}
      message={copy.body}
      hint={copy.hint}
      closeLabel={copy.closeLabel}
      onClose={close}
    />,
  );
}

export function hideAlert(): void {
  reactRoot?.render(null);
}
