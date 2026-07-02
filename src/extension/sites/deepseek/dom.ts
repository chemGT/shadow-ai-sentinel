import { createSiteDom } from '../shared/dom-factory.js';
import {
  DEEPSEEK_COMPOSER_SELECTORS,
  DEEPSEEK_INPUT_SELECTORS,
  DEEPSEEK_SEND_SELECTORS,
} from './selectors.js';

const deepseekDom = createSiteDom({
  inputSelectors: DEEPSEEK_INPUT_SELECTORS,
  sendSelectors: DEEPSEEK_SEND_SELECTORS,
  composerSelectors: DEEPSEEK_COMPOSER_SELECTORS,
});

export const findComposerInput = deepseekDom.findComposerInput;
export const findSendButton = deepseekDom.findSendButton;
export const isNodeInsideComposer = deepseekDom.isNodeInsideComposer;
export const isSendButtonTarget = deepseekDom.isSendButtonTarget;
export const extractTextFromInput = deepseekDom.extractTextFromInput;
export const setInputText = deepseekDom.setInputText;
