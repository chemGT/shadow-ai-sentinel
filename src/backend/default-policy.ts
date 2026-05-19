import { createDefaultPolicy } from '../core/defaults.js';
import type { Policy } from '../core/types.js';

export function buildPolicyForTenant(tenantId: string, emailDomains: string[] = []): Policy {
  const policy = createDefaultPolicy(tenantId);
  return {
    ...policy,
    tenantId,
    emailDomains,
    updatedAt: new Date().toISOString(),
    rules: policy.rules.map((rule) =>
      rule.type === 'pro_email' && emailDomains.length > 0
        ? { ...rule, enabled: true }
        : rule,
    ),
  };
}
