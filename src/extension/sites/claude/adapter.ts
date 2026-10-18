import type { Policy } from '../../../core/types.js';
import { attachGuardAdapter } from '../shared/guard-adapter.js';
import { createSiteDom } from '../shared/dom-factory.js';
import {
  CLAUDE_COMPOSER_SELECTORS,
  CLAUDE_INPUT_SELECTORS,
  CLAUDE_SEND_SELECTORS,
} from './selectors.js';

export type ClaudeAdapterOptions = {
  getPolicy: () => Policy;
  getAllowlist?: () => readonly string[];
};

const dom = createSiteDom({
  inputSelectors: CLAUDE_INPUT_SELECTORS,
  sendSelectors: CLAUDE_SEND_SELECTORS,
  composerSelectors: CLAUDE_COMPOSER_SELECTORS,
});

export function attachClaudeAdapter(options: ClaudeAdapterOptions): () => void {
  return attachGuardAdapter({
    getPolicy: options.getPolicy,
    host: 'claude.ai',
    dom,
    label: 'Claude',
    getAllowlist: options.getAllowlist,
  });
}
