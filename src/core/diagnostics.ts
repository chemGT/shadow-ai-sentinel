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

  add({
    id: 'version',
    status: 'ok',
    label: 'Version',
    detail: `${input.version} (${input.browser})`,
  });

  const failingRules = runEngineSelfTest();
  add(
    failingRules.length === 0
      ? {
          id: 'engine-self-test',
          status: 'ok',
          label: 'Moteur de détection',
          detail: `${ALL_RULE_TYPES.length}/${ALL_RULE_TYPES.length} détecteurs reconnaissent leur échantillon de test.`,
        }
      : {
          id: 'engine-self-test',
          status: 'fail',
          label: 'Moteur de détection',
          detail: `Détecteurs en échec : ${failingRules.join(', ')}.`,
          fix: 'Réinstallez ou mettez à jour l’extension ; si le problème persiste, ouvrez un ticket avec ce rapport.',
        },
  );

  add(
    input.storageWorks
      ? { id: 'storage', status: 'ok', label: 'Stockage local', detail: 'Lecture et écriture OK.' }
      : {
          id: 'storage',
          status: 'fail',
          label: 'Stockage local',
          detail: 'Lecture ou écriture impossible : les réglages ne sont pas enregistrés, les règles par défaut s’appliquent.',
          fix: 'Vérifiez que le profil du navigateur n’est pas en lecture seule ou plein, puis rechargez l’extension.',
        },
  );

  add(
    input.localPolicyErrors.length === 0
      ? { id: 'local-policy', status: 'ok', label: 'Policy locale', detail: 'Valide.' }
      : {
          id: 'local-policy',
          status: 'fail',
          label: 'Policy locale',
          detail: `Invalide (${input.localPolicyErrors.length} erreur(s)) : les règles par défaut s’appliquent à sa place.`,
          fix: 'Section « Avancé » : corrigez le JSON puis « Importer en local », ou modifiez une règle pour réécrire une policy valide.',
        },
  );

  if (!input.managedReadable) {
    add({
      id: 'managed-policy',
      status: 'warn',
      label: 'Policy gérée (organisation)',
      detail: 'Stockage géré illisible.',
      fix: 'Vérifiez la policy navigateur (chrome://policy, edge://policy ou about:policies) puis rechargez-la.',
    });
  } else if (input.managed.errors.length > 0) {
    add({
      id: 'managed-policy',
      status: 'fail',
      label: 'Policy gérée (organisation)',
      detail: `${input.managed.errors.length} valeur(s) ignorée(s) car invalide(s) : ${input.managed.errors.join(' ; ')}. Le réglage local (ou par défaut) s’applique à la place.`,
      fix: 'Corrigez la policy déployée (voir docs/deployment.md, section « Managed policy ») puis rechargez les policies du navigateur.',
    });
  } else {
    const managedKeys = [
      input.managed.rules !== undefined ? `${input.managed.rules.length} règle(s)` : '',
      input.managed.fail_mode !== undefined ? 'fail_mode' : '',
      input.managed.emailDomains !== undefined ? 'emailDomains' : '',
      input.managed.allowlist.length > 0 ? `${input.managed.allowlist.length} valeur(s) d’allowlist` : '',
      input.managed.lockSettings === true ? 'verrou des réglages locaux' : '',
    ].filter((v) => v.length > 0);
    add({
      id: 'managed-policy',
      status: 'ok',
      label: 'Policy gérée (organisation)',
      detail:
        managedKeys.length > 0
          ? `Appliquée : ${managedKeys.join(', ')}.`
          : 'Aucune policy déployée : réglages locaux uniquement.',
    });
  }

  const failMode = input.effectivePolicy.fail_mode ?? 'warn';
  add(
    failMode === 'open'
      ? {
          id: 'fail-mode',
          status: 'warn',
          label: 'Comportement en cas d’échec (fail_mode)',
          detail: 'open : un contenu non analysable (site modifié, texte trop long, fichier illisible) est envoyé.',
          fix: 'Passez à « warn » ou « closed » (policy gérée, ou section « Avancé »).',
        }
      : {
          id: 'fail-mode',
          status: 'ok',
          label: 'Comportement en cas d’échec (fail_mode)',
          detail:
            failMode === 'closed'
              ? 'closed : tout contenu non analysable est bloqué.'
              : 'warn : un contenu non analysable est envoyé avec un avertissement visible.',
        },
  );

  const disabled = ALL_RULE_TYPES.filter(
    (type) => input.effectivePolicy.rules.find((r) => r.type === type)?.enabled !== true,
  );
  const proEmailNeedsDomain =
    disabled.includes('pro_email') && input.effectivePolicy.emailDomains.length === 0;
  const reallyDisabled = disabled.filter((t) => !(t === 'pro_email' && proEmailNeedsDomain));
  add(
    reallyDisabled.length === 0
      ? {
          id: 'rules',
          status: 'ok',
          label: 'Règles actives',
          detail: proEmailNeedsDomain
            ? 'Toutes actives, sauf pro_email (aucun domaine configuré — normal hors entreprise).'
            : 'Toutes actives.',
        }
      : {
          id: 'rules',
          status: 'warn',
          label: 'Règles actives',
          detail: `Désactivées : ${reallyDisabled.join(', ')}.`,
          fix: 'Réactivez-les dans « Règles de détection » si ce n’est pas voulu.',
        },
  );

  add(
    input.missingHostPermissions.length === 0
      ? {
          id: 'host-permissions',
          status: 'ok',
          label: 'Accès aux sites protégés',
          detail: 'Accordé pour tous les sites pris en charge.',
        }
      : {
          id: 'host-permissions',
          status: 'fail',
          label: 'Accès aux sites protégés',
          detail: `Non accordé pour : ${input.missingHostPermissions.join(', ')}. L’extension n’y est pas injectée : aucune protection sur ces sites.`,
          fix:
            input.browser === 'firefox'
              ? 'about:addons → Shadow AI Sentinel → Permissions : activez l’accès à ces sites.'
              : 'Page des extensions → Shadow AI Sentinel → Détails → « Accès au site » : autorisez ces sites.',
        },
  );

  add(
    input.backgroundResponds
      ? { id: 'background', status: 'ok', label: 'Processus d’arrière-plan', detail: 'Répond.' }
      : {
          id: 'background',
          status: 'warn',
          label: 'Processus d’arrière-plan',
          detail: 'Pas de réponse. Les pages lisent alors la policy directement depuis le stockage : la protection reste active.',
          fix: 'Rechargez l’extension depuis la page des extensions si cela persiste.',
        },
  );

  add(
    input.adapterHealth === 'healthy'
      ? {
          id: 'adapter-health',
          status: 'ok',
          label: 'Dernier site visité',
          detail: 'Zone de saisie reconnue.',
        }
      : {
          id: 'adapter-health',
          status: 'fail',
          label: 'Dernier site visité',
          detail: 'Zone de saisie non reconnue : le site a changé, la protection y est inactive.',
          fix: 'Mettez l’extension à jour. Si elle est à jour, signalez le site (modèle de ticket « site-broken »).',
        },
  );

  if (input.localAllowlistCount > 0 && input.managed.lockSettings !== true) {
    add({
      id: 'allowlist',
      status: 'ok',
      label: 'Allowlist locale',
      detail: `${input.localAllowlistCount} valeur(s) exemptée(s) de détection.`,
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
