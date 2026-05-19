import type { RuleType } from '../types.js';

export interface RawMatch {
  ruleType: RuleType;
  start: number;
  end: number;
}

/** Priorité en cas de chevauchement (plus petit = plus prioritaire). */
export const RULE_PRIORITY: Record<RuleType, number> = {
  api_key: 0,
  generic_secret: 1,
  iban: 2,
  internal_ip: 3,
  pro_email: 4,
  phone: 5,
};
