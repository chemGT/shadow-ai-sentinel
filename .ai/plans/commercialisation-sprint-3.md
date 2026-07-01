# Sprint 3 — Scale-ready

> Plan maître : [commercialisation.md](./commercialisation.md) · Playbook : [execution-playbook](./commercialisation-execution-playbook.md)
> Durée : 8 semaines · Budget : ~32 j dev solo + freelances + 1er embauche éventuelle
> Branche : `sprint/s3-scale` · Tag de sortie : `v1.0.0-s3`
> Objectif : MRR 8-10k$/mois, conditions d'autonomie ou levée seed.

---

## Definition of Done (sortie de sprint)

- [ ] MRR ≥ 8 000 $
- [ ] NPS ≥ 30 (sur ≥ 30 répondants)
- [ ] Churn logo mensuel < 5%
- [ ] Self-hosted Enterprise déployable (Docker + Helm + doc)
- [ ] SOC 2 Type I : rapport disponible ou audit en cours
- [ ] MDM Intune + Jamf + Chrome Enterprise documenté et testé
- [ ] API publique documentée + 1 intégration Zapier publiée
- [ ] Détection hybride NER local en feature flag opt-in
- [ ] Pipeline Enterprise ≥ 10 opportunités qualifiées
- [ ] Audit qa_tester + security_auditor final OK
- [ ] Tag git `v1.0.0-s3` + CHANGELOG à jour

---

## Vue itérations (24 itérations, ~33 j)

Légende validateurs : Q=qa_tester · F=functional_tester · S=security_auditor 🔒 · C=compliance_rgpd 🛡️

| ID | Titre | Sous-agent | Estim. | Dépend. | Valid. | Statut |
|---|---|---|---|---|---|---|
| S3-I1 | Init branche S3 + CHANGELOG | architect | 0.5 j | — | Q | ⏳ |
| S3-I2 | Image Docker API release + scan Trivy CI | backend_ops | 1.5 j | — | Q S🔒 | ⏳ |
| S3-I3 | Helm chart Kubernetes (values prod) | backend_ops | 2 j | I2 | Q S🔒 | ⏳ |
| S3-I4 | Doc déploiement self-hosted (air-gapped possible) | technical_writer | 1 j | I3 | Q F | ⏳ |
| S3-I5 | Licence Enterprise signée Ed25519 + vérif | backend_ops + ext_dev | 1 j | I2 | Q S🔒 | ⏳ |
| S3-I6 | Support BYO Postgres + doc | backend_ops | 0.5 j | I2 | Q | ⏳ |
| S3-I7 | POC NER in-browser (Transformers.js DistilBERT distillé) | ext_dev | 2 j | — | Q | ⏳ |
| S3-I8 | Pipeline regex + NER (NER opt-in) feature flag | ext_dev + backend_ops | 1.5 j | I7 | Q F C🛡️ | ⏳ |
| S3-I9 | Détection code propriétaire (marqueurs + embedding light) | ext_dev | 1 j | I8 | Q | ⏳ |
| S3-I10 | Bench perf + précision NER vs regex-only | qa_tester | 1 j | I9 | Q | ⏳ |
| S3-I11 | Chrome Enterprise policy + managed config (Forcelist + tenantId) | backend_ops | 1 j | — | Q F | ⏳ |
| S3-I12 | Edge ADMX / Intune template | backend_ops | 1 j | I11 | Q F | ⏳ |
| S3-I13 | Firefox policies.json + ESR | backend_ops | 0.5 j | — | Q F | ⏳ |
| S3-I14 | Jamf / macOS Chrome+Edge profiles | technical_writer | 0.5 j | I11 | Q | ⏳ |
| S3-I15 | Doc IT déploiement (5 scénarios) | technical_writer | 1 j | I11-I14 | Q F | ⏳ |
| S3-I16 | OpenAPI spec + reference Mintlify | backend_ops + ux_writer | 1.5 j | — | Q | ⏳ |
| S3-I17 | Personal Access Tokens (portail) | backend_ops + ext_dev | 1 j | — | Q S🔒 | ⏳ |
| S3-I18 | Connector Zapier public app | ext_dev | 1 j | I16 | Q F | ⏳ |
| S3-I19 | Connector Make.com | ext_dev | 0.5 j | I16 | Q F | ⏳ |
| S3-I20 | Node n8n communautaire | ext_dev | 0.5 j | I16 | Q F | ⏳ |
| S3-I21 | Site docs Mintlify (docs.*) | technical_writer + ux_writer | 1.5 j | — | Q F | ⏳ |
| S3-I22 | Étude "State of Shadow AI 2026" | product_owner | 2 j | data clients | Q C🛡️ | ⏳ |
| S3-I23 | Audit SOC 2 Type I (coord. firme) | security_auditor | 1 j actif | S2-I25 | S🔒 | ⏳ |
| S3-I24 | Trust Center publique (Vanta ou solo) | compliance_rgpd | 1 j | I23 | Q F C🛡️ | ⏳ |
| S3-I25 | Bug bounty privé → public | security_auditor | 1 j | I24 | Q S🔒 | ⏳ |
| S3-I26 | Helpdesk Plain + base connaissances | ux_writer + technical_writer | 1.5 j | I21 | Q F | ⏳ |
| S3-I27 | Région US activable (Render US) + doc | backend_ops | 1 j | — | Q S🔒 | ⏳ |
| S3-I28 | CRM Pipedrive + sync Paddle/Apollo | product_owner | 0.5 j | — | Q | ⏳ |
| S3-I29 | Programme MAP partenaires (contrat + portail light) | product_owner | 1 j | — | Q | ⏳ |
| S3-I30 | Audit fin de sprint + tag v1.0.0-s3 | qa_tester + security_auditor | 1 j | toutes | Q S🔒 C🛡️ | ⏳ |

