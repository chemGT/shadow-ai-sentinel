import type { FeedbackContextChoice, Locale, RuleType } from '../../core/types.js';
import { REDACT_TOKENS } from '../../core/constants.js';

const RULE_LABELS: Record<Locale, Record<RuleType, string>> = {
  fr: {
    api_key: 'clé API',
    generic_secret: 'secret',
    iban: 'IBAN',
    internal_ip: 'adresse IP interne',
    pro_email: 'e-mail professionnel',
    phone: 'numéro de téléphone',
    card: 'carte bancaire',
  },
  en: {
    api_key: 'API key',
    generic_secret: 'secret',
    iban: 'IBAN',
    internal_ip: 'internal IP address',
    pro_email: 'work email',
    phone: 'phone number',
    card: 'card number',
  },
};

export type BlockModalCopy = {
  title: string;
  headline: string;
  body: string;
  hint: string;
  closeLabel: string;
};

export type EmployeeNoticeSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export function resolveLocale(): Locale {
  const lang = navigator.language.toLowerCase();
  return lang.startsWith('fr') ? 'fr' : 'en';
}

function ruleLabel(ruleType: RuleType, locale: Locale): string {
  return RULE_LABELS[locale][ruleType];
}

/** Modale Block — ton B2B, sans afficher la donnée détectée. */
export function blockModalCopy(ruleType: RuleType, locale: Locale): BlockModalCopy {
  const label = ruleLabel(ruleType, locale);

  if (locale === 'fr') {
    return {
      title: 'Envoi bloqué',
      headline: `Donnée sensible détectée : ${label}`,
      body:
        'Pour protéger votre organisation, votre message n’a pas été envoyé. ' +
        'Retirez la donnée du champ de saisie ou contactez votre équipe sécurité si vous pensez qu’il s’agit d’une erreur.',
      hint: 'Shadow AI Sentinel analyse le texte uniquement dans votre navigateur. Le contenu n’est ni stocké ni transmis.',
      closeLabel: "J'ai compris",
    };
  }

  return {
    title: 'Send blocked',
    headline: `Sensitive data detected: ${label}`,
    body:
      'To protect your organization, your message was not sent. ' +
      'Remove the data from the input field or contact your security team if you believe this is a mistake.',
    hint: 'Shadow AI Sentinel analyzes text only in your browser. Content is neither stored nor transmitted.',
    closeLabel: 'Got it',
  };
}

/** @deprecated Utiliser `blockModalCopy` — conservé pour compat tests existants. */
export function blockMessage(ruleType: RuleType, locale: Locale): string {
  const copy = blockModalCopy(ruleType, locale);
  return `${copy.headline} ${copy.body}`;
}

export function modalTitle(locale: Locale): string {
  return blockModalCopy('api_key', locale).title;
}

export function modalClose(locale: Locale): string {
  return blockModalCopy('api_key', locale).closeLabel;
}

/** Modale Block — pièce jointe texte. */
export function blockFileModalCopy(
  ruleType: RuleType,
  fileName: string,
  locale: Locale,
): BlockModalCopy {
  const label = ruleLabel(ruleType, locale);
  const safeName = fileName.replace(/[<>]/g, '');

  if (locale === 'fr') {
    return {
      title: 'Fichier bloqué',
      headline: `Donnée sensible détectée dans « ${safeName} » : ${label}`,
      body:
        'L’ajout de ce fichier a été annulé. Choisissez un autre fichier ou retirez les données sensibles avant de le joindre à la conversation.',
      hint: 'Seuls les fichiers texte (.txt, .csv, .json, etc.) sont analysés localement. Le contenu du fichier n’est pas envoyé à un serveur Sentinel.',
      closeLabel: "J'ai compris",
    };
  }

  return {
    title: 'File blocked',
    headline: `Sensitive data in “${safeName}”: ${label}`,
    body:
      'This file was not attached. Choose another file or remove sensitive data before attaching it to the conversation.',
    hint: 'Only text files (.txt, .csv, .json, etc.) are analyzed locally. File content is not sent to a Sentinel server.',
    closeLabel: 'Got it',
  };
}

/** Modale Block — PDF/DOCX dont la décision policy est "redact" (non réécrivable en place). */
export function blockUnsupportedFileFormatCopy(
  ruleTypes: RuleType[],
  fileName: string,
  locale: Locale,
): BlockModalCopy {
  const safeName = fileName.replace(/[<>]/g, '');
  const unique = [...new Set(ruleTypes)];
  const labels = unique.map((t) => ruleLabel(t, locale));

  if (locale === 'fr') {
    return {
      title: 'Fichier bloqué',
      headline: `Donnée sensible détectée dans « ${safeName} » : ${labels.join(', ')}`,
      body:
        'Ce format de fichier ne peut pas être caviardé sur place : le fichier a donc été ' +
        'bloqué plutôt que masqué. Retirez la donnée sensible du document ou copiez-collez le texte ' +
        'nécessaire dans le message.',
      hint: 'Seuls les fichiers texte peuvent être masqués automatiquement. Le contenu du fichier n’est pas envoyé à un serveur Sentinel.',
      closeLabel: "J'ai compris",
    };
  }

  return {
    title: 'File blocked',
    headline: `Sensitive data in “${safeName}”: ${labels.join(', ')}`,
    body:
      'This file format cannot be redacted in place, so it was blocked instead of masked. ' +
      'Remove the sensitive data from the document, or copy the text you need directly into the message.',
    hint: 'Only text files can be masked automatically. File content is not sent to a Sentinel server.',
    closeLabel: 'Got it',
  };
}

