import { describe, expect, it } from 'vitest';
import { createDefaultPolicy } from './defaults.js';
import {
  formatDiagnosticsReport,
  overallStatus,
  runDiagnostics,
  runEngineSelfTest,
  type DiagnosticsInput,
} from './diagnostics.js';
import { parseManagedConfig } from './managed-policy.js';

function healthy(overrides: Partial<DiagnosticsInput> = {}): DiagnosticsInput {
  return {
    version: '1.2.3',
    browser: 'chromium',
    storageWorks: true,
    localPolicyErrors: [],
    effectivePolicy: createDefaultPolicy(),
    managed: parseManagedConfig(undefined),
    managedReadable: true,
    localAllowlistCount: 0,
    missingHostPermissions: [],
    backgroundResponds: true,
    adapterHealth: 'healthy',
    ...overrides,
  };
}

const statusOf = (input: DiagnosticsInput, id: string) =>
  runDiagnostics(input).find((c) => c.id === id)?.status;

describe('diagnostic local (doctor)', () => {
  it('auto-test du moteur : chaque détecteur reconnaît son échantillon', () => {
    expect(runEngineSelfTest()).toEqual([]);
  });

  it('installation saine : tout est ok', () => {
    const checks = runDiagnostics(healthy());
    expect(overallStatus(checks)).toBe('ok');
    expect(checks.every((c) => c.fix === undefined)).toBe(true);
  });

  it.each([
    ['storage', { storageWorks: false }, 'fail'],
    ['local-policy', { localPolicyErrors: ['rules doit être un tableau'] }, 'fail'],
    ['managed-policy', { managed: parseManagedConfig({ fail_mode: 'strict' }) }, 'fail'],
    ['managed-policy', { managedReadable: false }, 'warn'],
    ['fail-mode', { effectivePolicy: { ...createDefaultPolicy(), fail_mode: 'open' as const } }, 'warn'],
    ['host-permissions', { missingHostPermissions: ['claude.ai'] }, 'fail'],
    ['background', { backgroundResponds: false }, 'warn'],
    ['adapter-health', { adapterHealth: 'broken' as const }, 'fail'],
  ] as const)('%s : problème détecté, avec une action corrective', (id, overrides, expected) => {
    const input = healthy(overrides as Partial<DiagnosticsInput>);
    const check = runDiagnostics(input).find((c) => c.id === id);
    expect(check?.status).toBe(expected);
    expect(check?.fix?.length ?? 0).toBeGreaterThan(0);
  });

  it('règle désactivée : avertissement ; pro_email sans domaine : normal', () => {
    expect(statusOf(healthy(), 'rules')).toBe('ok');
    const policy = createDefaultPolicy();
    policy.rules = policy.rules.map((r) => (r.type === 'iban' ? { ...r, enabled: false } : r));
    expect(statusOf(healthy({ effectivePolicy: policy }), 'rules')).toBe('warn');
  });

  it('policy gérée valide : listée comme appliquée', () => {
    const managed = parseManagedConfig({ fail_mode: 'closed', lock_settings: true });
    const check = runDiagnostics(healthy({ managed })).find((c) => c.id === 'managed-policy');
    expect(check?.status).toBe('ok');
    expect(check?.detail).toContain('verrou');
  });

  it('le rapport ne contient ni domaine ni valeur d’allowlist', () => {
    const managed = parseManagedConfig({
      emailDomains: ['secret-corp.example'],
      allowlist: ['AKIAIOSFODNN7EXAMPLE'],
    });
    const policy = { ...createDefaultPolicy(), emailDomains: ['secret-corp.example'] };
    const report = formatDiagnosticsReport(
      runDiagnostics(healthy({ managed, effectivePolicy: policy, localAllowlistCount: 3 })),
    );
    expect(report).not.toContain('secret-corp');
    expect(report).not.toContain('AKIA');
    // Domaines configurés mais règle pro_email inactive : signalé, sans nommer le domaine.
    expect(JSON.parse(report).overall).toBe('warn');
  });
});
