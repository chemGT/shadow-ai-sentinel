# Sprint 2 — Enterprise-credible

> Plan maître : [commercialisation.md](./commercialisation.md) · Playbook : [execution-playbook](./commercialisation-execution-playbook.md)
> Durée : 8 semaines · Budget : ~32 j dev solo + freelances ponctuels
> Branche : `sprint/s2-enterprise` · Tag de sortie : `v0.3.0-s2`
> Objectif : décrocher 2-3 deals Business + MRR > 2k$/mois.

---

## Definition of Done (sortie de sprint)

- [ ] 2 logos Business signés (contrats annuels)
- [ ] SSO SAML opérationnel Azure AD + Google Workspace + Okta
- [ ] SCIM provisioning testé avec 1 client
- [ ] Mode Discovery / Audit Shadow AI livré
- [ ] SIEM webhook + Slack/Teams connecteurs livrés
- [ ] Détection v2 : -50% faux positifs signalés vs baseline S1
- [ ] LLM étendus : Copilot M365, Mistral, Perplexity
- [ ] Pentest externe terminé, 0 High résiduel
- [ ] SOC 2 Type I : firme engagée + contrôles en place
- [ ] MRR ≥ 2 000 $
- [ ] Audit qa_tester + security_auditor final OK
- [ ] Tag git `v0.3.0-s2` + CHANGELOG à jour

---

## Vue itérations (22 itérations, ~33 j)

Légende validateurs : Q=qa_tester · F=functional_tester · S=security_auditor 🔒 · C=compliance_rgpd 🛡️

| ID | Titre | Sous-agent | Estim. | Dépend. | Valid. | Statut |
|---|---|---|---|---|---|---|
| S2-I1 | Init branche S2 + CHANGELOG | architect | 0.5 j | — | Q | ⏳ |
| S2-I2 | Setup WorkOS (ou BoxyHQ) + intégration SSO SAML | backend_ops | 2 j | S1-I9 | Q F S🔒 | ⏳ |
| S2-I3 | SCIM 2.0 provisioning users + groupes | backend_ops | 2 j | I2 | Q S🔒 | ⏳ |
| S2-I4 | JIT provisioning + RBAC enrichi (4 rôles) | backend_ops + ext_dev | 1.5 j | I3 | Q F S🔒 | ⏳ |
| S2-I5 | Audit log enrichi + export | backend_ops | 0.5 j | I4 | Q S🔒 C🛡️ | ⏳ |
| S2-I6 | Policy "discovery" mode (observe only) | ext_dev | 1.5 j | — | Q F C🛡️ | ⏳ |
| S2-I7 | Event `llm_used` (host sans match) | ext_dev | 1 j | I6 | Q C🛡️ | ⏳ |
| S2-I8 | Dashboard "Shadow AI map" (dept × LLM × ruleType) | ext_dev | 2 j | S1-I11, I7 | Q F | ⏳ |
| S2-I9 | Rapport CISO PDF mensuel auto (EN+FR) | backend_ops + ux_writer | 1 j | I8 | Q F | ⏳ |
| S2-I10 | Webhook sortant signé HMAC + retry | backend_ops | 1 j | — | Q S🔒 | ⏳ |
| S2-I11 | Connecteur Microsoft Sentinel + doc | backend_ops | 1 j | I10 | Q | ⏳ |
| S2-I12 | Connecteur Splunk HEC + doc | backend_ops | 0.5 j | I10 | Q | ⏳ |
| S2-I13 | Slack app (OAuth install + channel mapping) | ext_dev | 1.5 j | I10 | Q F S🔒 | ⏳ |
| S2-I14 | Microsoft Teams Incoming Webhook | ext_dev | 0.5 j | I10 | Q | ⏳ |
| S2-I15 | Détection v2 : contexte structurel (code/prose/JSON/URL) | backend_ops | 2 j | — | Q | ⏳ |
| S2-I16 | Allowlists tenant (dictionnaires custom) | backend_ops + ext_dev | 1.5 j | I15 | Q F C🛡️ | ⏳ |
| S2-I17 | Heuristiques anti-FP par ruleType (entropie, mod97, etc.) | backend_ops | 1 j | I15 | Q | ⏳ |
| S2-I18 | Règles FR/US ajoutées : NIR, SIRET, SSN, EIN, routing | backend_ops | 1 j | I15 | Q | ⏳ |
| S2-I19 | Règle "code propriétaire" (marqueurs configurables) | backend_ops | 0.5 j | I16 | Q | ⏳ |
| S2-I20 | Adaptateur Copilot M365 | ext_dev | 1 j | — | Q F | ⏳ |
| S2-I21 | Adaptateur Mistral LeChat | ext_dev | 0.5 j | I20 | Q F | ⏳ |
| S2-I22 | Adaptateur Perplexity | ext_dev | 0.5 j | I20 | Q F | ⏳ |
| S2-I23 | Validation Edge + soumission Edge Add-ons | qa_tester | 0.5 j | — | Q F | ⏳ |
| S2-I24 | Pentest externe (coord. + remédiation) | security_auditor | 2 j actif | toutes | S🔒 | ⏳ |
| S2-I25 | SOC 2 Type I démarrage (Drata + contrôles + policies) | architect + backend_ops | 3 j actif | — | S🔒 | ⏳ |
| S2-I26 | Playwright e2e sur 3 LLM live + smoke quotidien | qa_tester | 1 j | I20-I22 | Q F | ⏳ |
| S2-I27 | Pitch deck + outreach setup + 1 démo enregistrée | ux_writer | 2 j | — | Q | ⏳ |
| S2-I28 | Audit fin de sprint + tag v0.3.0-s2 | qa_tester + security_auditor | 1 j | toutes | Q S🔒 C🛡️ | ⏳ |

