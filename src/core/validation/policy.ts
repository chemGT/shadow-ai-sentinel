import { ALL_RULE_TYPES } from '../constants.js';
import type { Policy, Rule, RuleAction, RuleType } from '../types.js';

export type PolicyValidationResult =
  | { ok: true; policy: Policy }
  | { ok: false; errors: string[] };

const RULE_ACTIONS: RuleAction[] = ['block', 'redact'];

function isRuleType(value: unknown): value is RuleType {
  return typeof value === 'string' && ALL_RULE_TYPES.includes(value as RuleType);
}

function isRuleAction(value: unknown): value is RuleAction {
  return typeof value === 'string' && RULE_ACTIONS.includes(value as RuleAction);
}

function normalizeEmailDomains(domains: string[]): string[] {
  return domains
    .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
    .filter((d) => d.length > 0);
}

function parseRule(raw: unknown, index: number): Rule | string {
  if (typeof raw !== 'object' || raw === null) {
    return `rules[${index}] doit être un objet`;
  }
  const candidate = raw as Record<string, unknown>;
  if (!isRuleType(candidate.type)) {
    return `rules[${index}].type invalide`;
  }
  if (!isRuleAction(candidate.action)) {
    return `rules[${index}].action invalide`;
  }
  if (typeof candidate.enabled !== 'boolean') {
    return `rules[${index}].enabled doit être un booléen`;
  }
  return {
    type: candidate.type,
    action: candidate.action,
    enabled: candidate.enabled,
  };
}

/** Valide et normalise une policy (import JSON ou réponse API). */
export function validatePolicy(input: unknown): PolicyValidationResult {
  const errors: string[] = [];

  if (typeof input !== 'object' || input === null) {
    return { ok: false, errors: ['Policy doit être un objet JSON'] };
  }

  const raw = input as Record<string, unknown>;

  if (typeof raw.version !== 'string' || raw.version.length === 0) {
    errors.push('version requis (string non vide)');
  }
  if (typeof raw.tenantId !== 'string') {
    errors.push('tenantId requis (string)');
  }
  if (typeof raw.updatedAt !== 'string') {
    errors.push('updatedAt requis (ISO 8601)');
  }
  if (!Array.isArray(raw.emailDomains)) {
    errors.push('emailDomains doit être un tableau de strings');
  }
  if (!Array.isArray(raw.rules)) {
    errors.push('rules doit être un tableau');
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const rules: Rule[] = [];
  for (let i = 0; i < (raw.rules as unknown[]).length; i += 1) {
    const parsed = parseRule((raw.rules as unknown[])[i], i);
    if (typeof parsed === 'string') {
      errors.push(parsed);
    } else {
      rules.push(parsed);
    }
  }

  if (raw.departmentId !== undefined && typeof raw.departmentId !== 'string') {
    errors.push('departmentId doit être une string si présent');
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const emailDomains = normalizeEmailDomains(raw.emailDomains as string[]);

  const proEmailRule = rules.find((r) => r.type === 'pro_email' && r.enabled);
  if (proEmailRule && emailDomains.length === 0) {
    errors.push('pro_email activé sans emailDomains — fournir la liste à l’intégration');
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    policy: {
      version: raw.version as string,
      tenantId: raw.tenantId as string,
      emailDomains,
      rules,
      updatedAt: raw.updatedAt as string,
      ...(raw.departmentId !== undefined
        ? { departmentId: raw.departmentId as string }
        : {}),
    },
  };
}
