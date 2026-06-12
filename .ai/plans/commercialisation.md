# Plan de commercialisation — Shadow AI Sentinel

> Document maître.  
> Sprints : [sprint-1](./commercialisation-sprint-1.md) · [sprint-2](./commercialisation-sprint-2.md) · [sprint-3](./commercialisation-sprint-3.md)  
> Exécution : [playbook](./commercialisation-execution-playbook.md) (workflow itérations, gates de validation, agents)  
> Dernière mise à jour : 2026-06-12  
> Statut global : **Sprint 1 démarré — S1-I1 livré** (Sprint 0 technique clôturé 2026-06-12)  
> Implémentation : Claude Sonnet 4.6 + chaîne d'agents (qa_tester, functional_tester, security_auditor, compliance_rgpd)

---

## Vision commerciale

Transformer le MVP technique (DLP navigateur 100% local, 3 LLM, RGPD-ready) en produit SaaS vendable sur les marchés **FR + US**, avec un go-to-market **freemium individuel + tiers payants équipe/entreprise**, opéré en **solo** sur **6 mois**.

**Tagline EN** : *"The local-only browser DLP that maps and controls Shadow AI in your workforce — without ever reading your prompts."*
**Tagline FR** : *"Le DLP navigateur 100% local qui rend visible et maîtrise l'usage des IA génératives en entreprise — sans jamais voir vos prompts."*

---

## Décisions de cadrage (validées 2026-06-11)

| Sujet | Décision |
|---|---|
| Modèle commercial | Freemium individuel + Team self-serve + Business/Enterprise sales-assisted |
| Horizon | MVP commercial vendable en 3 mois, scale-ready en 6 mois |
| Ressources | Solo + Claude Code + freelances ponctuels (legal, design, pentest) |
| Positionnement | Privacy-first 100% local + Audit Shadow AI + Intégration écosystème entreprise |
| Marchés cibles | FR et US (langue primaire EN, FR secondaire) |
| Hébergement API | EU (Frankfurt) + CDN global, région US à la demande Enterprise |
| Billing | Paddle (Merchant of Record — gère TVA UE + sales tax US) recommandé vs Stripe direct |
| Auth utilisateurs | Clerk ou Supabase Auth (économise dev SSO) |
| Conformité prioritaire | RGPD (déjà partiel), CCPA/CPRA notice, SOC 2 Type I démarré S2 |

---

## Cibles & ICP

### ICP primaire — Mid-market réglementé EU+US
- 200 à 2 000 employés
- CISO ou RSSI déjà en poste, programme conformité actif
- Secteurs : finance, santé, conseil, juridique, public, éditeurs SaaS
- Pain : Shadow AI massif, pression DPO/conformité, pas de visibilité

### ICP secondaire — Équipes tech ETI
- Dev/Security teams 20-200 personnes
- Pain : fuite de code/secrets vers Copilot, ChatGPT
- Achat self-serve via carte CB, contournent achats

### Freemium — Individus & petites équipes
- Développeurs, consultants, freelances
- Acquisition par bouche-à-oreille, GitHub, communautés sécurité
- Conversion 1-3% vers tier payant à terme

---

## Pricing (à valider en S1)

| Tier | Cible | Prix (EN) | Prix (FR) | Sièges | Inclus |
|---|---|---|---|---|---|
| **Free** | Individus | $0 | 0 € | 1 | Extension perso, 3 LLM, regex de base, pas de dashboard, pas de télémétrie cloud |
| **Team** | PME / squads | $5/seat/mo | 5 €/siège/mois | 5-50 | Dashboard light, policies custom, SSO Google/Microsoft, support email 48h |
| **Business** | ETI | $11/seat/mo | 10 €/siège/mois | 50-500 | Audit Shadow AI complet, SIEM webhooks, SSO SAML, SCIM, DPA, SLA 99.5%, support 24h |
| **Enterprise** | Grands comptes | sur devis | sur devis | 500+ | Self-hosted option, mTLS, MDM, support dédié, audit annuel, SOC2 report |

