import { DEFAULT_RULES, POLICY_VERSION_INITIAL } from './constants.js';
import type { Policy } from './types.js';

export function createDefaultPolicy(tenantId = ''): Policy {
  return {
    version: POLICY_VERSION_INITIAL,
    tenantId,
    emailDomains: [],
    rules: DEFAULT_RULES.map((rule) => ({ ...rule })),
    updatedAt: new Date().toISOString(),
  };
}
