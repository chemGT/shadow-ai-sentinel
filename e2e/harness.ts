import { chromium, type BrowserContext, type Page } from '@playwright/test';
import path from 'node:path';
import { SITE_FIXTURES } from './fixtures.js';

// `npm run test:e2e` s'exécute à la racine du repo.
const DIST_DIR = path.resolve(process.cwd(), 'dist');

/**
 * Lance un contexte Chromium persistant avec l'extension buildée (`dist/`).
 * Prérequis : `npm run build` (le config Playwright le fait via webServer-less hook).
 */
export async function launchWithExtension(): Promise<BrowserContext> {
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    args: [
      `--disable-extensions-except=${DIST_DIR}`,
      `--load-extension=${DIST_DIR}`,
    ],
  });

  // Sert les fixtures aux URLs réelles : le content script s'injecte car
  // l'URL matche `content_scripts.matches` du manifest.
  for (const fixture of SITE_FIXTURES) {
    await context.route(`https://${fixture.host}/**`, (route) =>
      route.fulfill({ contentType: 'text/html', body: fixture.html }),
    );
    await context.route(`https://www.${fixture.host}/**`, (route) =>
      route.fulfill({ contentType: 'text/html', body: fixture.html }),
    );
  }

  return context;
}

/**
 * Service worker de l'extension, prêt à l'emploi. Playwright peut exposer le worker avant que
 * Chromium y ait injecté les bindings `chrome.*` : un `evaluate` immédiat échoue alors sur
 * `chrome.storage` indéfini (flaky ~1 lancement sur 2). On attend donc que l'API soit présente.
 */
async function extensionServiceWorker(context: BrowserContext) {
  const existing = context.serviceWorkers();
  const sw =
    existing.length > 0
      ? existing[0]
      : await context.waitForEvent('serviceworker', { timeout: 15_000 });

  const deadline = Date.now() + 10_000;
  while (!(await sw.evaluate(() => typeof chrome !== 'undefined' && !!chrome.storage?.local))) {
    if (Date.now() > deadline) {
      throw new Error('Service worker sans API chrome.storage après 10 s');
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return sw;
}

/**
 * Acquitte la notice employé premier lancement (overlay plein écran RGPD),
 * sinon elle recouvre tous les composers et fausse les clics.
 */
export async function ackFirstRunNotice(context: BrowserContext): Promise<void> {
  const sw = await extensionServiceWorker(context);
  await sw.evaluate(async () => {
    await chrome.storage.local.set({ sentinel_notice_ack_at: new Date().toISOString() });
  });
}

/**
 * Force un `fail_mode` de policy via le message `POLICY_UPDATED` (et non une
 * écriture directe dans le storage) : `background/index.ts` sert `GET_POLICY`
 * depuis le cache mémoire `cachedPolicy`, qui n'est mis à jour que par ce
 * message — une écriture storage seule ne serait pas vue par les content
 * scripts. Envoyé depuis une page d'extension (popup) plutôt que depuis le
 * service worker lui-même : l'auto-envoi d'un message par un service worker
 * MV3 vers son propre listener n'est pas fiable côté Chrome (« Could not
 * establish connection »).
 */
export async function seedPolicyFailMode(
  context: BrowserContext,
  failMode: 'open' | 'warn' | 'closed',
): Promise<void> {
  const sw = await extensionServiceWorker(context);
  const extensionId = new URL(sw.url()).hostname;
  const senderPage = await context.newPage();
  await senderPage.goto(`chrome-extension://${extensionId}/src/extension/popup/index.html`);
  await senderPage.evaluate(async (mode) => {
    const policy = {
      version: '1.0.0',
      tenantId: '',
      emailDomains: [],
      rules: [
        { type: 'api_key', action: 'block', enabled: true },
        { type: 'generic_secret', action: 'block', enabled: true },
        { type: 'iban', action: 'redact', enabled: true },
        { type: 'internal_ip', action: 'redact', enabled: true },
        { type: 'pro_email', action: 'redact', enabled: false },
        { type: 'phone', action: 'redact', enabled: true },
      ],
      updatedAt: new Date().toISOString(),
      fail_mode: mode,
    };
    await chrome.runtime.sendMessage({ type: 'POLICY_UPDATED', payload: policy });
  }, failMode);
  await senderPage.close();
}

/**
 * Navigue vers la fixture d'un hôte et attend que l'adaptateur du content
 * script soit actif (log console « Adaptateur <label> actif », avec fallback
 * temporisé si le message console du monde isolé n'est pas capté).
 */
export async function gotoFixture(page: Page, host: string): Promise<void> {
  const adapterReady = page
    .waitForEvent('console', {
      predicate: (message) => message.text().includes('Adaptateur'),
      timeout: 8_000,
    })
    .catch(() => null);

  await page.goto(`https://${host}/`);
  const ready = await adapterReady;
  if (!ready) {
    // Content script à document_idle : petite marge si le log n'est pas remonté.
    await page.waitForTimeout(2_000);
  }
}

/** Écrit du texte dans le composer (valeur directe : le guard lit value/innerText à l'envoi). */
export async function setComposerText(
  page: Page,
  selector: string,
  kind: 'textarea' | 'contenteditable',
  text: string,
): Promise<void> {
  await page.evaluate(
    ({ selector, kind, text }) => {
      const el = document.querySelector(selector);
      if (!el) throw new Error(`fixture: introuvable ${selector}`);
      if (kind === 'textarea') {
        (el as HTMLTextAreaElement).value = text;
      } else {
        (el as HTMLElement).innerText = text;
      }
    },
    { selector, kind, text },
  );
}

/** Vrai si la modale de blocage Sentinel est rendue (shadow root du ui-host). */
export async function blockModalVisible(page: Page): Promise<boolean> {
  return page
    .waitForFunction(
      () => {
        const host = document.getElementById('shadow-ai-sentinel-ui-host');
        const mount = host?.shadowRoot?.querySelector('[data-sentinel-mount]');
        return (mount?.childElementCount ?? 0) > 0;
      },
      undefined,
      { timeout: 5_000 },
    )
    .then(() => true)
    .catch(() => false);
}

/** Vrai si le toast de caviardage est affiché avec du texte. */
export async function redactToastVisible(page: Page): Promise<boolean> {
  return page
    .waitForFunction(
      () => {
        const toast = document.getElementById('shadow-ai-sentinel-toast');
        return !!toast && toast.style.display !== 'none' && (toast.textContent ?? '').length > 0;
      },
      undefined,
      { timeout: 5_000 },
    )
    .then(() => true)
    .catch(() => false);
}

export const SECRET_API_KEY = 'voici ma clé sk-ant-api03-e2e-fixture-0123456789 pour le script';
export const SECRET_AWS_KEY = 'AKIAABCDEFGHIJKLMNOP';
export const IBAN_FR = 'mon RIB est FR7630006000011234567890189 merci';
export const CLEAN_TEXT = 'bonjour, peux-tu résumer ce paragraphe anodin ?';
