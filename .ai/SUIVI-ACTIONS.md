# Suivi des actions — Shadow AI Sentinel

> **Document vivant** : mettre à jour à chaque fin de phase ou livrable notable.  
> Plan détaillé : [plans/mvp-pilote-claude.md](./plans/mvp-pilote-claude.md)  
> Guide d’installation : [guides/INSTALLATION.md](./guides/INSTALLATION.md)

**Dernière mise à jour :** 2026-05-19  
**Version produit cible :** 0.1.0 (pilote Claude)  
**Avancement global :** Phase 3 / 7 terminée (~57 %)

---

## Légende des statuts

| Symbole | Statut |
|---------|--------|
| ✅ | Terminé |
| 🔄 | En cours |
| ⏳ | À faire |
| 🚫 | Bloqué |
| ➖ | Hors scope pilote |

---

## Vue d’ensemble des phases

| Phase | Intitulé | Statut | Agent principal | Guide install mis à jour |
|-------|----------|--------|-----------------|--------------------------|
| 0 | Architecture & contrats | ✅ | architect | § Prérequis, § Extension Chromium (base) |
| 1 | Moteur regex | ✅ | backend_ops | § Vérifier le moteur (tests) |
| 2 | Adaptateur Claude (DOM) | ✅ | platform_watcher → ext_dev | § Tester sur Claude |
| 3 | Policies & offline | ✅ | ext_dev | § Options, § API |
| 4 | API durcissement prod | ⏳ | backend_ops | rétention, rate limit |
| 5 | UX & i18n | ⏳ | ux_writer | § Notice employé (à venir) |
| 6 | QA & release pilote | ⏳ | qa_tester | § Release pilote (à venir) |
| 7 | ChatGPT + Gemini | ⏳ | platform_watcher | § Multi-LLM (à venir) |

---

## Journal des mises à jour

| Date | Auteur / agent | Action |
|------|----------------|--------|
| 2026-05-19 | orchestrator | Création plan MVP + cadrage validé (Claude, télémétrie, FR/EN, Chromium+Firefox) |
| 2026-05-19 | architect | **Phase 0** : types, platform/, manifest Claude-only, ADR, threat model |
| 2026-05-19 | backend_ops | **Phase 1** : 6 détecteurs regex, 19 tests Vitest, limite 100k car. |
| 2026-05-19 | orchestrator | Création `SUIVI-ACTIONS.md` + `guides/INSTALLATION.md` |
| 2026-05-19 | — | Repo Git privé GitHub `chemGT/shadow-ai-sentinel` — commit initial `f25ea5e` |
| 2026-05-19 | ext_dev | **Phase 2** : adaptateur Claude, Block/Redact, modale Shadow DOM, i18n FR/EN |
| 2026-05-19 | ext_dev + backend_ops | **Phase 3** : Options, sync policy, queue télémétrie, API MVP |

---

## Détail par phase

### Phase 0 — Architecture ✅

| ID | Action | Statut | Livrable / preuve |
|----|--------|--------|-------------------|
| P0-1 | Schémas TS (`Policy`, `TelemetryEvent`, …) | ✅ | `src/core/types.ts` |
| P0-2 | Validation policy / télémétrie | ✅ | `src/core/validation/*` |
| P0-3 | Abstraction navigateur | ✅ | `src/extension/platform/*` |
| P0-4 | Manifest MV3 minimal (Claude) | ✅ | `manifest.json` |
| P0-5 | ADR dual-browser + queue offline | ✅ | `.ai/adr/001`, `002` |
| P0-6 | Threat model MVP | ✅ | `.ai/security/threat-model-mvp.md` |
| P0-7 | Exemple policy JSON | ✅ | `.ai/schemas/policy.example.json` |

---

### Phase 1 — Moteur regex ✅

| ID | Action | Statut | Livrable / preuve |
|----|--------|--------|-------------------|
| P1-1 | Détecteur `api_key` | ✅ | `src/core/detection/api-key.ts` |
| P1-2 | Détecteur `generic_secret` | ✅ | `src/core/detection/generic-secret.ts` |
| P1-3 | Détecteur `iban` (+ mod97) | ✅ | `src/core/detection/iban.ts` |
| P1-4 | Détecteur `internal_ip` | ✅ | `src/core/detection/internal-ip.ts` |
| P1-5 | Détecteur `pro_email` (allowlist) | ✅ | `src/core/detection/pro-email.ts` |
| P1-6 | Détecteur `phone` | ✅ | `src/core/detection/phone.ts` |
| P1-7 | Fusion chevauchements | ✅ | `src/core/detection/merge-matches.ts` |
| P1-8 | Tests unitaires | ✅ | `npm test` (19 tests) |
| P1-9 | Revue sécurité ReDoS | ⏳ | À planifier avant release pilote |

---

### Phase 2 — Adaptateur Claude ✅

