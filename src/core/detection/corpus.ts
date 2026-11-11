import type { RuleType } from '../types.js';

/**
 * Corpus étiqueté du moteur de détection : chaque entrée dit ce qui DOIT être détecté
 * (`expect`, liste exacte des types) ou ne doit PAS l'être (`expect: []`).
 * - `gap: true` = manque connu et assumé, vérifié tel quel (même convention que
 *   `[BYPASS CONNU]` dans `evasion-corpus.test.ts`) : corriger le détecteur fait échouer le
 *   test, il faut alors retirer le drapeau.
 *
 * Toutes les valeurs sont FACTICES et assemblées à l'exécution (`rep`, concaténation) pour ne
 * pas ressembler à un secret réel dans le dépôt (scanners de secrets, push protection).
 * La policy utilisée active toutes les règles avec le domaine `acme.com`.
 */
export type CorpusEntry = {
  id: string;
  text: string;
  expect: RuleType[];
  gap?: true;
};

const rep = (s: string, n: number): string => s.repeat(n);
const B62 = 'aB3dE6gH9jK2mN5pQ8sT1vW4yZ7cF0hJ';

export const TRUE_POSITIVES: CorpusEntry[] = [
  // --- api_key
  { id: 'aws-access-key', text: 'AKIA' + 'IOSFODNN7EXAMPLE', expect: ['api_key'] },
  { id: 'aws-sts-key', text: 'ASIA' + 'IOSFODNN7EXAMPLE', expect: ['api_key'] },
  { id: 'openai-legacy', text: 'sk-' + B62 + 'aB3dE6gH9jK2mN5p', expect: ['api_key'] },
  { id: 'openai-project', text: 'sk-proj-' + B62 + '_' + B62, expect: ['api_key'] },
  { id: 'anthropic', text: 'sk-ant-api03-' + B62 + '-' + B62 + 'AA', expect: ['api_key'] },
  { id: 'deepseek-hex', text: 'sk-' + rep('0a1b2c3d', 4), expect: ['api_key'] },
  { id: 'stripe-live', text: 'sk_' + 'live_' + B62.slice(0, 24), expect: ['api_key'] },
  { id: 'stripe-restricted', text: 'rk_' + 'live_' + B62.slice(0, 24), expect: ['api_key'] },
  { id: 'stripe-webhook', text: 'whsec_' + B62, expect: ['api_key'] },
  { id: 'github-pat', text: 'ghp_' + B62 + 'aB3d', expect: ['api_key'] },
  { id: 'github-oauth', text: 'gho_' + B62 + 'aB3d', expect: ['api_key'] },
  { id: 'github-server', text: 'ghs_' + B62 + 'aB3d', expect: ['api_key'] },
  { id: 'github-fine-grained', text: 'github_pat_' + B62.slice(0, 22) + '_' + B62 + B62, expect: ['api_key'] },
  { id: 'gitlab-pat', text: 'glpat-' + B62.slice(0, 20), expect: ['api_key'] },
  { id: 'slack-bot', text: 'xoxb-' + '123456789012-1234567890123-' + B62.slice(0, 24), expect: ['api_key'] },
  { id: 'slack-app', text: 'xapp-' + '1-A0123456789-1234567890123-' + B62, expect: ['api_key'] },
  { id: 'slack-webhook', text: 'https://hooks.slack.com/services/' + 'T00000000/B00000000/' + rep('X', 24), expect: ['api_key'] },
  { id: 'google-api', text: 'AIza' + 'SyA' + B62, expect: ['api_key'] },
  { id: 'npm-token', text: 'npm_' + B62 + 'aB3d', expect: ['api_key'] },
  { id: 'huggingface', text: 'hf_' + B62 + 'aB', expect: ['api_key'] },
  { id: 'sendgrid', text: 'SG.' + B62.slice(0, 22) + '.' + B62 + B62.slice(0, 11), expect: ['api_key'] },
  { id: 'twilio-api-key', text: 'SK' + rep('0a1b2c3d', 4), expect: ['api_key'] },
  { id: 'digitalocean', text: 'dop_v1_' + rep('0a1b2c3d', 8), expect: ['api_key'] },
  {
    id: 'pem-rsa',
    text: '-----BEGIN RSA PRIVATE KEY-----\n' + rep('MIIEpAIBAAKCAQEA7bq9\n', 6) + '-----END RSA PRIVATE KEY-----',
    expect: ['api_key'],
  },
  {
    id: 'pem-openssh',
    text: '-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAA\n-----END OPENSSH PRIVATE KEY-----',
    expect: ['api_key'],
  },
  { id: 'pem-header-only', text: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkq', expect: ['api_key'] },
  {
    id: 'azure-connection-string',
    text: 'DefaultEndpointsProtocol=https;AccountName=acct;AccountKey=' + rep('Ab1+/', 17) + 'A==;EndpointSuffix=core.windows.net',
    expect: ['api_key'],
  },
  // --- generic_secret
  { id: 'bearer-opaque', text: 'Authorization: Bearer ' + B62, expect: ['generic_secret'] },
  { id: 'bearer-padded', text: 'Authorization: Bearer ' + B62 + '==', expect: ['generic_secret'] },
  { id: 'bearer-long', text: 'Bearer ' + rep(B62, 20), expect: ['generic_secret'] },
  { id: 'basic-auth', text: 'Authorization: Basic ' + btoa('alice:Sup3rS3cret'), expect: ['generic_secret'] },
  {
    id: 'jwt',
    text: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.' + 'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    expect: ['generic_secret'],
  },
  { id: 'db-url', text: 'postgres://admin:' + 'S3cretP4ss' + '@db.example.internal:5432/prod', expect: ['generic_secret'] },
  { id: 'https-basic-url', text: 'git clone https://deploy:' + 'tok3nValue' + '@git.example.org/repo.git', expect: ['generic_secret'] },
  { id: 'env-password', text: 'DB_PASSWORD=' + 'Sup3rS3cret42', expect: ['generic_secret'] },
  { id: 'json-client-secret', text: '"client_secret": "' + 'aB3dE6gH9jK2mN5p' + '"', expect: ['generic_secret'] },
  { id: 'aws-secret-with-name', text: 'aws_secret_access_key = ' + 'wJalrXUtnFEMI/K7MDENG/bPxRfiCY' + 'EXAMPLEKEY', expect: ['generic_secret'] },
  { id: 'yaml-api-key', text: 'api_key: ' + 'q7w8e9r0t1y2u3i4', expect: ['generic_secret'] },
  // --- iban
  { id: 'iban-fr-grouped', text: 'FR76 3000 6000 0112 3456 7890 189', expect: ['iban'] },
  { id: 'iban-de-contiguous', text: 'DE89370400440532013000', expect: ['iban'] },
  { id: 'iban-lowercase', text: 'fr7630006000011234567890189', expect: ['iban'] },
  { id: 'iban-dashes', text: 'DE89-3704-0044-0532-0130-00', expect: ['iban'] },
  { id: 'iban-dots', text: 'FR76.3000.6000.0112.3456.7890.189', expect: ['iban'] },
  { id: 'iban-gb', text: 'GB29 NWBK 6016 1331 9268 19', expect: ['iban'] },
  // --- card
  { id: 'card-visa-grouped', text: '4111 1111 1111 1111', expect: ['card'] },
  { id: 'card-visa-contiguous', text: 'cb 4111111111111111 exp 12/29', expect: ['card'] },
  { id: 'card-mastercard', text: '5555-5555-5555-4444', expect: ['card'] },
  { id: 'card-mastercard-2-series', text: '2223 0031 2200 3222', expect: ['card'] },
  { id: 'card-amex', text: '3782 822463 10005', expect: ['card'] },
  { id: 'card-discover', text: '6011111111111117', expect: ['card'] },
  // --- phone
  { id: 'phone-fr-spaces', text: '06 12 34 56 78', expect: ['phone'] },
  { id: 'phone-fr-contiguous', text: 'tel 0612345678', expect: ['phone'] },
  { id: 'phone-fr-dots', text: '01.23.45.67.89', expect: ['phone'] },
  { id: 'phone-fr-intl', text: '+33 6 12 34 56 78', expect: ['phone'] },
  { id: 'phone-us-contiguous', text: '+14155552671', expect: ['phone'] },
  { id: 'phone-us-grouped', text: 'call +1 415 555 2671 now', expect: ['phone'] },
  { id: 'phone-uk-grouped', text: '+44 20 7946 0958', expect: ['phone'] },
  { id: 'phone-us-intl-parens', text: 'call +1 (415) 555-2671', expect: ['phone'] },
  { id: 'phone-uk-intl-trunk-zero', text: '+44 (0)20 7946 0958', expect: ['phone'] },
  { id: 'phone-de-intl', text: '+49 30 12345678', expect: ['phone'] },
  { id: 'phone-es-intl-dots', text: '+34.612.345.678', expect: ['phone'] },
  { id: 'phone-jp-intl', text: '+81 3-1234-5678', expect: ['phone'] },
  { id: 'phone-00-prefix-uk', text: '0044 20 7946 0958', expect: ['phone'] },
  { id: 'phone-00-prefix-de', text: 'tel 0049 30 12345678', expect: ['phone'] },
  { id: 'phone-nanp-dashes', text: '415-555-2671', expect: ['phone'] },
  { id: 'phone-nanp-parens', text: '(415) 555-2671', expect: ['phone'] },
  { id: 'phone-nanp-dots', text: 'call 415.555.2671', expect: ['phone'] },
  { id: 'phone-nanp-spaces', text: '415 555 2671', expect: ['phone'] },
  { id: 'phone-nanp-with-1', text: '1-415-555-2671', expect: ['phone'] },
  { id: 'phone-uk-national-mobile', text: '07911 123456', expect: ['phone'] },
  { id: 'phone-uk-national-mobile-3x3', text: '07911 123 456', expect: ['phone'] },
  { id: 'phone-uk-national-landline', text: '020 7946 0958', expect: ['phone'] },
  { id: 'phone-uk-national-landline-4', text: '0161 496 0123', expect: ['phone'] },
  // --- internal_ip
  { id: 'ip-10', text: 'server 10.12.3.4 down', expect: ['internal_ip'] },
  { id: 'ip-172', text: '172.16.254.1', expect: ['internal_ip'] },
  { id: 'ip-192', text: 'http://192.168.1.10:8080/admin', expect: ['internal_ip'] },
  // --- pro_email
  { id: 'email-domain', text: 'jean.dupont@acme.com', expect: ['pro_email'] },
  { id: 'email-subdomain', text: 'jean@mail.acme.com', expect: ['pro_email'] },
  { id: 'email-uppercase', text: 'Jean.Dupont@ACME.COM', expect: ['pro_email'] },
  // --- manques connus (assumés, cf. docs/security/evasion-threat-model.md)
  { id: 'GAP-aws-secret-bare', text: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCY' + 'EXAMPLEKEY', expect: [], gap: true },
  { id: 'GAP-ipv6-ula', text: 'fd12:3456:789a:1::1', expect: [], gap: true },
  { id: 'GAP-fr-nir', text: '1 84 12 76 451 089 46', expect: [], gap: true },
  { id: 'GAP-phone-no-plus-contiguous', text: '4155552671', expect: [], gap: true },
  { id: 'GAP-phone-00-contiguous', text: '00442079460958', expect: [], gap: true },
  { id: 'GAP-phone-de-national', text: '030 12345678', expect: [], gap: true },
  { id: 'GAP-password-no-digit', text: 'password=correcthorsebattery', expect: [], gap: true },
];

export const TRUE_NEGATIVES: CorpusEntry[] = [
  // --- texte banal qui ressemble à un secret
  { id: 'css-class-sk', text: 'class="sk-spinner-wave-rectangle-one"', expect: [] },
  { id: 'slug-sk', text: 'see sk-learn-pipeline-tutorial-part-two', expect: [] },
  { id: 'slug-sk-with-digit', text: 'sk-learn-tutorial-part-2-of-3-final', expect: [] },
  { id: 'bearer-prose', text: 'the Bearer authenticationschemeisdefinedinrfc', expect: [] },
  { id: 'basic-prose', text: 'Basic understandingofthesystemisrequired', expect: [] },
  { id: 'ghp-too-short', text: 'ghp_short', expect: [] },
  { id: 'akia-inside-word', text: 'TAKIAIOSFODNN7EXAMPLE', expect: [] },
  { id: 'git-sha', text: 'commit 3f2504e04f8911d39a0c0305e82c3301aabbccdd', expect: [] },
  { id: 'sha256', text: 'sha 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08', expect: [] },
  { id: 'uuid', text: '550e8400-e29b-41d4-a716-446655440000', expect: [] },
  { id: 'public-key-pem', text: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkq\n-----END PUBLIC KEY-----', expect: [] },
  { id: 'certificate-pem', text: '-----BEGIN CERTIFICATE-----\nMIIDdzCCAl+g\n-----END CERTIFICATE-----', expect: [] },
  // --- affectations qui ne sont pas des secrets
  { id: 'ts-type-annotation', text: 'password: string;', expect: [] },
  { id: 'password-none', text: 'password = None', expect: [] },
  { id: 'password-env-template', text: 'DB_PASSWORD=${DB_PASSWORD}', expect: [] },
  { id: 'password-placeholder', text: 'password=xxxxxxxxxxxx', expect: [] },
  { id: 'password-function-call', text: 'password = getpass.getpass()', expect: [] },
  { id: 'max-tokens', text: 'max_tokens: 4096, temperature: 0.2', expect: [] },
  { id: 'url-no-credentials', text: 'https://example.org/path?x=1', expect: [] },
  { id: 'url-port-only', text: 'http://localhost:8080/api', expect: [] },
  { id: 'email-in-url-like', text: 'mailto:contact@example.org', expect: [] },
  // --- nombres
  { id: 'order-id-16-digits-luhn', text: 'order 1234567812345670', expect: [] },
  { id: 'timestamp-micros', text: 'ts=1731234567890123', expect: [] },
  { id: 'card-like-longer-id', text: 'id 4111-1111-1111-1111-0000', expect: [] },
  { id: 'card-dots-version', text: '4111.1111.1111.1111', expect: [] },
  { id: 'luhn-fail', text: '4111 1111 1111 1112', expect: [] },
  { id: 'date-range', text: '2024-01-01 2024-12-31', expect: [] },
  { id: 'iso-datetime', text: '2026-11-10T12:00:00Z', expect: [] },
  { id: 'phone-fp-nanp-n11', text: '911-555-2671 et 415-411-2671', expect: [] },
  { id: 'phone-fp-nanp-mixed-seps', text: '415-555.2671', expect: [] },
  { id: 'phone-fp-nanp-too-long', text: '415-555-26711', expect: [] },
  { id: 'phone-fp-00-id', text: 'id 0012345678901', expect: [] },
  { id: 'phone-fp-iso-dates', text: '2024-01-15 2024-12-31', expect: [] },
  { id: 'phone-fp-uk-too-short', text: '020 794 095', expect: [] },
  { id: 'phone-fp-parens-unbalanced', text: '+1 (415 555 2671', expect: [] },
  { id: 'iban-bad-checksum', text: 'FR76 3000 6000 0112 3456 7890 188', expect: [] },
  { id: 'iban-like-words', text: 'GB12 abcd efgh ijkl', expect: [] },
  // --- réseau
  { id: 'public-ip', text: '8.8.8.8 and 1.1.1.1', expect: [] },
  { id: 'ip-172-public-range', text: '172.32.0.1', expect: [] },
  { id: 'version-5-parts', text: 'build 10.2.3.1.5', expect: [] },
  { id: 'version-3-parts', text: 'build 192.168.1', expect: [] },
  { id: 'ip-octet-overflow', text: '10.300.1.1', expect: [] },
  // --- e-mails
  { id: 'email-other-domain', text: 'bob@notacme.com', expect: [] },
  { id: 'email-suffix-attack', text: 'bob@acme.com.evil.org', expect: [] },
  { id: 'email-lookalike', text: 'bob@acme.community', expect: [] },
  // --- ambiguïtés assumées : format valide, impossible à distinguer sans contexte (gap = faux positif connu)
  { id: 'GAP-fp-version-as-ip', text: 'upgrade to node 10.2.3.1 please', expect: ['internal_ip'], gap: true },
  { id: 'GAP-fp-fr-phone-shaped-number', text: 'value 01 23 45 67 89 units', expect: ['phone'], gap: true },
  { id: 'GAP-fp-plus-number', text: 'x = y +12345678', expect: ['phone'], gap: true },
];
