# Roadmap

Priorities follow one principle: **close accidental leaks first** (common copy-paste formats),
document deliberate evasion as out of scope. Issues labelled `good first issue` / `help wanted`
are the best entry points.

## Next

- [ ] **First public release `v1.0.0`** — align manifest versions, tag, GitHub Release artifacts.
- [ ] **Chrome Web Store and Firefox Add-ons listings** (store assets ready in `store-assets/`).
- [ ] **`pro_email` subdomains** (B3) — `jean@mail.acme.com` should match domain `acme.com`.
- [ ] **Screenshots / demo GIF** of the current UI (block, redact, popup, options).

## Later

- [x] **XLSX / PPTX attachments** (B5, partial) — extracted locally, no new dependency.
- [ ] **More file formats** (B5, remainder): RTF, ODF, ZIP archives.
- [ ] **Custom rules**: user-defined patterns with validation and a template library (design proposal: [ADR 004](docs/adr/004-custom-rules.md)).
- [ ] **More secret formats**: provider keys requested through
      [missed-detection issues](https://github.com/chemGT/shadow-ai-sentinel/issues/new?template=false-negative.yml).
- [x] **Managed deployment guide**: Chrome/Edge enterprise policies, Firefox policies.json ([docs/deployment.md](docs/deployment.md)).
- [x] **Centrally managed policy** (`chrome.storage.managed`): admins push rules, email domains, `fail_mode` and allowlist entries; managed values win field by field.
- [x] Translate the security docs to English. ([docs/security/](docs/security/) → EN canonical, `*.fr.md` = original)

## Out of scope (by design)

- Decoding base64/hex/URL-encoded payloads, reversed or deliberately split secrets.
- OCR of images or scanned PDFs.
- Any server component, telemetry or analytics.

See the [threat model](docs/security/evasion-threat-model.md) for the reasoning.
