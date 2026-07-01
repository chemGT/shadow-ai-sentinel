import type { Policy } from '../../../core/types.js';
import { attachGuardAdapter } from '../shared/guard-adapter.js';
import { createSiteDom } from '../shared/dom-factory.js';
import {
  GEMINI_COMPOSER_SELECTORS,
  GEMINI_INPUT_SELECTORS,
  GEMINI_SEND_SELECTORS,
} from './selectors.js';

export type GeminiAdapterOptions = {
  getPolicy: () => Policy;
  isFileScanEnabled?: () => boolean;
  getAllowlist?: () => readonly string[];
};

const dom = createSiteDom({
  inputSelectors: GEMINI_INPUT_SELECTORS,
  sendSelectors: GEMINI_SEND_SELECTORS,
  composerSelectors: GEMINI_COMPOSER_SELECTORS,
});

export function attachGeminiAdapter(options: GeminiAdapterOptions): () => void {
  return attachGuardAdapter({
    getPolicy: options.getPolicy,
    host: 'gemini.google.com',
    dom,
    label: 'Gemini',
    isFileScanEnabled: options.isFileScanEnabled,
    getAllowlist: options.getAllowlist,
  });
}
