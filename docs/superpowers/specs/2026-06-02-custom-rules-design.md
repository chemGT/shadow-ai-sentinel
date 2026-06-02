# Design Spec — Règles personnalisées & bibliothèque de templates

**Date :** 2026-06-02  
**Statut :** Approuvé  
**Auteur :** chemGT  

---

## Contexte

Shadow AI Sentinel dispose de 6 types de règles système hardcodés (api_key, iban, internal_ip, pro_email, phone, generic_secret). L'objectif est d'ajouter une couche de règles personnalisées définie par l'utilisateur ou l'admin, avec une bibliothèque de templates prêts à l'emploi pour rendre l'extension attractive sur le Chrome Web Store.

---

## Approche retenue : Couche `CustomRuleSet` séparée

Deux espaces de stockage distincts :
- `sentinel_policy` — règles système, pilotées par l'API tenant ou import JSON (inchangé)
- `sentinel_custom_rules` — règles utilisateur, 100 % locales

Le moteur de détection fusionne les deux au runtime. Les templates sont un catalogue JSON bundlé dans l'extension.

---

## Section 1 — Types de données & stockage

### Nouveaux types (`src/core/types.ts`)

```ts
export type CustomRuleKind = 'regex' | 'keyword' | 'domain' | 'key_prefix';

export interface CustomRule {
  id: string;              // uuid v4, généré à la création
  kind: CustomRuleKind;
  label: string;           // nom lisible (ex. "Clé Stripe prod")
  pattern: string;         // regex string, mot-clé, domaine, ou préfixe
  action: RuleAction;      // 'block' | 'redact'
  enabled: boolean;
  source: 'user' | 'template';  // distingue règle manuelle vs template activé
  templateId?: string;     // si source === 'template', id du template catalogue
  createdAt: string;       // ISO 8601
}

export interface CustomRuleSet {
  version: number;         // bump local à chaque modification
  rules: CustomRule[];
}
```

### Stockage (`src/core/constants.ts`)

```ts
customRules: 'sentinel_custom_rules',
```

### Catalogue de templates (`src/core/custom-rule-templates.ts`)

Fichier bundlé (pas de fetch réseau), 25-30 templates organisés par catégories :

| Catégorie | Exemples |
|-----------|---------|
| Cloud | AWS Access Key, AWS Secret, GCP Service Account |
| Dev | GitHub PAT, npm token, PyPI token |
| Paiement | Stripe sk/pk, Braintree, PayPal |
| AI/LLM | OpenAI `sk-`, Anthropic `sk-ant-`, xAI `xai-` |
| Interne | Préfixe custom (champ libre pré-rempli) |
| Mots-clés | "confidentiel", "NDA", "salary", "mot de passe" |

Chaque template : `{ id, label, description, kind, pattern, defaultAction }`.

---

## Section 2 — Moteur de détection & fusion

### `runCustomDetectors(text, rules: CustomRule[])`

Nouveau fichier `src/core/detection/custom.ts`. Stratégie par kind :

| `kind` | Implémentation |
|--------|---------------|
| `regex` | `new RegExp(pattern, 'gi')` avec try/catch |
| `keyword` | Recherche insensible à la casse, délimiteurs de mots |
| `domain` | Regex construite : `\b${escapedDomain}\b` |
| `key_prefix` | Regex : `${escapedPrefix}[A-Za-z0-9_\-]{8,}` |

Retourne `DetectionMatch[]` avec `ruleType: 'custom'` pour la télémétrie (pattern non exposé).

### Fusion

Dans `background/index.ts` : après `runDetectors()` (système), appel de `runCustomDetectors()`, fusion via `mergeMatches()` existant. Zéro régression sur les règles système.

### Indicateur visuel post-redact

Quand une substitution Redact a lieu (règle custom ou système), le content script :
1. Pose `data-sentinel-modified="true"` sur le champ texte
2. Affiche un bandeau discret sous le champ : "⚠ Texte modifié par Sentinel — vérifiez avant d'envoyer"
3. Le bandeau disparaît dès que l'utilisateur modifie manuellement le texte

---

## Section 3 — UI Options & bibliothèque de templates

### Nouvelle section "Mes règles" dans la page Options

