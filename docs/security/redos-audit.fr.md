# Audit ReDoS — Shadow AI Sentinel

**Date** : 2026-06-12  
**Auteur** : Claude Code (S0-8)  
**Scope** : tous les patterns regex dans `src/core/detection/`

---

## Résumé

| Fichier | Patterns | Risque | Action |
|---------|----------|--------|--------|
| `api-key.ts` | 10 | FAIBLE | Aucune |
| `iban.ts` | 1 | FAIBLE | Aucune |
| `phone.ts` | 2 | FAIBLE | Aucune |
| `internal-ip.ts` | 1 | FAIBLE | Aucune |
| `pro-email.ts` | 1 dynamique | FAIBLE | Aucune |
| `generic-secret.ts` | 3 (dont JWT) | FAIBLE après correction | Corrigé |

**Statut global : SAFE** — aucun risque de ReDoS catastrophique. Une correction défensive appliquée sur le pattern JWT.

---

## Analyse détaillée

### `api-key.ts`

10 patterns (AWS AKIA/ASIA, OpenAI sk-, GitHub ghp_/github_pat_, GitLab glpat-, Slack xox*, Azure).

Caractéristiques communes :
- Préfixe littéral fixe (ancre de départ non ambiguë)
- `\b` en début et fin
- Un seul groupe de caractères sans chevauchement
- Quantificateurs bornés : `{16}`, `{20,255}`, `{10,255}`, `{36,255}`, `{22,255}`, `{3,24}`

**Verdict : SAFE** — backtracking linéaire au pire.

---

### `iban.ts`

Pattern : `/\b([A-Z]{2}\d{2}[A-Z0-9]{11,30})\b/gi`

- `{2}` et `{11,30}` bornés
- Classes de caractères disjointes (majuscules, chiffres, alphanum)

**Verdict : SAFE**

---

### `phone.ts`

`FR_PHONE_PATTERN` : `/\b(?:(?:\+33|0033)[\s.-]?[1-9](?:[\s.-]?\d{2}){4}|0[1-9](?:[\s.-]?\d{2}){4})\b/g`

- `{4}` répétition fixe (pas `{4,}`)
- `[\s.-]?` borné à 0 ou 1
- Alternation en tête (`\+33|0033`), les deux branches sont linéaires

`INTL_PATTERN` : `/(?<![\w+]|\d[ .-])(?:\+|00)[1-9](?:[ .()-]{0,2}\d){7,15}(?![ .-]?\d)/g` — une seule répétition `{7,15}` d'un groupe dont le séparateur est borné à `{0,2}` et suivi d'un chiffre obligatoire (pas d'ambiguïté, pas de quantificateur non borné imbriqué). La cohérence des parenthèses est vérifiée ensuite par une boucle linéaire, pas par regex.

`NANP_PATTERN` / `UK_PATTERN` : groupes de chiffres de longueur fixe (`\d{3}`, `\d{4}`, `\d{3,4}`), séparateurs optionnels uniques, lookarounds de largeur fixe. Entrées adversariales (1 M de `+1 `, `00 `, `(1`, `415-555-`, zéros) scannées en bien moins d'une seconde.

**Verdict : SAFE**

---

### `internal-ip.ts`

Pattern IP v4 RFC1918 avec trois alternatives (`10.x`, `172.16-31.x`, `192.168.x`).

- Chaque octet : `\d{1,3}` borné
- Alternation de haut niveau, branches indépendantes
- Validation post-match `isPrivateIpv4()` + `isValidOctet()`

**Verdict : SAFE**

---

### `pro-email.ts`

Pattern dynamique : `` `\\b([a-zA-Z0-9._%+-]{1,64}@(?:${domainPart}))\\b` ``

- `[a-zA-Z0-9._%+-]{1,64}` : borné à 64 (RFC 5321 local-part max)
- `domainPart` : liste de domaines échappés via `escapeRegex()` qui neutralise `[.*+?^${}()|[\]\\]`
- Après échappement, les domaines sont des chaînes littérales sans quantificateurs imbriqués

Vérification de `escapeRegex()` (ligne 4-6) : `/[.*+?^${}()|[\]\\]/g` — couvre tous les métacaractères PCRE. **Injection de regex impossible depuis la policy.**

**Verdict : SAFE**

---

### `generic-secret.ts`

| Pattern | Avant | Après | Note |
|---------|-------|-------|------|
| Bearer | `{20,512}` | inchangé | Déjà borné |
| Basic | `{20,512}` | inchangé | Déjà borné |
| JWT | `{10,}` non borné | `{10,4096}\.[10,4096}\.[10,512}` | Correction défensive |

**JWT avant correction** : `/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g`

Analyse : le séparateur `.` est un caractère littéral **disjoint** de la classe `[A-Za-z0-9_-]`. Le backtracking sur `{10,}` est donc linéaire (O(n)), pas catastrophique. Cependant, un upper bound explicite est recommandé :
- Header JWT base64url : typiquement 36-100 chars → `{10,4096}` (généreux)
- Payload JWT : peut dépasser 1 Ko → `{10,4096}`
- Signature (HS256: 43c, RS256: 342c, PS512: 683c) → `{10,512}`

**JWT après correction** : `/\beyJ[A-Za-z0-9_-]{10,4096}\.[A-Za-z0-9_-]{10,4096}\.[A-Za-z0-9_-]{10,512}\b/g`

Le filet de sécurité `MAX_DETECTION_INPUT_LENGTH = 100_000` (dans `limits.ts`) reste la défense principale contre tout DoS au niveau input.

**Verdict après correction : SAFE**

---

## Protection transversale

`src/core/detection/limits.ts` : `truncateForDetection()` tronque tout input à 100 000 caractères avant analyse. Même si un pattern avait une complexité super-linéaire, l'input est borné.

---

## Actions effectuées

- [x] Correction `generic-secret.ts` ligne 8 : JWT `{10,}` → `{10,4096}` / `{10,4096}` / `{10,512}`
- [x] Tests ré-exécutés : 94/94 ✅

## Actions restantes

- [ ] Envisager `vuln-regex-detector` ou `safe-regex` en CI pour régression future (optionnel Sprint 1)

---

## Addendum — 2026-11 (extension des détecteurs)

Ré-audit après l'extension des détecteurs (nouvelles clés fournisseurs, clés privées PEM, URL
avec identifiants, secrets `nom=valeur`, E.164 groupé). La « troncature à 100 000 caractères »
décrite plus haut est obsolète : le moteur parcourt des fenêtres chevauchantes de 100 k jusqu'à
2 000 000 de caractères (`detection/limits.ts`).

