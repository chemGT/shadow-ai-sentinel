import { describe, expect, it } from 'vitest';
import { createDefaultPolicy } from './defaults.js';
import {
  DETECTION_CHUNK_SIZE,
  MAX_DETECTION_TOTAL_LENGTH,
  wasTextTruncated,
} from './detection/limits.js';
import { isValidCardChecksum } from './detection/card.js';
import { isValidIbanChecksum } from './detection/iban.js';
import { detectSensitiveData } from './regex-engine.js';
import type { Policy } from './types.js';

function policyWith(overrides: Partial<Policy> & { emailDomains?: string[] }): Policy {
  const base = createDefaultPolicy('tenant-test');
  return {
    ...base,
    ...overrides,
    rules: overrides.rules ?? base.rules,
    emailDomains: overrides.emailDomains ?? base.emailDomains,
  };
}

function enableAllRules(policy: Policy): Policy {
  return {
    ...policy,
    rules: policy.rules.map((r) => ({ ...r, enabled: true })),
    emailDomains: ['acme.com'],
  };
}

describe('isValidIbanChecksum', () => {
  it('valide un IBAN de référence', () => {
    expect(isValidIbanChecksum('DE89370400440532013000')).toBe(true);
    expect(isValidIbanChecksum('FR76 3000 6000 0112 3456 7890 189')).toBe(true);
  });

  it('rejette un IBAN invalide', () => {
    expect(isValidIbanChecksum('FR7612345678901234567890188')).toBe(false);
    expect(isValidIbanChecksum('XX00INVALID0000000000')).toBe(false);
  });
});

describe('detectSensitiveData — api_key', () => {
  it('détecte une clé AWS', () => {
    const text = 'clé = AKIAIOSFODNN7EXAMPLE pour S3';
    const matches = detectSensitiveData(text, enableAllRules(createDefaultPolicy()));
    expect(matches.some((m) => m.ruleType === 'api_key')).toBe(true);
    expect(matches.find((m) => m.ruleType === 'api_key')?.replacementToken).toBe(
      '[REDACTED_API_KEY]',
    );
  });

  it('détecte une clé OpenAI sk-', () => {
    const text = 'token sk-abcdefghijklmnopqrstuvwxyz1234567890';
    const matches = detectSensitiveData(text, enableAllRules(createDefaultPolicy()));
    expect(matches.some((m) => m.ruleType === 'api_key')).toBe(true);
  });

  it('détecte un token GitHub', () => {
    const text = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz12';
    const matches = detectSensitiveData(text, enableAllRules(createDefaultPolicy()));
    expect(matches.some((m) => m.ruleType === 'api_key')).toBe(true);
  });
});

describe('detectSensitiveData — iban', () => {
  it('détecte un IBAN valide', () => {
    const text = 'virement vers DE89370400440532013000 demain';
    const matches = detectSensitiveData(text, enableAllRules(createDefaultPolicy()));
    expect(matches.some((m) => m.ruleType === 'iban')).toBe(true);
  });

  it('détecte un IBAN formaté avec espaces (copier-coller usuel)', () => {
    const text = 'RIB : FR76 3000 6000 0112 3456 7890 189 merci';
    const matches = detectSensitiveData(text, enableAllRules(createDefaultPolicy()));
    const iban = matches.find((m) => m.ruleType === 'iban');
    expect(iban).toBeDefined();
    // Le match couvre l'IBAN complet, espaces compris (pour le caviardage).
    expect(text.slice(iban!.start, iban!.end)).toBe('FR76 3000 6000 0112 3456 7890 189');
  });

  it('ignore un IBAN espacé au checksum invalide', () => {
    const text = 'FR76 1234 5678 9012 3456 7890 188';
    const matches = detectSensitiveData(text, enableAllRules(createDefaultPolicy()));
    expect(matches.some((m) => m.ruleType === 'iban')).toBe(false);
  });

  it('ignore une chaîne type IBAN invalide', () => {
    const text = 'FR7612345678901234567890188';
    const matches = detectSensitiveData(text, enableAllRules(createDefaultPolicy()));
    expect(matches.some((m) => m.ruleType === 'iban')).toBe(false);
  });
});

describe('detectSensitiveData — internal_ip', () => {
  it('détecte une IP RFC1918', () => {
    const text = 'serveur sur 192.168.10.25 en local';
    const matches = detectSensitiveData(text, enableAllRules(createDefaultPolicy()));
    expect(matches.some((m) => m.ruleType === 'internal_ip')).toBe(true);
  });

  it('ignore une IP publique', () => {
    const text = 'DNS 8.8.8.8';
    const matches = detectSensitiveData(text, enableAllRules(createDefaultPolicy()));
    expect(matches.some((m) => m.ruleType === 'internal_ip')).toBe(false);
  });
});

