# Checklist fin de pilote — Shadow AI Sentinel (Claude)

> Critères du [plan MVP](../plans/mvp-pilote-claude.md) § Fin de pilote.  
> À valider par **product_owner** + équipe client avant clôture.

---

## 1. Technique & QA

| # | Critère | Cible | Statut | Preuve |
|---|---------|--------|--------|--------|
| T1 | CI verte | `npm run ci` (tests + build Chromium + Firefox) | ✅ | 94/94 tests verts — 2026-06-12 |
| T2 | Tests auto | 100 % verts (`npm test`) | ✅ | 17 fichiers / 94 tests — coverage 81% stmts |
| T3 | Build Chromium chargeable | `dist/` | ✅ | 60 modules, 214 kB bundle — 2026-06-12 |
| T4 | Build Firefox chargeable | `dist-firefox/` | ✅ | 60 modules, 214 kB bundle — 2026-06-12 |
| T5 | XPI Mozilla signé (prod) | Artefact HTTPS interne client | ☐ | URL + date signature |
| T6 | Matrice F01–F10 | 100 % OK | ☐ | [matrice-tests-pilote-claude.md](./matrice-tests-pilote-claude.md) |
| T7 | Perf détection | p95 &lt; 50 ms (~10k car.) | ☐ | Test unitaire Phase 1 |
| T8 | Stabilité | 0 bug **bloquant** sur 5 jours usage interne | ☐ | Liste anomalies |

---

## 2. Fonctionnel & UX

| # | Critère | Statut |
|---|---------|--------|
| F1 | Block + Redact opérationnels sur claude.ai (Chromium) | ☐ |
| F2 | Même comportement sur Firefox (F10) | ☐ |
| F3 | Notice employé affichée au 1er lancement | ☐ |
| F4 | Options : credentials + sync policy + import JSON | ☐ |
| F5 | Offline : policy en cache + télémétrie rattrapée (F09) | ☐ |

---

## 3. Conformité & client

| # | Critère | Statut |
|---|---------|--------|
| C1 | Checklist RGPD technique | ☐ | [checklist-rgpd-release.md](../compliance/checklist-rgpd-release.md) |
| C2 | Relecture DPO / juriste **client** | ☐ |
| C3 | `tenantId` + clé API + `emailDomains[]` fournis | ☐ |
| C4 | Télémétrie 100 % conforme schéma (aucun contenu prompt) | ☐ |
| C5 | Notices employé FR/EN communiquées | ☐ |

---

## 4. Pilote (métier)

| # | Critère | Cible | Statut |
|---|---------|--------|--------|
| P1 | Utilisateurs déployés | **20–50** OU **2 semaines** (premier atteint) | ☐ |
| P2 | Guide install remis aux IT / utilisateurs | ☐ |
| P3 | Contact support interne client défini | ☐ |
| P4 | Version figée (tag Git + manifest) | ☐ |

---

## Décision de clôture

| | |
|---|---|
| **Date** | |
| **Décision** | Poursuite Phase 7 (ChatGPT/Gemini) ☐ · Extension pilote ☐ · Arrêt ☐ |
| **Signataire PO** | |
