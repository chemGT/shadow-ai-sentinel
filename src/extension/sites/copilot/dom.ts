import { createSiteDom } from '../shared/dom-factory.js';
import {
  COPILOT_COMPOSER_SELECTORS,
  COPILOT_INPUT_SELECTORS,
  COPILOT_SEND_SELECTORS,
} from './selectors.js';

const copilotDom = createSiteDom({
  inputSelectors: COPILOT_INPUT_SELECTORS,
  sendSelectors: COPILOT_SEND_SELECTORS,
  composerSelectors: COPILOT_COMPOSER_SELECTORS,
});

export const findComposerInput = copilotDom.findComposerInput;
export const findSendButton = copilotDom.findSendButton;
export const isNodeInsideComposer = copilotDom.isNodeInsideComposer;
export const isSendButtonTarget = copilotDom.isSendButtonTarget;
export const extractTextFromInput = copilotDom.extractTextFromInput;
export const setInputText = copilotDom.setInputText;
