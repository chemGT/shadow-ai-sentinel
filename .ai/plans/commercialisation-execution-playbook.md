# Playbook d'exécution — Sprints commercialisation

> Plan maître : [commercialisation.md](./commercialisation.md)
> Cible : exécution itérative avec Claude Sonnet 4.6 + chaîne de validation agents.
> Version : 1.0 — 2026-06-12

---

## Principe

Chaque sprint est découpé en **itérations vertical slice** de **1 à 3 jours** maximum. Une itération = une fonctionnalité utile livrable, testable, déployable. Pas de big-bang.

À la fin de chaque itération : **gates de validation → commit → mise à jour suivi**.

---

## Format d'une itération

```
ID         : SX-IY (Sprint X, Itération Y)
Titre      : Verb + objet (impératif)
Scope IN   : 3-7 puces concrètes
Scope OUT  : ce qu'on NE fait PAS (anti-dérive)
Fichiers   : chemins prévus (touchés / créés)
Estim.     : jours (0.5 / 1 / 1.5 / 2 / 3 max)
Dépend.    : ID itérations précédentes
Validateurs: qa_tester (toujours), functional_tester (si UI/flow), security_auditor (si sensible)
Critères   : Definition of Done bullet list
Commit     : type(scope): description en conventional commit
```

Si une itération dépasse 3 jours estimés, **la couper en deux** avant de commencer.

---

## Workflow d'une itération

### Étape 1 — Briefing (humain → Sonnet)

Le décideur (toi) ouvre la session Claude Code avec :
1. Le fichier de sprint (`commercialisation-sprint-N.md`)
2. L'ID de l'itération à exécuter (ex. `S1-I3`)
3. Toute info contextuelle non écrite (préférences, contraintes du jour)

Sonnet doit :
- Relire l'itération + les itérations dépendantes déjà livrées
- Reformuler le scope IN/OUT en 3 lignes pour confirmation
- Lister les fichiers qu'il prévoit toucher
- Demander validation avant d'écrire du code (sauf itération triviale ≤ 0.5 j)

### Étape 2 — Implémentation (Sonnet)

- Suit l'agent métier indiqué (`ext_dev`, `backend_ops`, `ux_writer`, etc.)
- Écrit tests unitaires en même temps que le code (TDD léger : tests avant ou avec, pas après)
- Aucun fichier hors scope sans mention explicite
- Mise à jour de `INSTALLATION.md` si l'itération change l'installation
- Mise à jour du `CHANGELOG.md` (à créer en S1-I1) à chaque itération

### Étape 3 — Gate QA technique (`qa_tester`)

Lancement de l'agent `qa_tester` avec instruction :
> "Audite l'itération `SX-IY`. Vérifie : tests verts (`npm run test:ci`), coverage ≥ 70% sur fichiers touchés, lint clean, build OK (`npm run build` + `npm run build:firefox`), aucune régression sur la suite existante. Liste les findings par sévérité."

**Bloquant** : test rouge, coverage < seuil, build cassé.

### Étape 4 — Gate QA fonctionnel (`functional_tester`) — si UI/flow

Lancement avec :
> "Valide l'itération `SX-IY` contre ses critères d'acceptation. Exécute le scénario utilisateur principal manuellement (ou propose script Playwright). Documente les écarts."

**Bloquant** : critère d'acceptation non rempli.

### Étape 5 — Gate sécurité (`security_auditor`) — si sensible

Itérations marquées 🔒 dans les sprints. Lancement avec :
> "Audit sécurité de l'itération `SX-IY`. Focus : injection, auth bypass, isolation tenant, fuite de données, secrets en clair, dépendances vulnérables. Pas de finding High accepté."

**Bloquant** : finding sévérité High.

### Étape 6 — Gate conformité (`compliance_rgpd`) — si télémétrie/légal

Itérations marquées 🛡️. Lancement avec :
> "Vérifie l'itération `SX-IY` vs schéma TelemetryEvent + RGPD checklist. Aucun champ texte utilisateur transmis. Notice à jour si nouveau traitement."

**Bloquant** : sortie de scope schéma.

### Étape 7 — Décision humaine + commit

Toi :
1. Lis les findings agents
2. Décide Go / No-Go / Itération supplémentaire
3. Sur Go : commit conventionnel + push