/** Toast — le texte dépassait le plafond de scan : la fin n'a pas été analysée. */
export function truncationNotice(locale: Locale): string {
  return locale === 'fr'
    ? 'Texte très volumineux : la fin du message n’a pas été analysée par le DLP avant envoi.'
    : 'Very large text: the end of the message was not scanned by DLP before sending.';
}

/** Toast — pièce jointe binaire trop volumineuse pour être scannée. */
export function fileTooLargeNotice(fileName: string, locale: Locale): string {
  const safeName = fileName.replace(/[<>]/g, '');
  return locale === 'fr'
    ? `Fichier « ${safeName} » trop volumineux pour être analysé : envoyé sans vérification DLP.`
    : `File “${safeName}” is too large to scan: sent without DLP verification.`;
}

/** Toast — PDF/DOCX illisible (corrompu, chiffré…), laissé passer sans blocage. */
export function fileScanFailedNotice(fileName: string, locale: Locale): string {
  const safeName = fileName.replace(/[<>]/g, '');
  return locale === 'fr'
    ? `Fichier « ${safeName} » illisible (corrompu ou protégé) : analyse DLP impossible, envoyé sans vérification.`
    : `File “${safeName}” could not be read (corrupted or protected): DLP scan skipped, sent without verification.`;
}

/** Toast Redact — fichier texte remplacé avant envoi. */
export function fileRedactNotice(
  ruleTypes: RuleType[],
  fileName: string,
  locale: Locale,
): string {
  const safeName = fileName.replace(/[<>]/g, '');
  const unique = [...new Set(ruleTypes)];
  const labels = unique.map((t) => ruleLabel(t, locale));

  if (locale === 'fr') {
    if (unique.length === 1) {
      return `Fichier « ${safeName} » : données ${labels[0]} masquées avant envoi. Vérifiez le contenu.`;
    }
    return `Fichier « ${safeName} » : données sensibles masquées (${labels.join(', ')}). Vérifiez avant envoi.`;
  }

  if (unique.length === 1) {
    return `File “${safeName}”: ${labels[0]} data masked before upload. Please review.`;
  }
  return `File “${safeName}”: sensitive data masked (${labels.join(', ')}). Please review.`;
}

/** Toast Redact — mentionne le jeton sans révéler la valeur d’origine. */
export function redactNotice(ruleTypes: RuleType[], locale: Locale): string {
  const unique = [...new Set(ruleTypes)];
  const labels = unique.map((t) => ruleLabel(t, locale));
  const tokens = unique.map((t) => REDACT_TOKENS[t]);

  if (locale === 'fr') {
    if (unique.length === 1) {
      const type = unique[0]!;
      return (
        `Donnée masquée (${ruleLabel(type, locale)}) : le jeton ${tokens[0]} remplace la valeur d’origine. ` +
        'Vérifiez le texte avant d’envoyer.'
      );
    }
    return (
      `Données sensibles masquées (${labels.join(', ')}). ` +
      `Des jetons du type ${tokens[0]} remplacent les valeurs d’origine. Vérifiez avant envoi.`
    );
  }

  if (unique.length === 1) {
    const type = unique[0]!;
    const label = ruleLabel(type, locale);
    return (
      `${label.charAt(0).toUpperCase() + label.slice(1)} masked: ` +
      `your message now contains the token ${tokens[0]}. Review the text before sending.`
    );
  }
  return (
    `Sensitive data masked (${labels.join(', ')}). ` +
    `Tokens such as ${tokens[0]} replace the original values. Review before sending.`
  );
}

export function employeeNoticeTitle(locale: Locale): string {
  return locale === 'fr'
    ? 'Shadow AI Sentinel — à savoir'
    : 'Shadow AI Sentinel — what you should know';
}

