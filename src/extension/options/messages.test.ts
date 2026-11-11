/**
 * @vitest-environment happy-dom
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createDefaultPolicy } from '../../core/defaults.js';
import { runDiagnostics, type DiagnosticsInput } from '../../core/diagnostics.js';
import { parseManagedConfig } from '../../core/managed-policy.js';
import { applyStaticTranslations, OPTIONS_MESSAGES } from './messages.js';

const html = readFileSync(join(process.cwd(), 'src/extension/options/index.html'), 'utf8');

function loadPage(): void {
  document.documentElement.innerHTML = html.replace(/^[\s\S]*?<html[^>]*>/i, '').replace(/<\/html>\s*$/i, '');
}

describe('options — textes FR / EN', () => {
  it('chaque clé data-i18n de la page existe dans les deux langues', () => {
    const keys = [...html.matchAll(/data-i18n="([A-Za-z]+)"/g)].map((m) => m[1]);
    expect(keys.length).toBeGreaterThan(15);
    for (const key of keys) {
      expect(OPTIONS_MESSAGES.fr.static).toHaveProperty(key);
      expect(OPTIONS_MESSAGES.en.static).toHaveProperty(key);
    }
  });

  it('chaque texte statique de l’anglais diffère du français (rien d’oublié)', () => {
    for (const [key, fr] of Object.entries(OPTIONS_MESSAGES.fr.static)) {
      const en = OPTIONS_MESSAGES.en.static[key as keyof typeof OPTIONS_MESSAGES.en.static];
      // Mots identiques dans les deux langues.
      if (key === 'allowlistLegend' || key === 'colAction' || key === 'diagLegend') continue;
      expect(en, key).not.toBe(fr);
    }
  });

  it('l’anglais ne contient aucun caractère accentué français', () => {
    const dump = JSON.stringify(OPTIONS_MESSAGES.en, (_k, v) => (typeof v === 'function' ? '' : v));
    const fnDump = [
      OPTIONS_MESSAGES.en.allowlistLocked(1),
      OPTIONS_MESSAGES.en.allowlistExtra(1),
      OPTIONS_MESSAGES.en.managedErrors(['a']),
      OPTIONS_MESSAGES.en.invalidPolicy(['a']),
    ].join(' ');
    expect(dump + fnDump).not.toMatch(/[éèêàâùûôîç]/);
  });

  it('applyStaticTranslations(en) traduit la page, lang et placeholder compris', () => {
    loadPage();
    applyStaticTranslations(document, OPTIONS_MESSAGES.en);
    expect(document.documentElement.lang).toBe('en');
    expect(document.querySelector('[data-i18n="rulesLegend"]')?.textContent).toBe('Detection rules');
    expect(document.getElementById('saveAllowlist')?.textContent).toBe('Save allowlist');
    expect(document.getElementById('allowlist')?.getAttribute('placeholder')).toContain('example@company.com');
    expect(document.querySelector('.toast-dismiss')?.getAttribute('aria-label')).toBe('Dismiss notification');
    expect(document.body.textContent).not.toMatch(/Règle|Enregistrer|Avancé|Relancer/);
  });

  it('applyStaticTranslations(fr) laisse le français', () => {
    loadPage();
    applyStaticTranslations(document, OPTIONS_MESSAGES.fr);
    expect(document.documentElement.lang).toBe('fr');
    expect(document.querySelector('[data-i18n="rulesLegend"]')?.textContent).toBe('Règles de détection');
  });
});

describe('diagnostic — langue', () => {
  const base: DiagnosticsInput = {
    version: '1.0.0',
    browser: 'chromium',
    storageWorks: false,
    localPolicyErrors: ['x'],
    effectivePolicy: { ...createDefaultPolicy(), fail_mode: 'open' },
    managed: parseManagedConfig(undefined),
    managedReadable: true,
    localAllowlistCount: 2,
    missingHostPermissions: ['claude.ai'],
    backgroundResponds: false,
    adapterHealth: 'broken',
  };

  it('locale en : libellés, détails et corrections en anglais', () => {
    const checks = runDiagnostics({ ...base, locale: 'en' });
    const text = checks.map((c) => `${c.label} ${c.detail} ${c.fix ?? ''}`).join(' ');
    expect(text).not.toMatch(/[éèêàâùûôîç]/);
    expect(checks.find((c) => c.id === 'host-permissions')?.label).toBe('Access to protected sites');
  });

  it('sans locale : français inchangé', () => {
    const checks = runDiagnostics(base);
    expect(checks.find((c) => c.id === 'host-permissions')?.label).toBe('Accès aux sites protégés');
  });

  it('mêmes identifiants et statuts dans les deux langues', () => {
    const shape = (locale: 'fr' | 'en') =>
      runDiagnostics({ ...base, locale }).map((c) => [c.id, c.status, c.fix !== undefined]);
    expect(shape('en')).toEqual(shape('fr'));
  });
});
