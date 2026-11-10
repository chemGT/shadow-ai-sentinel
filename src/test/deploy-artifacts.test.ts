import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MANAGED_KEYS, parseManagedConfig } from '../core/managed-policy.js';

/**
 * Les gabarits de `deploy/` sont copiés tels quels par des admins : un exemple invalide se
 * traduit par une policy ignorée en silence sur tout un parc. Ces tests les valident avec le
 * même code que l'extension, et exercent le script Linux dans une racine temporaire.
 */
const root = process.cwd();
const readJson = (path: string): unknown => JSON.parse(readFileSync(join(root, path), 'utf8'));

describe('deploy/policy — configurations gérées d’exemple', () => {
  const dir = join(root, 'deploy', 'policy');
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));

  it('au moins deux exemples fournis', () => {
    expect(files.length).toBeGreaterThanOrEqual(2);
  });

  it.each(files)('%s : acceptée sans erreur par parseManagedConfig', (file) => {
    const raw = readJson(join('deploy', 'policy', file)) as Record<string, unknown>;
    expect(Object.keys(raw).every((k) => (MANAGED_KEYS as readonly string[]).includes(k))).toBe(true);
    expect(parseManagedConfig(raw).errors).toEqual([]);
  });

  it('l’exemple recommandé est strict : closed + verrou + toutes les règles', () => {
    const config = parseManagedConfig(readJson('deploy/policy/managed-policy.recommended.json'));
    expect(config.fail_mode).toBe('closed');
    expect(config.lockSettings).toBe(true);
    expect(config.rules).toHaveLength(7);
  });
});

describe('deploy/firefox/policies.json', () => {
  it('cible l’identifiant gecko du manifeste et une configuration gérée valide', () => {
    const geckoId = (
      readJson('manifest.firefox.json') as {
        browser_specific_settings: { gecko: { id: string } };
      }
    ).browser_specific_settings.gecko.id;
    const policies = (
      readJson('deploy/firefox/policies.json') as {
        policies: {
          ExtensionSettings: Record<string, { installation_mode: string }>;
          '3rdparty': { Extensions: Record<string, unknown> };
        };
      }
    ).policies;
    expect(policies.ExtensionSettings[geckoId]?.installation_mode).toBe('force_installed');
    expect(parseManagedConfig(policies['3rdparty'].Extensions[geckoId]).errors).toEqual([]);
  });
});

describe.skipIf(process.platform === 'win32')('deploy/linux — script de policy', () => {
  const script = join(root, 'deploy', 'linux', 'shadow-ai-sentinel-policy.sh');
  const id = 'abcdefghijklmnopabcdefghijklmnop';
  const run = (args: string[]) => spawnSync('sh', [script, ...args], { encoding: 'utf8' });
  const newRoot = (): string => mkdtempSync(join(tmpdir(), 'sentinel-deploy-'));
  const chromeFile = (r: string): string =>
    join(r, 'etc', 'opt', 'chrome', 'policies', 'managed', 'shadow-ai-sentinel.json');

  it('install écrit un JSON valide (force-install + configuration gérée), de façon idempotente', () => {
    const r = newRoot();
    const args = ['install', '--id', id, '--policy', 'deploy/policy/managed-policy.recommended.json', '--root', r];
    expect(run(args).status).toBe(0);
    const first = readFileSync(chromeFile(r), 'utf8');
    expect(run(args).status).toBe(0);
    expect(readFileSync(chromeFile(r), 'utf8')).toBe(first);

    const written = JSON.parse(first) as {
      ExtensionInstallForcelist: string[];
      '3rdparty': { extensions: Record<string, unknown> };
    };
    expect(written.ExtensionInstallForcelist).toEqual([
      `${id};https://clients2.google.com/service/update2/crx`,
    ]);
    expect(parseManagedConfig(written['3rdparty'].extensions[id]).errors).toEqual([]);
  });

  it('status : 0 après install, 1 après uninstall', () => {
    const r = newRoot();
    run(['install', '--id', id, '--root', r]);
    expect(run(['status', '--id', id, '--root', r]).status).toBe(0);
    expect(run(['uninstall', '--root', r]).status).toBe(0);
    const status = run(['status', '--id', id, '--root', r]);
    expect(status.status).toBe(1);
    expect(status.stdout).toContain('Fix:');
  });

  it('refuse un identifiant invalide et une clé de configuration inconnue', () => {
    const r = newRoot();
    expect(run(['install', '--id', 'BAD', '--root', r]).status).toBe(2);
    const bad = join(r, 'bad.json');
    writeFileSync(bad, '{"evil": 1}');
    const result = run(['install', '--id', id, '--policy', bad, '--root', r]);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('unknown setting');
  });

  it('n’écrase pas une ExtensionInstallForcelist déjà gérée dans un autre fichier', () => {
    const r = newRoot();
    const dir = join(r, 'etc', 'opt', 'edge', 'policies', 'managed');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'corp.json'), '{"ExtensionInstallForcelist":["x;y"]}');
    const result = run(['install', '--id', id, '--root', r, '--browser', 'edge']);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('corp.json');
  });
});
