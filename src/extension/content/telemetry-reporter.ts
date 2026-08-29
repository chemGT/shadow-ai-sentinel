import type {
  FeedbackContextChoice,
  LlmHost,
  RuleAction,
  RuleType,
} from '../../core/types.js';
import { resolveLocale } from '../../ui/i18n/messages.js';
import { sendMessage } from '../platform/runtime.js';
import { incrementLocalStat } from '../platform/storage.js';

/**
 * Événement de troncature (texte au-delà du plafond de scan, cf. `core/detection/limits.ts`).
 * Compteur local uniquement (jamais envoyé à un serveur) : le schéma `TelemetryEvent` cloud
 * exige `ruleType`/`action` (liés aux règles de policy), qui n'ont pas de sens ici — créer un
 * type d'événement dédié demanderait d'étendre le schéma API + la base (hors périmètre de ce
 * correctif). Le compteur local suffit à rendre l'événement visible (popup) sans ce chantier.
 */
export async function reportTruncation(host: LlmHost): Promise<void> {
  void incrementLocalStat('truncated');
  console.warn('[Shadow AI Sentinel] Texte tronqué avant analyse DLP (plafond dépassé)', {
    host,
  });
}

export async function reportDlpAction(
  ruleType: RuleType,
  action: RuleAction,
  host: LlmHost,
): Promise<void> {
  // Compteur local affiché dans la popup (toujours suivi, même hors télémétrie cloud).
  void incrementLocalStat(action === 'redact' ? 'redacted' : 'blocked');
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
