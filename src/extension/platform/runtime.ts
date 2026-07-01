import type { ExtensionMessage } from '../../core/types.js';
import { getExtensionApi } from './browser-api.js';

const CONNECTION_ERRORS = ['Could not establish connection', 'Receiving end does not exist'];
const SEND_MAX_RETRIES = 3;
const SEND_RETRY_DELAY_MS = 150;

function sendMessageOnce<TResponse>(message: ExtensionMessage): Promise<TResponse> {
  const api = getExtensionApi();
  return new Promise((resolve, reject) => {
    api.runtime.sendMessage(message, (response: TResponse) => {
      const err = api.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }
      resolve(response);
    });
  });
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

export function onMessage(
  handler: (
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
  ) => Promise<unknown> | unknown,
): void {
  const api = getExtensionApi();
  api.runtime.onMessage.addListener((message, sender, sendResponse) => {
    void (async () => {
      try {
        const result = await handler(message as ExtensionMessage, sender);
        sendResponse(result);
      } catch (error) {
        sendResponse({
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    })();
    return true;
  });
}