**Total estimé** : 33 j dev · **Budget** : 32 j → overflow 1 j (absorbable, sinon couper I22 ou I27)

---

## Itérations sensibles — détail

### S2-I2 — SSO SAML via WorkOS 🔒

- **Scope IN** : config WorkOS (ou BoxyHQ self-host), connectors Azure AD + Google Workspace + Okta côté Clerk ou direct, callback handler portail, mapping email → user, gating Business+.
- **Scope OUT** : SCIM (I3), rôles avancés (I4).
- **DoD** : login SSO Azure AD test → user créé/retrouvé, JWT consommable, attributs mappés (email, dept optionnel), logout SSO, tests E2E.
- **Commit** : `feat(auth): saml sso via workos [S2-I2]`.

### S2-I3 — SCIM provisioning 🔒

- **Scope IN** : endpoints SCIM 2.0 (`Users`, `Groups`), auth Bearer dédiée, gating Business+, audit log de chaque provisioning.
- **DoD** : Azure AD enterprise app SCIM connectée, création/suppression auto user testée, isolation tenant respectée.
- **Commit** : `feat(auth): scim 2.0 provisioning [S2-I3]`.

### S2-I6 — Discovery mode 🛡️

- **Scope IN** : nouveau champ `policy.mode = 'discovery' | 'enforce' | 'mixed'`. En discovery : détections enregistrées mais **aucun bloc ni redact** affiché, juste un événement télémétrie + notice utilisateur "audit en cours" (FR+EN).
- **Conformité** : notice doit être à jour (compliance_rgpd) ; opt-in tenant explicite (pas par défaut).
- **DoD** : tests adaptateur 3 LLM × discovery → 0 modale, événements collectés, notice affichée au moins une fois.
- **Commit** : `feat(detection): discovery mode for shadow ai audit [S2-I6]`.

### S2-I10 — Webhook sortant signé 🔒

- **Scope IN** : configuration tenant (URL + secret), signature HMAC-SHA256, header `X-Signature` + `X-Timestamp` (anti-replay), retry exponentiel 5 tentatives, dead letter queue, panel test.
- **DoD** : événement test délivré + validé localement (sample receiver), replay rejeté > 5 min, doc HMAC dans `/docs/webhooks`.
- **Commit** : `feat(integrations): signed outbound webhook with retry [S2-I10]`.

### S2-I15 — Détection v2 contexte structurel

- **Scope IN** : détection langage (highlight.js auto-detect ou heuristique), JSON parse tentative, URL regex, classification global du buffer → pondération par ruleType (ex. clé API en URL = downgrade, IBAN dans code = upgrade).
- **DoD** : corpus de tests (50+ samples) avec attendus, baseline précision documentée, perf < 50 ms maintenue.
- **Commit** : `feat(detection): contextual classification v2 [S2-I15]`.

### S2-I24 — Pentest externe 🔒

- **Scope IN** : prestataire engagé S0/S2 (Synacktiv / Lexfo / Cure53 light), périmètre extension + API + portail, scope test grey-box, 3-5 j prestataire, fenêtre observation 4 sem.
- **DoD** : rapport reçu, plan de remédiation, fix tous les High avant tag de sprint, ≤ 3 Medium documentés.
- **Commit** : `chore(security): pentest remediations [S2-I24]`.

### S2-I25 — SOC 2 Type I démarrage 🔒

- **Scope IN** : Drata onboardé, mapping contrôles AICPA Trust Services Criteria (Security mandatory + Availability + Confidentiality), policies écrites (security, incident, access, BCP, vendor management), contrôles techniques (MFA partout, password manager équipe (toi + freelances), endpoint logs, disques chiffrés).
- **DoD** : Drata dashboard ≥ 80% green, gap analysis livrée, firme audit engagée pour audit fin S3.
- **Commit** : `docs(compliance): soc2 type i kickoff [S2-I25]`.

---

## Gates de fin de sprint (avant merge + tag v0.3.0-s2)

| Gate | Validateur | Critère |
|---|---|---|
| Tests verts CI | qa_tester | `npm run ci` |
| Coverage ≥ 75% global | qa_tester | |
| Sécurité | security_auditor | 0 High + pentest fermé High |
| RGPD | compliance_rgpd | discovery mode + nouveaux LLM = notice à jour |
| SSO réel | humain | 1 démo réussie avec Azure AD tenant client |
| SIEM | functional_tester | 1 événement délivré end-to-end (Sentinel ou Splunk) |
| Précision FP | qa_tester | -50% faux positifs vs baseline S1 sur corpus |
| MRR | humain | ≥ 2k $ vérifié Paddle |
| 2 logos Business | humain | contrats signés annuels |

---

## Suivi hebdo

(Même template que S1.)

---

## Sortie → entrée Sprint 3

- Pipeline Enterprise > 500 sièges
- Top features manquantes (priorité S3)
- Status SOC 2 Type I (% Drata green)
- Métriques : MRR, CAC, churn, NPS, précision détection
