import { createSiteDom } from '../shared/dom-factory.js';
import {
  GEMINI_COMPOSER_SELECTORS,
  GEMINI_INPUT_SELECTORS,
  GEMINI_SEND_SELECTORS,
} from './selectors.js';

const geminiDom = createSiteDom({
  inputSelectors: GEMINI_INPUT_SELECTORS,
  sendSelectors: GEMINI_SEND_SELECTORS,
  composerSelectors: GEMINI_COMPOSER_SELECTORS,
});

export const findComposerInput = geminiDom.findComposerInput;
export const findSendButton = geminiDom.findSendButton;
export const isNodeInsideComposer = geminiDom.isNodeInsideComposer;
export const isSendButtonTarget = geminiDom.isSendButtonTarget;
export const extractTextFromInput = geminiDom.extractTextFromInput;
export const setInputText = geminiDom.setInputText;
