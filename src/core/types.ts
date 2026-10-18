/** Familles de données sensibles détectées localement. */
export type RuleType =
  | 'api_key'
  | 'iban'
  | 'internal_ip'
  | 'pro_email'
  | 'phone'
  | 'generic_secret'
  | 'card';

/** Action appliquée lorsqu'une règle correspond. */
export type RuleAction = 'block' | 'redact';

/**
 * Comportement quand l'adaptateur d'un site ne trouve plus le composer (sélecteurs
 * obsolètes) : `open` = envoi autorisé sans analyse (ancien comportement, fail-open),
 * `warn` = envoi autorisé + bannière d'alerte visible, `closed` = tout envoi bloqué
 * (interception générique Entrée + clic submit) jusqu'à résolution.
 */
export type FailMode = 'open' | 'warn' | 'closed';

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
  /** Défaut si absent : `'warn'` (cf. `DEFAULT_FAIL_MODE`). */
  fail_mode?: FailMode;
}

/** Résultat local du moteur de détection (jamais envoyé tel quel à l'API). */
export interface DetectionMatch {
  ruleType: RuleType;
  start: number;
  end: number;
  replacementToken: string;
}

/** Contexte de saisie déclaré par l'utilisateur lors d'un signalement faux positif. */
export type FeedbackContextChoice = 'code' | 'prose' | 'json' | 'url' | 'other';

export type MessageType =
  | 'GET_POLICY'
  | 'POLICY_UPDATED';

export interface ExtensionMessage<T = unknown> {
  type: MessageType;
  payload?: T;
}