Annual discount : -20%. Free trial 14 jours sur Team et Business.

---

## Roadmap globale (3 sprints)

| Sprint | Durée | Objectif | Jalon de sortie | Statut |
|---|---|---|---|---|
| **S0 — Préparation** | 1-2 sem | Setup outils, branding, légal kick-off | Identité visuelle + domaines + stack ops prêts | ⏳ À démarrer |
| **[S1 — Make it sellable](./commercialisation-sprint-1.md)** | 8 sem | Pouvoir encaisser, onboarder, livrer | 1ère vente Paddle + 3 pilotes payants en prod | ⏳ |
| **[S2 — Enterprise-credible](./commercialisation-sprint-2.md)** | 8 sem | Décrocher des deals Business | MRR > 2k$ + 2 logos Business + pentest OK + SOC2 démarré | ⏳ |
| **[S3 — Scale-ready](./commercialisation-sprint-3.md)** | 8 sem | Conditions d'autonomie ou levée | MRR > 8-10k$ + NPS > 30 + pipeline 3 mois | ⏳ |

---

## Sprint 0 — Préparation (semaines -2 à 0)

Pré-requis avant lancement Sprint 1. **Budget : 8-10 jours.**

| ID | Tâche | Estimation | Statut |
|---|---|---|---|
| S0-1 | Nom commercial définitif + recherche INPI/USPTO de disponibilité | 1 j | ⏳ |
| S0-2 | Achat domaines (.com .io .fr), email pro Google Workspace ou Fastmail | 0.5 j | ⏳ |
| S0-3 | Logo + identité visuelle (Fiverr 200-400 € ou solo Figma) | 2 j (calendrier) | ⏳ |
| S0-4 | Création entité légale (SASU FR + Stripe Atlas si besoin Delaware) | 5 j (calendrier, papier) | ⏳ |
| S0-5 | Compte Paddle (KYC, 1-2 sem review) | 1 j actif + délai | ⏳ |
| S0-6 | Comptes outils : GitHub org, Linear/Plane, Vercel, Render, Sentry, PostHog, Plain | 1 j | ⏳ |
| S0-7 | Brief juriste freelance pour CGU/CGV/DPA (templates Iubenda + relecture) | 1 j actif | ⏳ |
| S0-8 | Audit ReDoS du moteur regex actuel (P1-9 pendant) | 1-2 j | ⏳ |
| S0-9 | Clôture recettes manuelles pilote (matrice F01-F10, multi-LLM) | 2-3 j | ⏳ |
| S0-10 | Décision : monorepo (npm workspaces) ou split repos extension/api/web | 0.5 j décision + 1 j refactor | ⏳ |

---

## KPIs cibles fin de plan (mois 6)

| KPI | Cible mois 3 | Cible mois 6 |
|---|---|---|
| Comptes Free actifs | 200 | 1 500 |
| Comptes payants logos | 3 | 15-20 |
| Sièges payés | 30-50 | 300-500 |
| MRR | 300-500 $ | 8-10k $ |
| Activation (signup → 1ère alerte < 24h) | 40% | 60% |
| Churn logo mensuel | < 10% | < 5% |
| Précision détection (1 - faux positifs signalés) | > 85% | > 92% |
| Pipeline démos/mois (Business) | 3 | 12 |
| NPS | n/a | > 30 |

---

## Risques majeurs

