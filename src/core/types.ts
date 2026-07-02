/** Familles de données sensibles détectées localement. */
export type RuleType =
  | 'api_key'
  | 'iban'
  | 'internal_ip'
  | 'pro_email'
  | 'phone'
  | 'generic_secret';

/** Action appliquée lorsqu'une règle correspond. */
export type RuleAction = 'block' | 'redact';

export type Locale = 'fr' | 'en';

export type BrowserFamily = 'chromium' | 'firefox';

/** Hôtes LLM supportés. */
export type LlmHost =
  | 'claude.ai'
  | 'chatgpt.com'
  | 'gemini.google.com'
  | 'chat.mistral.ai'
  | 'chat.deepseek.com'
  | 'perplexity.ai'
  | 'grok.com'
  | 'copilot.microsoft.com';

/** Une règle policy par type de donnée. */
export interface Rule {
  type: RuleType;
  action: RuleAction;
  enabled: boolean;
}

/**
 * Configuration DLP distribuée par l'API ou importée manuellement.
 * `emailDomains` : allowlist fournie à l'intégration client (emails pro).
 */
export interface Policy {
  version: string;
  tenantId: string;
  emailDomains: string[];
  rules: Rule[];
  updatedAt: string;
  departmentId?: string;
}

/** Résultat local du moteur de détection (jamais envoyé tel quel à l'API). */
export interface DetectionMatch {
  ruleType: RuleType;
  start: number;
  end: number;
  replacementToken: string;
}

/** Événement télémétrie — schéma RGPD minimal (sans contenu utilisateur). */
export interface TelemetryEvent {
  eventId: string;
  tenantId: string;
  deviceId: string;
  occurredAt: string;
  ruleType: RuleType;
  action: RuleAction;
  host: LlmHost;
  extensionVersion: string;
  policyVersion: string;
  locale: Locale;
  browser: BrowserFamily;
  departmentId?: string;
}

/** Contexte de saisie déclaré par l'utilisateur lors d'un signalement faux positif. */
export type FeedbackContextChoice = 'code' | 'prose' | 'json' | 'url' | 'other';

/**
 * Signalement faux positif — schéma RGPD minimal.
 * Ne contient JAMAIS le texte d'origine, le contenu de la saisie, ou un extrait.
 */
export interface FeedbackEvent {
  eventId: string;
  tenantId: string;
  deviceId: string;
  occurredAt: string;
  ruleType: RuleType;
  contextChoice: FeedbackContextChoice;
  host: LlmHost;
  extensionVersion: string;
  policyVersion: string;
  locale: Locale;
  browser: BrowserFamily;
}

/** Enveloppe API POST /feedback */
export interface FeedbackBatchRequest {
  events: FeedbackEvent[];
}

/** Credentials install (page Options / intégration). */
export interface TenantCredentials {
  tenantId: string;
  apiKey: string;
  apiBaseUrl: string;
}

/** File d'attente offline — métadonnées de sync. */
export interface TelemetryQueueItem {
  event: TelemetryEvent;
  queuedAt: string;
  retryCount: number;
}

/** Enveloppe API GET /policies */
export interface PoliciesResponse {
  policy: Policy;
}

/** Enveloppe API POST /telemetry */
export interface TelemetryBatchRequest {
  events: TelemetryEvent[];
}

export type MessageType =
  | 'GET_POLICY'
  | 'POLICY_UPDATED'
  | 'QUEUE_TELEMETRY'
  | 'QUEUE_FEEDBACK'
  | 'FLUSH_TELEMETRY'
  | 'SYNC_POLICY'
  | 'GET_ENTITLEMENT'
  | 'ACTIVATE_LICENSE'
  | 'DEACTIVATE_LICENSE';

export interface ExtensionMessage<T = unknown> {
  type: MessageType;
  payload?: T;
}
