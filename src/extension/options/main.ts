import { validatePolicy } from '../../core/validation/policy.js';
import { ALL_RULE_TYPES } from '../../core/constants.js';
import type { Policy, Rule, RuleAction, RuleType, TenantCredentials } from '../../core/types.js';
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

const RULE_LABELS: Record<RuleType, string> = {
  api_key: 'Clé API',
  iban: 'IBAN',
  internal_ip: 'IP interne',
  pro_email: 'Email professionnel',
  phone: 'Téléphone',
  generic_secret: 'Secret générique',
};

const tenantIdEl = document.getElementById('tenantId') as HTMLInputElement;
const apiKeyEl = document.getElementById('apiKey') as HTMLInputElement;
const apiBaseUrlEl = document.getElementById('apiBaseUrl') as HTMLInputElement;
const policyJsonEl = document.getElementById('policyJson') as HTMLTextAreaElement;
const allowlistEl = document.getElementById('allowlist') as HTMLTextAreaElement;
const licenseKeyEl = document.getElementById('licenseKeyOpt') as HTMLInputElement;
const tierStatusEl = document.getElementById('tierStatus') as HTMLElement;
const rulesTableBodyEl = document.getElementById('rulesTableBody') as HTMLTableSectionElement;

const toastEl = document.getElementById('toast') as HTMLElement;
const toastIconEl = toastEl.querySelector('.toast-icon') as HTMLElement;
const toastMessageEl = toastEl.querySelector('.toast-message') as HTMLElement;
const toastDismissEl = toastEl.querySelector('.toast-dismiss') as HTMLButtonElement;

let toastTimer: ReturnType<typeof setTimeout> | null = null;

const ICON_OK =
  '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 10.5L8 14.5L16 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_ERROR =
  '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2"/><path d="M10 6v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="10" cy="13.5" r="1" fill="currentColor"/></svg>';

function hideToast(): void {
  toastEl.classList.remove('visible');
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
}

function showToast(kind: 'ok' | 'error', message: string): void {
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
  toastEl.classList.remove('ok', 'error');
  toastEl.classList.add(kind);
  toastIconEl.innerHTML = kind === 'ok' ? ICON_OK : ICON_ERROR;
  toastMessageEl.textContent = message;
  toastEl.classList.add('visible');

  if (kind === 'ok') {
    toastTimer = setTimeout(hideToast, 4000);
  }
}

toastDismissEl.addEventListener('click', hideToast);

function renderTier(entitlement: Entitlement): void {
  tierStatusEl.textContent = isProEntitlement(entitlement) ? 'Palier : Pro ✓' : 'Palier : Free';
}

function makeSwitch(rule: Rule): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'switch';
  btn.setAttribute('role', 'switch');
  btn.setAttribute('aria-checked', String(rule.enabled));
  btn.setAttribute('aria-label', `Activer la règle ${RULE_LABELS[rule.type]}`);
  btn.addEventListener('click', () => {
    void updateRule(rule.type, { enabled: !rule.enabled });
  });
  return btn;
}

function makeSegmented(rule: Rule): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.className = 'segmented';

  const actions: { value: RuleAction; label: string }[] = [
    { value: 'redact', label: 'Redact' },
    { value: 'block', label: 'Block' },
  ];

  for (const action of actions) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = action.label;
    btn.setAttribute('aria-pressed', String(rule.action === action.value));
    btn.disabled = !rule.enabled;
    btn.addEventListener('click', () => {
      void updateRule(rule.type, { action: action.value });
    });
    wrap.appendChild(btn);
  }

  return wrap;
}

function renderRulesTable(policy: Policy): void {
  rulesTableBodyEl.innerHTML = '';

  for (const type of ALL_RULE_TYPES) {
    const rule = policy.rules.find((r) => r.type === type) ?? {
      type,
      action: 'redact' as RuleAction,
      enabled: false,
    };

    const tr = document.createElement('tr');

    const labelTd = document.createElement('td');
    labelTd.className = 'rule-label';
    labelTd.textContent = RULE_LABELS[type];
    tr.appendChild(labelTd);

    const switchTd = document.createElement('td');
    switchTd.appendChild(makeSwitch(rule));
    tr.appendChild(switchTd);

    const actionTd = document.createElement('td');
    actionTd.appendChild(makeSegmented(rule));
    tr.appendChild(actionTd);

    rulesTableBodyEl.appendChild(tr);
  }
}

