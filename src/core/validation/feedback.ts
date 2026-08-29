import { FORBIDDEN_TELEMETRY_KEYS, ALL_RULE_TYPES } from '../constants.js';
import { SUPPORTED_LLM_HOSTS } from '../llm-hosts.js';
import type {
  BrowserFamily,
  FeedbackContextChoice,
  FeedbackEvent,
  Locale,
  LlmHost,
  RuleType,
} from '../types.js';

export type FeedbackValidationResult =
  | { ok: true; event: FeedbackEvent }
  | { ok: false; errors: string[] };

const LLM_HOSTS: readonly LlmHost[] = SUPPORTED_LLM_HOSTS;
const LOCALES: Locale[] = ['fr', 'en'];
const BROWSERS: BrowserFamily[] = ['chromium', 'firefox'];
export const FEEDBACK_CONTEXT_CHOICES: FeedbackContextChoice[] = [
  'code',
  'prose',
  'json',
  'url',
  'other',
];

function hasForbiddenKeys(record: Record<string, unknown>): string[] {
  return FORBIDDEN_TELEMETRY_KEYS.filter((key) => key in record).map(
    (key) => `champ interdit: ${key}`,
  );
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/** Valide un signalement faux positif avant enqueue ou envoi API. */
export function validateFeedbackEvent(input: unknown): FeedbackValidationResult {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, errors: ['Événement doit être un objet'] };
  }

  const raw = input as Record<string, unknown>;
  const errors = hasForbiddenKeys(raw);

  const requiredStrings: (keyof FeedbackEvent)[] = [
    'eventId',
    'tenantId',
    'deviceId',
    'occurredAt',
    'extensionVersion',
    'policyVersion',
  ];

  for (const key of requiredStrings) {
    if (typeof raw[key] !== 'string' || (raw[key] as string).length === 0) {
      errors.push(`${key} requis (string non vide)`);
    }
  }

  if (typeof raw.eventId === 'string' && !isUuidLike(raw.eventId)) {
    errors.push('eventId doit être un UUID v4');
  }

  if (typeof raw.ruleType === 'string' && !ALL_RULE_TYPES.includes(raw.ruleType as RuleType)) {
    errors.push('ruleType invalide');
  } else if (typeof raw.ruleType !== 'string') {
    errors.push('ruleType requis');
  }

  if (
    typeof raw.contextChoice === 'string' &&
    !FEEDBACK_CONTEXT_CHOICES.includes(raw.contextChoice as FeedbackContextChoice)
  ) {
    errors.push('contextChoice invalide');
  } else if (typeof raw.contextChoice !== 'string') {
    errors.push('contextChoice requis');
  }

  if (typeof raw.host === 'string' && !LLM_HOSTS.includes(raw.host as LlmHost)) {
    errors.push('host invalide');
  }

  if (typeof raw.locale === 'string' && !LOCALES.includes(raw.locale as Locale)) {
    errors.push('locale invalide');
  }

  if (typeof raw.browser === 'string' && !BROWSERS.includes(raw.browser as BrowserFamily)) {
    errors.push('browser invalide');
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const event: FeedbackEvent = {
    eventId: raw.eventId as string,
    tenantId: raw.tenantId as string,
    deviceId: raw.deviceId as string,
    occurredAt: raw.occurredAt as string,
    ruleType: raw.ruleType as RuleType,
    contextChoice: raw.contextChoice as FeedbackContextChoice,
    host: raw.host as LlmHost,
    extensionVersion: raw.extensionVersion as string,
    policyVersion: raw.policyVersion as string,
    locale: raw.locale as Locale,
    browser: raw.browser as BrowserFamily,
  };

  return { ok: true, event };
}
