import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALL_RULE_TYPES, FAIL_MODES } from './constants.js';
import { createDefaultPolicy } from './defaults.js';
import {
  applyManagedPolicy,
  hasManagedSettings,
  MANAGED_KEYS,
  managedRuleTypes,
  mergeAllowlists,
  parseManagedConfig,
} from './managed-policy.js';

describe('parseManagedConfig', () => {
  it('stockage géré vide ou absent → aucun réglage géré', () => {
    for (const raw of [undefined, null, {}, 'x']) {
      const config = parseManagedConfig(raw);
      expect(hasManagedSettings(config)).toBe(false);
      expect(config.errors).toEqual([]);
    }
  });

  it('normalise les domaines et valide fail_mode', () => {
    const config = parseManagedConfig({ emailDomains: [' @ACME.com ', ''], fail_mode: 'closed' });
    expect(config.emailDomains).toEqual(['acme.com']);
    expect(config.fail_mode).toBe('closed');
  });

  it('ignore un champ invalide sans invalider les autres (Firefox ne valide pas le schéma)', () => {
    const config = parseManagedConfig({
      emailDomains: 'acme.com',
      fail_mode: 'sometimes',
      allowlist: ['  test-key  ', ''],
    });
    expect(config.emailDomains).toBeUndefined();
    expect(config.fail_mode).toBeUndefined();
    expect(config.allowlist).toEqual(['test-key']);
    expect(config.errors).toHaveLength(2);
  });

  it('résout rules entrée par entrée : invalide ignorée, doublon → dernière occurrence', () => {
    const config = parseManagedConfig({
      rules: [
        { type: 'iban', action: 'redact', enabled: true },
        { type: 'nope', action: 'block', enabled: true },
        { type: 'iban', action: 'block', enabled: true },
      ],
    });
    expect(config.rules).toEqual([{ type: 'iban', action: 'block', enabled: true }]);
    expect(config.errors).toHaveLength(1);
  });

  it('null = pas de valeur gérée (repli local, pas d’effacement)', () => {
    const config = parseManagedConfig({ emailDomains: null, rules: null });
    expect(hasManagedSettings(config)).toBe(false);
    expect(config.errors).toEqual([]);
  });
});

describe('applyManagedPolicy', () => {
  it('sans réglage géré, la policy locale est renvoyée telle quelle', () => {
    const local = createDefaultPolicy();
    expect(applyManagedPolicy(local, parseManagedConfig({}))).toBe(local);
  });

  it('la valeur gérée l’emporte champ par champ, le reste reste local', () => {
    const local = {
      ...createDefaultPolicy(),
      emailDomains: ['local.example'],
      fail_mode: 'open' as const,
    };
    const effective = applyManagedPolicy(
      local,
      parseManagedConfig({ rules: [{ type: 'iban', action: 'block', enabled: true }] }),
    );
    expect(effective.rules.find((r) => r.type === 'iban')).toEqual({
      type: 'iban',
      action: 'block',
      enabled: true,
    });
    // Types non gérés et champs non gérés : inchangés.
    expect(effective.rules.find((r) => r.type === 'phone')).toEqual(
      local.rules.find((r) => r.type === 'phone'),
    );
    expect(effective.emailDomains).toEqual(['local.example']);
    expect(effective.fail_mode).toBe('open');
    expect(effective.rules).toHaveLength(local.rules.length);
  });

  it('ajoute une règle gérée absente de la policy locale', () => {
    const local = { ...createDefaultPolicy(), rules: [] };
    const effective = applyManagedPolicy(
      local,
      parseManagedConfig({ rules: [{ type: 'card', action: 'block', enabled: true }] }),
    );
    expect(effective.rules).toEqual([{ type: 'card', action: 'block', enabled: true }]);
  });

  it('surcharge emailDomains et fail_mode', () => {
    const effective = applyManagedPolicy(
      createDefaultPolicy(),
      parseManagedConfig({ emailDomains: ['corp.example'], fail_mode: 'closed' }),
    );
    expect(effective.emailDomains).toEqual(['corp.example']);
    expect(effective.fail_mode).toBe('closed');
  });

  it('managedRuleTypes liste les types verrouillés', () => {
    const config = parseManagedConfig({
      rules: [{ type: 'api_key', action: 'block', enabled: true }],
    });
    expect([...managedRuleTypes(config)]).toEqual(['api_key']);
  });
});

describe('mergeAllowlists', () => {
  it('union locale + gérée sans doublon', () => {
    const config = parseManagedConfig({ allowlist: ['a', 'b'] });
    expect(mergeAllowlists(['b', 'c'], config)).toEqual(['b', 'c', 'a']);
  });
});

interface SchemaProperty {
  enum?: string[];
  items?: { properties?: Record<string, { enum?: string[] }> };
}

describe('public/managed_schema.json', () => {
  const schema = JSON.parse(
    readFileSync(join(process.cwd(), 'public', 'managed_schema.json'), 'utf8'),
  ) as { properties: Record<string, SchemaProperty> };

  it('déclare exactement les clés lues par l’extension', () => {
    expect(Object.keys(schema.properties).sort()).toEqual([...MANAGED_KEYS].sort());
  });

  it('reste aligné sur les types de règle et fail modes du code', () => {
    expect(schema.properties.fail_mode?.enum?.sort()).toEqual([...FAIL_MODES].sort());
    expect(schema.properties.rules?.items?.properties?.type?.enum?.sort()).toEqual(
      [...ALL_RULE_TYPES].sort(),
    );
  });
});