| ID | Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|---|
| RC-1 | Burn-out solo | Élevée | Élevé | Plafond 4j/sem, sous-traiter design/legal/SOC2, embauche freelance S2 |
| RC-2 | Concurrents US baissent prix UE | Moyenne | Élevé | Différenciation 100% local + ancrage FR + tarif PME |
| RC-3 | Chrome Web Store rejette permissions | Moyenne | Élevé | Réduction perms dès S1, justification doc, plan B AMO+CRX self-hosted |
| RC-4 | Plateformes LLM cassent DOM | Élevée | Moyen | Recettes e2e Playwright + monitoring synthétique + abonnements test |
| RC-5 | Faux positifs → churn | Élevée | Élevé | Signal user S1 + détection v2 S2 priorité |
| RC-6 | CNIL/DPO bloque DPA | Faible | Élevé | DPA + DPIA prêts S1, relecture juriste |
| RC-7 | SOC2 prend > 6 mois | Moyenne | Moyen | Démarrer S2 avec Drata/Vanta, accepter Type II en mois 9-12 |
| RC-8 | Paddle KYC bloque revenus | Faible | Élevé | Démarrer KYC S0, plan B Stripe + LemonSqueezy |

---

## Manquements techniques bloquants (consolidé)

Voir détails dans backlogs de sprints. Synthèse :

| Domaine | Bloquant pour | Sprint |
|---|---|---|
| Multi-tenant API réel (isolation, rotation clés) | Tout client > 1 | S1 |
| Auth utilisateur + portail admin | Self-serve | S1 |
| Dashboard admin (graphes, exports) | Positionnement audit Shadow AI | S1 puis S2 |
| Signalement faux positif | Adoption | S1 |
| Billing Paddle / licences | Encaissement | S1 |
| Publication Chrome Web Store + AMO | Volume / signature | S1 |
| ReDoS audit + perf workers | Sécurité prod | S0/S1 |
| SSO SAML + SCIM | Vente mid-market | S2 |
| SIEM webhooks + Slack/Teams | Intégration écosystème | S2 |
| Détection v2 (contexte, allowlists tenant) | Réduction faux positifs | S2 |
| Couverture LLM étendue (Copilot M365, Mistral, Perplexity) | Concurrence | S2 |
| SOC 2 Type I | US mid-market | S2 |
| Audit Shadow AI mode discovery | Positionnement #3 | S2 |
| Self-hosted option | Enterprise | S3 |
| API publique + intégrations Zapier | Écosystème | S3 |
| MDM Intune/Jamf/Workspace | Enterprise déploiement | S3 |

---

## Légal — kit minimum à produire

| Document | Échéance | Coût estimé |
|---|---|---|
| CGU service SaaS (EN + FR) | S1 | 800-1 500 € avocat |
| CGV B2B (EN + FR) | S1 | inclus |
| Politique de confidentialité (EN + FR) — RGPD + CCPA | S1 | inclus |
| DPA template (sous-traitant) | S1 | inclus |
| Mentions légales site | S1 | 0 (template) |
| Notice cookies + bannière (consent management) | S1 | Iubenda 30 €/mois |
| DPIA (déjà partielle dans `.ai/compliance/`) | S1 | finalisation solo |
| Registre des traitements (modèle client) | S1 | déjà partiel |
| ToS US-specific (CCPA opt-out, arbitration clause) | S1 | inclus |
| SLA Business 99.5% / Enterprise 99.9% | S2 | template |
| BAA (HIPAA si santé US) | Optionnel S3 | avocat US 1-2k$ |

---

## Comment maintenir ce document

1. À chaque fin de sprint : mettre à jour le statut dans § Roadmap globale.
2. À chaque livrable : décrémenter la liste sprint correspondant (sprint-N.md).
3. Mettre à jour les KPIs réels en bas du document (à créer en S1).
4. Versionner toute décision majeure (pivot pricing, abandon feature) dans une § Décisions à créer.
5. Ne **jamais** mettre de secret (clés Paddle, Stripe, etc.) dans ces fichiers — référencer Portainer ou 1Password.

---

## Prochaines actions

1. Valider le pricing en table — à confronter à 5 prospects ICP avant lancement.
2. Lancer Sprint 0 (8-10 j) : entité, domaines, identité, comptes outils.
3. Démarrer [Sprint 1](./commercialisation-sprint-1.md) dès S0 terminé.
