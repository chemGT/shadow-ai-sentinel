/**
 * Corpus adversarial d'évasion du moteur DLP — cf. `docs/security/evasion-threat-model.md`.
 *
 * Deux catégories de tests :
 *  - Régressions POSITIVES : la détection DOIT fonctionner (verrou permanent contre une régression).
 *  - `[BYPASS CONNU]` : contournements RÉELS non couverts aujourd'hui. Le test asserte le
 *    comportement ACTUEL (non-détection) pour rester vert, tout en traçant le trou : si un jour la
 *    détection est renforcée, le test échouera et forcera sa mise à jour (le trou ne sera pas oublié).
 *    Chaque cas est daté + cause racine `fichier:ligne`, repris dans `docs/security/bypasses-2026-09.md`.
 *
 * Autonome : aucune dépendance réseau ni site réel. `File` (Node 20+) sert aux prédicats de fichier.
 */
import { describe, expect, it } from 'vitest';
import { createDefaultPolicy } from '../defaults.js';
import { detectSensitiveData } from '../regex-engine.js';
import { isBinaryScannableFile, isPdfFile } from '../binary-file.js';
import { isTextLikeFile } from '../text-file.js';
import type { Policy, RuleType } from '../types.js';

function allRules(domains: string[] = ['acme.com']): Policy {
  const base = createDefaultPolicy();
  return {
    ...base,
    emailDomains: domains,
    rules: base.rules.map((r) => ({ ...r, enabled: true })),
  };
}

function types(text: string, policy: Policy = allRules()): RuleType[] {
  return detectSensitiveData(text, policy).map((m) => m.ruleType);
}

function detects(text: string, ruleType: RuleType, policy: Policy = allRules()): boolean {
  return types(text, policy).includes(ruleType);
}

// Séparateurs Unicode (échappés pour rester lisibles et non-ambigus dans le source).
const NBSP = ' '; // espace insécable
const NNBSP = ' '; // espace insécable fine
const ZWSP = '​'; // zero-width space
const FEFF = '﻿'; // BOM / zero-width no-break space

// Valeurs de référence à checksum VALIDE (sinon les validateurs Luhn/mod-97 rejettent).
const AWS_KEY = 'AKIAIOSFODNN7EXAMPLE';
const IBAN_DE = 'DE89370400440532013000'; // mod-97 valide
const CARD_VISA = '4111111111111111'; // Luhn valide

