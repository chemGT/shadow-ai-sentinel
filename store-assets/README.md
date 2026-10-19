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
| `amo-reviewer-notes.md` | Build instructions, bundled libraries, expected linter warnings and test steps for AMO/CWS reviewers |
| `../assets/logo.jpg` | Logo source (regenerate PNGs with `npm i --no-save sharp && node scripts/build-icons.mjs`) |
| `../icons/icon-{16,48,128}.png` | Shipped icons (also used as store icon) |

## ✅ Done
- [x] Icon set 16/48/128 (derived from `assets/logo.jpg`), wired into both manifests
- [x] Store descriptions EN + FR
- [x] Permission justifications + data-practice answers
- [x] Privacy policy (truthful: zero network)
- [x] Store-ready packages: `npm run package` (or the GitHub Release) → `release/` with the Chromium zip, the Firefox `.xpi`, the source zip for AMO and `SHA256SUMS.txt`
- [x] Firefox data-collection consent declared (`data_collection_permissions: none`, required for new AMO submissions); `web-ext lint` → 0 errors
- [x] Screenshots 01 (block modal) and 02 (block on Claude), 1280×800

## ⬜ Remaining screenshots (optional, needs the extension loaded in a browser)
CWS requires at least 1 (done), ideally 3–5, at **1280×800** or **640×400** (PNG/JPEG).

3. **Redact in action** — a secret masked inline.
4. **Popup** — blocked/redacted counters, link to source code.
5. **Options page** — rules table (Block/Redact per type), allowlist.

Store icon (CWS marketing): 128×128 → use `icons/icon-128.png`.
Small promo tile (optional): 440×280.

To capture: `npm run build` → load `dist/` via `chrome://extensions` (dev mode) →
open a supported AI site → trigger detection → screenshot.

## ⬜ Submission (maintainer accounts)
1. Publish the GitHub Release (`CONTRIBUTING.md` → Releasing) and download its assets.
2. **Chrome Web Store** (developer account, one-time fee): upload `…-chromium.zip`; paste
   `listing-en.md` (+ `listing-fr.md` as French localisation), `permissions-justification.md`
   (Privacy practices tab), screenshots, icon `icons/icon-128.png`; privacy policy URL:
   `https://github.com/chemGT/shadow-ai-sentinel/blob/master/store-assets/privacy-policy.md`.
3. **Firefox Add-ons** (free account): *Submit a New Add-on* → *On this site* → upload
   `…-firefox-unsigned.xpi`; answer "yes" to source code and upload `…-source.zip`; paste
   `amo-reviewer-notes.md` into *Notes to Reviewer*; same listing copy and privacy policy URL.
4. Once both listings are live, replace the "planned" line in the README install sections with the
   store links.
