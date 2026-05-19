import { createDefaultPolicy } from '../../core/defaults.js';
import type { Policy, RuleType } from '../../core/types.js';

export type RegexRegressionCase = {
  id: string;
  text: string;
  /** Types attendus (au moins un). Vide = aucune détection. */
  expectTypes: RuleType[];
  buildPolicy?: () => Policy;
};

function enableAllWithDomains(domains: string[]): Policy {
  return {
    ...createDefaultPolicy('fixture'),
    emailDomains: domains,
    rules: createDefaultPolicy().rules.map((r) => ({ ...r, enabled: true })),
  };
}

/** Jeu de régression versionné — tout échec CI bloque un merge. */
export const REGEX_POSITIVE_CASES: RegexRegressionCase[] = [
  { id: 'P01-aws', text: 'AKIAIOSFODNN7EXAMPLE', expectTypes: ['api_key'] },
  {
    id: 'P02-openai-sk',
    text: 'sk-abcdefghijklmnopqrstuvwxyz1234567890',
    expectTypes: ['api_key'],
  },
  {
    id: 'P03-github',
    text: 'ghp_1234567890abcdefghijklmnopqrstuvwxyz12',
    expectTypes: ['api_key'],
  },
  {
    id: 'P04-iban',
    text: 'virement DE89370400440532013000',
    expectTypes: ['iban'],
  },
  {
    id: 'P05-ip-private',
    text: 'host 192.168.0.1 local',
    expectTypes: ['internal_ip'],
  },
  {
    id: 'P06-phone-fr',
    text: 'tel 06 12 34 56 78',
    expectTypes: ['phone'],
  },
  {
    id: 'P07-bearer',
    text: 'Bearer eyJhbGciOiJIUzI1NiJ9.abc.defghijklmnop',
    expectTypes: ['generic_secret'],
  },
  {
    id: 'P08-pro-email',
    text: 'contact jean@acme.com',
    expectTypes: ['pro_email'],
    buildPolicy: () => enableAllWithDomains(['acme.com']),
  },
];

export const REGEX_NEGATIVE_CASES: RegexRegressionCase[] = [
  { id: 'N01-public-ip', text: 'dns 8.8.8.8', expectTypes: [] },
  { id: 'N02-invalid-iban', text: 'FR7612345678901234567890188', expectTypes: [] },
  { id: 'N03-gmail', text: 'user@gmail.com', expectTypes: [], buildPolicy: () => enableAllWithDomains(['acme.com']) },
  { id: 'N04-random-digits', text: 'ref 1234567890123456', expectTypes: [] },
  { id: 'N05-plain-text', text: 'bonjour monde', expectTypes: [] },
];
