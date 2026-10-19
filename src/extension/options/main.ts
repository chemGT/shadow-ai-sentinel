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
  getAllowlist,
  getManagedConfig,
  getStoredPolicy,
  setAllowlist,
  setStoredPolicy,
} from '../platform/storage.js';
import { sendMessage } from '../platform/runtime.js';

const RULE_LABELS: Record<RuleType, string> = {
  api_key: 'Clé API',
  iban: 'IBAN',
  internal_ip: 'IP interne',
  pro_email: 'Email professionnel',
  phone: 'Téléphone',
  generic_secret: 'Secret générique',
  card: 'Carte bancaire',
};

const policyJsonEl = document.getElementById('policyJson') as HTMLTextAreaElement;
const allowlistEl = document.getElementById('allowlist') as HTMLTextAreaElement;
const rulesTableBodyEl = document.getElementById('rulesTableBody') as HTMLTableSectionElement;
const managedBannerEl = document.getElementById('managedBanner') as HTMLElement;
const allowlistManagedHintEl = document.getElementById('allowlistManagedHint') as HTMLElement;

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
  btn.setAttribute('aria-label', `Activer la règle ${RULE_LABELS[rule.type]}`);
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
      badge.textContent = 'Géré';
      badge.title = 'Règle imposée par la policy de votre organisation';
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
    showToast('ok', `Règle « ${RULE_LABELS[type]} » mise à jour.`);
  } catch (error) {
    showToast('error', error instanceof Error ? error.message : 'Mise à jour de la règle échouée.');
  }
}

function renderManagedState(): void {
  managedBannerEl.hidden = !hasManagedSettings(managedConfig);
  const count = managedConfig.allowlist.length;
  allowlistManagedHintEl.hidden = count === 0;
  allowlistManagedHintEl.textContent =
    `+ ${count} valeur(s) ajoutée(s) par votre organisation, appliquée(s) en plus de cette liste.`;
}

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
  showToast('ok', `Allowlist enregistrée (${stored.length} valeur(s)).`);
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
