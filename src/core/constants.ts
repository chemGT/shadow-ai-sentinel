import type { FailMode, Rule, RuleType } from './types.js';

/** Clés `chrome.storage` / `browser.storage`. */
export const STORAGE_KEYS = {
  policy: 'sentinel_policy',
  credentials: 'sentinel_credentials',
  deviceId: 'sentinel_device_id',
  telemetryQueue: 'sentinel_telemetry_queue',
  noticeAckAt: 'sentinel_notice_ack_at',
  locale: 'sentinel_locale',
  entitlement: 'sentinel_entitlement',
  licenseKey: 'sentinel_license_key',
  licenseInstanceId: 'sentinel_license_instance_id',
  stats: 'sentinel_stats',
  allowlist: 'sentinel_allowlist',
  adapterHealth: 'sentinel_adapter_health',
} as const;

export const POLICY_VERSION_INITIAL = '1.0.0';

export const FAIL_MODES: FailMode[] = ['open', 'warn', 'closed'];

export const DEFAULT_FAIL_MODE: FailMode = 'warn';

export const REDACT_TOKENS: Record<RuleType, string> = {
  api_key: '[REDACTED_API_KEY]',
  iban: '[REDACTED_IBAN]',
  internal_ip: '[REDACTED_INTERNAL_IP]',
  pro_email: '[REDACTED_PRO_EMAIL]',
  phone: '[REDACTED_PHONE]',
  generic_secret: '[REDACTED_SECRET]',
};

/** Règles par défaut (modes mixtes — cf. plan MVP). */
export const DEFAULT_RULES: Rule[] = [
  { type: 'api_key', action: 'block', enabled: true },
  { type: 'generic_secret', action: 'block', enabled: true },
  { type: 'iban', action: 'redact', enabled: true },
  { type: 'internal_ip', action: 'redact', enabled: true },
  { type: 'pro_email', action: 'redact', enabled: false },
  { type: 'phone', action: 'redact', enabled: true },
];

/** Champs interdits dans tout payload télémétrie (validation API + client). */
export const FORBIDDEN_TELEMETRY_KEYS = [
  'text',
  'snippet',
  'match',
  'matchedText',
  'prompt',
  'content',
  'clipboard',
  'value',
  'raw',
  'userEmail',
  'userName',
  'ip',
  'userAgent',
  'url',
  'path',
  'query',
] as const;

export const ALL_RULE_TYPES: RuleType[] = [
  'api_key',
  'iban',
  'internal_ip',
  'pro_email',
  'phone',
  'generic_secret',
];

export { LLM_TAB_URL_PATTERNS, PILOT_LLM_HOST, SUPPORTED_LLM_HOSTS } from './llm-hosts.js';
