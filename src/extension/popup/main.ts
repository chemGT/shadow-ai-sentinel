import { getAdapterHealth, getLocalStats } from '../platform/storage.js';
import { getExtensionApi } from '../platform/browser-api.js';
import { resolveLocale } from '../../ui/i18n/messages.js';
import { PROJECT_REPO_URL } from '../../core/constants.js';

const locale = resolveLocale();

const copy =
  locale === 'fr'
    ? {
        statusActive: 'Protection active',
        blocked: 'bloqués',
        redacted: 'caviardés',
        options: 'Réglages avancés',
        source: 'Code source',
        adapterBroken: 'Protection inactive sur ce site — sélecteurs obsolètes.',
      }
    : {
        statusActive: 'Protection active',
        blocked: 'blocked',
        redacted: 'redacted',
        options: 'Advanced settings',
        source: 'Source code',
        adapterBroken: 'Protection inactive on this site — outdated selectors.',
      };

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} introuvable`);
  return el;
}

function setText(id: string, text: string): void {
  $(id).textContent = text;
}

async function loadStats(): Promise<void> {
  const stats = await getLocalStats();
  setText('blockedCount', String(stats.blocked));
  setText('redactedLabel', String(stats.redacted));
}

async function loadAdapterHealth(): Promise<void> {
  const health = await getAdapterHealth();
  setText('adapterHealthWarningText', copy.adapterBroken);
  $('adapterHealthWarning').classList.toggle('hidden', health !== 'broken');
}

function applyStaticCopy(): void {
  setText('statusText', copy.statusActive);
  setText('blockedLabel', copy.blocked);
  setText('redactedText', copy.redacted);
  setText('optionsBtn', copy.options);
  setText('sourceLink', copy.source);
  ($('sourceLink') as HTMLAnchorElement).href = PROJECT_REPO_URL;
}

function wireEvents(): void {
  $('optionsBtn').addEventListener('click', () => {
    getExtensionApi().runtime.openOptionsPage();
  });
}

applyStaticCopy();
wireEvents();
void loadStats();
void loadAdapterHealth();