async function updateRule(type: RuleType, patch: Partial<Pick<Rule, 'enabled' | 'action'>>): Promise<void> {
  try {
    const policy = await getStoredPolicy();
    const existingIndex = policy.rules.findIndex((r) => r.type === type);
    const base: Rule =
      existingIndex >= 0 ? policy.rules[existingIndex] : { type, action: 'redact', enabled: false };
    const updatedRule: Rule = { ...base, ...patch };

    const rules =
      existingIndex >= 0
        ? policy.rules.map((r, i) => (i === existingIndex ? updatedRule : r))
        : [...policy.rules, updatedRule];

    const nextPolicy: Policy = { ...policy, rules, updatedAt: new Date().toISOString() };

    await setStoredPolicy(nextPolicy);
    await sendMessage({ type: 'POLICY_UPDATED', payload: nextPolicy });

    renderRulesTable(nextPolicy);
    policyJsonEl.value = JSON.stringify(nextPolicy, null, 2);
    showToast('ok', `Règle « ${RULE_LABELS[type]} » mise à jour.`);
  } catch (error) {
    showToast('error', error instanceof Error ? error.message : 'Mise à jour de la règle échouée.');
  }
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
  renderRulesTable(policy);

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
  showToast('ok', `Allowlist enregistrée (${stored.length} valeur(s)).`);
});

document.getElementById('activateLicenseOpt')?.addEventListener('click', async () => {
  const key = licenseKeyEl.value.trim();
  if (!key) {
    showToast('error', 'Saisissez votre clé de licence.');
    return;
  }
  try {
    const res = await sendMessage<EntitlementResponse>({
      type: 'ACTIVATE_LICENSE',
      payload: { key },
    });
    if (res.ok && isProEntitlement(res.entitlement)) {
      renderTier(res.entitlement);
      showToast('ok', 'Licence Pro activée. Merci !');
    } else if (res.entitlement.message === 'network_error') {
      showToast('error', 'Vérification impossible (réseau).');
    } else {
      showToast('error', 'Clé invalide ou non reconnue.');
    }
  } catch {
    showToast('error', 'Vérification impossible (réseau).');
  }
});

document.getElementById('deactivateLicenseOpt')?.addEventListener('click', async () => {
  const res = await sendMessage<EntitlementResponse>({ type: 'DEACTIVATE_LICENSE' });
  licenseKeyEl.value = '';
  renderTier(res.entitlement);
  showToast('ok', 'Licence retirée.');
});

document.getElementById('saveCredentials')?.addEventListener('click', async () => {
  const credentials: TenantCredentials = {
    tenantId: tenantIdEl.value.trim(),
    apiKey: apiKeyEl.value.trim(),
    apiBaseUrl: apiBaseUrlEl.value.trim(),
  };

  if (!credentials.tenantId || !credentials.apiKey || !credentials.apiBaseUrl) {
    showToast('error', 'Renseignez tenantId, clé API et URL.');
    return;
  }

  const granted = await ensureApiHostPermission(credentials.apiBaseUrl);
  if (!granted) {
    showToast('error', 'Permission réseau refusée pour l’URL API.');
    return;
  }

  await setTenantCredentials(credentials);
  showToast('ok', 'Credentials enregistrés.');
});

document.getElementById('syncPolicy')?.addEventListener('click', async () => {
  try {
    const result = (await sendMessage({ type: 'SYNC_POLICY' })) as {
      ok?: boolean;
      policy?: Policy;
    };
    if (result?.policy) {
      policyJsonEl.value = JSON.stringify(result.policy, null, 2);
      renderRulesTable(result.policy);
    }
    showToast('ok', 'Policy synchronisée depuis l’API.');
  } catch (error) {
    showToast('error', error instanceof Error ? error.message : 'Sync échouée');
  }
});

document.getElementById('flushTelemetry')?.addEventListener('click', async () => {
  try {
    const result = (await sendMessage({ type: 'FLUSH_TELEMETRY' })) as {
      sent?: number;
      remaining?: number;
    };
    showToast('ok', `Télémétrie : ${result.sent ?? 0} envoyé(s), ${result.remaining ?? 0} en file.`);
  } catch (error) {
    showToast('error', error instanceof Error ? error.message : 'Flush échoué');
  }
});

document.getElementById('importPolicy')?.addEventListener('click', async () => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(policyJsonEl.value) as unknown;
  } catch {
    showToast('error', 'JSON invalide — vérifiez la syntaxe (virgules, guillemets, accolades).');
    return;
  }

  const validated = validatePolicy(parsed);
  if (!validated.ok) {
    showToast('error', `Policy invalide : ${validated.errors.join(' · ')}`);
    return;
  }

  await setStoredPolicy(validated.policy);
  await sendMessage({ type: 'POLICY_UPDATED', payload: validated.policy });
  policyJsonEl.value = JSON.stringify(validated.policy, null, 2);
  renderRulesTable(validated.policy);
  showToast('ok', 'Policy importée en local.');
});

document.getElementById('exportPolicy')?.addEventListener('click', async () => {
  const policy = await getStoredPolicy();
  policyJsonEl.value = JSON.stringify(policy, null, 2);
  renderRulesTable(policy);
  showToast('ok', 'Policy exportée depuis le stockage.');
});

void loadForm();
