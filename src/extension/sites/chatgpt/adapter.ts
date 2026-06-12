import type { Policy } from '../../../core/types.js';
import { attachGuardAdapter } from '../shared/guard-adapter.js';
import { createSiteDom } from '../shared/dom-factory.js';
import {
  CHATGPT_COMPOSER_SELECTORS,
  CHATGPT_INPUT_SELECTORS,
  CHATGPT_SEND_SELECTORS,
} from './selectors.js';

export type ChatGptAdapterOptions = {
  getPolicy: () => Policy;
};

const dom = createSiteDom({
  inputSelectors: CHATGPT_INPUT_SELECTORS,
  sendSelectors: CHATGPT_SEND_SELECTORS,
  composerSelectors: CHATGPT_COMPOSER_SELECTORS,
});

export function attachChatGptAdapter(options: ChatGptAdapterOptions): () => void {
  return attachGuardAdapter({
    getPolicy: options.getPolicy,
    host: 'chatgpt.com',
    dom,
    label: 'ChatGPT',
  });
}
