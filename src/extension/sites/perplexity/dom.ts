import { createSiteDom } from '../shared/dom-factory.js';
import {
  PERPLEXITY_COMPOSER_SELECTORS,
  PERPLEXITY_INPUT_SELECTORS,
  PERPLEXITY_SEND_SELECTORS,
} from './selectors.js';

const perplexityDom = createSiteDom({
  inputSelectors: PERPLEXITY_INPUT_SELECTORS,
  sendSelectors: PERPLEXITY_SEND_SELECTORS,
  composerSelectors: PERPLEXITY_COMPOSER_SELECTORS,
});

export const findComposerInput = perplexityDom.findComposerInput;
export const findSendButton = perplexityDom.findSendButton;
export const isNodeInsideComposer = perplexityDom.isNodeInsideComposer;
export const isSendButtonTarget = perplexityDom.isSendButtonTarget;
export const extractTextFromInput = perplexityDom.extractTextFromInput;
export const setInputText = perplexityDom.setInputText;
