/**
 * Policy gérée par l'organisation (`chrome.storage.managed` / `browser.storage.managed`),
 * poussée par GPO, profil MDM, JSON de policies Chromium ou `policies.json` Firefox (`3rdparty`).
 * Aucune requête réseau : le navigateur a déjà livré ces valeurs localement.
 *
 * Précédence : la valeur gérée l'emporte sur la valeur locale, **champ par champ**. Un champ
 * absent (ou invalide) côté géré retombe sur la valeur locale, jamais sur un effacement
 * implicite. `rules` est résolu **par type de règle** : une règle gérée remplace la règle locale
 * du même type, les autres types restent locaux. L'allowlist gérée s'**ajoute** à l'allowlist
 * locale (union).
 *
 * `lock_settings: true` verrouille le poste : les réglages locaux de l'utilisateur sont ignorés.
 * Les règles non listées par l'admin prennent leur valeur PAR DÉFAUT (et non celle choisie par
 * l'utilisateur), `fail_mode`/`emailDomains` non gérés prennent leur défaut, et l'allowlist
 * locale n'est plus appliquée. Sans ce verrou, un utilisateur peut désactiver toute règle que
 * l'admin n'a pas listée et allowlister n'importe quelle valeur.
 *
 * Chromium valide déjà contre `managed_schema.json` ; Firefox ne valide pas : on revalide ici.
 */
import { ALL_RULE_TYPES, DEFAULT_FAIL_MODE, DEFAULT_RULES } from './constants.js';
import type { FailMode, Policy, Rule, RuleType } from './types.js';
import { isFailMode, normalizeEmailDomains, parseRule } from './validation/policy.js';

/** Clés lues dans le stockage géré (cf. `public/managed_schema.json`). */
export const MANAGED_KEYS = [
  'emailDomains',
  'fail_mode',
  'rules',
  'allowlist',
  'lock_settings',
] as const;

export interface ManagedConfig {
  emailDomains?: string[];
  fail_mode?: FailMode;
  /** Une entrée par type (dernière occurrence retenue en cas de doublon). */
  rules?: Rule[];
  allowlist: string[];
  /** `true` : réglages locaux ignorés (règles par défaut + règles gérées, allowlist gérée seule). */
  lockSettings?: boolean;
  /**
   * Champs/entrées ignorés car invalides. Jamais bloquant, mais À MONTRER (page d'options,
   * diagnostic) : une policy admin mal formée qui retombe en silence sur le réglage local est
   * une protection que l'admin croit active et qui ne l'est pas.
   */
  errors: string[];
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

/** Normalise le contenu brut de `storage.managed.get(null)`. */
export function parseManagedConfig(raw: unknown): ManagedConfig {
  if (typeof raw !== 'object' || raw === null) {
    return { allowlist: [], errors: [] };
  }
  const input = raw as Record<string, unknown>;
  const config: ManagedConfig = { allowlist: [], errors: [] };

  if (input.emailDomains !== undefined && input.emailDomains !== null) {
    if (isStringArray(input.emailDomains)) {
      config.emailDomains = normalizeEmailDomains(input.emailDomains);
    } else {
      config.errors.push('emailDomains ignoré (tableau de strings attendu)');
    }
  }

  if (input.fail_mode !== undefined && input.fail_mode !== null) {
    if (isFailMode(input.fail_mode)) {
      config.fail_mode = input.fail_mode;
    } else {
      config.errors.push('fail_mode ignoré (valeur invalide)');
    }
  }

  if (input.rules !== undefined && input.rules !== null) {
    if (Array.isArray(input.rules)) {
      const byType = new Map<RuleType, Rule>();
      input.rules.forEach((entry, index) => {
        const parsed = parseRule(entry, index);
        if (typeof parsed === 'string') {
          config.errors.push(`${parsed} — entrée ignorée`);
        } else {
          byType.set(parsed.type, parsed);
        }
      });
      if (byType.size > 0) {
        config.rules = [...byType.values()];
      }
    } else {
      config.errors.push('rules ignoré (tableau attendu)');
    }
  }

  if (input.allowlist !== undefined && input.allowlist !== null) {
    if (isStringArray(input.allowlist)) {
      config.allowlist = input.allowlist.map((v) => v.trim()).filter((v) => v.length > 0);
    } else {
      config.errors.push('allowlist ignoré (tableau de strings attendu)');
    }
  }

  if (input.lock_settings !== undefined && input.lock_settings !== null) {
    if (typeof input.lock_settings === 'boolean') {
      config.lockSettings = input.lock_settings;
    } else {
      config.errors.push('lock_settings ignoré (booléen attendu)');
    }
  }

  return config;
}

/** Au moins un réglage effectivement géré (hors erreurs). */
export function hasManagedSettings(config: ManagedConfig): boolean {
  return (
    config.emailDomains !== undefined ||
    config.fail_mode !== undefined ||
    config.rules !== undefined ||
    config.allowlist.length > 0 ||
    config.lockSettings === true
  );
}

/** Types de règle non modifiables par l'utilisateur (tous si `lock_settings`). */
export function managedRuleTypes(config: ManagedConfig): Set<RuleType> {
  if (config.lockSettings === true) {
    return new Set(ALL_RULE_TYPES);
  }
  return new Set((config.rules ?? []).map((r) => r.type));
}

/** Policy effective = policy locale surchargée champ par champ par la configuration gérée. */
export function applyManagedPolicy(local: Policy, config: ManagedConfig): Policy {
  if (!hasManagedSettings(config)) {
    return local;
  }
  const managedRules = new Map((config.rules ?? []).map((r) => [r.type, r]));
  if (config.lockSettings === true) {
    // Poste verrouillé : on part des défauts, pas des réglages de l'utilisateur. `pro_email`
    // n'a de sens qu'avec des domaines : sans `emailDomains` géré, il reste désactivé.
    const emailDomains = config.emailDomains ?? [];
    return {
      ...local,
      rules: DEFAULT_RULES.map((def) => {
        const rule = { ...(managedRules.get(def.type) ?? def) };
        return rule.type === 'pro_email' && emailDomains.length === 0
          ? { ...rule, enabled: false }
          : rule;
      }),
      emailDomains,
      fail_mode: config.fail_mode ?? DEFAULT_FAIL_MODE,
    };
  }
  const rules = local.rules.map((r) => managedRules.get(r.type) ?? r);
  for (const rule of managedRules.values()) {
    if (!local.rules.some((r) => r.type === rule.type)) {
      rules.push(rule);
    }
  }
  return {
    ...local,
    rules,
    ...(config.emailDomains !== undefined ? { emailDomains: config.emailDomains } : {}),
    ...(config.fail_mode !== undefined ? { fail_mode: config.fail_mode } : {}),
  };
}

/** Allowlist effective : union locale + gérée, sans doublon (gérée seule si `lock_settings`). */
export function mergeAllowlists(local: readonly string[], config: ManagedConfig): string[] {
  if (config.lockSettings === true) {
    return Array.from(new Set(config.allowlist));
  }
  return Array.from(new Set([...local, ...config.allowlist]));
}
