import { createSiteDom } from '../shared/dom-factory.js';
import {
  CHATGPT_COMPOSER_SELECTORS,
  CHATGPT_INPUT_SELECTORS,
  CHATGPT_SEND_SELECTORS,
} from './selectors.js';

const chatgptDom = createSiteDom({
  inputSelectors: CHATGPT_INPUT_SELECTORS,
  sendSelectors: CHATGPT_SEND_SELECTORS,
  composerSelectors: CHATGPT_COMPOSER_SELECTORS,
});

export const findComposerInput = chatgptDom.findComposerInput;
export const findSendButton = chatgptDom.findSendButton;
export const isNodeInsideComposer = chatgptDom.isNodeInsideComposer;
export const isSendButtonTarget = chatgptDom.isSendButtonTarget;
export const extractTextFromInput = chatgptDom.extractTextFromInput;
export const setInputText = chatgptDom.setInputText;
