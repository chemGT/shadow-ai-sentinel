import type { Locale, RuleType } from '../../core/types.js';

const RULE_LABELS: Record<Locale, Record<RuleType, string>> = {
  fr: {
    api_key: 'clé API',
    generic_secret: 'secret',
    iban: 'IBAN',
    internal_ip: 'adresse IP interne',
    pro_email: 'e-mail professionnel',
    phone: 'numéro de téléphone',
  },
  en: {
    api_key: 'API key',
    generic_secret: 'secret',
    iban: 'IBAN',
    internal_ip: 'internal IP address',
    pro_email: 'work email',
    phone: 'phone number',
  },
};

export function resolveLocale(): Locale {
  const lang = navigator.language.toLowerCase();
  return lang.startsWith('fr') ? 'fr' : 'en';
}

export function blockMessage(ruleType: RuleType, locale: Locale): string {
  const label = RULE_LABELS[locale][ruleType];
  if (locale === 'fr') {
    return `Envoi bloqué : votre message contient une ${label} sensible. Retirez-la ou contactez votre équipe sécurité avant de partager ce contenu avec un LLM public.`;
  }
  return `Send blocked: your message contains a sensitive ${label}. Remove it or contact your security team before sharing this content with a public LLM.`;
}

export function redactNotice(locale: Locale): string {
  return locale === 'fr'
    ? 'Données sensibles remplacées par des jetons. Vérifiez le message avant envoi.'
    : 'Sensitive data was replaced with tokens. Review your message before sending.';
}

export function modalTitle(locale: Locale): string {
  return locale === 'fr' ? 'Shadow AI Sentinel' : 'Shadow AI Sentinel';
}

export function modalClose(locale: Locale): string {
  return locale === 'fr' ? 'Fermer' : 'Close';
}
