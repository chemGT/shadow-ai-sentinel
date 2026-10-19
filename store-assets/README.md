# Store assets — Shadow AI Sentinel

Everything needed to submit the extension to the Chrome Web Store (CWS) and
Firefox Add-ons (AMO), plus the public privacy page.

## Contents
| File | Use |
|------|-----|
| `listing-en.md` | CWS/AMO listing copy (name, summary, description) — English |
| `listing-fr.md` | Same, French |
| `permissions-justification.md` | Per-permission rationale + single-purpose + data-practice answers for reviewers |
| `privacy-policy.md` | Public privacy policy — must be hosted at a public URL and linked in both stores |
| `../assets/logo.jpg` | Logo source (regenerate PNGs with `npm i --no-save sharp && node scripts/build-icons.mjs`) |
| `../icons/icon-{16,48,128}.png` | Shipped icons (also used as store icon) |

## ✅ Done
- [x] Icon set 16/48/128 (derived from `assets/logo.jpg`), wired into both manifests
- [x] Store descriptions EN + FR
- [x] Permission justifications + data-practice answers
- [x] Privacy policy (truthful: free tier = zero network)

## ⬜ Remaining (needs the extension loaded in a browser)
Screenshots must be captured from the real, running extension.

**Required by CWS:** at least 1, ideally 3–5, at **1280×800** or **640×400** (PNG/JPEG).

Suggested shots:
1. **Block modal** on ChatGPT — an API key detected, message stopped.
2. **Redact in action** — a secret masked inline on Claude.
3. **Popup** — blocked/redacted counters, link to source code.
4. **Options page** — rules table (Block/Redact per type), PII rules toggled on.
5. **Options page** — allowlist textarea, custom rules.

Store icon (CWS marketing): 128×128 → use `icons/icon-128.png`.
Small promo tile (optional): 440×280.

To capture: `npm run build` → load `dist/` via `chrome://extensions` (dev mode) →
open a supported AI site → trigger detection → screenshot.

## ⬜ Before publishing
- Host `privacy-policy.md` at a public URL (landing page or GitHub Pages) and paste that URL into CWS + AMO.
- Bump `version` in `manifest.json` / `manifest.firefox.json` from `0.1.0` to the release version.
