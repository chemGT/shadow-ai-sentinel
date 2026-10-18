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

`E164_PATTERN` : `/\+[1-9]\d{7,14}\b/g` — simple, borné.

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
