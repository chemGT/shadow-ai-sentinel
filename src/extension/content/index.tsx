import { PILOT_LLM_HOST } from '../../core/constants.js';
import type { Policy } from '../../core/types.js';
import { sendMessage } from '../platform/runtime.js';
import { attachClaudeAdapter } from '../sites/claude/adapter.js';

const host = globalThis.location.hostname;
const isPilotHost = host === PILOT_LLM_HOST || host.endsWith(`.${PILOT_LLM_HOST}`);

let policy: Policy | null = null;

async function loadPolicy(): Promise<Policy> {
  const response = (await sendMessage({ type: 'GET_POLICY' })) as { policy?: Policy };
  if (!response?.policy) {
    throw new Error('Policy indisponible');
  }
  return response.policy;
}

function bootstrap(): void {
  if (!isPilotHost) {
    return;
  }

  void loadPolicy()
    .then((loaded) => {
      policy = loaded;
      attachClaudeAdapter({
        getPolicy: () => policy ?? loaded,
      });
      console.info('[Shadow AI Sentinel] Content script prêt', { host, policyVersion: loaded.version });
    })
    .catch((error: unknown) => {
      console.error('[Shadow AI Sentinel] Échec initialisation', error);
    });
}

bootstrap();
