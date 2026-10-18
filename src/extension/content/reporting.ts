import { PROJECT_REPO_URL } from '../../core/constants.js';
import type { FeedbackContextChoice, LlmHost, RuleAction, RuleType } from '../../core/types.js';
import { getExtensionVersion } from '../platform/browser-api.js';
import { incrementLocalStat } from '../platform/storage.js';

/**
 * Événement de troncature (texte au-delà du plafond de scan, cf. `core/detection/limits.ts`).
 * Compteur local uniquement, affiché dans la popup — jamais envoyé.
 */
export async function reportTruncation(host: LlmHost): Promise<void> {
  void incrementLocalStat('truncated');
  console.warn('[Shadow AI Sentinel] Texte tronqué avant analyse DLP (plafond dépassé)', {
    host,
  });
}

/** Compteur local (popup) d'une action block/redact — jamais envoyé. */
export async function reportDlpAction(
  ruleType: RuleType,
  action: RuleAction,
  host: LlmHost,
): Promise<void> {
  void incrementLocalStat(action === 'redact' ? 'redacted' : 'blocked');
  console.info('[Shadow AI Sentinel] Action DLP', { ruleType, action, host });
}

/**
 * URL d'une issue GitHub « faux positif » pré-remplie (formulaire
 * `.github/ISSUE_TEMPLATE/false-positive.yml`). Ne contient JAMAIS le texte saisi ni un extrait :
 * uniquement le type de règle, le site, le contexte déclaré et la version de l'extension.
 */
export function buildFalsePositiveIssueUrl(
  ruleType: RuleType,
  contextChoice: FeedbackContextChoice,
  host: LlmHost,
  version: string,
): string {
  const params = new URLSearchParams({
    template: 'false-positive.yml',
    title: `[False positive] ${ruleType} on ${host}`,
    rule: ruleType,
    site: host,
    context: contextChoice,
    version,
  });
  return `${PROJECT_REPO_URL}/issues/new?${params.toString()}`;
}

/**
 * Signale un faux positif : ouvre une issue GitHub publique pré-remplie dans un nouvel onglet.
 * Rien n'est envoyé automatiquement — l'utilisateur relit et soumet lui-même.
 */
export function reportFalsePositive(
  ruleType: RuleType,
  contextChoice: FeedbackContextChoice,
  host: LlmHost,
): void {
  const url = buildFalsePositiveIssueUrl(ruleType, contextChoice, host, getExtensionVersion());
  globalThis.open(url, '_blank', 'noopener');
}
