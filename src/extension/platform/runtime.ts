import type { ExtensionMessage } from '../../core/types.js';
import { getExtensionApi } from './browser-api.js';

const CONNECTION_ERRORS = ['Could not establish connection', 'Receiving end does not exist'];
const SEND_MAX_RETRIES = 3;
const SEND_RETRY_DELAY_MS = 150;

/**
 * Envoie un message et attend la réponse via l'API Promise native.
 *
 * IMPORTANT (Chrome vs Firefox) : `chrome.runtime.sendMessage` accepte un callback en
 * 2e argument (API historique) ET retourne une Promise (MV3). `browser.runtime.sendMessage`
 * (Firefox) est Promise-only : un callback passé en 2e argument est silencieusement ignoré
 * et n'est jamais invoqué. Utiliser le pattern callback fait donc pendre indéfiniment cette
 * Promise sur Firefox (elle ne se résout ni ne rejette jamais), ce qui bloque tout le
 * pipeline detection -> action côté content script (GET_POLICY, telemetry, etc.).
 * D'où l'usage exclusif de la forme Promise, supportée nativement par les deux navigateurs.
 */
function sendMessageOnce<TResponse>(message: ExtensionMessage): Promise<TResponse> {
  const api = getExtensionApi();
  return api.runtime.sendMessage(message) as Promise<TResponse>;
}

export async function sendMessage<TResponse = unknown>(
  message: ExtensionMessage,
  retriesLeft = SEND_MAX_RETRIES,
): Promise<TResponse> {
  try {
    return await sendMessageOnce<TResponse>(message);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const isConnectionError = CONNECTION_ERRORS.some((e) => msg.includes(e));
    if (isConnectionError && retriesLeft > 0) {
      await new Promise<void>((r) => setTimeout(r, SEND_RETRY_DELAY_MS));
      return sendMessage<TResponse>(message, retriesLeft - 1);
    }
    throw err;
  }
}

/**
 * Enregistre un handler de messages async.
 *
 * On retourne directement la Promise du handler plutôt que d'appeler `sendResponse`
 * couplé à `return true` : c'est le pattern documenté comme portable par MDN pour
 * `runtime.onMessage`, fiable à la fois sur Chrome (MV3) et Firefox. Le pattern
 * `sendResponse` + `return true` fonctionne sur Chrome mais est une source classique
 * d'incohérences sur Firefox si le listener n'est pas strictement synchrone jusqu'au
 * `return true` (ex. logique conditionnelle avant l'appel async) — on l'évite ici.
 */
export function onMessage(
  handler: (
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
  ) => Promise<unknown> | unknown,
): void {
  const api = getExtensionApi();
  api.runtime.onMessage.addListener((message, sender) => {
    return (async () => {
      try {
        return await handler(message as ExtensionMessage, sender);
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    })();
  });
}
