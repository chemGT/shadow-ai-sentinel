/**
 * E2E — page d'options : diagnostic local (« doctor ») dans le vrai navigateur, et collage d'un
 * fichier sensible (F1 : l'annulation doit être synchrone, sinon le site reçoit le fichier).
 */
import { test, expect, type BrowserContext } from '@playwright/test';
import { SITE_FIXTURES } from './fixtures.js';
import { ackFirstRunNotice, extensionId, gotoFixture, launchWithExtension } from './harness.js';

test.describe.configure({ mode: 'serial' });

test.describe('diagnostic + collage de fichier', () => {
  let context: BrowserContext;

  test.beforeAll(async () => {
    context = await launchWithExtension();
    await ackFirstRunNotice(context);
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('options — le diagnostic s’exécute et tout est OK sur une installation saine', async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${await extensionId(context)}/src/extension/options/index.html`);

    const items = page.locator('#diagList li');
    await expect(items.first()).toBeVisible({ timeout: 10_000 });

    for (const id of ['engine-self-test', 'storage', 'local-policy', 'managed-policy', 'host-permissions', 'background']) {
      await expect(page.locator(`#diagList li[data-check="${id}"]`), id).toHaveClass(/ok/);
    }
    await expect(page.locator('#diagList li.fail')).toHaveCount(0);
    await expect(page.locator('#managedErrors')).toBeHidden();
    await page.close();
  });

  test('collage d’un fichier contenant une clé : le site ne reçoit pas l’événement', async () => {
    const fixture = SITE_FIXTURES[0];
    const page = await context.newPage();
    await gotoFixture(page, fixture.host);

    const result = await page.evaluate(() => {
      let reachedSite = 0;
      document.body.addEventListener('paste', () => {
        reachedSite += 1;
      });
      const transfer = new DataTransfer();
      transfer.items.add(
        new File(['aws_access_key_id = ' + 'AKIA' + 'IOSFODNN7EXAMPLE'], 'creds.txt', { type: 'text/plain' }),
      );
      const event = new ClipboardEvent('paste', {
        clipboardData: transfer,
        bubbles: true,
        cancelable: true,
      });
      document.body.dispatchEvent(event);
      return { reachedSite, defaultPrevented: event.defaultPrevented };
    });

    expect(result.defaultPrevented).toBe(true);
    expect(result.reachedSite).toBe(0);
    await expect(page.locator('#shadow-ai-sentinel-ui-host')).toBeAttached({ timeout: 5_000 });
    await page.close();
  });
});
