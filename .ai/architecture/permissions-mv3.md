# Permissions Manifest V3 — 3 LLM

## Actuelles (v0.1.0 — Phase 7)

```json
{
  "permissions": ["storage", "alarms", "tabs"],
  "optional_host_permissions": ["http://localhost/*", "https://*/*"],
  "host_permissions": [
    "*://claude.ai/*",
    "*://chatgpt.com/*",
    "*://gemini.google.com/*"
  ]
}
```

## Retirées (Phase 0)

| Permission | Raison retrait |
|------------|----------------|
| `activeTab` | Non utilisée — pas d’injection à la demande |
| `scripting` | Non utilisée — content script déclaratif |
| `matches: <all_urls>` | Hors scope ; fuite surface d’attaque |

## Actives

| Permission | Usage |
|------------|--------|
| `storage` | Policy, credentials, file télémétrie, notice ack |
| `alarms` | Sync policy (30 min) + flush télémétrie (5 min) |
| `tabs` | Diffusion `POLICY_UPDATED` vers onglets LLM |
| `optional_host_permissions` | URL API client (Options) |

## Content scripts

Un seul bundle `src/extension/content/index.tsx` injecté sur les 3 domaines ; routage via `resolveLlmHost()`.

## Options UI

`options_ui` → `src/extension/options/index.html` (credentials, import policy, sync, flush télémétrie).
