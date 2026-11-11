import { ALL_RULE_TYPES } from './constants.js';
import { createDefaultPolicy } from './defaults.js';
import type { ManagedConfig } from './managed-policy.js';
import { detectSensitiveData } from './regex-engine.js';
import type { Policy, RuleType } from './types.js';

/**
 * Diagnostic local (« doctor ») affiché dans la page d'options. Fonction pure : la page collecte
 * les faits (`DiagnosticsInput`), ce module en tire des constats avec, pour chaque problème, ce
 * qu'il faut faire. Aucun accès réseau. Le rapport ne contient JAMAIS de contenu saisi, de
 * valeur d'allowlist ni de nom de domaine : uniquement des états et des décomptes.
 */
export type DiagnosticStatus = 'ok' | 'warn' | 'fail';

export type DiagnosticCheck = {
  /** Identifiant stable (rapport JSON, documentation de dépannage). */
  id: string;
  status: DiagnosticStatus;
  label: string;
  detail: string;
  /** Action corrective, présente si `status` ≠ `ok`. */
  fix?: string;
};

export type DiagnosticsInput = {
  version: string;
  browser: 'chromium' | 'firefox';
  /** `false` si la lecture/écriture de `storage.local` a échoué. */
  storageWorks: boolean;
  /** Erreurs de validation de la policy locale stockée (`[]` = valide ou absente). */
  localPolicyErrors: string[];
  /** Policy effective (locale + gérée). */
  effectivePolicy: Policy;
  managed: ManagedConfig;
  /** `false` si le stockage géré est illisible (hors « aucune policy déployée »). */
  managedReadable: boolean;
  localAllowlistCount: number;
  /** Hôtes dont la permission d'accès n'est pas accordée (Firefox : révocable par l'utilisateur). */
  missingHostPermissions: string[];
  /** Le service worker / la page d'arrière-plan a répondu. */
  backgroundResponds: boolean;
  /** Dernier état connu du self-test d'adaptateur (dernier site visité). */
  adapterHealth: 'healthy' | 'broken';
  /** Langue des libellés et détails ; `fr` si absent. */
  locale?: 'fr' | 'en';
};

/** Échantillons FACTICES, un par règle, assemblés à l'exécution. */
const SELF_TEST_SAMPLES: Record<RuleType, string> = {
  api_key: 'AKIA' + 'IOSFODNN7EXAMPLE',
  generic_secret: 'Bearer ' + 'aB3dE6gH9jK2mN5pQ8sT1vW4yZ7c',
  iban: 'DE89 3704 0044 0532 0130 00',
  card: '4111 1111 1111 1111',
  phone: '+33 6 12 34 56 78',
  internal_ip: '10.12.3.4',
  pro_email: 'self-test@diagnostic.invalid',
};

/** Vérifie que chaque détecteur reconnaît son échantillon (moteur réellement fonctionnel). */
export function runEngineSelfTest(): RuleType[] {
  const policy: Policy = {
    ...createDefaultPolicy(),
    emailDomains: ['diagnostic.invalid'],
    rules: createDefaultPolicy().rules.map((r) => ({ ...r, enabled: true })),
  };
  const failing: RuleType[] = [];
  for (const type of ALL_RULE_TYPES) {
    let found = false;
    try {
      found = detectSensitiveData(SELF_TEST_SAMPLES[type], policy).some((m) => m.ruleType === type);
    } catch {
      found = false;
    }
    if (!found) {
      failing.push(type);
    }
  }
  return failing;
}

