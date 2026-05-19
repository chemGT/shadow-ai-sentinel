import { PILOT_LLM_HOST } from '../../core/constants.js';
import { sendMessage } from '../platform/runtime.js';

const host = globalThis.location.hostname;

if (host === PILOT_LLM_HOST || host.endsWith(`.${PILOT_LLM_HOST}`)) {
  void sendMessage({ type: 'GET_POLICY' }).then((response) => {
    console.info('[Shadow AI Sentinel] Content script actif', {
      host,
      policy: response,
    });
  });
}
