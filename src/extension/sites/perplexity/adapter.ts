import type { Policy } from '../../../core/types.js';
import { attachGuardAdapter } from '../shared/guard-adapter.js';
import { createSiteDom } from '../shared/dom-factory.js';
import {
  PERPLEXITY_COMPOSER_SELECTORS,
  PERPLEXITY_INPUT_SELECTORS,
  PERPLEXITY_SEND_SELECTORS,
} from './selectors.js';

export type PerplexityAdapterOptions = {
  getPolicy: () => Policy;
  isFileScanEnabled?: () => boolean;
  getAllowlist?: () => readonly string[];
};

const dom = createSiteDom({
  inputSelectors: PERPLEXITY_INPUT_SELECTORS,
  sendSelectors: PERPLEXITY_SEND_SELECTORS,
  composerSelectors: PERPLEXITY_COMPOSER_SELECTORS,
});

export function attachPerplexityAdapter(options: PerplexityAdapterOptions): () => void {
  return attachGuardAdapter({
    getPolicy: options.getPolicy,
    host: 'perplexity.ai',
    dom,
    label: 'Perplexity',
    isFileScanEnabled: options.isFileScanEnabled,
    getAllowlist: options.getAllowlist,
  });
}
