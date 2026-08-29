/**
 * E2E — extension réelle (dist/) chargée dans Chromium, fixtures servies aux
 * URLs de prod (voir fixtures.ts). Automatise la matrice M14–M24 hors dérive
 * DOM des vrais sites (qui reste une recette manuelle ponctuelle).
 *
 * Couverture par site (×8) : block sur Enter · block sur clic envoi · passage
 * d'un texte anodin. Plus : redact Pro (IBAN) et file-guard Pro (.txt avec clé).
 */
import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { SITE_FIXTURES } from './fixtures.js';
import {
  ackFirstRunNotice,
  blockModalVisible,
  CLEAN_TEXT,
  gotoFixture,
  IBAN_FR,
  launchWithExtension,
  redactToastVisible,
  SECRET_API_KEY,
  SECRET_AWS_KEY,
  seedProEntitlement,
  setComposerText,
} from './harness.js';

test.describe.configure({ mode: 'serial' });

test.describe('guard Free — 8 sites', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async () => {
    context = await launchWithExtension();
    await ackFirstRunNotice(context);
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context?.close();
  });

  for (const site of SITE_FIXTURES) {
    test(`${site.label} — block sur Enter`, async () => {
      await gotoFixture(page, site.host);
      await setComposerText(page, site.inputSelector, site.inputKind, SECRET_API_KEY);
      await page.locator(site.inputSelector).press('Enter');

      expect(await blockModalVisible(page), 'modale de blocage attendue').toBe(true);
      expect(await page.evaluate(() => (window as any).__enterReached)).toBe(0);
    });

    test(`${site.label} — block sur clic envoi`, async () => {
      await gotoFixture(page, site.host);
      await setComposerText(page, site.inputSelector, site.inputKind, SECRET_API_KEY);
      // dispatchEvent : le stopImmediatePropagation du guard casse la
      // vérification hit-target du click() Playwright (le blocage, lui, est correct).
      await page.locator(site.sendSelector).dispatchEvent('click');

      expect(await blockModalVisible(page), 'modale de blocage attendue').toBe(true);
      expect(await page.evaluate(() => (window as any).__sent)).toBe(0);
    });

    test(`${site.label} — texte anodin passe`, async () => {
      await gotoFixture(page, site.host);
      await setComposerText(page, site.inputSelector, site.inputKind, CLEAN_TEXT);
      await page.locator(site.sendSelector).click();

      expect(await page.evaluate(() => (window as any).__sent)).toBe(1);
    });
  }
});

test.describe('guard Pro — redact + fichiers', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async () => {
    context = await launchWithExtension();
    await ackFirstRunNotice(context);
    await seedProEntitlement(context);
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('Copilot — IBAN caviardé sur Enter (Pro)', async () => {
    await gotoFixture(page, 'copilot.microsoft.com');
    await seedProEntitlement(context, page);
    await setComposerText(page, 'textarea#userInput', 'textarea', IBAN_FR);
    await page.locator('textarea#userInput').press('Enter');

    expect(await redactToastVisible(page), 'toast de caviardage attendu').toBe(true);
    const value = await page.locator('textarea#userInput').inputValue();
    expect(value).toContain('[REDACTED_IBAN]');
    expect(value).not.toContain('FR7630006000011234567890189');
    expect(await page.evaluate(() => (window as any).__enterReached)).toBe(0);
  });

  test('Grok — IBAN caviardé sur clic envoi (Pro)', async () => {
    await gotoFixture(page, 'grok.com');
    await seedProEntitlement(context, page);
    await setComposerText(page, 'textarea[aria-label*="Grok"]', 'textarea', IBAN_FR);
    await page.locator('form button[type="submit"]').dispatchEvent('click');

    expect(await redactToastVisible(page), 'toast de caviardage attendu').toBe(true);
    const value = await page.locator('textarea[aria-label*="Grok"]').inputValue();
    expect(value).toContain('[REDACTED_IBAN]');
    expect(await page.evaluate(() => (window as any).__sent)).toBe(0);
  });

  test('Copilot — fichier .txt avec clé AWS bloqué (Pro)', async () => {
    await gotoFixture(page, 'copilot.microsoft.com');
    await seedProEntitlement(context, page);
    await page.locator('input[data-fixture-file]').setInputFiles({
      name: 'secrets.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(`config de prod\naws_access_key_id=${SECRET_AWS_KEY}\n`),
    });

    expect(await blockModalVisible(page), 'modale de blocage fichier attendue').toBe(true);
    const fileCount = await page
      .locator('input[data-fixture-file]')
      .evaluate((el) => (el as HTMLInputElement).files?.length ?? 0);
    expect(fileCount, 'le fichier ne doit pas rester attaché').toBe(0);
  });

  test('DeepSeek — fichier .txt sain non bloqué (Pro)', async () => {
    await gotoFixture(page, 'chat.deepseek.com');
    await seedProEntitlement(context, page);
    await page.locator('input[data-fixture-file]').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('des notes de réunion parfaitement anodines\n'),
    });

    // Laisse le pipeline async du file-guard se terminer puis vérifie le ré-attachement.
    await expect
      .poll(
        () =>
          page
            .locator('input[data-fixture-file]')
            .evaluate((el) => (el as HTMLInputElement).files?.length ?? 0),
        { timeout: 5_000 },
      )
      .toBe(1);
  });
});