| Fichier | Changement | Pourquoi cela reste linéaire / borné |
|---------|------------|--------------------------------------|
| `api-key.ts` | Motifs à préfixe fixe : GitHub `gh[pousr]_`, Stripe `whsec_`, Slack `xapp-` et webhooks, Google `AIza`, npm, Hugging Face, SendGrid, Twilio, DigitalOcean | Préfixe littéral + une classe bornée |
| `api-key.ts` | Clé privée PEM : `BEGIN…[\s\S]{1,4096}?…END` et `BEGIN…[A-Za-z0-9+/=\s]{0,4096}` | Parcours plafonné à 4096 par en-tête ; pire cas mesuré ci-dessous |
| `api-key.ts` | Azure : `AccountKey=…{20,128}` optionnel, `SharedAccessSignature=…{20,512}` | Borné, une seule classe |
| `generic-secret.ts` | Bearer `{20,4096}`, Basic `{16,512}` terminés par un lookahead négatif au lieu de `\b` | Une classe, bornée ; un jeton trop long est désormais détecté au lieu d'être ignoré |
| `generic-secret.ts` | URL avec identifiants `schéma://user:pass@hôte` | Trois classes disjointes bornées séparées par des littéraux |
| `generic-secret.ts` | Secrets `nom[:=]valeur` | Alternance de mots-clés + `{0,24}` + `{8,128}` ; aucun imbriquement |
| `card.ts`, `phone.ts`, `internal-ip.ts` | Gardes lookbehind/lookahead (chiffre adjacent, séparateurs de date) | Lookarounds de largeur fixe ou bornés par `?` |
| `iban.ts` | `.` accepté comme séparateur de groupes | Même forme qu'avant |
| `pro-email.ts` | Labels de sous-domaine bornés `{1,63}` × `{0,8}` (auparavant `+` / `*` non bornés) | Supprime les derniers quantificateurs non bornés du moteur |
| `merge-matches.ts` | Fusion linéaire (auparavant quadratique : 22,9 s pour 120 k correspondances) | Pas un regex, mais c'était le seul vrai gel constaté |

Mesuré sur des entrées adverses d'environ 2 000 000 de caractères (36 cas, Node 22, toutes
règles actives) : pire cas 0,7 s (labels d'e-mail), tous les autres sous 0,6 s. Une version
réduite de ces entrées tourne en CI (`src/core/detection/corpus.test.ts`, « temps de scan borné »).
