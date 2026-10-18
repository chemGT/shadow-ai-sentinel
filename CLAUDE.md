# CLAUDE.md — Shadow AI Sentinel

Point d'entrée Claude Code. Concis : le détail vit dans `.ai/` (voir renvois en bas).
Les préférences globales de chemGT (style FR, RTK, conventions) s'appliquent en plus — non redupliquées ici.

## Le projet en une ligne

Extension navigateur **MV3 B2B** = **DLP** sur les LLM publics (Claude / ChatGPT / Gemini /
Le Chat / DeepSeek / Perplexity / Grok / Copilot) :
détection **100 % locale** des données sensibles **avant envoi**, modes **Block** ou **Redact**.
Aucun contenu de prompt ne quitte le navigateur ; la télémétrie serveur (optionnelle, tier tenant)
ne porte que des métadonnées.

**Modèle : open source (Apache-2.0)** — décision du 18/10, vente abandonnée. Toutes les
fonctionnalités (secrets, PII `iban`/`card`/`internal_ip`/`pro_email`/`phone`, scan fichiers
texte/code + PDF/DOCX, allowlist) sont disponibles sans licence. Identité publique = pseudo `chemGT`
(pas de nom réel, pas de domaine perso). Étude + plan L1–L6 : `.ai/plans/open-source.md`.

## Commandes & garde-fous

| Commande | Rôle |
|----------|------|
| `npm test` | Vitest — **298 tests, doit être vert** |
| `npm run test:e2e` | Playwright — extension réelle (`dist/`) + fixtures des 8 sites (30 tests) |
| `npx tsc --noEmit` | Typecheck — doit être vide |
| `npm run build` | Typecheck + build extension Chromium → `dist/` |
| `npm run build:firefox` | Build Firefox → `dist-firefox/` |
| `npm run package:firefox` | .xpi signable pour AMO |
| `npm run backend` | API Express locale (port 3000) |

**Reprise à froid :** les 3 premiers verts, puis charger `dist/` via `chrome://extensions`
(mode dev → « charger l'extension non empaquetée ») pour tester popup + allowlist.

## Architecture (l'essentiel)

- Côté content, `getPolicy()` renvoie la policy stockée telle quelle (plus de gating Free/Pro).
- **Allowlist** dans clé **`sentinel_allowlist`**, toujours appliquée.
- Le code de licence (Lemon Squeezy, `src/core/licensing`, `license-manager`) a été **supprimé** (L1).

## État sprint & prochaine action

- **Open source en cours** : plan **`.ai/plans/open-source.md`** (L1 nettoyage fait ; L2 correctifs
  B1/B2/B4 ; L3 hygiène OSS ; L4 tri `.ai/` ; L5 publication ; stores CWS/AMO : plus tard).
- Le portail Next.js Clerk (`apps/portal`) est archivé (branche `archive/saas-portal`). Le backend
  Express garde encore l'auth Clerk JWT + jobs (dunning) : décision keep/archive en attente.
- Reprise détaillée à froid : **`.ai/plans/checkpoint.md`** (antérieur au pivot OSS).

## Renvois documentation (`.ai/`)

| Fichier | Rôle |
|---------|------|
| `.ai/plans/checkpoint.md` | **Reprise à froid** (statuts, journal, archi gating) |
| `.ai/plans/open-source.md` | **Plan open source** (audit, licence, lots L1–L6) |
| `.ai/context.md` | Vision technique + doc projet + agents |
| `.ai/agents/orchestrator.md` | Délégation multi-agents (tâche large) |
| `.ai/SUIVI-ACTIONS.md` | Suivi des actions / avancement |
| `store-assets/` | Listings EN/FR, permissions, privacy, screenshots 1280×800 |
