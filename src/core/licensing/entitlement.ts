import type { Policy, RuleType } from '../types.js';

/** Palier d'abonnement débloqué pour l'appareil. */
export type Tier = 'free' | 'pro';

/**
 * Droit d'usage stocké localement (`chrome.storage.local`).
 * Aucun secret serveur : la vérification licence est côté client (modèle prosumer).
 */
export interface Entitlement {
  tier: Tier;
  /** `true` si la dernière évaluation (ou la grâce offline) considère la licence valide. */
  valid: boolean;
  /** Dernière tentative de vérification (ISO 8601). */
  checkedAt: string;
  /** Dernière fois où la licence a été confirmée valide en ligne (sert à la grâce offline). */
  lastValidAt?: string;
  /** Message lisible sur le dernier résultat (UI). */
  message?: string;
}

/** Types de règles inclus dans l'offre gratuite (produit d'appel). */
export const FREE_RULE_TYPES: RuleType[] = ['api_key', 'generic_secret'];

/** Types de règles réservés au palier Pro. */
export const PRO_RULE_TYPES: RuleType[] = ['iban', 'internal_ip', 'pro_email', 'phone'];

/** Entitlement gratuit par défaut. */
export function createFreeEntitlement(now: Date = new Date()): Entitlement {
  return { tier: 'free', valid: false, checkedAt: now.toISOString() };
}

/** Vrai si l'appareil dispose des fonctionnalités Pro actives. */
export function isProEntitlement(entitlement: Entitlement | null | undefined): boolean {
  return entitlement?.tier === 'pro' && entitlement.valid === true;
}

/** Vrai si un type de règle est réservé au Pro. */
export function isProRuleType(ruleType: RuleType): boolean {
  return PRO_RULE_TYPES.includes(ruleType);
}

/** Le scan des pièces jointes (PDF/DOCX) est une fonctionnalité Pro. */
export function isFileScanAllowed(entitlement: Entitlement | null | undefined): boolean {
  return isProEntitlement(entitlement);
}

/**
 * Renvoie la policy effective selon l'entitlement.
 * En Free, les règles Pro sont forcées à `enabled: false` (sans muter l'entrée).
 */
export function applyEntitlementToPolicy(
  policy: Policy,
  entitlement: Entitlement | null | undefined,
): Policy {
  if (isProEntitlement(entitlement)) {
    return policy;
  }
  return {
    ...policy,
    rules: policy.rules.map((rule) =>
      isProRuleType(rule.type) ? { ...rule, enabled: false } : rule,
    ),
  };
}
