import { sendMessage } from '../platform/runtime.js';
import { getLocalStats } from '../platform/storage.js';
import { getExtensionApi } from '../platform/browser-api.js';
import { resolveLocale } from '../../ui/i18n/messages.js';
import { GUMROAD_PRODUCT_URL } from '../config.js';
import { isProEntitlement, type Entitlement } from '../../core/licensing/entitlement.js';

interface EntitlementResponse {
  ok: boolean;
  entitlement: Entitlement;
}

const locale = resolveLocale();

const copy =
  locale === 'fr'
    ? {
        tierFree: 'Free',
        tierPro: 'Pro',
        statusActive: 'Protection active',
        blocked: 'bloqués',
        redacted: 'caviardés',
        proPitch:
          'Passez en Pro : détection PII (IBAN, téléphone, e-mail pro, IP interne), scan des pièces jointes et règles personnalisées.',
        upgrade: 'Passer en Pro',
        licenseLabel: 'Clé de licence',
        activate: 'Activer',
        activating: 'Vérification…',
        licensed: 'Licence Pro active. Merci !',
        deactivate: 'Désactiver la licence',
        options: 'Réglages avancés',
        okActivated: 'Licence activée.',
        errEmpty: 'Saisissez votre clé.',
        errInvalid: 'Clé invalide ou non reconnue.',
        errNetwork: 'Vérification impossible (réseau).',
      }
    : {
        tierFree: 'Free',
        tierPro: 'Pro',
        statusActive: 'Protection active',
        blocked: 'blocked',
        redacted: 'redacted',
        proPitch:
          'Go Pro: PII detection (IBAN, phone, work email, internal IP), attachment scanning and custom rules.',
        upgrade: 'Upgrade to Pro',
        licenseLabel: 'License key',
        activate: 'Activate',
        activating: 'Verifying…',
        licensed: 'Pro license active. Thank you!',
        deactivate: 'Remove license',
        options: 'Advanced settings',
        okActivated: 'License activated.',
        errEmpty: 'Enter your key.',
        errInvalid: 'Invalid or unrecognized key.',
        errNetwork: 'Verification failed (network).',
      };

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} introuvable`);
  return el;
}

function setText(id: string, text: string): void {
  $(id).textContent = text;
}

function render(entitlement: Entitlement): void {
  const pro = isProEntitlement(entitlement);
  const badge = $('tierBadge');
  badge.textContent = pro ? copy.tierPro : copy.tierFree;
  badge.classList.toggle('pro', pro);

  $('proSection').classList.toggle('hidden', pro);
  $('licensedSection').classList.toggle('hidden', !pro);
}

async function loadEntitlement(): Promise<void> {
  try {
    const res = await sendMessage<EntitlementResponse>({ type: 'GET_ENTITLEMENT' });
    render(res.entitlement);
  } catch {
    render({ tier: 'free', valid: false, checkedAt: new Date().toISOString() });
  }
}

async function loadStats(): Promise<void> {
  const stats = await getLocalStats();
  setText('blockedCount', String(stats.blocked));
  setText('redactedLabel', String(stats.redacted));
}

function applyStaticCopy(): void {
  setText('statusText', copy.statusActive);
  setText('blockedLabel', copy.blocked);
  setText('redactedText', copy.redacted);
  setText('proPitch', copy.proPitch);
  setText('licenseLabel', copy.licenseLabel);
  setText('activateBtn', copy.activate);
  setText('licensedText', copy.licensed);
  setText('deactivateBtn', copy.deactivate);
  setText('optionsBtn', copy.options);

  const upgrade = $('upgradeLink') as HTMLAnchorElement;
  upgrade.textContent = copy.upgrade;
  upgrade.href = GUMROAD_PRODUCT_URL;
}

function setMsg(text: string, kind: 'ok' | 'error' | ''): void {
  const el = $('licenseMsg');
  el.textContent = text;
  el.className = `msg ${kind}`.trim();
}

function wireEvents(): void {
  const input = $('licenseKey') as HTMLInputElement;
  const activateBtn = $('activateBtn') as HTMLButtonElement;

  activateBtn.addEventListener('click', async () => {
    const key = input.value.trim();
    if (!key) {
      setMsg(copy.errEmpty, 'error');
      return;
    }
    activateBtn.disabled = true;
    setMsg(copy.activating, '');
    try {
      const res = await sendMessage<EntitlementResponse>({
        type: 'ACTIVATE_LICENSE',
        payload: { key },
      });
      if (res.ok && isProEntitlement(res.entitlement)) {
        setMsg(copy.okActivated, 'ok');
        render(res.entitlement);
      } else if (res.entitlement.message === 'network_error') {
        setMsg(copy.errNetwork, 'error');
      } else {
        setMsg(copy.errInvalid, 'error');
      }
    } catch {
      setMsg(copy.errNetwork, 'error');
    } finally {
      activateBtn.disabled = false;
    }
  });

  $('deactivateBtn').addEventListener('click', async () => {
    const res = await sendMessage<EntitlementResponse>({ type: 'DEACTIVATE_LICENSE' });
    input.value = '';
    setMsg('', '');
    render(res.entitlement);
  });

  $('optionsBtn').addEventListener('click', () => {
    getExtensionApi().runtime.openOptionsPage();
  });
}

applyStaticCopy();
wireEvents();
void loadEntitlement();
void loadStats();
