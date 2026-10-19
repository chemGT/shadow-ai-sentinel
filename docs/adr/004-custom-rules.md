# ADR 004 — Règles personnalisées (motifs définis par l'utilisateur / l'admin)

**Statut :** Proposé — à valider dans l'issue #15 avant implémentation  
**Date :** 2026-10-19  
**Contexte :** issue #15. Les équipes ont leurs propres identifiants sensibles (clés de ticket
internes, identifiants clients, noms de code projet, hôtes internes) que les 7 détecteurs intégrés
ne couvrent pas.

## Contraintes

- Le motif s'exécute sur **chaque message** et chaque pièce jointe : un motif catastrophique
  (ReDoS) gèle l'onglet de l'utilisateur. Règle projet : aucune regex sans borne, aucun
  quantificateur imbriqué (`docs/security/redos-audit.md`).
- Même pipeline que les règles intégrées : `normalizeForScan` → chunks → détecteurs → fusion ;
  action Block/Redact, allowlist, jeton de caviardage.
- Zéro réseau ; rien de la règle (libellé, paramètres) ne sort du navigateur — y compris le
  signalement GitHub (`reporting.ts`), qui ne doit mentionner que `custom`.
- Stockage local (`sentinel_policy`), export/import avec le JSON de policy, et poussée centrale via
  `chrome.storage.managed` (cf. #14, `docs/deployment.md`) — c'est le cas d'usage entreprise principal.

## Décision proposée

**Pas de regex arbitraire en v1.** L'utilisateur choisit un **gabarit** paramétré ; l'extension
compile lui-même une regex bornée. Les paramètres sont échappés et plafonnés, donc toute règle
valide est sûre par construction — aucun analyseur statique de regex à maintenir.

### Gabarits v1

| Gabarit | Paramètres | Regex compilée (indicative) | Exemples |
|---------|-----------|-----------------------------|----------|
| `prefix_charset` | `prefix` (1–32 car., littéral échappé), `charset` ∈ {`digits`, `alnum`, `upper_alnum`, `hex`}, `minLength`/`maxLength` (1–128) | `\b<prefix>[<charset>]{min,max}\b` | `PROJ-1234`, `CUST-000981`, `INC0012345` |
| `host_suffix` | `suffix` (domaine, ex. `corp.example`) | `\b[a-z0-9.-]{1,253}\.corp\.example\b` (classe unique puis suffixe littéral, pas de groupe répété) | `db01.prod.corp.example` |
| `keyword_list` | `keywords` (≤ 200 entrées, 2–64 car. chacune, littéraux échappés), `caseSensitive` | `\b(?:alpha\|bravo\|charlie)\b` | noms de code projet |

Un gabarit `regex` « expert » est **écarté pour la v1** (voir alternatives).

### Modèle

```ts
interface CustomRule {
  id: string;            // slug [a-z0-9_]{1,32}, unique — sert au jeton et au dédoublonnage
  label: string;         // affiché à l'utilisateur, jamais dans un rapport
  template: 'prefix_charset' | 'host_suffix' | 'keyword_list';
  params: PrefixCharsetParams | HostSuffixParams | KeywordListParams;
  action: RuleAction;    // block | redact
  enabled: boolean;
}

interface Policy {
  // …champs existants
  customRules?: CustomRule[];   // ≤ 50 règles
}
```

- `RuleType` s'étend par un type gabarit `` `custom:${string}` `` (l'`id`) pour que
  `DetectionMatch`, l'allowlist, les stats et la fusion restent inchangés.
- Jeton de caviardage : `[REDACTED_CUSTOM_<ID>]` (l'`id` est choisi par l'auteur de la règle, pas
  extrait du texte).
- `validatePolicy` valide `customRules` (bornes, unicité des `id`, gabarit connu) ; une règle
  invalide est rejetée à l'import et ignorée (avertissement console) depuis le stockage géré.
- Compilation dans `src/core/detection/custom.ts`, mise en cache par `(id, params)` ; branchée dans
  `runAllDetectors` après les détecteurs intégrés.
- Stockage géré : clé `customRules` ajoutée à `managed_schema.json`, fusion par `id` (une règle
  gérée remplace la règle locale de même `id`, comme `rules` par type).

### UI (page options)

Section « Règles personnalisées » : liste, ajout via formulaire par gabarit, **zone de test locale**
(on colle un exemple, on voit ce qui matche — rien n'est stocké), Block/Redact, activation. Les
règles gérées sont verrouillées (badge « Géré »).

### Tests

- Compilation : chaque gabarit, échappement des métacaractères dans `prefix`/`keywords`, bornes.
- Sécurité : entrées pathologiques (1 Mo de `a`, de `-`, de `.`) sur chaque gabarit aux paramètres
  maximaux, temps borné ; aucun quantificateur imbriqué dans les regex compilées (assertion sur la
  source).
- Pipeline : normalisation appliquée (zero-width / homoglyphes dans `PROJ-1234`), allowlist,
  Block vs Redact, fichiers.
- Rapport GitHub : aucune donnée de règle personnalisée dans l'URL générée.

## Alternatives écartées

| Alternative | Raison |
|-------------|--------|
| Regex arbitraire + analyse statique (rejet des quantificateurs imbriqués, références arrière, lookarounds) | Analyseur à maintenir et à auditer, faux sentiment de sécurité (alternances ambiguës `(a\|a)*`) ; à reconsidérer après retours v1 si les gabarits ne suffisent pas |
| Regex arbitraire + budget temps par scan | Impossible d'interrompre une regex JS en cours sans Worker dédié ; un Worker par scan ajoute latence et complexité à l'envoi |
| Moteur sans backtracking (RE2/WASM) | Dépendance lourde dans le content script, contraire à l'esprit « auditable » |

## Questions ouvertes (à trancher dans #15)

1. Format du jeton : `[REDACTED_CUSTOM_<ID>]` ou générique `[REDACTED_CUSTOM]` (moins
   d'information divulguée au LLM sur la nature de la donnée) ?
2. Règles éditables par l'utilisateur, ou réservées à l'admin (stockage géré) en v1 ?
3. Sensibilité à la casse par défaut pour `prefix_charset` (proposé : sensible).