export function runDiagnostics(input: DiagnosticsInput): DiagnosticCheck[] {
  const checks: DiagnosticCheck[] = [];
  const add = (check: DiagnosticCheck): void => {
    checks.push(check);
  };
  // `fr` par défaut : les consommateurs existants (tests, rapports) ne changent pas.
  const tr = (fr: string, en: string): string => (input.locale === 'en' ? en : fr);

  add({
    id: 'version',
    status: 'ok',
    label: 'Version',
    detail: `${input.version} (${input.browser})`,
  });

  const failingRules = runEngineSelfTest();
  const engineLabel = tr('Moteur de détection', 'Detection engine');
  add(
    failingRules.length === 0
      ? {
          id: 'engine-self-test',
          status: 'ok',
          label: engineLabel,
          detail: tr(
            `${ALL_RULE_TYPES.length}/${ALL_RULE_TYPES.length} détecteurs reconnaissent leur échantillon de test.`,
            `${ALL_RULE_TYPES.length}/${ALL_RULE_TYPES.length} detectors recognize their test sample.`,
          ),
        }
      : {
          id: 'engine-self-test',
          status: 'fail',
          label: engineLabel,
          detail: tr(
            `Détecteurs en échec : ${failingRules.join(', ')}.`,
            `Failing detectors: ${failingRules.join(', ')}.`,
          ),
          fix: tr(
            'Réinstallez ou mettez à jour l’extension ; si le problème persiste, ouvrez un ticket avec ce rapport.',
            'Reinstall or update the extension; if the problem persists, open an issue with this report.',
          ),
        },
  );

  const storageLabel = tr('Stockage local', 'Local storage');
  add(
    input.storageWorks
      ? {
          id: 'storage',
          status: 'ok',
          label: storageLabel,
          detail: tr('Lecture et écriture OK.', 'Read and write OK.'),
        }
      : {
          id: 'storage',
          status: 'fail',
          label: storageLabel,
          detail: tr(
            'Lecture ou écriture impossible : les réglages ne sont pas enregistrés, les règles par défaut s’appliquent.',
            'Cannot read or write: settings are not saved, the default rules apply.',
          ),
          fix: tr(
            'Vérifiez que le profil du navigateur n’est pas en lecture seule ou plein, puis rechargez l’extension.',
            'Check that the browser profile is neither read-only nor full, then reload the extension.',
          ),
        },
  );

  const localPolicyLabel = tr('Policy locale', 'Local policy');
  add(
    input.localPolicyErrors.length === 0
      ? { id: 'local-policy', status: 'ok', label: localPolicyLabel, detail: tr('Valide.', 'Valid.') }
      : {
          id: 'local-policy',
          status: 'fail',
          label: localPolicyLabel,
          detail: tr(
            `Invalide (${input.localPolicyErrors.length} erreur(s)) : les règles par défaut s’appliquent à sa place.`,
            `Invalid (${input.localPolicyErrors.length} error(s)): the default rules apply instead.`,
          ),
          fix: tr(
            'Section « Avancé » : corrigez le JSON puis « Importer en local », ou modifiez une règle pour réécrire une policy valide.',
            'Advanced section: fix the JSON then “Import locally”, or change a rule to rewrite a valid policy.',
          ),
        },
  );

  const managedLabel = tr('Policy gérée (organisation)', 'Managed policy (organization)');
  if (!input.managedReadable) {
    add({
      id: 'managed-policy',
      status: 'warn',
      label: managedLabel,
      detail: tr('Stockage géré illisible.', 'Managed storage unreadable.'),
      fix: tr(
        'Vérifiez la policy navigateur (chrome://policy, edge://policy ou about:policies) puis rechargez-la.',
        'Check the browser policy (chrome://policy, edge://policy or about:policies), then reload it.',
      ),
    });
  } else if (input.managed.errors.length > 0) {
    add({
      id: 'managed-policy',
      status: 'fail',
      label: managedLabel,
      detail: tr(
        `${input.managed.errors.length} valeur(s) ignorée(s) car invalide(s) : ${input.managed.errors.join(' ; ')}. Le réglage local (ou par défaut) s’applique à la place.`,
        `${input.managed.errors.length} value(s) ignored as invalid: ${input.managed.errors.join('; ')}. The local (or default) setting applies instead.`,
      ),
      fix: tr(
        'Corrigez la policy déployée (voir docs/deployment.md, section « Managed policy ») puis rechargez les policies du navigateur.',
        'Fix the deployed policy (see docs/deployment.md, “Managed policy” section), then reload the browser policies.',
      ),
    });
  } else {
    const managedKeys = [
      input.managed.rules !== undefined
        ? tr(`${input.managed.rules.length} règle(s)`, `${input.managed.rules.length} rule(s)`)
        : '',
      input.managed.fail_mode !== undefined ? 'fail_mode' : '',
      input.managed.emailDomains !== undefined ? 'emailDomains' : '',
      input.managed.allowlist.length > 0
        ? tr(
            `${input.managed.allowlist.length} valeur(s) d’allowlist`,
            `${input.managed.allowlist.length} allowlist value(s)`,
          )
        : '',
      input.managed.lockSettings === true
        ? tr('verrou des réglages locaux', 'local settings lock')
        : '',
    ].filter((v) => v.length > 0);
    add({
      id: 'managed-policy',
      status: 'ok',
      label: managedLabel,
      detail:
        managedKeys.length > 0
          ? tr(`Appliquée : ${managedKeys.join(', ')}.`, `Applied: ${managedKeys.join(', ')}.`)
          : tr(
              'Aucune policy déployée : réglages locaux uniquement.',
              'No policy deployed: local settings only.',
            ),
    });
  }

  const failMode = input.effectivePolicy.fail_mode ?? 'warn';
  const failModeLabel = tr('Comportement en cas d’échec (fail_mode)', 'Behavior on failure (fail_mode)');
  add(
    failMode === 'open'
      ? {
          id: 'fail-mode',
          status: 'warn',
          label: failModeLabel,
          detail: tr(
            'open : un contenu non analysable (site modifié, texte trop long, fichier illisible) est envoyé.',
            'open: content that cannot be scanned (changed site, text too long, unreadable file) is sent.',
          ),
          fix: tr(
            'Passez à « warn » ou « closed » (policy gérée, ou section « Avancé »).',
            'Switch to “warn” or “closed” (managed policy, or the Advanced section).',
          ),
        }
      : {
          id: 'fail-mode',
          status: 'ok',
          label: failModeLabel,
          detail:
            failMode === 'closed'
              ? tr(
                  'closed : tout contenu non analysable est bloqué.',
                  'closed: any content that cannot be scanned is blocked.',
                )
              : tr(
                  'warn : un contenu non analysable est envoyé avec un avertissement visible.',
                  'warn: content that cannot be scanned is sent with a visible warning.',
                ),
        },
  );

  const disabled = ALL_RULE_TYPES.filter(
    (type) => input.effectivePolicy.rules.find((r) => r.type === type)?.enabled !== true,
  );
  const proEmailNeedsDomain =
    disabled.includes('pro_email') && input.effectivePolicy.emailDomains.length === 0;
  const reallyDisabled = disabled.filter((t) => !(t === 'pro_email' && proEmailNeedsDomain));
  const rulesLabel = tr('Règles actives', 'Active rules');
  add(
    reallyDisabled.length === 0
      ? {
          id: 'rules',
          status: 'ok',
          label: rulesLabel,
          detail: proEmailNeedsDomain
            ? tr(
                'Toutes actives, sauf pro_email (aucun domaine configuré — normal hors entreprise).',
                'All active, except pro_email (no domain configured — normal outside a company).',
              )
            : tr('Toutes actives.', 'All active.'),
        }
      : {
          id: 'rules',
          status: 'warn',
          label: rulesLabel,
          detail: tr(
            `Désactivées : ${reallyDisabled.join(', ')}.`,
            `Disabled: ${reallyDisabled.join(', ')}.`,
          ),
          fix: tr(
            'Réactivez-les dans « Règles de détection » si ce n’est pas voulu.',
            'Re-enable them under “Detection rules” if this is not intended.',
          ),
        },
  );

  const hostsLabel = tr('Accès aux sites protégés', 'Access to protected sites');
  add(
    input.missingHostPermissions.length === 0
      ? {
          id: 'host-permissions',
          status: 'ok',
          label: hostsLabel,
          detail: tr(
            'Accordé pour tous les sites pris en charge.',
            'Granted for all supported sites.',
          ),
        }
      : {
          id: 'host-permissions',
          status: 'fail',
          label: hostsLabel,
          detail: tr(
            `Non accordé pour : ${input.missingHostPermissions.join(', ')}. L’extension n’y est pas injectée : aucune protection sur ces sites.`,
            `Not granted for: ${input.missingHostPermissions.join(', ')}. The extension is not injected there: no protection on these sites.`,
          ),
          fix:
            input.browser === 'firefox'
              ? tr(
                  'about:addons → Shadow AI Sentinel → Permissions : activez l’accès à ces sites.',
                  'about:addons → Shadow AI Sentinel → Permissions: enable access to these sites.',
                )
              : tr(
                  'Page des extensions → Shadow AI Sentinel → Détails → « Accès au site » : autorisez ces sites.',
                  'Extensions page → Shadow AI Sentinel → Details → “Site access”: allow these sites.',
                ),
        },
  );

  const backgroundLabel = tr('Processus d’arrière-plan', 'Background process');
  add(
    input.backgroundResponds
      ? { id: 'background', status: 'ok', label: backgroundLabel, detail: tr('Répond.', 'Responding.') }
      : {
          id: 'background',
          status: 'warn',
          label: backgroundLabel,
          detail: tr(
            'Pas de réponse. Les pages lisent alors la policy directement depuis le stockage : la protection reste active.',
            'No response. Pages then read the policy directly from storage: protection stays active.',
          ),
          fix: tr(
            'Rechargez l’extension depuis la page des extensions si cela persiste.',
            'Reload the extension from the extensions page if this persists.',
          ),
        },
  );

  const adapterLabel = tr('Dernier site visité', 'Last visited site');
  add(
    input.adapterHealth === 'healthy'
      ? {
          id: 'adapter-health',
          status: 'ok',
          label: adapterLabel,
          detail: tr('Zone de saisie reconnue.', 'Input box recognized.'),
        }
      : {
          id: 'adapter-health',
          status: 'fail',
          label: adapterLabel,
          detail: tr(
            'Zone de saisie non reconnue : le site a changé, la protection y est inactive.',
            'Input box not recognized: the site changed, protection is inactive there.',
          ),
          fix: tr(
            'Mettez l’extension à jour. Si elle est à jour, signalez le site (modèle de ticket « site-broken »).',
            'Update the extension. If it is up to date, report the site (“site-broken” issue template).',
          ),
        },
  );

  if (input.localAllowlistCount > 0 && input.managed.lockSettings !== true) {
    add({
      id: 'allowlist',
      status: 'ok',
      label: tr('Allowlist locale', 'Local allowlist'),
      detail: tr(
        `${input.localAllowlistCount} valeur(s) exemptée(s) de détection.`,
        `${input.localAllowlistCount} value(s) exempt from detection.`,
      ),
    });
  }

  return checks;
}

/** Pire statut de la liste (`fail` > `warn` > `ok`). */
export function overallStatus(checks: readonly DiagnosticCheck[]): DiagnosticStatus {
  if (checks.some((c) => c.status === 'fail')) {
    return 'fail';
  }
  return checks.some((c) => c.status === 'warn') ? 'warn' : 'ok';
}

/** Rapport copiable : identifiants, statuts et détails — aucun contenu utilisateur. */
export function formatDiagnosticsReport(checks: readonly DiagnosticCheck[]): string {
  return JSON.stringify(
    {
      tool: 'shadow-ai-sentinel',
      overall: overallStatus(checks),
      checks: checks.map(({ id, status, detail }) => ({ id, status, detail })),
    },
    null,
    2,
  );
}
