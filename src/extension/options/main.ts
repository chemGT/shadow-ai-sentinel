import { validatePolicy } from '../../core/validation/policy.js';
import type { Policy, TenantCredentials } from '../../core/types.js';
import { ensureApiHostPermission } from '../platform/permissions.js';
import {
  getStoredPolicy,
  getTenantCredentials,
  setStoredPolicy,
  setTenantCredentials,
} from '../platform/storage.js';
import { sendMessage } from '../platform/runtime.js';

const statusEl = document.getElementById('status') as HTMLElement;
const tenantIdEl = document.getElementById('tenantId') as HTMLInputElement;
const apiKeyEl = document.getElementById('apiKey') as HTMLInputElement;
const apiBaseUrlEl = document.getElementById('apiBaseUrl') as HTMLInputElement;
const policyJsonEl = document.getElementById('policyJson') as HTMLTextAreaElement;

function setStatus(message: string, kind: 'ok' | 'error' | '' = ''): void {
  statusEl.textContent = message;
  statusEl.className = kind;
}

async function loadForm(): Promise<void> {
  const credentials = await getTenantCredentials();
  if (credentials) {
    tenantIdEl.value = credentials.tenantId;
    apiKeyEl.value = credentials.apiKey;
    apiBaseUrlEl.value = credentials.apiBaseUrl;
  } else {
    apiBaseUrlEl.value = 'http://localhost:3000';
  }

  const policy = await getStoredPolicy();
  policyJsonEl.value = JSON.stringify(policy, null, 2);
}

document.getElementById('saveCredentials')?.addEventListener('click', async () => {
  const credentials: TenantCredentials = {
    tenantId: tenantIdEl.value.trim(),
    apiKey: apiKeyEl.value.trim(),
    apiBaseUrl: apiBaseUrlEl.value.trim(),
  };

  if (!credentials.tenantId || !credentials.apiKey || !credentials.apiBaseUrl) {
    setStatus('Renseignez tenantId, clé API et URL.', 'error');
    return;
  }

  const granted = await ensureApiHostPermission(credentials.apiBaseUrl);
  if (!granted) {
    setStatus('Permission réseau refusée pour l’URL API.', 'error');
    return;
  }

  await setTenantCredentials(credentials);
  setStatus('Credentials enregistrés.', 'ok');
});

document.getElementById('syncPolicy')?.addEventListener('click', async () => {
  try {
    const result = (await sendMessage({ type: 'SYNC_POLICY' })) as {
      ok?: boolean;
      policy?: Policy;
    };
    if (result?.policy) {
      policyJsonEl.value = JSON.stringify(result.policy, null, 2);
    }
    setStatus('Policy synchronisée depuis l’API.', 'ok');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Sync échouée', 'error');
  }
});

document.getElementById('flushTelemetry')?.addEventListener('click', async () => {
  try {
    const result = (await sendMessage({ type: 'FLUSH_TELEMETRY' })) as {
      sent?: number;
      remaining?: number;
    };
    setStatus(
      `Télémétrie : ${result.sent ?? 0} envoyé(s), ${result.remaining ?? 0} en file.`,
      'ok',
    );
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Flush échoué', 'error');
  }
});

document.getElementById('importPolicy')?.addEventListener('click', async () => {
  try {
    const parsed = JSON.parse(policyJsonEl.value) as unknown;
    const validated = validatePolicy(parsed);
    if (!validated.ok) {
      setStatus(validated.errors.join(' · '), 'error');
      return;
    }
    await setStoredPolicy(validated.policy);
    await sendMessage({ type: 'POLICY_UPDATED', payload: validated.policy });
    policyJsonEl.value = JSON.stringify(validated.policy, null, 2);
    setStatus('Policy importée en local.', 'ok');
  } catch {
    setStatus('JSON invalide.', 'error');
  }
});

document.getElementById('exportPolicy')?.addEventListener('click', async () => {
  const policy = await getStoredPolicy();
  policyJsonEl.value = JSON.stringify(policy, null, 2);
  setStatus('Policy exportée depuis le stockage.', 'ok');
});

void loadForm();