Deux onglets : **"Mes règles"** et **"Bibliothèque de templates"**.

**Onglet "Mes règles" :**
- Liste des règles avec : icône par kind, label, kind, action (BLOCK/REDACT), toggle actif, boutons éditer/supprimer
- Bouton "+ Ajouter une règle" → modal avec :
  - Sélecteur de type (Regex / Mot-clé / Domaine / Préfixe de clé)
  - Champ pattern + bouton "Tester" (affiche les matches sur texte d'exemple)
  - Champ label
  - Toggle Block / Redact
  - Validation temps réel (regex invalide → erreur immédiate)
- Boutons "Exporter (JSON)" et "Importer (JSON)"
- Fichier modèle `custom-rules-example.json` fourni dans le repo et accessible depuis l'UI d'import

**Onglet "Bibliothèque de templates" :**
- Grille de cartes groupées par catégorie
- Chaque carte : icône, nom, description, badge action par défaut, bouton "Activer"
- Si déjà activé : bouton "Activé ✓" grisé

### Mode Solo vs Entreprise

| État | Comportement |
|------|-------------|
| Sans credentials API | Section "Mes règles" disponible, Policies affiche invitation à configurer le tenant |
| Avec credentials API | Deux couches visibles : "Règles entreprise (sync)" + "Mes règles (local)" |

---

## Section 4 — Télémétrie, validation & gestion d'erreurs

### Télémétrie

- `ruleType` = `'custom'` (valeur fixe, pattern non transmis)
- Nouveau champ optionnel : `ruleSource: 'user' | 'template'`
- Schéma `TelemetryEvent` et `FORBIDDEN_TELEMETRY_KEYS` existants couvrent ce cas sans modification

### Validation avant sauvegarde

- Regex : try/catch sur `new RegExp(pattern)`, erreur retournée à l'UI
- Longueur pattern : 1–500 caractères
- Label : 1–80 caractères, pas de HTML
- Limite : max **50 règles custom** par utilisateur

### Gestion d'erreurs runtime

Si une regex plante à l'exécution : désactivation silencieuse de cette règle + `console.warn`. Le reste de la détection continue normalement.

### Export / Import JSON

Format standard avec modèle commenté `custom-rules-example.json` :
- Fourni dans le repo (`/examples/custom-rules-example.json`)
- Lien "Télécharger le modèle" affiché dans la modale d'import
- JSON importé passe par la même validation que la saisie manuelle

---

## Section 5 — Tests

### Tests unitaires (`src/core/`)

- `custom-detectors.test.ts` : chaque kind, cas nominaux, faux positifs, regex invalide
- `custom-rule-templates.test.ts` : chaque template compile + matche au moins un exemple connu
- `merge-matches.test.ts` : chevauchement règle système + règle custom

### Tests d'intégration (`src/extension/`)

- `custom-rules-storage.test.ts` : CRUD `chrome.storage.local` simulé, validation (regex invalide, limite 50, champs manquants)

### Tests de régression

Ajouter les règles custom aux matrices `.ai/docs/matrice-tests-multi-llm.md` : indicateur "texte modifié" sur Claude, ChatGPT, Gemini.

### Hors scope

Pas de test E2E navigateur pour l'UI Options dans cette itération.

---

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `src/core/types.ts` | Ajout `CustomRuleKind`, `CustomRule`, `CustomRuleSet` |
| `src/core/constants.ts` | Ajout clé `customRules` dans `STORAGE_KEYS`, ajout `'custom'` aux `RuleType` télémétrie |
| `src/core/detection/custom.ts` | Nouveau — `runCustomDetectors()` |
| `src/core/custom-rule-templates.ts` | Nouveau — catalogue 25-30 templates |
| `src/extension/background/index.ts` | Fusion custom + système |
| `src/extension/content/index.tsx` | Indicateur visuel post-redact |
| `src/ui/` (Options) | Nouvelle section "Mes règles" + onglet "Bibliothèque" |
| `examples/custom-rules-example.json` | Nouveau — modèle JSON commenté |

---

## Hors scope

- Synchronisation des règles custom vers l'API (post-pilote)
- Partage de règles via lien court
- Éditeur de règles live avec testeur temps réel avancé
- MDM / déploiement centralisé des règles custom