describe('detectSensitiveData — pro_email', () => {
  it('détecte un email pro allowlisté', () => {
    const policy = policyWith({
      emailDomains: ['acme.com'],
      rules: createDefaultPolicy().rules.map((r) =>
        r.type === 'pro_email' ? { ...r, enabled: true } : r,
      ),
    });
    const matches = detectSensitiveData('contact: jean.dupont@acme.com', policy);
    expect(matches.some((m) => m.ruleType === 'pro_email')).toBe(true);
  });

  it('ignore gmail hors allowlist', () => {
    const policy = policyWith({
      emailDomains: ['acme.com'],
      rules: createDefaultPolicy().rules.map((r) =>
        r.type === 'pro_email' ? { ...r, enabled: true } : r,
      ),
    });
    const matches = detectSensitiveData('perso@gmail.com', policy);
    expect(matches.some((m) => m.ruleType === 'pro_email')).toBe(false);
  });

  it('ne scanne pas pro_email si désactivé', () => {
    const policy = policyWith({ emailDomains: ['acme.com'] });
    const matches = detectSensitiveData('jean@acme.com', policy);
    expect(matches.some((m) => m.ruleType === 'pro_email')).toBe(false);
  });
});

describe('detectSensitiveData — phone', () => {
  it('détecte un numéro FR', () => {
    const matches = detectSensitiveData(
      'appelez le 06 12 34 56 78',
      enableAllRules(createDefaultPolicy()),
    );
    expect(matches.some((m) => m.ruleType === 'phone')).toBe(true);
  });

  it('ignore une suite de chiffres sans format téléphone', () => {
    const matches = detectSensitiveData(
      'référence 1234567890123',
      enableAllRules(createDefaultPolicy()),
    );
    expect(matches.some((m) => m.ruleType === 'phone')).toBe(false);
  });
});

describe('detectSensitiveData — generic_secret', () => {
  it('détecte un Bearer token', () => {
    const matches = detectSensitiveData(
      'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig',
      enableAllRules(createDefaultPolicy()),
    );
    expect(matches.some((m) => m.ruleType === 'generic_secret')).toBe(true);
  });
});

describe('detectSensitiveData — policy', () => {
  it('respecte les règles désactivées', () => {
    const policy = policyWith({
      rules: createDefaultPolicy().rules.map((r) =>
        r.type === 'api_key' ? { ...r, enabled: false } : { ...r, enabled: true },
      ),
      emailDomains: ['acme.com'],
    });
    const matches = detectSensitiveData('AKIAIOSFODNN7EXAMPLE', policy);
    expect(matches.some((m) => m.ruleType === 'api_key')).toBe(false);
  });

  it('fusionne les chevauchements (api_key prioritaire)', () => {
    const text = 'AKIAIOSFODNN7EXAMPLE';
    const matches = detectSensitiveData(text, enableAllRules(createDefaultPolicy()));
    const apiMatches = matches.filter((m) => m.ruleType === 'api_key');
    expect(apiMatches.length).toBe(1);
  });
});

