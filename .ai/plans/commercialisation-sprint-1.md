# Sprint 1 — Make it sellable

> Plan maître : [commercialisation.md](./commercialisation.md) · Playbook : [execution-playbook](./commercialisation-execution-playbook.md)
> Durée : 8 semaines · Budget : ~32 j dev solo (4 j/sem)
> Branche : `sprint/s1-make-sellable` · Tag de sortie : `v0.2.0-s1`
> Objectif : encaisser la 1ère vente + onboarder 3 pilotes payants en prod.

---

## Definition of Done (sortie de sprint)

- [ ] 1 client externe a payé via Paddle et utilise la solution en prod
- [ ] 3 tenants pilotes onboardés via signup self-serve sans intervention manuelle
- [ ] Extension publiée Chrome Web Store + AMO (signés)
- [ ] Dashboard admin affiche événements agrégés 30j
- [ ] Site marketing live, pricing public, signup fonctionnel
- [ ] CGU/CGV/DPA signés par le 1er client
- [ ] Monitoring + status page opérationnels
- [ ] Suite tests ≥ 70% coverage, aucune régression sur les 88+ tests existants
- [ ] Audit `qa_tester` final OK + `security_auditor` final sans High ouvert
- [ ] Tag git `v0.2.0-s1` + CHANGELOG à jour

---

## Vue itérations (25 itérations, ~31 j)

Légende validateurs : Q=qa_tester (toujours) · F=functional_tester · S=security_auditor 🔒 · C=compliance_rgpd 🛡️

| ID | Titre | Sous-agent | Estim. | Dépend. | Valid. | Statut |
|---|---|---|---|---|---|---|
| S1-I1 | Init branche + CHANGELOG + ADR multi-tenant | architect | 0.5 j | — | Q | ✅ |
| S1-I2 | Schéma Postgres multi-tenant + migrations | backend_ops | 1.5 j | I1 | Q S🔒 | ✅ |
| S1-I3 | Middleware extraction tenant + isolation queries | backend_ops | 1.5 j | I2 | Q S🔒 | ✅ |
| S1-I4 | Rotation clés API + scopes + grace period | backend_ops | 1 j | I3 | Q S🔒 | ✅ |
| S1-I5 | Audit log append-only | backend_ops | 0.5 j | I3 | Q S🔒 | ✅ |
| S1-I6 | Endpoint `/events/aggregate` + cache | backend_ops | 1.5 j | I3 | Q | ⏳ |
| S1-I7 | Endpoint `/events/export` CSV streaming | backend_ops | 0.5 j | I6 | Q C🛡️ | ⏳ |
| S1-I8 | Background jobs (purge + agg + dunning hook) | backend_ops | 1 j | I3 | Q | ⏳ |
| S1-I9 | Next.js portal skeleton + Clerk auth EN/FR | ext_dev | 1.5 j | I3 | Q F S🔒 | ⏳ |
| S1-I10 | Orgs + members + rôles (owner/admin/viewer) | ext_dev | 1.5 j | I9 | Q F S🔒 | ⏳ |
| S1-I11 | Dashboard charts read-only (Recharts) | ext_dev | 2 j | I6, I10 | Q F | ⏳ |
| S1-I12 | Editor policy JSON (Monaco) + validation | ext_dev | 1 j | I10 | Q F | ⏳ |
| S1-I13 | Gestion clés API dans portail | ext_dev | 0.5 j | I4, I10 | Q F S🔒 | ⏳ |
| S1-I14 | Paddle live setup + produits + checkout overlay | backend_ops | 1.5 j | S0-5 | Q F S🔒 | ⏳ |
| S1-I15 | Paddle webhooks → entitlements tenant | backend_ops | 2 j | I14 | Q S🔒 | ⏳ |
| S1-I16 | Feature gating middleware + UI | backend_ops + ext_dev | 0.5 j | I15 | Q F | ⏳ |
| S1-I17 | Signup wizard 4 étapes + presets policy | ext_dev | 2 j | I10, I12 | Q F | ⏳ |
| S1-I18 | Deep-link extension `chrome-extension://...#config=...` | ext_dev | 1 j | I17 | Q F S🔒 C🛡️ | ⏳ |
| S1-I19 | Signal faux positif dans extension | ext_dev + ux_writer | 1 j | I3 | Q F C🛡️ | ⏳ |
| S1-I20 | Réduction host_permissions + assets stores | ext_dev | 1 j | — | Q S🔒 | ✅ |
| S1-I21 | Site marketing landing + pricing EN/FR | ux_writer + ext_dev | 2 j | S0-3 | Q F | ⏳ |
| S1-I22 | Pages Trust/Security + Privacy + CGU intégration | ux_writer + compliance_rgpd | 1 j | I21 | Q F C🛡️ S🔒 | ⏳ |
| S1-I23 | Soumission Chrome Web Store + AMO | qa_tester | 0.5 j | I20, I22 | Q | ⏳ |
| S1-I24 | Monitoring (Sentry + Better Stack + PostHog) | backend_ops | 1.5 j | I3, I21 | Q S🔒 | ⏳ |
| S1-I25 | E2E Playwright signup→install→1ère alerte + CI coverage gate | qa_tester | 1.5 j | I18, I19 | Q F | ⏳ |
| S1-I26 | Recette pilote close (F01-F10 + M01-M11) | functional_tester | 1 j | I25 | Q F | ⏳ |
| S1-I27 | Audit sécurité fin de sprint + remédiation | security_auditor | 1 j | toutes | Q S🔒 C🛡️ | ⏳ |

