import { validatePolicy } from '../../core/validation/policy.js';
import type { Policy, TenantCredentials } from '../../core/types.js';
import { isProEntitlement, type Entitlement } from '../../core/licensing/entitlement.js';
import { ensureApiHostPermission } from '../platform/permissions.js';
import {
  getAllowlist,
  getStoredPolicy,
  getTenantCredentials,
  setAllowlist,
  setStoredPolicy,
  setTenantCredentials,
} from '../platform/storage.js';
import { sendMessage } from '../platform/runtime.js';

interface EntitlementResponse {
  ok: boolean;
  entitlement: Entitlement;
}

const statusEl = document.getElementById('status') as HTMLElement;
const tenantIdEl = document.getElementById('tenantId') as HTMLInputElement;
const apiKeyEl = document.getElementById('apiKey') as HTMLInputElement;
const apiBaseUrlEl = document.getElementById('apiBaseUrl') as HTMLInputElement;
const policyJsonEl = document.getElementById('policyJson') as HTMLTextAreaElement;
const allowlistEl = document.getElementById('allowlist') as HTMLTextAreaElement;
const licenseKeyEl = document.getElementById('licenseKeyOpt') as HTMLInputElement;
const tierStatusEl = document.getElementById('tierStatus') as HTMLElement;

function setStatus(message: string, kind: 'ok' | 'error' | '' = ''): void {
  statusEl.textContent = message;
  statusEl.className = kind;
}

function renderTier(entitlement: Entitlement): void {
  tierStatusEl.textContent = isProEntitlement(entitlement) ? 'Palier : Pro ✓' : 'Palier : Free';
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

  const allowlist = await getAllowlist();
  allowlistEl.value = allowlist.join('\n');

  try {
    const res = await sendMessage<EntitlementResponse>({ type: 'GET_ENTITLEMENT' });
    renderTier(res.entitlement);
  } catch {
    renderTier({ tier: 'free', valid: false, checkedAt: new Date().toISOString() });
  }
}

document.getElementById('saveAllowlist')?.addEventListener('click', async () => {
  const values = allowlistEl.value.split('\n');
  await setAllowlist(values);
  const stored = await getAllowlist();
  allowlistEl.value = stored.join('\n');
  setStatus(`Allowlist enregistrée (${stored.length} valeur(s)).`, 'ok');
});

document.getElementById('activateLicenseOpt')?.addEventListener('click', async () => {
  const key = licenseKeyEl.value.trim();
  if (!key) {
    setStatus('Saisissez votre clé de licence.', 'error');
    return;
  }
  setStatus('Vérification…');
  try {
    const res = await sendMessage<EntitlementResponse>({
      type: 'ACTIVATE_LICENSE',
      payload: { key },
    });
    if (res.ok && isProEntitlement(res.entitlement)) {
      renderTier(res.entitlement);
      setStatus('Licence Pro activée. Merci !', 'ok');
    } else if (res.entitlement.message === 'network_error') {
      setStatus('Vérification impossible (réseau).', 'error');
    } else {
      setStatus('Clé invalide ou non reconnue.', 'error');
    }
  } catch {
    setStatus('Vérification impossible (réseau).', 'error');
  }
});

document.getElementById('deactivateLicenseOpt')?.addEventListener('click', async () => {
  const res = await sendMessage<EntitlementResponse>({ type: 'DEACTIVATE_LICENSE' });
  licenseKeyEl.value = '';
  renderTier(res.entitlement);
  setStatus('Licence retirée.', 'ok');
});

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