describe('detectSensitiveData — limites', () => {
  it('détecte un secret situé bien au-delà de l’ancien seuil de 100k grâce au chunking', () => {
    // Avant le fix : tout ce qui suivait 100k caractères était tronqué en silence — une clé
    // placée après un simple bourrage passait donc à travers le DLP sans aucune détection.
    const policy = enableAllRules(createDefaultPolicy());
    const padding = 'x'.repeat(DETECTION_CHUNK_SIZE + 5000);
    const text = `${padding} AKIAIOSFODNN7EXAMPLE`;
    const matches = detectSensitiveData(text, policy);
    expect(matches.some((m) => m.ruleType === 'api_key')).toBe(true);
  });

  it('détecte un secret à cheval sur une frontière de fenêtre (chevauchement)', () => {
    const policy = enableAllRules(createDefaultPolicy());
    // Place la clé (précédée d'un espace, requis par la frontière `\b` du motif AKIA) pour
    // qu'elle chevauche exactement la fin de la première fenêtre (DETECTION_CHUNK_SIZE) : sans
    // chevauchement suffisant, ni le chunk 1 (clé coupée) ni un chunk 2 mal placé ne la
    // verraient en entier.
    const keyStart = DETECTION_CHUNK_SIZE - 10;
    const padding = 'x'.repeat(keyStart - 1);
    const text = `${padding} AKIAIOSFODNN7EXAMPLE`;
    const matches = detectSensitiveData(text, policy);
    const match = matches.find((m) => m.ruleType === 'api_key');
    expect(match).toBeDefined();
    expect(text.slice(match!.start, match!.end)).toBe('AKIAIOSFODNN7EXAMPLE');
  });

  it('ne détecte pas deux fois un secret trouvé dans la zone de chevauchement', () => {
    const policy = enableAllRules(createDefaultPolicy());
    const keyStart = DETECTION_CHUNK_SIZE - 10;
    const padding = 'x'.repeat(keyStart - 1);
    const text = `${padding} AKIAIOSFODNN7EXAMPLE`;
    const matches = detectSensitiveData(text, policy);
    expect(matches.filter((m) => m.ruleType === 'api_key').length).toBe(1);
  });

  it('tronque (avec perte) au-delà du plafond absolu, sans planter', () => {
    const policy = enableAllRules(createDefaultPolicy());
    const padding = 'x'.repeat(MAX_DETECTION_TOTAL_LENGTH + 5000);
    const text = `${padding} AKIAIOSFODNN7EXAMPLE`;
    expect(wasTextTruncated(text)).toBe(true);
    const matches = detectSensitiveData(text, policy);
    expect(matches.some((m) => m.ruleType === 'api_key')).toBe(false);
  });

  it('wasTextTruncated — seuil exact', () => {
    expect(wasTextTruncated('x'.repeat(MAX_DETECTION_TOTAL_LENGTH))).toBe(false);
    expect(wasTextTruncated('x'.repeat(MAX_DETECTION_TOTAL_LENGTH + 1))).toBe(true);
  });

  it('reste rapide sur ~10k caractères', () => {
    const policy = enableAllRules(createDefaultPolicy());
    const text = `${'mot '.repeat(2500)}DE89370400440532013000 ${'fin '.repeat(2500)}`;
    const start = performance.now();
    detectSensitiveData(text, policy);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });
});

describe('isValidCardChecksum (Luhn)', () => {
  it('valide des numéros de test connus (Visa/Mastercard/Amex)', () => {
    expect(isValidCardChecksum('4111 1111 1111 1111')).toBe(true);
    expect(isValidCardChecksum('5500000000000004')).toBe(true);
    expect(isValidCardChecksum('3782 822463 10005')).toBe(true);
  });

  it('rejette un numéro au checksum invalide', () => {
    expect(isValidCardChecksum('4111 1111 1111 1112')).toBe(false);
  });

  it('rejette une longueur hors bornes (13-19)', () => {
    expect(isValidCardChecksum('411111')).toBe(false);
    expect(isValidCardChecksum('4'.repeat(20))).toBe(false);
  });
});

describe('detectSensitiveData — card', () => {
  it('détecte une carte Visa valide (Luhn) et masque avec le bon token', () => {
    const text = 'ma carte : 4111 1111 1111 1111 merci';
    const matches = detectSensitiveData(text, enableAllRules(createDefaultPolicy()));
    const card = matches.find((m) => m.ruleType === 'card');
    expect(card).toBeDefined();
    expect(card?.replacementToken).toBe('[REDACTED_CARD]');
  });

  it('ignore un numéro de 16 chiffres au checksum Luhn invalide (ex. numéro de commande)', () => {
    const text = 'commande n° 1234567890123456';
    const matches = detectSensitiveData(text, enableAllRules(createDefaultPolicy()));
    expect(matches.some((m) => m.ruleType === 'card')).toBe(false);
  });

  it('ne scanne pas card si désactivé', () => {
    const text = '4111 1111 1111 1111';
    const policy = createDefaultPolicy();
    const disabled = {
      ...policy,
      rules: policy.rules.map((r) => (r.type === 'card' ? { ...r, enabled: false } : r)),
    };
    const matches = detectSensitiveData(text, disabled);
    expect(matches.some((m) => m.ruleType === 'card')).toBe(false);
  });

  it('ne remonte pas de faux positif "card" sur un IBAN déjà détecté (priorité iban)', () => {
    const text = 'RIB : FR76 3000 6000 0112 3456 7890 189 merci';
    const matches = detectSensitiveData(text, enableAllRules(createDefaultPolicy()));
    expect(matches.some((m) => m.ruleType === 'iban')).toBe(true);
    expect(matches.some((m) => m.ruleType === 'card')).toBe(false);
  });

  it('ignore un numéro de téléphone FR (trop court pour une carte)', () => {
    const text = 'appelez le 06 12 34 56 78';
    const matches = detectSensitiveData(text, enableAllRules(createDefaultPolicy()));
    expect(matches.some((m) => m.ruleType === 'card')).toBe(false);
  });
});
