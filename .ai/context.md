# Projet : Shadow AI Sentinel

## Vision
Un DLP (Data Loss Prevention) ultra-léger sous forme d'extension navigateur B2B. L'objectif est d'intercepter les données sensibles (clés API, IBAN, IP internes) tapées par les utilisateurs dans des LLMs publics (ChatGPT, Claude, Gemini) AVANT leur soumission.

## Scope MVP (Version Actuelle)
1.  **Frontend (Extension) :** Manifest V3. Content script qui intercepte les requêtes (clics/entrées clavier) sur les domaines d'IA.
2.  **Moteur de détection :** 100% local (expressions régulières avancées pour le MVP).
3.  **Actions :** 
    - Mode Block : Alerte l'utilisateur et empêche l'envoi.
    - Mode Redact : Remplace la donnée par un token (ex: `[REDACTED_IBAN]`) à la volée.
4.  **Backend (Optionnel MVP) :** API Node.js stateless pour distribuer la configuration (policies) et récupérer la télémétrie anonymisée. Déploiement prévu via conteneur sur Portainer.

## Contraintes Techniques
- Zéro fuite de contexte : L'analyse doit se faire dans le navigateur.
- UX : Pas de friction inutile, l'extension doit éduquer l'utilisateur.
- Manifest V3 : Respect strict des contraintes des Service Workers et des Content Security Policies (CSP).

## Documentation projet (`.ai/`)

| Document | Rôle |
|----------|------|
| `plans/mvp-pilote-claude.md` | Plan MVP détaillé par phases |
| `SUIVI-ACTIONS.md` | **Suivi des actions** — statuts, journal, checklist pilote |
| `guides/INSTALLATION.md` | **Guide d'installation** — mis à jour à chaque phase livrée |
| `compliance/` | Fiche traitement, notices employé, checklist RGPD |

## Agents IA (`.ai/agents/`)

**Point d'entrée recommandé :** `orchestrator.md` — planifie, découpe et délègue aux agents ci-dessous.  
Pour une tâche ciblée et déjà cadrée, tu peux invoquer directement le spécialiste.

| Agent | Fichier | Quand l'utiliser |
|-------|---------|------------------|
| **Orchestrateur / CP** | `orchestrator.md` | Toute demande large, roadmap, coordination multi-agents, synthèse release |
| Architecte | `architect.md` | Nouvelle feature, revue d'architecture, intégration SW / content / API |
| Extension MV3 | `ext_dev.md` | DOM, interception, UI React, messaging, adaptateurs par site LLM |
| Backend & Ops | `backend_ops.md` | Regex perf, API Express, Docker, Portainer |
| Product Owner | `product_owner.md` | Priorisation, stories, critères d'acceptation, scope MVP |
| QA technique | `qa_tester.md` | Tests auto, CI, build, régression regex, perf |
| QA fonctionnel | `functional_tester.md` | Scénarios utilisateur, matrice de test, UX métier |
| Sécurité DLP | `security_auditor.md` | Audit confidentialité, permissions, contournements, conformité |
| UX Writer | `ux_writer.md` | Copy modales, onboarding, i18n, ton B2B |
| Doc technique admin | `technical_writer.md` | Portainer, API, déploiement enterprise, dépannage |
| Conformité RGPD | `compliance_rgpd.md` | DPIA, minimisation, bases légales, notices employé |
| Veille plateformes | `platform_watcher.md` | Sélecteurs DOM, compatibilité ChatGPT / Claude / Gemini |
