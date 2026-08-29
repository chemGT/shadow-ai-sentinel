import type { Policy } from '../../../core/types.js';
import { attachGuardAdapter } from '../shared/guard-adapter.js';
import { createSiteDom } from '../shared/dom-factory.js';
import {
  DEEPSEEK_COMPOSER_SELECTORS,
  DEEPSEEK_INPUT_SELECTORS,
  DEEPSEEK_SEND_SELECTORS,
} from './selectors.js';

export type DeepSeekAdapterOptions = {
  getPolicy: () => Policy;
  isFileScanEnabled?: () => boolean;
  getAllowlist?: () => readonly string[];
};

const dom = createSiteDom({
  inputSelectors: DEEPSEEK_INPUT_SELECTORS,
  sendSelectors: DEEPSEEK_SEND_SELECTORS,
  composerSelectors: DEEPSEEK_COMPOSER_SELECTORS,
});

export function attachDeepSeekAdapter(options: DeepSeekAdapterOptions): () => void {
  return attachGuardAdapter({
    getPolicy: options.getPolicy,
    host: 'chat.deepseek.com',
    dom,
    label: 'DeepSeek',
    isFileScanEnabled: options.isFileScanEnabled,
    getAllowlist: options.getAllowlist,
  });
}
