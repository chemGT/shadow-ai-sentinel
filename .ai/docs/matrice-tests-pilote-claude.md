# Matrice de tests — pilote Claude

> Recette **functional_tester** · navigateurs Chromium + Firefox · site `claude.ai` uniquement.

**Version extension cible :** `0.1.0` (manifest)  
**Policy de test :** importer [policy.example.json](../schemas/policy.example.json) avec `emailDomains: ["acme.com"]` et `pro_email` activé pour F06–F07.

---

## Préparation

| Étape | Détail |
|-------|--------|
| Build | `npm run build` (Chromium) et/ou `npm run build:firefox` |
| Extension | Charger `dist/` ou `dist-firefox/` (voir [INSTALLATION.md](../guides/INSTALLATION.md)) |
| API (F09) | `npm run backend` ou `docker compose up -d` ; credentials dans Options |
| Notice | Première visite : notice employé → **J'ai compris** |
| Console | `[Shadow AI Sentinel] Adaptateur Claude actif` |

---

## Matrice F01–F10

| ID | Donnée (exemple) | Mode policy | Action | Résultat attendu | Chromium | Firefox | Notes |
|----|------------------|-------------|--------|------------------|----------|---------|-------|
| F01 | `DE89370400440532013000` | **block** (override IBAN) | Entrée / Envoyer | Modale Block, **pas d'envoi** | ☐ | ☐ | Forcer `iban` → `block` dans policy JSON |
| F02 | `DE89370400440532013000` | redact (défaut) | Envoyer | `[REDACTED_IBAN]` + toast, pas d'envoi auto | ☐ | ☐ | |
| F03 | `AKIAIOSFODNN7EXAMPLE` | block | Coller + Envoyer | Modale, pas d'envoi | ☐ | ☐ | |
| F04 | `sk-proj-abcdefghijklmnopqrstuvwxyz123456` | block | Envoyer | Modale, pas d'envoi | ☐ | ☐ | |
| F05 | `192.168.1.42` | redact | Envoyer | `[REDACTED_INTERNAL_IP]` | ☐ | ☐ | |
| F06 | `jean@acme.com` | redact + allowlist | Envoyer | `[REDACTED_PRO_EMAIL]` | ☐ | ☐ | `emailDomains` doit contenir `acme.com` |
| F07 | `jean@gmail.com` | — | Envoyer | **Aucune** action DLP | ☐ | ☐ | Hors allowlist pro |
| F08 | `06 12 34 56 78` | redact | Envoyer | `[REDACTED_PHONE]` | ☐ | ☐ | |
| F09 | Offline ~24 h | block event | Couper réseau → Block → rétablir → flush | File locale puis télémétrie sans doublon | ☐ | ☐ | Options → **Envoyer télémétrie** ou attendre 5 min |
| F10 | (idem F03) | block | Firefox uniquement | Même comportement que F03 | — | ☐ | Validation build `dist-firefox` |

---

## Policy JSON pour F01 (IBAN en block)

```json
{
  "rules": [
    { "type": "iban", "action": "block", "enabled": true }
  ]
}
```

Fusionner avec la policy complète (tenantId, emailDomains, autres règles).

---

## UX (Phase 5)

| Contrôle | Attendu |
|----------|---------|
| Modale Block | Titre « Envoi bloqué », pas de donnée en clair, bouton Comprendre / Got it |
| Toast Redact | Mention du jeton `[REDACTED_*]` |
| Notice 1er run | Sections structurées, compréhensible sans formation |

---

## Synthèse recette

| Champ | Valeur |
|-------|--------|
| Testeur | |
| Date | |
| Build / commit | |
| Navigateur(s) | Chrome ☐ Edge ☐ Firefox ☐ |
| Résultat global | OK ☐ / KO ☐ |
| Bloquants ouverts | |
