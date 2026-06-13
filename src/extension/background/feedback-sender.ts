import { validateFeedbackEvent } from '../../core/validation/feedback.js';
import type {
  FeedbackContextChoice,
  FeedbackEvent,
  LlmHost,
  RuleType,
} from '../../core/types.js';
import {
  getOrCreateDeviceId,
  getStoredPolicy,
  getTenantCredentials,
} from '../platform/storage.js';
import {
  getBrowserFamily,
  getExtensionVersion,
} from '../platform/browser-api.js';
import { STORAGE_KEYS } from '../../core/constants.js';
import { getExtensionApi } from '../platform/browser-api.js';

export type FeedbackInput = {
  ruleType: RuleType;
  contextChoice: FeedbackContextChoice;
  host: LlmHost;
  locale?: 'fr' | 'en';
};

async function getLocale(): Promise<'fr' | 'en'> {
  const api = getExtensionApi();
  const stored = await api.storage.local.get(STORAGE_KEYS.locale);
  const value = stored[STORAGE_KEYS.locale];
  return value === 'en' ? 'en' : 'fr';
}

export async function buildFeedbackEvent(input: FeedbackInput): Promise<FeedbackEvent | null> {
  const policy = await getStoredPolicy();
  const credentials = await getTenantCredentials();
  if (!credentials?.tenantId) return null;

  const deviceId = await getOrCreateDeviceId();
  const locale = input.locale ?? (await getLocale());

  const event: FeedbackEvent = {
    eventId: crypto.randomUUID(),
    tenantId: credentials.tenantId,
    deviceId,
    occurredAt: new Date().toISOString(),
    ruleType: input.ruleType,
    contextChoice: input.contextChoice,
    host: input.host,
    extensionVersion: getExtensionVersion(),
    policyVersion: policy.version,
    locale,
    browser: getBrowserFamily(),
  };

  const validated = validateFeedbackEvent(event);
  if (!validated.ok) {
    console.warn('[Shadow AI Sentinel] Signalement faux positif rejeté', validated.errors);
    return null;
  }

  return validated.event;
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Envoi fire-and-forget : si l'utilisateur est offline ou si l'API échoue,
 * le signalement est perdu. Tradeoff délibéré : volume faible, pas critique
 * comme la télémétrie d'action (bloc/redact).
 */
export async function sendFeedback(input: FeedbackInput): Promise<{ sent: boolean }> {
  const event = await buildFeedbackEvent(input);
  if (!event) return { sent: false };

  const credentials = await getTenantCredentials();
  if (!credentials) return { sent: false };

  try {
    const response = await fetch(`${normalizeBaseUrl(credentials.apiBaseUrl)}/feedback`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ events: [event] }),
    });

    if (!response.ok) {
      console.warn('[Shadow AI Sentinel] Feedback HTTP', response.status);
      return { sent: false };
    }

    return { sent: true };
  } catch (error) {
    console.warn('[Shadow AI Sentinel] Feedback non envoyé', error);
    return { sent: false };
  }
}