Format commit (référencer l'itération) :
```
feat(billing): paddle webhook subscription handling [S1-I8]

- ...

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Préfixes acceptés : `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `ci`, `build`.

### Étape 8 — Mise à jour suivi

Cocher l'itération dans `commercialisation-sprint-N.md`.
Ajouter ligne au **Suivi hebdo** du sprint (livré / heures réelles / écart estim. / bloqueurs).

---

## Règles de coupure / pivot

- **Découpe à 3 jours max** : au-delà, scission obligatoire.
- **Si scope dérive en cours** : stop, mettre à jour le fichier sprint avant de continuer (pas de scope creep silencieux).
- **Si test rouge récurrent (>2 retries)** : escalade humain, ne pas brute-forcer.
- **Si dépendance externe bloque** (review store, KYC) : marquer 🚫 et passer à l'itération non-bloquée suivante.

---

## Recommandations agents par type d'itération

| Type | Implementer (Sonnet + sous-agent) | Validateurs obligatoires | Notes |
|---|---|---|---|
| Backend API / DB | `backend_ops` | qa_tester, security_auditor 🔒 | Tests isolation tenant systématiques |
| Extension (content/background) | `ext_dev` | qa_tester, functional_tester | Tester Chromium ET Firefox |
| UI portail (React/Next) | `ext_dev` (front-experienced) | qa_tester, functional_tester | A11y de base (clavier, contraste) |
| Copy / i18n | `ux_writer` | qa_tester | Couvrir EN + FR |
| Architecture / refactor | `architect` | qa_tester, security_auditor 🔒 | ADR à créer si décision structurante |
| Légal / DPA / privacy | `compliance_rgpd` | qa_tester, security_auditor 🔒 | Pas de prod sans relecture juriste |
| Conformité télémétrie | `compliance_rgpd` | qa_tester, security_auditor 🔒 | Schéma strict |
| Marketing site | `ux_writer` | qa_tester, functional_tester | SEO check basique |
| Ops / monitoring | `backend_ops` | qa_tester, security_auditor 🔒 | Pas de secret dans config commit |

---

## Cadence de commits par sprint

- **1 commit minimum par itération** (commit en fin d'itération validée)
- **Pas de commit géant fin de sprint** (sauf hotfix ultime de release)
- **Tag git de fin de sprint** : `v0.2.0-s1`, `v0.3.0-s2`, `v1.0.0-s3`
- **Branche par sprint** : `sprint/s1-make-sellable`, `sprint/s2-enterprise`, `sprint/s3-scale`
- **Merge dans master** après revue qa_tester + security_auditor finale sur tout le sprint, **uniquement** quand DoD du sprint coché.

---

## Suivi hebdo (à créer dans chaque fichier sprint)

Section type :

```markdown
## Suivi hebdo

### Semaine 1 (2026-06-15 → 2026-06-19)
- Livré : S1-I1, S1-I2
- En cours : S1-I3
- Bloqué : -
- Heures réelles : 28h (budget 32h, écart -4h)
- Findings agents notables : -
- Décisions / pivots : -
- Prochain : S1-I3, S1-I4
```

À tenir vendredi soir, 5 min max.

---

## Indicateurs de santé du sprint (calculés en fin de semaine)

- **Vélocité** : jours estimés livrés / jours estimés budget hebdo
- **Burn rate** : heures réelles / heures budget
- **Quality gate ratio** : itérations validées 1er coup / itérations totales
- **Drift** : nombre de scope creep documenté
- **Findings** : open par sévérité

Si vélocité < 70% deux semaines de suite → réviser DoD sprint, déprioriser itérations basses.

---

## Outils & comptes (rappel S0)

Pour exécuter efficacement, ces comptes doivent être prêts avant S1-I1 :

| Catégorie | Outil | But |
|---|---|---|
| Source | GitHub org | branches sprint, PRs, CI |
| CI | GitHub Actions (déjà OK) | tests + builds |
| DB | Supabase ou Render PG | Postgres multi-tenant |
| Hosting | Render ou Fly.io | API + portail |
| Auth | Clerk ou Supabase Auth | login + SSO basique |
| Billing | Paddle | MoR, factures |
| Monitoring | Sentry + Better Stack | erreurs + uptime |
| Produit analytics | PostHog | funnel signup |
| Communication ops | Plain ou Linear | tickets internes |
| Statut | Better Stack Status | status.shadowaisentinel.com |
