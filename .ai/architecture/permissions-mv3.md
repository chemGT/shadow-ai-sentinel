# Permissions Manifest V3 — pilote Claude

## Actuelles (v0.1.0)

```json
{
  "permissions": ["storage"],
  "host_permissions": ["*://claude.ai/*"]
}
```

## Retirées (Phase 0)

| Permission | Raison retrait |
|------------|----------------|
| `activeTab` | Non utilisée — pas d’injection à la demande |
| `scripting` | Non utilisée — content script déclaratif |
| `matches: <all_urls>` | Hors scope pilote ; fuite surface d’attaque |

## Prévues

| Permission | Phase | Usage |
|------------|-------|--------|
| `alarms` | 3 | Flush file télémétrie |
| `*://chatgpt.com/*` | 7 | Extension ChatGPT |
| `*://gemini.google.com/*` | 7 | Extension Gemini |

## Options UI (sans permission dédiée)

Page **Options** via `options_page` dans le manifest (Phase 3) — aucune permission supplémentaire.
