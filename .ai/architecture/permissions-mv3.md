# Permissions Manifest V3 — pilote Claude

## Actuelles (v0.1.0)

```json
{
  "permissions": ["storage", "alarms", "tabs"],
  "optional_host_permissions": ["http://localhost/*", "https://*/*"],
  "host_permissions": ["*://claude.ai/*"]
}
```

## Retirées (Phase 0)

| Permission | Raison retrait |
|------------|----------------|
| `activeTab` | Non utilisée — pas d’injection à la demande |
| `scripting` | Non utilisée — content script déclaratif |
| `matches: <all_urls>` | Hors scope pilote ; fuite surface d’attaque |

## Actives (Phase 3)

| Permission | Usage |
|------------|--------|
| `alarms` | Sync policy (30 min) + flush télémétrie (5 min) |
| `tabs` | Diffusion `POLICY_UPDATED` vers onglets Claude |
| `optional_host_permissions` | URL API client (demandée à l’enregistrement Options) |

## Prévues

| Permission | Phase | Usage |
|------------|-------|--------|
| `*://chatgpt.com/*` | 7 | Extension ChatGPT |
| `*://gemini.google.com/*` | 7 | Extension Gemini |

## Options UI

`options_ui` → `src/extension/options/index.html` (credentials, import policy, sync, flush télémétrie).
