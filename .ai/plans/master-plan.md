# MASTER PLAN — lancement prosumer → enterprise-ready

> **Point d'entrée roadmap** (dire « master plan » suffit pour retrouver ce fichier).
> Rédigé le 2026-07-08 en Plan Mode (Claude Fable 5), après vérification de l'état réel du code.
> Remplace [commercialisation.md](./commercialisation.md) (pré-pivot Paddle, obsolète).
> Reprise à froid de l'état technique : [checkpoint.md](./checkpoint.md).

---

## Séquence

| Sprint | Fichier | Durée | Objectif | Statut |
|---|---|---|---|---|
| **L — Launch** | [sprint-launch.md](./sprint-launch.md) | ~1,5 sem | 1er encaissement réel : produit Lemon Squeezy + site live + CWS/AMO | ⏳ prochain |
| **R — Résilience** | [sprint-resilience.md](./sprint-resilience.md) | ~2 sem | Fail-closed + OTA sélecteurs (Cloudflare Workers + KV, payload signé Ed25519) | ⏳ **bloquant avant toute vente B2B active** |
| **M — MDM + Team** | [sprint-mdm-team.md](./sprint-mdm-team.md) | ~2 sem | `chrome.storage.managed`, templates Intune/Firefox/Jamf, licence Team multi-sièges LS | ⏳ **bloquant avant toute mise en avant commerciale du tier Team** |
| **E — Enterprise+** | backlog en fin de [sprint-mdm-team.md](./sprint-mdm-team.md) | non planifié | SSO/SCIM, self-hosted, SOC 2, NER — sur déclencheurs explicites uniquement | 💤 |

## Cadrage (décisions utilisateur 2026-07-08 — ne pas re-débattre)

- **Lancer d'abord, enterprise après.** Le prosumer encaisse pendant que R et M se construisent.
- **SSO/SAML/SCIM hors scope** ; le portail Clerk reste en pause (cf. note dans
  [commercialisation-sprint-1.md](./commercialisation-sprint-1.md)). Team v1 = licence LS
  multi-sièges + policy managed/JSON, **sans compte**. Déclencheur de dé-pause : ≥ 2 prospects
  demandant SSO.
- **Infra OTA/policies = Cloudflare Workers + KV** (déjà dans la stack via le site sur Pages).
  L'API Node/Portainer reste pour le self-hosted enterprise futur (Sprint E).
- **Bande passante : quasi temps plein (4-5 j/sem)** → sprints de 2 semaines réalistes.

## Positionnement & séquencement commercial (décisions 2026-07-12 — ne pas re-débattre)

Analyse concurrentielle menée le 2026-07-12 (Nightfall AI, Harmonic Security, Microsoft Purview,
dope.security, LayerX, Netskope, Cyberhaven, Metomic — tous positionnés enterprise, 150-200+$/siège/an).
Conclusions actées :

- **Pas de moat technique côté extension** — un `.crx`/`.xpi` est désarchivable, le JS est lisible,
  les règles de détection sont copiables en quelques jours par un concurrent motivé. Le moat réel =
  couverture des 8 sites maintenue dans le temps + distribution/confiance store + relation B2B, **pas**
  le secret du code. Ne jamais vendre "impossible à copier" comme argument produit.
- **Sprint R devient un bloqueur de vente B2B, pas seulement un item roadmap.** Le fail-open
  (`guard-adapter.ts`) disqualifie immédiatement le produit dans un audit sécurité acheteur — donc
  toute démarche de vente B2B active (démos, outreach IT/sécu) doit attendre R livré, même si L est
  fini avant.
- **Le tier Team ne doit pas être mis en avant commercialement avant Sprint M.** Le pousser sans MDM
  réel recrée le risque déjà identifié (mémoire `project_prompt_redact_mdm_gap`) à un niveau plus
  large depuis le pivot copy landing du 2026-07-10 (cible tout le segment IT/sécu, pas juste le mot
  MDM).
- **Cible réaliste à court terme : PME/ETI (10-300 salariés) sensibles RGPD**, pas le Fortune 500 déjà
  équipé Nightfall/Purview/Harmonic. Argument différenciant honnête = prix (49€/an/siège vs
  150-200+$/siège/an), zéro-config, RGPD-natif (déjà vrai : télémétrie sans PII, zéro appel réseau en
  Free) — pas la promesse de rivaliser feature-à-feature avec les suites enterprise.

## Pourquoi ces sprints (blockers vérifiés dans le code, 2026-07-08)

1. **Fail-open** : `src/extension/sites/shared/guard-adapter.ts` — si `findComposerInput()`
   ne résout rien (sélecteur cassé par un redesign), le guard retourne silencieusement et le
   message part **sans analyse**. → Sprint R.
2. **MDM = 0 % implémenté** (`chrome.storage.managed`, Forcelist, ADMX/Intune, `policies.json`,
   Jamf) alors que la copy Team de la landing l'implique. → Sprint M (+ correctif copy dès L8).
3. **Sélecteurs hardcodés, pas d'OTA** : mitigé par les chaînes de fallback
   (`sites/shared/dom-factory.ts`) mais toute casse impose une republication store (review =
   jours). → Sprint R.

## Plans historiques

- `commercialisation.md`, `commercialisation-sprint-2.md`, `commercialisation-sprint-3.md` :
  **obsolètes** (pré-pivot Lemon Squeezy, portail actif, objectifs MRR solo irréalistes).
  Conservés pour trace ; leurs items encore pertinents sont repris dans le backlog E.
- `commercialisation-sprint-1.md` : quasi terminé (extension sellable) ; le reliquat = Jalon 4,
  absorbé par le Sprint L via [plan-vente-lemonsqueezy.md](./plan-vente-lemonsqueezy.md).
