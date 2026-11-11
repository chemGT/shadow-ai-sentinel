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
- [x] 4 English screenshots at 1280×800 (see below), 2 demo GIFs (`assets/`, README only — the Chrome Web Store takes PNG/JPEG only)

## Screenshots (English, 1280×800)
| File | Scene |
|------|-------|
| `screenshots/01-block-modal.png` | API key pasted → "Send blocked" dialog |
| `screenshots/02-redact-iban.png` | IBAN → `[REDACTED_IBAN]` |
| `screenshots/03-redact-gemini.png` | Phone + work email redacted on Gemini |
| `screenshots/04-first-launch.png` | First-run notice |

They are generated from the native-size captures in `screenshots/raw/` (never upscaled):
`npm i --no-save sharp && node scripts/compose-screenshots.mjs`. To add or change a scene, edit
`SCENES` in `scripts/compose-screenshots.mjs`. `raw/gemini-before|after.png` are frames 30 and 69
of `assets/demo-redact-gemini.gif`.

Not captured yet (optional, up to 5 are allowed): **popup** (blocked/redacted counters, source
link) and **options page** (rules table, allowlist; now available in English).
`04-first-launch.png` has its "I understand" button cut off at the bottom: re-capture the notice
fully if you want a cleaner shot.

Store icon (CWS marketing): 128×128 → use `icons/icon-128.png`.
Small promo tile (optional): 440×280.

To capture: `npm run build` → load `dist/` via `chrome://extensions` (dev mode), set English as the
browser's first language → open a supported AI site → trigger detection → screenshot.

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
