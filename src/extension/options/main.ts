import { validatePolicy } from '../../core/validation/policy.js';
import { ALL_RULE_TYPES } from '../../core/constants.js';
import {
  applyManagedPolicy,
  hasManagedSettings,
  managedRuleTypes,
  type ManagedConfig,
} from '../../core/managed-policy.js';
import type { Policy, Rule, RuleAction, RuleType } from '../../core/types.js';
import {
  formatDiagnosticsReport,
  overallStatus,
  runDiagnostics,
  type DiagnosticCheck,
} from '../../core/diagnostics.js';
import { SUPPORTED_LLM_HOSTS } from '../../core/llm-hosts.js';
import {
  getAdapterHealth,
  getAllowlist,
  getEffectivePolicy,
  getManagedConfig,
  getStoredPolicy,
  getStoredPolicyErrors,
  probeStorage,
  setAllowlist,
  setStoredPolicy,
} from '../platform/storage.js';
import { getBrowserFamily, getExtensionApi, getExtensionVersion } from '../platform/browser-api.js';
import { sendMessage } from '../platform/runtime.js';
import { resolveLocale } from '../../ui/i18n/messages.js';
import { applyStaticTranslations, optionsMessages } from './messages.js';

const locale = resolveLocale();
const m = optionsMessages(locale);
applyStaticTranslations(document, m);
const RULE_LABELS: Record<RuleType, string> = m.ruleLabels;

const policyJsonEl = document.getElementById('policyJson') as HTMLTextAreaElement;
const allowlistEl = document.getElementById('allowlist') as HTMLTextAreaElement;
const rulesTableBodyEl = document.getElementById('rulesTableBody') as HTMLTableSectionElement;
const managedBannerEl = document.getElementById('managedBanner') as HTMLElement;
const allowlistManagedHintEl = document.getElementById('allowlistManagedHint') as HTMLElement;
const managedErrorsEl = document.getElementById('managedErrors') as HTMLElement;
const diagSummaryEl = document.getElementById('diagSummary') as HTMLElement;
const diagListEl = document.getElementById('diagList') as HTMLUListElement;

let managedConfig: ManagedConfig = { allowlist: [], errors: [] };

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

function makeSwitch(rule: Rule, managed: boolean): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'switch';
  btn.setAttribute('role', 'switch');
  btn.setAttribute('aria-checked', String(rule.enabled));
  btn.disabled = managed;
  btn.setAttribute('aria-label', m.enableRule(RULE_LABELS[rule.type]));
  btn.addEventListener('click', () => {
    void updateRule(rule.type, { enabled: !rule.enabled });
  });
  return btn;
}

function makeSegmented(rule: Rule, managed: boolean): HTMLDivElement {
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
    btn.disabled = managed || !rule.enabled;
    btn.addEventListener('click', () => {
      void updateRule(rule.type, { action: action.value });
    });
    wrap.appendChild(btn);
  }

  return wrap;
}

/** Affiche la policy effective (locale + gérée) ; les règles gérées sont verrouillées. */
function renderRulesTable(localPolicy: Policy): void {
  rulesTableBodyEl.innerHTML = '';
  const policy = applyManagedPolicy(localPolicy, managedConfig);
  const managedTypes = managedRuleTypes(managedConfig);

  for (const type of ALL_RULE_TYPES) {
    const rule = policy.rules.find((r) => r.type === type) ?? {
      type,
      action: 'redact' as RuleAction,
      enabled: false,
    };

    const tr = document.createElement('tr');

    const managed = managedTypes.has(type);
    const labelTd = document.createElement('td');
    labelTd.className = 'rule-label';
    labelTd.textContent = RULE_LABELS[type];
    if (managed) {
      const badge = document.createElement('span');
      badge.className = 'managed-badge';
      badge.textContent = m.managedBadge;
      badge.title = m.managedBadgeTitle;
      labelTd.appendChild(badge);
    }
    tr.appendChild(labelTd);

    const switchTd = document.createElement('td');
    switchTd.appendChild(makeSwitch(rule, managed));
    tr.appendChild(switchTd);

    const actionTd = document.createElement('td');
    actionTd.appendChild(makeSegmented(rule, managed));
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
    showToast('ok', m.ruleUpdated(RULE_LABELS[type]));
  } catch (error) {
    showToast('error', error instanceof Error ? error.message : m.ruleUpdateFailed);
  }
}

function renderManagedState(): void {
  managedBannerEl.hidden = !hasManagedSettings(managedConfig);
  const locked = managedConfig.lockSettings === true;
  const count = managedConfig.allowlist.length;
  allowlistManagedHintEl.hidden = count === 0 && !locked;
  allowlistManagedHintEl.textContent = locked ? m.allowlistLocked(count) : m.allowlistExtra(count);

  // Poste verrouillé : l'édition locale n'aurait aucun effet, on la désactive.
  allowlistEl.readOnly = locked;
  policyJsonEl.readOnly = locked;
  for (const id of ['saveAllowlist', 'importPolicy']) {
    const button = document.getElementById(id) as HTMLButtonElement | null;
    if (button) {
      button.disabled = locked;
    }
  }

  // Une valeur gérée invalide est ignorée (repli sur le réglage local) : il faut le dire ici,
  // pas seulement en console — sinon l'admin croit sa policy appliquée.
  managedErrorsEl.hidden = managedConfig.errors.length === 0;
  managedErrorsEl.textContent = m.managedErrors(managedConfig.errors);
}