**Total estimé** : 30.5 j dev · **Budget sprint** : 32 j → marge 1.5 j

---

## Détail des itérations sensibles

### S1-I1 — Init branche + CHANGELOG + ADR multi-tenant

- **Scope IN** : créer branche `sprint/s1-make-sellable`, fichier `CHANGELOG.md` (format keep-a-changelog), ADR `.ai/adr/003-multi-tenant-postgres.md`, mise à jour `commercialisation.md` § statut.
- **Scope OUT** : aucun code applicatif.
- **DoD** : branche créée, ADR review architect ok, premier commit `chore(repo): sprint S1 kickoff [S1-I1]`.

### S1-I2 — Schéma Postgres multi-tenant 🔒

- **Scope IN** : tables `tenants`, `users`, `api_keys`, `policies`, `telemetry_events`, `audit_log`. Migrations (drizzle ou prisma — décision dans I1). Index FK + partition `telemetry_events` par mois si volume.
- **Scope OUT** : pas d'auth users (I9), pas d'admin UI (I11).
- **Fichiers** : `src/backend/db/schema.ts`, `src/backend/db/migrations/*`.
- **DoD** : `npm run db:migrate` idempotent, seed test data, test isolation fuzz tenant_id, `security_auditor` confirme RLS ou middleware-only OK.
- **Commit** : `feat(db): multi-tenant schema and migrations [S1-I2]`.

### S1-I3 — Middleware extraction tenant + isolation 🔒

- **Scope IN** : middleware Express extraction Bearer → tenant + scope. Wrapper queries (toutes filtrées par tenant_id). Tests d'isolation cross-tenant.
- **Scope OUT** : rotation clés (I4), audit log (I5).
- **Fichiers** : `src/backend/middleware/tenant.ts`, `src/backend/db/tenant-scoped.ts`, tests.
- **DoD** : impossible d'accéder à données d'un autre tenant, 5+ tests d'isolation, perf overhead < 5 ms par requête.
- **Commit** : `feat(api): tenant isolation middleware [S1-I3]`.

### S1-I4 — Rotation clés API + scopes 🔒

- **Scope IN** : génération clés (`sk_live_*`), scopes `policies:read`, `telemetry:write`, `admin:*`. Grace period 7 j sur ancienne clé. Hash bcrypt en DB.
- **DoD** : ancienne clé valide 7 j, nouvelle clé valide immédiatement, audit log de rotation, test rotation E2E.
- **Commit** : `feat(api): api key rotation with scopes [S1-I4]`.

### S1-I9 — Portal Next.js + Clerk EN/FR 🔒

- **Scope IN** : app Next.js 15 App Router, Clerk integration (email + Google + Microsoft), layout shadcn/ui, i18n (next-intl), pages `/`, `/login`, `/signup`, `/dashboard` (placeholder).
- **Scope OUT** : pas de logic dashboard (I11), pas d'invitations (I10).
- **Fichiers** : nouveau workspace `apps/portal/` (si monorepo S0-10 fait) ou repo séparé.
- **DoD** : login OAuth Google fonctionne, sortie session token consommable côté API (Clerk JWT verify dans middleware tenant I3 étendu).
- **Commit** : `feat(portal): nextjs skeleton + clerk auth [S1-I9]`.

### S1-I14 — Paddle live + checkout 🔒

- **Scope IN** : compte Paddle live activé, produits Team + Business créés, plans mensuels + annuels, taxes auto, checkout overlay JS dans portail.
- **Scope OUT** : webhooks (I15), gating (I16).
- **DoD** : carte test passe, abo créé côté Paddle, redirection succès, URL retours configurées.
- **Commit** : `feat(billing): paddle products and checkout overlay [S1-I14]`.

### S1-I15 — Paddle webhooks → entitlements 🔒

