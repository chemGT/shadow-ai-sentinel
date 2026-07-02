import { createSiteDom } from '../shared/dom-factory.js';
import {
  GROK_COMPOSER_SELECTORS,
  GROK_INPUT_SELECTORS,
  GROK_SEND_SELECTORS,
} from './selectors.js';

const grokDom = createSiteDom({
  inputSelectors: GROK_INPUT_SELECTORS,
  sendSelectors: GROK_SEND_SELECTORS,
  composerSelectors: GROK_COMPOSER_SELECTORS,
});

export const findComposerInput = grokDom.findComposerInput;
export const findSendButton = grokDom.findSendButton;
export const isNodeInsideComposer = grokDom.isNodeInsideComposer;
export const isSendButtonTarget = grokDom.isSendButtonTarget;
export const extractTextFromInput = grokDom.extractTextFromInput;
export const setInputText = grokDom.setInputText;
