import type { Policy } from '../../../core/types.js';
import { attachGuardAdapter } from '../shared/guard-adapter.js';
import { createSiteDom } from '../shared/dom-factory.js';
import {
  GROK_COMPOSER_SELECTORS,
  GROK_INPUT_SELECTORS,
  GROK_SEND_SELECTORS,
} from './selectors.js';

export type GrokAdapterOptions = {
  getPolicy: () => Policy;
  getAllowlist?: () => readonly string[];
};

const dom = createSiteDom({
  inputSelectors: GROK_INPUT_SELECTORS,
  sendSelectors: GROK_SEND_SELECTORS,
  composerSelectors: GROK_COMPOSER_SELECTORS,
});

export function attachGrokAdapter(options: GrokAdapterOptions): () => void {
  return attachGuardAdapter({
    getPolicy: options.getPolicy,
    host: 'grok.com',
    dom,
    label: 'Grok',
    getAllowlist: options.getAllowlist,
  });
}