- **Scope IN** : webhook signé HMAC, événements `subscription.created/updated/canceled/paused`, écriture entitlements en DB, idempotence (replay safe).
- **DoD** : événement test Paddle → tenant entitlements à jour < 5 s, replay sans duplication, dead letter sur erreur, test contract event payload.
- **Commit** : `feat(billing): paddle webhook entitlements sync [S1-I15]`.

### S1-I18 — Deep-link extension config 🔒🛡️

- **Scope IN** : page Options parse `#config=base64({tenantId, apiKey, apiBaseUrl})` à l'ouverture, validation, stockage chrome.storage.sync (ou local pour Firefox), alerte UI si remplacement.
- **Scope OUT** : pas de signup (I17).
- **Sécurité** : valider format strict, refuser si tenantId inconnu côté API (ping `/whoami`), pas de log de la clé.
- **DoD** : flow signup wizard génère lien → ouverture extension → credentials remplis → 1er ping API OK, test négatif sur payload malformé.
- **Commit** : `feat(extension): deep link credentials provisioning [S1-I18]`.

### S1-I19 — Signal faux positif 🛡️

- **Scope IN** : bouton "C'est un faux positif" dans modale Block + après Redact, événement télémétrie nouveau `feedback_false_positive` (champs : `ruleType`, `contextChoice` enum {code, prose, json, url, other}, **jamais le texte**).
- **DoD** : événement envoyé conforme schéma, test contract API (rejette `text`), copy FR/EN, agrégation visible côté admin (count par ruleType).
- **Commit** : `feat(extension): false positive signal with safe schema [S1-I19]`.

### S1-I22 — Pages Trust + Privacy + CGU 🔒🛡️

- **Scope IN** : pages `/security`, `/privacy`, `/terms`, `/dpa`, `/sub-processors`. Cookie banner Iubenda. CCPA opt-out form US. Bannière intégrée site I21.
- **DoD** : Privacy + ToS + DPA en EN + FR (templates juriste S0-7), cookie banner respecte refus complet, link DPA téléchargeable PDF.
- **Commit** : `docs(legal): trust security privacy terms pages [S1-I22]`.

### S1-I27 — Audit sécurité fin de sprint 🔒🛡️

- **Scope IN** : `security_auditor` exécute checklist complète (auth, isolation, secrets, deps, RGPD). `compliance_rgpd` confirme schéma télémétrie. Remédiation findings High/Medium.
- **DoD** : 0 finding High, < 3 Medium documentés avec plan, rapport intégré `.ai/security/audit-s1.md`.
- **Commit** : `chore(security): sprint 1 audit and remediations [S1-I27]`.

---

## Catalogue de features (cross-référence blocs initiaux)

Les itérations couvrent les blocs A à I définis initialement :

| Bloc historique | Itérations correspondantes |
|---|---|
| A — Backend multi-tenant | I1, I2, I3, I4, I5, I6, I7, I8 |
| B — Auth + portail | I9, I10, I11, I12, I13 |
| C — Billing | I14, I15, I16 |
| D — Onboarding | I17, I18 |
| E — Extension ajustements | I18, I19, I20 |
| F — Site & stores | I21, I22, I23 |
| G — Légal | I22 (intégration) + délivrables S0-7 |
| H — Ops | I24 |
| I — Qualité | I25, I26, I27 |

---

## Gates de fin de sprint (avant merge master + tag v0.2.0-s1)

| Gate | Validateur | Critère |
|---|---|---|
| Tous tests verts | qa_tester | `npm run ci` OK |
| Coverage ≥ 70% global | qa_tester | rapport coverage |
| Build dual Chromium + Firefox | qa_tester | artefacts générés |
| Sécurité | security_auditor | 0 High |
| Conformité RGPD | compliance_rgpd | schéma télémétrie + notices à jour |
| Fonctionnel E2E | functional_tester | recette F01-F10 + M01-M11 + signup → 1ère alerte |
| Légal | humain | CGU + Privacy + DPA online |
| Paddle | humain | 1 transaction réelle (toi en client test live) |
| Stores | humain | au moins Chrome Web Store accepté (AMO ok signé) |

---

## Suivi hebdo

À tenir chaque vendredi. Template :

```markdown
### Semaine N (YYYY-MM-DD → YYYY-MM-DD)
- Livré : [IDs]
- En cours : [IDs]
- Bloqué : [ID + raison]
- Heures réelles : Xh / 32h budget
- Findings agents : -
- Décisions / pivots : -
- Prochain : [IDs]
```

---

## Sortie → entrée Sprint 2

À documenter en fin de S1 :
- Liste prospects pipeline Business pour S2
- Top 5 demandes clients non livrées
- Métriques baseline : activation %, churn semaine 1, faux positifs signalés
- Anomalies regex agrégées par ruleType
