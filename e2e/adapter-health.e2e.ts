/**
 * E2E — Sprint R1 : health-check adaptateur + `fail_mode`. Fixture volontairement
 * dépourvue de tout composer reconnu (aucun `[contenteditable="true"]`) pour
 * forcer l'état `adapter_broken`, puis vérifie le comportement de la bannière et
 * de l'interception générique document-level selon `fail_mode`.
 */
import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { ackFirstRunNotice, launchWithExtension, seedPolicyFailMode } from './harness.js';

const BROKEN_HOST = 'claude.ai';

function brokenAdapterHtml(): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Claude (adaptateur cassé) — fixture Sentinel</title>
  <style>body { margin-top: 80px; }</style>
</head>
<body>
  <input type="text" id="genericInput" />
  <button type="submit" id="genericSend">Send</button>
  <script>
    window.__enterReached = 0;
    window.__genericSubmitted = 0;
    document.getElementById('genericInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') window.__enterReached += 1;
    });
    document.getElementById('genericSend').addEventListener('click', () => {
      window.__genericSubmitted += 1;
    });
  </script>
</body>
</html>`;
}

async function gotoBrokenAdapter(page: Page): Promise<void> {
  await page.goto(`https://${BROKEN_HOST}/`);
}

async function waitAdapterBrokenBanner(page: Page): Promise<boolean> {
  return page
    .waitForSelector('#shadow-ai-sentinel-adapter-banner', { timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
}

test.describe.configure({ mode: 'serial' });

test.describe('adapter health-check + fail_mode (Sprint R1)', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async () => {
    context = await launchWithExtension();
    await ackFirstRunNotice(context);
    await context.route(`https://${BROKEN_HOST}/**`, (route) =>
      route.fulfill({ contentType: 'text/html', body: brokenAdapterHtml() }),
    );
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('fail_mode warn — bannière affichée, envoi générique toujours autorisé', async () => {
    test.setTimeout(45_000);
    await seedPolicyFailMode(context, 'warn');
    await gotoBrokenAdapter(page);

    expect(await waitAdapterBrokenBanner(page), 'bannière adaptateur cassé attendue').toBe(true);

    await page.locator('#genericInput').press('Enter');
    await page.locator('#genericSend').click();

    expect(await page.evaluate(() => (window as any).__enterReached)).toBe(1);
    expect(await page.evaluate(() => (window as any).__genericSubmitted)).toBe(1);
  });

  test('fail_mode closed — bannière affichée, envoi générique bloqué', async () => {
    test.setTimeout(45_000);
    await seedPolicyFailMode(context, 'closed');
    await gotoBrokenAdapter(page);

    expect(await waitAdapterBrokenBanner(page), 'bannière adaptateur cassé attendue').toBe(true);

    await page.locator('#genericInput').press('Enter');
    await page.locator('#genericSend').click({ force: true });

    expect(await page.evaluate(() => (window as any).__enterReached)).toBe(0);
    expect(await page.evaluate(() => (window as any).__genericSubmitted)).toBe(0);
  });
});