/** Notice premier lancement — sections courtes, compréhensibles sans formation. */
export function employeeNoticeSections(locale: Locale): EmployeeNoticeSection[] {
  if (locale === 'fr') {
    return [
      {
        heading: 'Pourquoi cette extension ?',
        paragraphs: [
          'Elle limite l’envoi accidentel de données sensibles vers les IA publiques (Claude, ChatGPT, Gemini, Le Chat, DeepSeek, Perplexity, Grok, Copilot — clés API, IBAN, secrets, etc.). Vous l’avez installée vous-même ou votre organisation l’a déployée.',
        ],
      },
      {
        heading: 'Ce que fait Sentinel',
        bullets: [
          'Analyse votre saisie et vos pièces jointes (texte, code, PDF, DOCX) localement, avant envoi.',
          'Peut bloquer l’envoi ou remplacer une donnée par un jeton (ex. [REDACTED_IBAN]).',
        ],
      },
      {
        heading: 'Ce que Sentinel ne fait pas',
        bullets: [
          'N’envoie pas le contenu de vos messages ni de vos prompts à un serveur.',
          'N’affiche jamais la donnée sensible en clair dans une alerte.',
        ],
      },
      {
        heading: 'Données transmises',
        bullets: [
          'Aucune : l’extension n’établit aucune connexion réseau, ni vers votre entreprise ni vers son éditeur.',
          'Seuls des compteurs locaux (blocages, masquages) sont conservés dans votre navigateur.',
        ],
      },
      {
        heading: 'Besoin d’aide ?',
        paragraphs: [
          'Extension déployée par votre entreprise : contactez votre service sécurité ou votre DPO. Le code source est public : github.com/chemGT/shadow-ai-sentinel.',
        ],
      },
    ];
  }

  return [
    {
      heading: 'Why this extension?',
      paragraphs: [
        'It reduces accidental sharing of sensitive data with public AI tools (Claude, ChatGPT, Gemini, Le Chat, DeepSeek, Perplexity, Grok, Copilot — API keys, IBAN, secrets, etc.). You installed it yourself or your organization deployed it.',
      ],
    },
    {
      heading: 'What Sentinel does',
      bullets: [
        'Analyzes what you type and your attachments (text, code, PDF, DOCX) locally before sending.',
        'May block sending or replace data with a token (e.g. [REDACTED_IBAN]).',
      ],
    },
    {
      heading: 'What Sentinel does not do',
      bullets: [
        'Does not send message or prompt content to a server.',
        'Never shows sensitive data in clear text in an alert.',
      ],
    },
    {
      heading: 'Data shared',
      bullets: [
        'None: the extension makes no network connection, neither to your organization nor to its authors.',
        'Only local counters (blocks, redactions) are kept in your browser.',
      ],
    },
    {
      heading: 'Questions?',
      paragraphs: [
        'Deployed by your organization? Contact your security team or DPO. The source code is public: github.com/chemGT/shadow-ai-sentinel.',
      ],
    },
  ];
}

/** @deprecated Corps plat — préférer `employeeNoticeSections`. */
export function employeeNoticeBody(locale: Locale): string {
  return employeeNoticeSections(locale)
    .flatMap((s) => [
      s.heading,
      ...(s.paragraphs ?? []),
      ...(s.bullets?.map((b) => `• ${b}`) ?? []),
    ])
    .join('\n\n');
}

export function employeeNoticeAck(locale: Locale): string {
  return locale === 'fr' ? "J'ai compris" : 'I understand';
}

export type AdapterHealthBannerCopy = {
  title: string;
  dismissLabel: string;
};

/** Bannière non bloquante — adaptateur cassé (sélecteurs obsolètes), fail_mode warn/closed. */
export function adapterHealthBannerCopy(locale: Locale): AdapterHealthBannerCopy {
  if (locale === 'fr') {
    return {
      title:
        'Protection inactive sur ce site — mise à jour requise. Contactez votre équipe sécurité.',
      dismissLabel: 'Masquer',
    };
  }
  return {
    title: 'Protection inactive on this site — update required. Contact your security team.',
    dismissLabel: 'Dismiss',
  };
}

export type FeedbackCopy = {
  triggerLabel: string;
  prompt: string;
  hint: string;
  submitLabel: string;
  cancelLabel: string;
  thanksLabel: string;
  choices: Record<FeedbackContextChoice, string>;
};

/** Textes pour le panneau de signalement faux positif. */
export function feedbackCopy(locale: Locale): FeedbackCopy {
  if (locale === 'fr') {
    return {
      triggerLabel: 'Signaler un faux positif',
      prompt: 'Dans quel contexte tapiez-vous cette donnée ?',
      hint: 'Ouvre une issue GitHub publique pré-remplie (règle, site, contexte). Aucun texte saisi n’y figure.',
      submitLabel: 'Ouvrir sur GitHub',
      cancelLabel: 'Annuler',
      thanksLabel: 'Issue ouverte dans un nouvel onglet. Merci.',
      choices: {
        code: 'Code source',
        prose: 'Texte / prose',
        json: 'JSON / configuration',
        url: 'URL / lien',
        other: 'Autre',
      },
    };
  }

  return {
    triggerLabel: 'Report false positive',
    prompt: 'What were you typing when this was flagged?',
    hint: 'Opens a prefilled public GitHub issue (rule, site, context). None of your typed text is included.',
    submitLabel: 'Open on GitHub',
    cancelLabel: 'Cancel',
    thanksLabel: 'Issue opened in a new tab. Thank you.',
    choices: {
      code: 'Source code',
      prose: 'Plain text / prose',
      json: 'JSON / configuration',
      url: 'URL / link',
      other: 'Other',
    },
  };
}
