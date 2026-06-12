import type { Locale, RuleType } from '../../core/types.js';
import { REDACT_TOKENS } from '../../core/constants.js';

const RULE_LABELS: Record<Locale, Record<RuleType, string>> = {
  fr: {
    api_key: 'clé API',
    generic_secret: 'secret',
    iban: 'IBAN',
    internal_ip: 'adresse IP interne',
    pro_email: 'e-mail professionnel',
    phone: 'numéro de téléphone',
  },
  en: {
    api_key: 'API key',
    generic_secret: 'secret',
    iban: 'IBAN',
    internal_ip: 'internal IP address',
    pro_email: 'work email',
    phone: 'phone number',
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
      closeLabel: 'Comprendre',
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
      closeLabel: 'Comprendre',
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
    ? 'Shadow AI Sentinel — information employé'
    : 'Shadow AI Sentinel — employee information';
}

/** Notice premier lancement — sections courtes, compréhensibles sans formation. */
export function employeeNoticeSections(locale: Locale): EmployeeNoticeSection[] {
  if (locale === 'fr') {
    return [
      {
        heading: 'Pourquoi cette extension ?',
        paragraphs: [
          'Votre organisation l’a déployée pour limiter l’envoi accidentel de données sensibles vers les IA publiques (Claude, ChatGPT, Gemini — clés API, IBAN, secrets, etc.).',
        ],
      },
      {
        heading: 'Ce que fait Sentinel',
        bullets: [
          'Analyse votre saisie et les fichiers texte (.txt, .csv, .json, etc.) localement, avant envoi.',
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
        heading: 'Données transmises à votre entreprise',
        bullets: [
          'Type de règle déclenchée (ex. clé API, IBAN).',
          'Action effectuée (blocage ou masquage).',
          'Date et heure, version de la policy, identifiant technique anonyme de l’installation.',
        ],
      },
      {
        heading: 'Besoin d’aide ?',
        paragraphs: [
          'Contactez votre service sécurité ou votre DPO pour exercer vos droits ou obtenir le détail du traitement.',
        ],
      },
    ];
  }

  return [
    {
      heading: 'Why this extension?',
      paragraphs: [
        'Your organization deployed it to reduce accidental sharing of sensitive data with public AI tools (Claude, ChatGPT, Gemini — API keys, IBAN, secrets, etc.).',
      ],
    },
    {
      heading: 'What Sentinel does',
      bullets: [
        'Analyzes what you type and text file attachments (.txt, .csv, .json, etc.) locally before sending.',
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
      heading: 'Data shared with your organization',
      bullets: [
        'Rule type triggered (e.g. API key, IBAN).',
        'Action taken (block or mask).',
        'Timestamp, policy version, anonymous installation identifier.',
      ],
    },
    {
      heading: 'Questions?',
      paragraphs: [
        'Contact your security team or DPO for your rights or processing details.',
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
