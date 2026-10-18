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

- [ ] **More file formats** (B5): XLSX, PPTX, RTF, ZIP archives.
- [ ] **Custom rules**: user-defined patterns with validation and a template library.
- [ ] **More secret formats**: provider keys requested through
      [missed-detection issues](https://github.com/chemGT/shadow-ai-sentinel/issues/new?template=false-negative.yml).
- [ ] **Managed deployment guide**: Chrome/Edge enterprise policies, Firefox policies.json.
- [ ] Translate the security docs to English.

## Out of scope (by design)

- Decoding base64/hex/URL-encoded payloads, reversed or deliberately split secrets.
- OCR of images or scanned PDFs.
- Any server component, telemetry or analytics.

See the [threat model](docs/security/evasion-threat-model.md) for the reasoning.
