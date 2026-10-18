import type { Policy } from '../../../core/types.js';
import { attachGuardAdapter } from '../shared/guard-adapter.js';
import { createSiteDom } from '../shared/dom-factory.js';
import {
  MISTRAL_COMPOSER_SELECTORS,
  MISTRAL_INPUT_SELECTORS,
  MISTRAL_SEND_SELECTORS,
} from './selectors.js';

export type MistralAdapterOptions = {
  getPolicy: () => Policy;
  getAllowlist?: () => readonly string[];
};

const dom = createSiteDom({
  inputSelectors: MISTRAL_INPUT_SELECTORS,
  sendSelectors: MISTRAL_SEND_SELECTORS,
  composerSelectors: MISTRAL_COMPOSER_SELECTORS,
});

export function attachMistralAdapter(options: MistralAdapterOptions): () => void {
  return attachGuardAdapter({
    getPolicy: options.getPolicy,
    host: 'chat.mistral.ai',
    dom,
    label: 'Le Chat',
    getAllowlist: options.getAllowlist,
  });
}
