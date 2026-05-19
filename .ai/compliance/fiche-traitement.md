# Fiche de traitement — Shadow AI Sentinel (brouillon)

> Document type à valider par le DPO / juriste du **client** employeur.  
> Shadow AI Sentinel agit en tant que **sous-traitant** ou fournisseur d’outil selon le contrat B2B.

## 1. Responsable de traitement

- **Responsable :** l’employeur client (organisation déployant l’extension)
- **Sous-traitant technique :** éditeur / hébergeur de l’API policies & télémétrie (selon contrat)

## 2. Finalités

| Finalité | Base légale (indicative) |
|----------|---------------------------|
| Prévention de fuite de données vers des LLM publics | Intérêt légitime / obligation employeur |
| Application de politiques de sécurité (Block/Redact) | Idem |
| Mesure d’efficacité du contrôle (télémétrie agrégée) | Idem |

## 3. Données traitées

### Dans le navigateur (local)

- Contenu des saisies : **analysé localement**, non transmis par défaut.

### Transmises à l’API (télémétrie)

| Champ | Donnée personnelle ? |
|-------|----------------------|
| `eventId` | Non (UUID technique) |
| `tenantId` | Non (organisation) |
| `deviceId` | Pseudonyme (non lié RH dans le produit standard) |
| `occurredAt` | Non |
| `ruleType`, `action`, `host` | Non |
| `extensionVersion`, `policyVersion` | Non |
| `locale`, `browser` | Faible |
| `departmentId` | Optionnel — selon policy client |

**Exclus :** texte des prompts, valeurs détectées, IP utilisateur, email employé.

## 4. Durée de conservation

- **API télémétrie :** 90 jours par défaut (`TELEMETRY_RETENTION_DAYS`), purge automatique.
- **Extension locale :** policy + queue jusqu’à sync / désinstallation.

## 5. Destinataires

- Équipe sécurité / conformité du client
- Hébergeur API (si SaaS)

## 6. Transferts hors UE

À documenter si l’API ou les LLM impliquent des transferts (Claude, etc.).

## 7. Droits des personnes

- Pas d’accès au contenu des messages (non collecté).
- Opposition / information : procédure interne employeur.
- `deviceId` : rotation possible via réinstallation ou policy.

## 8. Mesures de sécurité

- HTTPS, Bearer token, rate limiting
- Validation schéma télémétrie + champs interdits
- Logs API sans corps des requêtes
- Extension : permissions MV3 minimales
