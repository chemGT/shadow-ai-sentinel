import { createSiteDom } from '../shared/dom-factory.js';
import {
  MISTRAL_COMPOSER_SELECTORS,
  MISTRAL_INPUT_SELECTORS,
  MISTRAL_SEND_SELECTORS,
} from './selectors.js';

const mistralDom = createSiteDom({
  inputSelectors: MISTRAL_INPUT_SELECTORS,
  sendSelectors: MISTRAL_SEND_SELECTORS,
  composerSelectors: MISTRAL_COMPOSER_SELECTORS,
});

export const findComposerInput = mistralDom.findComposerInput;
export const findSendButton = mistralDom.findSendButton;
export const isNodeInsideComposer = mistralDom.isNodeInsideComposer;
export const isSendButtonTarget = mistralDom.isSendButtonTarget;
export const extractTextFromInput = mistralDom.extractTextFromInput;
export const setInputText = mistralDom.setInputText;
