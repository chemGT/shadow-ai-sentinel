import type { ExtensionMessage } from '../../core/types.js';
import { getExtensionApi } from './browser-api.js';

export function sendMessage<TResponse = unknown>(
  message: ExtensionMessage,
): Promise<TResponse> {
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
