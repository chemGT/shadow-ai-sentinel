import type {
  FeedbackContextChoice,
  LlmHost,
  RuleAction,
  RuleType,
} from '../../core/types.js';
import { resolveLocale } from '../../ui/i18n/messages.js';
import { sendMessage } from '../platform/runtime.js';

export async function reportDlpAction(
  ruleType: RuleType,
  action: RuleAction,
  host: LlmHost,
): Promise<void> {
  try {
    await sendMessage({
      type: 'QUEUE_TELEMETRY',
      payload: {
        ruleType,
        action,
        host,
        locale: resolveLocale(),
      },
    });
  } catch (error) {
    console.warn('[Shadow AI Sentinel] Télémétrie non envoyée', error);
  }
}

/**
 * Signale un faux positif. N'envoie aucun extrait du texte saisi —
 * uniquement le type de règle, le contexte déclaré et l'hôte.
 */
export async function reportFalsePositive(
  ruleType: RuleType,
  contextChoice: FeedbackContextChoice,
  host: LlmHost,
): Promise<void> {
  try {
    await sendMessage({
      type: 'QUEUE_FEEDBACK',
      payload: {
        ruleType,
        contextChoice,
        host,
        locale: resolveLocale(),
      },
    });
  } catch (error) {
    console.warn('[Shadow AI Sentinel] Signalement faux positif non envoyé', error);
  }
}
