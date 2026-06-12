import { createSiteDom } from '../shared/dom-factory.js';
import {
  CLAUDE_COMPOSER_SELECTORS,
  CLAUDE_INPUT_SELECTORS,
  CLAUDE_SEND_SELECTORS,
} from './selectors.js';

const claudeDom = createSiteDom({
  inputSelectors: CLAUDE_INPUT_SELECTORS,
  sendSelectors: CLAUDE_SEND_SELECTORS,
  composerSelectors: CLAUDE_COMPOSER_SELECTORS,
});

export const findComposerInput = claudeDom.findComposerInput;
export const findSendButton = claudeDom.findSendButton;
export const isNodeInsideComposer = claudeDom.isNodeInsideComposer;
export const isSendButtonTarget = claudeDom.isSendButtonTarget;
export const extractTextFromInput = claudeDom.extractTextFromInput;
export const setInputText = claudeDom.setInputText;
