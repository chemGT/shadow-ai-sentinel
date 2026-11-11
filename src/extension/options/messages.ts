import type { Locale, RuleType } from '../../core/types.js';
import { resolveLocale } from '../../ui/i18n/messages.js';

/**
 * Textes de la page d'options (FR / EN). La langue suit `navigator.language`
 * (`resolveLocale`, comme la modale et la popup) : français si le navigateur est en français,
 * anglais sinon. Le HTML garde le français en repli ; `applyStaticTranslations` y applique le
 * dictionnaire de la langue résolue via les attributs `data-i18n*`.
 */
export type StaticKey =
  | 'hint'
  | 'managedBanner'
  | 'allowlistLegend'
  | 'allowlistHint'
  | 'allowlistLabel'
  | 'saveAllowlist'
  | 'rulesLegend'
  | 'rulesHint'
  | 'colRule'
  | 'colEnabled'
  | 'colAction'
  | 'advanced'
  | 'policyLabel'
  | 'importPolicy'
  | 'exportPolicy'
  | 'diagLegend'
  | 'diagHint'
  | 'runDiag'
  | 'copyDiag';

export type OptionsMessages = {
  htmlLang: string;
  static: Record<StaticKey, string>;
  toastDismiss: string;
  allowlistPlaceholder: string;
  ruleLabels: Record<RuleType, string>;
  managedBadge: string;
  managedBadgeTitle: string;
  enableRule: (label: string) => string;
  ruleUpdated: (label: string) => string;
  ruleUpdateFailed: string;
  allowlistLocked: (count: number) => string;
  allowlistExtra: (count: number) => string;
  managedErrors: (errors: string[]) => string;
  statusLabels: { ok: string; warn: string; fail: string };
  diagOverall: { ok: string; warn: string; fail: string };
  reportCopied: string;
  reportCopyFailed: string;
  allowlistSaved: (count: number) => string;
  invalidJson: string;
  invalidPolicy: (errors: string[]) => string;
  policyImported: string;
  policyExported: string;
};

const FR: OptionsMessages = {
  htmlLang: 'fr',
  static: {
    hint: 'Configuration locale — règles DLP et allowlist. Rien ne quitte votre navigateur.',
    managedBanner:
      'Certains réglages sont gérés par votre organisation (policy navigateur). Ils sont appliqués en priorité et ne sont pas modifiables ici.',
    allowlistLegend: 'Allowlist',
    allowlistHint:
      'Une valeur par ligne. Ces valeurs exactes ne déclencheront pas la policy (anti faux-positifs).',
    allowlistLabel: 'Valeurs autorisées',
    saveAllowlist: 'Enregistrer l’allowlist',
    rulesLegend: 'Règles de détection',
    rulesHint:
      'Activez ou désactivez chaque type de donnée sensible et choisissez l’action appliquée quand une correspondance est détectée.',
    colRule: 'Règle',
    colEnabled: 'Activée',
    colAction: 'Action',
    advanced: 'Avancé',
    policyLabel: 'Contenu (import / édition manuelle)',
    importPolicy: 'Importer en local',
    exportPolicy: 'Exporter depuis le stockage',
    diagLegend: 'Diagnostic',
    diagHint:
      'Vérifie localement que la protection fonctionne : moteur, réglages, policy de l’organisation, accès aux sites. Aucune donnée n’est envoyée ; le rapport ne contient ni texte saisi, ni valeur d’allowlist, ni nom de domaine.',
    runDiag: 'Relancer le diagnostic',
    copyDiag: 'Copier le rapport',
  },
  toastDismiss: 'Fermer la notification',
  allowlistPlaceholder: 'exemple@entreprise.com\n192.168.1.1',
  ruleLabels: {
    api_key: 'Clé API',
    iban: 'IBAN',
    internal_ip: 'IP interne',
    pro_email: 'Email professionnel',
    phone: 'Téléphone',
    generic_secret: 'Secret générique',
    card: 'Carte bancaire',
  },
  managedBadge: 'Géré',
  managedBadgeTitle: 'Règle imposée par la policy de votre organisation',
  enableRule: (label) => `Activer la règle ${label}`,
  ruleUpdated: (label) => `Règle « ${label} » mise à jour.`,
  ruleUpdateFailed: 'Mise à jour de la règle échouée.',
  allowlistLocked: (count) =>
    `Réglages verrouillés par votre organisation : cette liste locale n’est pas appliquée (${count} valeur(s) gérée(s) seulement).`,
  allowlistExtra: (count) =>
    `+ ${count} valeur(s) ajoutée(s) par votre organisation, appliquée(s) en plus de cette liste.`,
  managedErrors: (errors) =>
    `Policy de l’organisation partiellement ignorée (valeurs invalides) : ${errors.join(' ; ')}. ` +
    'Le réglage local ou par défaut s’applique à la place. Prévenez votre équipe sécurité.',
  statusLabels: { ok: 'OK', warn: 'À vérifier', fail: 'Problème' },
  diagOverall: {
    ok: 'Tout fonctionne.',
    warn: 'Protection active, avec des points à vérifier.',
    fail: 'Problème détecté : la protection est incomplète.',
  },
  reportCopied: 'Rapport de diagnostic copié.',
  reportCopyFailed: 'Copie impossible — sélectionnez le rapport dans la console.',
  allowlistSaved: (count) => `Allowlist enregistrée (${count} valeur(s)).`,
  invalidJson: 'JSON invalide — vérifiez la syntaxe (virgules, guillemets, accolades).',
  invalidPolicy: (errors) => `Policy invalide : ${errors.join(' · ')}`,
  policyImported: 'Policy importée en local.',
  policyExported: 'Policy exportée depuis le stockage.',
};