**Total estimé** : 33 j dev · **Budget** : 32 j → overflow 1 j

**Mitigations si budget dépassé** :
- Couper I19 (Make.com), I20 (n8n) — reporter post-sprint
- Couper I22 (étude) si MRR < 5k$ → recentrer ventes
- Embaucher freelance Sales (J1 du sprint 2 reporté) pour libérer dev

---

## Itérations sensibles — détail

### S3-I2 — Image Docker release 🔒

- **Scope IN** : Dockerfile multi-stage, image distroless ou alpine, tag `vX.Y.Z`, scan Trivy CI (bloquant si High), publication GHCR privé.
- **DoD** : `docker run` réussit, healthcheck OK, image < 200 MB, 0 CVE High.
- **Commit** : `build(docker): release image with trivy scan [S3-I2]`.

### S3-I5 — Licence Enterprise Ed25519 🔒

- **Scope IN** : génération licence côté portail (clé privée Ed25519 côté ops), payload `{tenantId, seats, expiresAt, features}`, signature, distribution fichier `.lic`. Vérif côté extension + API self-hosted.
- **DoD** : licence valide acceptée, expirée refusée, tampered refusée, doc renouvellement.
- **Commit** : `feat(licensing): ed25519 enterprise licenses [S3-I5]`.

### S3-I7 — POC NER in-browser

- **Scope IN** : Transformers.js (Xenova/distilbert-base-multilingual-cased), modèle quantizé Q8 (~60 MB), worker dédié, fallback regex si modèle non chargé.
- **Décisions à confirmer** : modèle, taille, cible perf (< 200 ms sur 5k caractères).
- **DoD** : worker isolé fonctionnel, perf documentée, fallback testé.
- **Commit** : `feat(detection): in-browser ner poc [S3-I7]`.

### S3-I22 — Étude "State of Shadow AI 2026" 🛡️

- **Scope IN** : extraction agrégats anonymisés clients opt-in (jamais individualisé), sondage 200 répondants via LinkedIn / Typeform, rapport PDF gated.
- **Conformité** : RGPD — opt-in tenant explicite, anonymisation k > 50 par segment, validation compliance_rgpd avant publication.
- **DoD** : rapport publié, formulaire gated, 100+ leads premier mois cible.
- **Commit** : `docs(marketing): state of shadow ai 2026 report [S3-I22]`.

### S3-I23 — Audit SOC 2 Type I 🔒

- **Scope IN** : fenêtre observation 1 mois (vendor pas démarré avant SOC 2 pour ça), audit firmé sur point-in-time, rapport reçu sous NDA.
- **DoD** : rapport SOC 2 Type I disponible (ou date de remise confirmée), pas de "qualified opinion".
- **Commit** : `docs(compliance): soc2 type i report [S3-I23]`.

---

## Gates de fin de sprint (avant merge + tag v1.0.0-s3)

| Gate | Validateur | Critère |
|---|---|---|
| Tests verts CI | qa_tester | `npm run ci` |
| Coverage ≥ 80% global | qa_tester | |
| Sécurité | security_auditor | 0 High + pentest S2 toujours fermé |
| RGPD | compliance_rgpd | étude validée, opt-in anonymisation OK |
| Self-hosted | functional_tester | déploiement test client Helm OK |
| API publique | functional_tester | exemple Zapier OK end-to-end |
| MDM | functional_tester | déploiement test Intune en sandbox |
| MRR | humain | ≥ 8 000 $ vérifié |
| NPS | humain | ≥ 30 sur ≥ 30 réponses |
| Churn | humain | < 5% sur 30 derniers jours |
| SOC 2 | humain | rapport reçu ou date confirmée |

---

## Suivi hebdo

(Même template que S1.)

---

## Sortie → entrée Mois 7+

- Décision bootstrap autonomie vs levée seed
- Recrutement 1er employé (Sales vs Engineer) sur bottleneck mesuré
- Roadmap Mois 7-12 : SOC 2 Type II observation 6 mois, marchés DE/ES si demande, integrations CASB, edge cases (DLP file uploads avancés, OCR opt-in)
- Veille compétitive actualisée (qui a levé, qui a churné, nouveaux entrants)
