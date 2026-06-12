import type { LlmHost, RuleAction, RuleType } from '../../core/types.js';
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