const EN: OptionsMessages = {
  htmlLang: 'en',
  static: {
    hint: 'Local configuration — DLP rules and allowlist. Nothing leaves your browser.',
    managedBanner:
      'Some settings are managed by your organization (browser policy). They take precedence and cannot be changed here.',
    allowlistLegend: 'Allowlist',
    allowlistHint: 'One value per line. These exact values will not trigger the policy (false-positive relief).',
    allowlistLabel: 'Allowed values',
    saveAllowlist: 'Save allowlist',
    rulesLegend: 'Detection rules',
    rulesHint:
      'Turn each type of sensitive data on or off and choose the action applied when a match is detected.',
    colRule: 'Rule',
    colEnabled: 'Enabled',
    colAction: 'Action',
    advanced: 'Advanced',
    policyLabel: 'Content (import / manual edit)',
    importPolicy: 'Import locally',
    exportPolicy: 'Export from storage',
    diagLegend: 'Diagnostic',
    diagHint:
      'Checks locally that protection works: engine, settings, organization policy, site access. No data is sent; the report contains no typed text, no allowlist value and no domain name.',
    runDiag: 'Run diagnostic again',
    copyDiag: 'Copy report',
  },
  toastDismiss: 'Dismiss notification',
  allowlistPlaceholder: 'example@company.com\n192.168.1.1',
  ruleLabels: {
    api_key: 'API key',
    iban: 'IBAN',
    internal_ip: 'Internal IP',
    pro_email: 'Work email',
    phone: 'Phone',
    generic_secret: 'Generic secret',
    card: 'Card number',
  },
  managedBadge: 'Managed',
  managedBadgeTitle: 'Rule enforced by your organization’s policy',
  enableRule: (label) => `Enable the ${label} rule`,
  ruleUpdated: (label) => `Rule “${label}” updated.`,
  ruleUpdateFailed: 'Rule update failed.',
  allowlistLocked: (count) =>
    `Settings locked by your organization: this local list is not applied (${count} managed value(s) only).`,
  allowlistExtra: (count) =>
    `+ ${count} value(s) added by your organization, applied on top of this list.`,
  managedErrors: (errors) =>
    `Organization policy partially ignored (invalid values): ${errors.join('; ')}. ` +
    'The local or default setting applies instead. Tell your security team.',
  statusLabels: { ok: 'OK', warn: 'Check', fail: 'Problem' },
  diagOverall: {
    ok: 'Everything works.',
    warn: 'Protection active, with points to check.',
    fail: 'Problem detected: protection is incomplete.',
  },
  reportCopied: 'Diagnostic report copied.',
  reportCopyFailed: 'Copy failed — select the report in the console.',
  allowlistSaved: (count) => `Allowlist saved (${count} value(s)).`,
  invalidJson: 'Invalid JSON — check the syntax (commas, quotes, braces).',
  invalidPolicy: (errors) => `Invalid policy: ${errors.join(' · ')}`,
  policyImported: 'Policy imported locally.',
  policyExported: 'Policy exported from storage.',
};

export const OPTIONS_MESSAGES: Record<Locale, OptionsMessages> = { fr: FR, en: EN };

export function optionsMessages(locale: Locale = resolveLocale()): OptionsMessages {
  return OPTIONS_MESSAGES[locale];
}

/**
 * Applique le dictionnaire aux éléments portant `data-i18n="clé"` (contenu texte), au bouton de
 * fermeture du toast (`data-i18n-aria-label`) et au placeholder de l'allowlist, et fixe
 * `<html lang>`.
 */
export function applyStaticTranslations(root: Document, messages: OptionsMessages): void {
  root.documentElement.lang = messages.htmlLang;
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = el.dataset.i18n as StaticKey | undefined;
    if (key && key in messages.static) {
      el.textContent = messages.static[key];
    }
  }
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n-aria-label]')) {
    el.setAttribute('aria-label', messages.toastDismiss);
  }
  root.getElementById('allowlist')?.setAttribute('placeholder', messages.allowlistPlaceholder);
}
