# Threat model — MVP pilote Claude

**Version :** 0.1 (Phase 0)  
**Périmètre :** Extension MV3 + API policies/télémétrie

## Actifs

| Actif | Sensibilité |
|-------|-------------|
| Contenu des prompts | Critique — reste local |
| Policy (modes, domaines email) | Moyenne |
| Clé API tenant | Haute |
| Télémétrie agrégée | Faible (métadonnées) |
| `deviceId` pseudonyme | Faible |

## Acteurs

- Employé (utilisateur légitime ou contournement volontaire)
- Attaquant réseau (MITM API)
- Page hôte LLM (XSS, DOM malveillant)
- Admin client (configure policy)

## Vecteurs & mitigations

| Vecteur | Risque | Mitigation |
|---------|--------|------------|
| Prompt envoyé au LLM malgré DLP | Fuite données | Interception submit + Block/Redact (Phase 2) |
| Raccourci / API native non hookée | Contournement | Documenter limites ; tests Entrée + bouton |
| Extension désinstallée | Bypass | Processus RH / MDM (post-pilote) |
| ReDoS regex | DoS onglet | Limite taille texte + tests perf (Phase 1) |
| XSS page Claude lit storage extension | Faible (isolation) | Pas d’exposer policy via `window` ; Shadow DOM UI |
| MITM API | Falsification policy | HTTPS + Bearer ; mTLS option entreprise |
| Télémétrie avec contenu | Violation RGPD | Schéma strict + `FORBIDDEN_TELEMETRY_KEYS` |
| Logs Docker avec body | Fuite | Pas de log payload télémétrie (Phase 4) |
| Policy `pro_email` sans domaines | Faux positifs / inactif | Validation `validatePolicy()` |

## Permissions MV3 (pilote)

| Permission | Justification |
|------------|---------------|
| `storage` | Policy locale, queue, deviceId, credentials |
| `host_permissions: *://claude.ai/*` | Content script + interception |

**Retirées en Phase 0 :** `activeTab`, `scripting`, `<all_urls>`.

**Phase 3+ :** `alarms` (flush queue).

## Risques résiduels acceptés (pilote)

- Contournement par autre navigateur / machine personnelle
- LLM modifie le DOM (adaptateur à maintenir)
- Employé photographie l’écran

## Revue

Revoir après Phase 2 (interception) et Phase 4 (API auth).