const STATUS_LABELS: Record<DiagnosticCheck['status'], string> = m.statusLabels;

let lastDiagnostics: DiagnosticCheck[] = [];

/** Sites pris en charge dont la permission d'hôte n'est pas accordée. */
async function findMissingHostPermissions(): Promise<string[]> {
  const api = getExtensionApi();
  const missing: string[] = [];
  for (const host of SUPPORTED_LLM_HOSTS) {
    try {
      const granted = await api.permissions.contains({ origins: [`*://${host}/*`] });
      if (!granted) {
        missing.push(host);
      }
    } catch {
      missing.push(host);
    }
  }
  return missing;
}

async function runDiagnosticsPanel(): Promise<void> {
  const storageWorks = await probeStorage();
  let managedReadable = true;
  try {
    await getExtensionApi().storage.managed.get(null);
  } catch {
    // Firefox rejette quand aucune policy n'est déployée : ce n'est pas une panne. Chromium,
    // lui, renvoie `{}` : un rejet y signale un vrai problème de lecture.
    managedReadable = getBrowserFamily() === 'firefox';
  }
  let backgroundResponds = false;
  try {
    const response = (await sendMessage({ type: 'GET_POLICY' })) as { policy?: Policy };
    backgroundResponds = response?.policy !== undefined;
  } catch {
    backgroundResponds = false;
  }

  const safe = async <T>(read: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await read();
    } catch {
      return fallback;
    }
  };

  lastDiagnostics = runDiagnostics({
    version: getExtensionVersion(),
    browser: getBrowserFamily(),
    storageWorks,
    localPolicyErrors: await safe(getStoredPolicyErrors, []),
    effectivePolicy: await safe(getEffectivePolicy, await getStoredPolicy()),
    managed: await safe(getManagedConfig, managedConfig),
    managedReadable,
    localAllowlistCount: (await safe(getAllowlist, [])).length,
    missingHostPermissions: await findMissingHostPermissions(),
    backgroundResponds,
    adapterHealth: await safe(getAdapterHealth, 'healthy'),
    locale,
  });

  const overall = overallStatus(lastDiagnostics);
  diagSummaryEl.textContent = m.diagOverall[overall];

  diagListEl.textContent = '';
  for (const check of lastDiagnostics) {
    const li = document.createElement('li');
    li.className = check.status;
    li.dataset.check = check.id;
    const status = document.createElement('span');
    status.className = 'diag-status';
    status.textContent = STATUS_LABELS[check.status];
    const label = document.createElement('strong');
    label.textContent = `${check.label} — `;
    const detail = document.createElement('span');
    detail.textContent = check.detail;
    li.append(status, label, detail);
    if (check.fix) {
      const fix = document.createElement('span');
      fix.className = 'diag-fix';
      fix.textContent = `→ ${check.fix}`;
      li.appendChild(fix);
    }
    diagListEl.appendChild(li);
  }
}

document.getElementById('runDiag')?.addEventListener('click', () => {
  void runDiagnosticsPanel();
});

document.getElementById('copyDiag')?.addEventListener('click', async () => {
  const report = formatDiagnosticsReport(lastDiagnostics);
  try {
    await navigator.clipboard.writeText(report);
    showToast('ok', m.reportCopied);
  } catch {
    showToast('error', m.reportCopyFailed);
    console.info(report);
  }
});

async function loadForm(): Promise<void> {
  managedConfig = await getManagedConfig();
  renderManagedState();
  const policy = await getStoredPolicy();
  policyJsonEl.value = JSON.stringify(policy, null, 2);
  renderRulesTable(policy);

  const allowlist = await getAllowlist();
  allowlistEl.value = allowlist.join('\n');
}

document.getElementById('saveAllowlist')?.addEventListener('click', async () => {
  const values = allowlistEl.value.split('\n');
  await setAllowlist(values);
  const stored = await getAllowlist();
  allowlistEl.value = stored.join('\n');
  showToast('ok', m.allowlistSaved(stored.length));
});

document.getElementById('importPolicy')?.addEventListener('click', async () => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(policyJsonEl.value) as unknown;
  } catch {
    showToast('error', m.invalidJson);
    return;
  }

  const validated = validatePolicy(parsed);
  if (!validated.ok) {
    showToast('error', m.invalidPolicy(validated.errors));
    return;
  }

  await setStoredPolicy(validated.policy);
  await sendMessage({ type: 'POLICY_UPDATED', payload: validated.policy });
  policyJsonEl.value = JSON.stringify(validated.policy, null, 2);
  renderRulesTable(validated.policy);
  showToast('ok', m.policyImported);
});

document.getElementById('exportPolicy')?.addEventListener('click', async () => {
  const policy = await getStoredPolicy();
  policyJsonEl.value = JSON.stringify(policy, null, 2);
  renderRulesTable(policy);
  showToast('ok', m.policyExported);
});

void loadForm().finally(() => runDiagnosticsPanel());
