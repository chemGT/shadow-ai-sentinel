import type { Policy, RuleType } from '../types.js';
import { findApiKeyMatches } from './api-key.js';
import { findCardMatches } from './card.js';
import { findGenericSecretMatches } from './generic-secret.js';
import { findIbanMatches } from './iban.js';
import { findInternalIpMatches } from './internal-ip.js';
import { findPhoneMatches } from './phone.js';
import { findProEmailMatches } from './pro-email.js';
import type { RawMatch } from './types.js';

function isRuleEnabled(policy: Policy, ruleType: RuleType): boolean {
  const rule = policy.rules.find((r) => r.type === ruleType);
  return rule?.enabled === true;
}

export function runAllDetectors(text: string, policy: Policy): RawMatch[] {
  const raw: RawMatch[] = [];

  let apiKeyMatches: RawMatch[] = [];

  if (isRuleEnabled(policy, 'api_key')) {
    apiKeyMatches = findApiKeyMatches(text);
    raw.push(...apiKeyMatches);
  }

  if (isRuleEnabled(policy, 'generic_secret')) {
    raw.push(...findGenericSecretMatches(text, apiKeyMatches));
  }

  if (isRuleEnabled(policy, 'iban')) {
    raw.push(...findIbanMatches(text));
  }

  if (isRuleEnabled(policy, 'internal_ip')) {
    raw.push(...findInternalIpMatches(text));
  }

  if (isRuleEnabled(policy, 'pro_email')) {
    raw.push(...findProEmailMatches(text, policy));
  }

  if (isRuleEnabled(policy, 'phone')) {
    raw.push(...findPhoneMatches(text));
  }

  if (isRuleEnabled(policy, 'card')) {
    raw.push(...findCardMatches(text));
  }

  return raw;
}