| ID | Action | Statut | Notes |
|----|--------|--------|-------|
| P2-1 | Cartographie sélecteurs DOM Claude | ✅ | `selectors.ts` + `platform-compatibility.md` |
| P2-2 | Module `sites/claude/` | ✅ | `adapter.ts`, `dom.ts` |
| P2-3 | Branchement `detectSensitiveData` | ✅ | `content/analyze.ts` |
| P2-4 | Mode Block + modale | ✅ | `SentinelAlert` + Shadow DOM |
| P2-5 | Mode Redact in-place | ✅ | `execCommand` + toast |
| P2-6 | Tests manuels matrice F01–F08 | ⏳ | À valider sur claude.ai connecté |

---

### Phase 3 — Policies & offline ✅

| ID | Action | Statut | Notes |
|----|--------|--------|-------|
| P3-1 | Sync `GET /policies` | ✅ | `policy-sync.ts` |
| P3-2 | Page Options | ✅ | `options/index.html` |
| P3-3 | Queue télémétrie offline | ✅ | `telemetry-queue.ts` |
| P3-4 | Flush + backoff + alarms | ✅ | 5 min / 30 min |
| P3-5 | API MVP `/policies` `/telemetry` | ✅ | `server.ts` |

---

### Phase 4 — API ⏳

| ID | Action | Statut | Notes |
|----|--------|--------|-------|
| P4-1 | `GET /policies` | ⏳ | |
| P4-2 | `POST /telemetry` + validation stricte | ⏳ | |
| P4-3 | Auth Bearer par tenant | ⏳ | |
| P4-4 | Rétention 90 j + purge | ⏳ | |
| P4-5 | Notice employé FR/EN (brouillon) | ⏳ | `compliance_rgpd` |

---

### Phase 5 — UX & i18n ⏳

| ID | Action | Statut | Notes |
|----|--------|--------|-------|
| P5-1 | Copy modales Block FR/EN | ⏳ | |
| P5-2 | Tokens Redact affichés côté UI | ⏳ | |
| P5-3 | Premier lancement → notice légale | ⏳ | |

---

### Phase 6 — QA & release pilote ⏳

| ID | Action | Statut | Notes |
|----|--------|--------|-------|
| P6-1 | CI build Chromium | ⏳ | |
| P6-2 | Build Firefox (WXT / web-ext) | ⏳ | |
| P6-3 | Guide install final | ⏳ | MAJ `INSTALLATION.md` |
| P6-4 | Soumission XPI Mozilla signé | ⏳ | |
| P6-5 | Critères fin pilote validés | ⏳ | voir § Pilote |

---

### Phase 7 — ChatGPT + Gemini ⏳

| ID | Action | Statut | Notes |
|----|--------|--------|-------|
| P7-1 | Adaptateur ChatGPT | ⏳ | |
| P7-2 | Adaptateur Gemini | ⏳ | |
| P7-3 | Régression 3 LLM × 2 navigateurs | ⏳ | |

---

## Checklist intégration client

À remplir **à l’intégration** (bloquant go-live, pas bloquant dev).

| Élément | Fourni par le client | Statut |
|---------|----------------------|--------|
| `tenantId` | | ⏳ |
| Clé API Bearer | | ⏳ |
| URL API (`apiBaseUrl`) | | ⏳ |
| `emailDomains[]` (emails pro) | | ⏳ |
| Modes par type (override défauts) | | ⏳ |
| `departmentId` (optionnel) | | ⏳ |
| URL hébergement XPI Firefox signé | | ⏳ |
| Relecture DPO / notice employé | | ⏳ |

---

## Critères de fin de pilote

| Critère | Cible | Statut |
|---------|--------|--------|
| Utilisateurs | 20–50 **ou** 2 semaines | ⏳ |
| Matrice Claude F01–F10 | 100 % OK | ⏳ |
| Chromium + Firefox | Validé | ⏳ |
| Bugs bloquants | 0 sur 5 jours | ⏳ |
| Perf détection p95 | &lt; 50 ms (~10k car.) | ✅ (test unitaire Phase 1) |
| Checklist RGPD | Validée + DPO client | ⏳ |
| Télémétrie conforme schéma | 100 % | ⏳ |

---

## Risques & blocages actifs

| ID | Risque / blocage | Impact | Mitigation | Statut |
|----|------------------|--------|------------|--------|
| R-1 | DOM Claude change | Interception cassée | Adaptateur isolé + veille | Surveillé |
| R-2 | DPO client non validé | Télémétrie obligatoire | Notice + schéma strict | ⏳ |
| R-3 | Build Firefox non démarré | Pilote Chromium seul d’abord | Phase 6 | ⏳ |

---

## Prochaines actions (priorité)

1. **P2-6** — Tests manuels Claude (Block/Redact + sync Options).
2. **Phase 4** — Durcissement API (rate limit, rétention 90 j, notice RGPD).
3. Valider file offline 24 h (test manuel).

---

## Comment maintenir ce document

1. Changer le statut des lignes quand une tâche est livrée.
2. Ajouter une ligne au **Journal des mises à jour**.
3. Mettre à jour **Avancement global** et la colonne « Guide install » du tableau des phases.
4. Référencer les PR / commits dans « Livrable / preuve » si utile.
