import type { Policy } from '../../../core/types.js';
import { attachGuardAdapter } from '../shared/guard-adapter.js';
import { createSiteDom } from '../shared/dom-factory.js';
import {
  COPILOT_COMPOSER_SELECTORS,
  COPILOT_INPUT_SELECTORS,
  COPILOT_SEND_SELECTORS,
} from './selectors.js';

export type CopilotAdapterOptions = {
  getPolicy: () => Policy;
  getAllowlist?: () => readonly string[];
};

const dom = createSiteDom({
  inputSelectors: COPILOT_INPUT_SELECTORS,
  sendSelectors: COPILOT_SEND_SELECTORS,
  composerSelectors: COPILOT_COMPOSER_SELECTORS,
});

export function attachCopilotAdapter(options: CopilotAdapterOptions): () => void {
  return attachGuardAdapter({
    getPolicy: options.getPolicy,
    host: 'copilot.microsoft.com',
    dom,
    label: 'Copilot',
    getAllowlist: options.getAllowlist,
  });
}