// ---------------------------------------------------------------------------
// SOLIDE — ce qui résiste (régressions positives : DOIT rester détecté)
// ---------------------------------------------------------------------------
describe('SOLIDE — détections robustes (régressions permanentes)', () => {
  it('clé AWS brute', () => {
    expect(detects(`clé ${AWS_KEY} fin`, 'api_key')).toBe(true);
  });

  it('clé OpenAI sk- (longueur réaliste)', () => {
    expect(detects(`token sk-${'a'.repeat(48)}`, 'api_key')).toBe(true);
  });

  it('JWT/Bearer', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghij';
    expect(detects(`Authorization: Bearer ${jwt}`, 'generic_secret')).toBe(true);
  });

  it('IBAN contigu et espacé (ASCII)', () => {
    expect(detects(`vir ${IBAN_DE}`, 'iban')).toBe(true);
    expect(detects('FR76 3000 6000 0112 3456 7890 189', 'iban')).toBe(true);
  });

  it('carte Visa contiguë / espacée / tiretée (ASCII)', () => {
    expect(detects(CARD_VISA, 'card')).toBe(true);
    expect(detects('4111 1111 1111 1111', 'card')).toBe(true);
    expect(detects('4111-1111-1111-1111', 'card')).toBe(true);
  });

  it('IP RFC1918', () => {
    expect(detects('host 192.168.10.25', 'internal_ip')).toBe(true);
  });

  it('e-mail pro sur domaine exact (casse indifférente)', () => {
    expect(detects('contact jean@acme.com', 'pro_email')).toBe(true);
    expect(detects('contact JEAN@ACME.COM', 'pro_email')).toBe(true);
  });

  it('téléphone FR national (contigu / espacé / NBSP)', () => {
    expect(detects('appel 0612345678', 'phone')).toBe(true);
    expect(detects('appel 06 12 34 56 78', 'phone')).toBe(true);
    // NBSP toléré par la classe \s du motif téléphone (contrairement à IBAN/carte).
    expect(detects(`appel 06${NBSP}12${NBSP}34${NBSP}56${NBSP}78`, 'phone')).toBe(true);
  });

  it('pas de faux positif sur du texte / des chiffres anodins', () => {
    expect(types('bonjour, réunion à 14h').length).toBe(0);
    expect(detects('référence commande 1234567890123456', 'card')).toBe(false);
    expect(detects('dns 8.8.8.8', 'internal_ip')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CORRECTIF 2026-09-15 — téléphone au format international +33 (régression)
// Auparavant NON détecté (cf. bypasses-2026-09.md #1). Ces tests verrouillent le correctif
// `phone.ts` (ancrage `(?<![\w+])`) : ils DOIVENT passer.
// ---------------------------------------------------------------------------
describe('CORRECTIF — téléphone +33 (international) désormais détecté', () => {
  it('+33 contigu', () => {
    expect(detects('appel +33612345678', 'phone')).toBe(true);
  });
  it('+33 espacé (format carnet de contacts)', () => {
    expect(detects('appel +33 6 12 34 56 78', 'phone')).toBe(true);
  });
  it('+33 pointé', () => {
    expect(detects('appel +33.6.12.34.56.78', 'phone')).toBe(true);
  });
  it('0033 (préfixe international alternatif) toujours détecté', () => {
    expect(detects('appel 0033612345678', 'phone')).toBe(true);
  });
  it('E.164 non-FR (US) toujours détecté', () => {
    expect(detects('call +14155552671', 'phone')).toBe(true);
  });
  it('ne crée pas de faux positif sur un identifiant collé à un mot', () => {
    expect(detects('ticketX0612345678', 'phone')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// [BYPASS CONNU] — Encodages (aucune couche de décodage — limite assumée)
// Daté 2026-09-15. Cause racine : le moteur scanne le texte brut, cf. run-detectors.ts.
// ---------------------------------------------------------------------------
describe('[BYPASS CONNU] encodages — 2026-09-15', () => {
  it('[BYPASS CONNU] base64 d’une clé AWS échappe', () => {
    // b64("AKIAIOSFODNN7EXAMPLE") — aucun motif ne matche. Décoder généraliserait les FP → assumé.
    const b64 = Buffer.from(AWS_KEY).toString('base64');
    expect(detects(b64, 'api_key')).toBe(false);
  });
  it('[BYPASS CONNU] hex d’une clé AWS échappe', () => {
    const hex = Buffer.from(AWS_KEY).toString('hex');
    expect(detects(hex, 'api_key')).toBe(false);
  });
  it('[BYPASS CONNU] URL-encoding casse la frontière du motif', () => {
    expect(detects('AKIA%20IOSFODNN7EXAMPLE', 'api_key')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// [BYPASS CONNU] — Manipulations de chaîne
// ---------------------------------------------------------------------------
describe('[BYPASS CONNU] manipulations de chaîne — 2026-09-15', () => {
  it('[BYPASS CONNU] découpage d’une clé sur deux lignes (api-key.ts:7, motif contigu)', () => {
    expect(detects('AKIA\nIOSFODNN7EXAMPLE', 'api_key')).toBe(false);
  });
  it('[BYPASS CONNU] séparateurs internes dans une clé (api-key.ts:7)', () => {
    expect(detects('AKIA-IOSF-ODNN-7EXA-MPLE', 'api_key')).toBe(false);
  });
  it('[BYPASS CONNU] enrobage par « _ » : \\b échoue car _ est un caractère \\w (api-key.ts:7-20)', () => {
    expect(detects(`x=_${AWS_KEY}_`, 'api_key')).toBe(false);
  });
  it('[BYPASS CONNU] inversion du secret', () => {
    expect(detects([...AWS_KEY].reverse().join(''), 'api_key')).toBe(false);
  });
  it('SOLIDE (contrôle) : la clé intacte au milieu de la même phrase est bien vue', () => {
    expect(detects(`avant ${AWS_KEY} après`, 'api_key')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// CORRECTIF — Unicode : normalisation défensive avant scan (detection/normalize.ts)
// Fermé le 2026-10-18 (B1, B2, B4 de bypasses-2026-09.md).
// ---------------------------------------------------------------------------
describe('CORRECTIF — unicode normalisé avant scan (B1/B2/B4)', () => {
  it('zero-width (U+200B) dans une clé', () => {
    expect(detects(`AKIA${ZWSP}IOSFODNN7EXAMPLE`, 'api_key')).toBe(true);
  });
  it('BOM/ZWNBSP (U+FEFF) dans une carte', () => {
    expect(detects(`4111${FEFF}1111${FEFF}1111${FEFF}1111`, 'card')).toBe(true);
  });
  it('IBAN séparé par NBSP', () => {
    const nbsp = `DE89${NBSP}3704${NBSP}0044${NBSP}0532${NBSP}0130${NBSP}00`;
    expect(detects(nbsp, 'iban')).toBe(true);
  });
  it('IBAN séparé par tirets', () => {
    expect(detects('DE89-3704-0044-0532-0130-00', 'iban')).toBe(true);
  });
  it('IBAN à tirets au checksum faux toujours rejeté (mod-97)', () => {
    expect(detects('DE88-3704-0044-0532-0130-00', 'iban')).toBe(false);
  });
  it('carte séparée par NBSP', () => {
    expect(detects(`4111${NBSP}1111${NBSP}1111${NBSP}1111`, 'card')).toBe(true);
  });
  it('carte séparée par NNBSP fine (U+202F)', () => {
    expect(detects(`4111${NNBSP}1111${NNBSP}1111${NNBSP}1111`, 'card')).toBe(true);
  });
  it('homoglyphe cyrillique dans une clé (А = U+0410)', () => {
    expect(detects('АKIAIOSFODNN7EXAMPLE', 'api_key')).toBe(true);
  });
  it('chiffre pleine chasse dans une carte (U+FF14)', () => {
    expect(detects('４111111111111111', 'card')).toBe(true);
  });
  it('clé entièrement en pleine chasse', () => {
    const fullwidth = [...AWS_KEY]
      .map((c) => String.fromCodePoint(c.codePointAt(0)! + 0xfee0))
      .join('');
    expect(detects(fullwidth, 'api_key')).toBe(true);
  });
  it('offsets ramenés au texte ORIGINAL (caviardage du segment réellement saisi)', () => {
    const text = `x ${ZWSP}АKIA${ZWSP}IOSFODNN7EXAMPLE y`;
    const [match] = detectSensitiveData(text, allRules()).filter((m) => m.ruleType === 'api_key');
    expect(text.slice(match.start, match.end)).toBe(`АKIA${ZWSP}IOSFODNN7EXAMPLE`);
  });
  it('pas de faux positif sur du texte cyrillique/grec ordinaire', () => {
    expect(types('Привет, как дела ? Καλημέρα σας. ＡＢＣ　テスト')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// [BYPASS CONNU] — Unicode résiduel
// ---------------------------------------------------------------------------
describe('[BYPASS CONNU] unicode — 2026-09-15', () => {
  it('[BYPASS CONNU] carte séparée par des points (card.ts:12) — NE PAS corriger (FP versions)', () => {
    expect(detects('4111.1111.1111.1111', 'card')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CORRECTIF 2026-10-19 — pro_email sous-domaines (bypass B3 corrigé, issue #11)
// Auparavant NON détecté (cf. `docs/security/bypasses-2026-09.md` B3). Ces tests verrouillent
// le correctif `pro-email.ts` : ils DOIVENT passer.
// ---------------------------------------------------------------------------
describe('CORRECTIF — pro_email sous-domaines (B3)', () => {
  it('sous-domaine du domaine configuré désormais détecté', () => {
    expect(detects('contact jean@mail.acme.com', 'pro_email')).toBe(true);
    expect(detects('contact jean@eu.acme.com', 'pro_email')).toBe(true);
    expect(detects('contact jean@a.b.c.acme.com', 'pro_email')).toBe(true);
  });
  it('ne matche pas un domaine qui se termine par le domaine configuré', () => {
    expect(detects('contact jean@evilmacme.com', 'pro_email')).toBe(false);
    expect(detects('contact jean@notacme.com', 'pro_email')).toBe(false);
  });
  it('hors allowlist toujours ignoré (contrôle)', () => {
    expect(detects('perso@gmail.com', 'pro_email')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// [BYPASS CONNU] — Fichiers : formats non scannés (prédicats core, sans DOM)
// ---------------------------------------------------------------------------
describe('[BYPASS CONNU] formats de fichier non scannés — 2026-09-15', () => {
  const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  function file(name: string, type: string): File {
    return new File(['peu importe le contenu'], name, { type });
  }

  it('SOLIDE (contrôle) : PDF et DOCX SONT reconnus scannables', () => {
    expect(isBinaryScannableFile(file('secret.pdf', 'application/pdf'))).toBe(true);
    expect(isBinaryScannableFile(file('secret.docx', DOCX))).toBe(true);
    expect(isPdfFile(file('secret.pdf', 'application/pdf'))).toBe(true);
  });

  it('[BYPASS CONNU] XLSX / PPTX / archives / images ne sont ni texte ni binaire scannable', () => {
    const cases: Array<[string, string]> = [
      ['budget.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      ['deck.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
      ['export.rtf', 'application/rtf'],
      ['data.zip', 'application/zip'],
      ['scan.png', 'image/png'],
    ];
    for (const [name, type] of cases) {
      const f = file(name, type);
      expect(isTextLikeFile(f)).toBe(false);
      expect(isBinaryScannableFile(f)).toBe(false);
    }
  });
});
