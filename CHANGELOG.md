# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

## [1.1.0] — 2026-10-19

### Added
- **XLSX and PPTX attachments are scanned** (closes the XLSX/PPTX part of bypass B5): cells, all sheets, cell comments, slides and speaker notes are extracted locally by a built-in Office Open XML reader (no new dependency, zip-bomb guard). As with PDF/DOCX, a redact rule blocks the file since it cannot be rewritten
- **Centrally managed policy** (`chrome.storage.managed`, declared via `managed_schema.json`): admins can push `rules`, `emailDomains`, `fail_mode` and `allowlist` through Chrome/Edge enterprise policy or Firefox `policies.json` (`3rdparty`). Managed values win field by field (rule by rule), invalid values fall back to the local setting, the admin allowlist is added to the user's. The options page shows managed settings as locked. Guide: `docs/deployment.md`
- `npm run package`: builds both targets and writes store-ready packages to `release/` — Chromium zip (Chrome Web Store), unsigned Firefox `.xpi` (AMO), source zip (required by AMO for minified code) and `SHA256SUMS.txt`; the release workflow uses the same script, so GitHub Releases now also ship the source zip
- `store-assets/amo-reviewer-notes.md`: build instructions, bundled libraries, expected linter warnings and test steps for store reviewers
- Firefox manifest declares `data_collection_permissions: none` (Firefox built-in data consent, required for new AMO submissions)
- Release workflow can be started manually (Actions → Release → Run workflow, from `master`): it validates the version, builds, tests and creates the `vX.Y.Z` tag and GitHub Release itself — no local tag push needed

### Changed
- Replaced `npm run package:firefox` (unsigned `.xpi` written inside `dist-firefox/`, re-zipped into itself on a second run) with `npm run package`
- New logo: extension icons (16/48/128) are now generated from `assets/logo.jpg` (`scripts/build-icons.mjs`); README header banner

## [1.0.0] — 2026-10-18 — First open-source release

Shadow AI Sentinel is now free and open source (Apache-2.0). Every feature is available to
everyone, and the extension makes **no network request at all**: detection, policy and allowlist are
100 % local. Highlights: 7 detectors (API keys, generic secrets, IBAN, payment cards, phone numbers,
internal IPs, work emails) with checksum validation, PDF/DOCX/text attachment scanning, Unicode
evasion hardening, 8 supported AI sites, Chromium and Firefox builds.

### Fixed
- CodeQL failed on every run while the repository is private (code scanning unavailable): the job now runs only on a public repository
- CI and release workflows moved from Node.js 20 (end of life) to Node.js 22 LTS
- Flaky e2e suite (~50 % of runs): the harness evaluated code in the extension service worker before Chromium had injected `chrome.*` bindings; it now waits for `chrome.storage` (0 failures over 12 full runs)

### Added
- `ROADMAP.md`, `docs/README.md` index, `docs/compliance/` (GDPR/NIS2/AI Act notes, employee-notice templates EN/FR), `docs/policy.example.json` (validated by a unit test)
- English README (+ `README.fr.md`), `SECURITY.md` (private vulnerability reporting), `CONTRIBUTING.md` (incl. how to add a detector), `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1)
- Issue forms (false positive — prefilled by the extension —, missed detection, new detector, broken site adapter, bug) and a pull-request template
- CI: e2e Playwright job, CodeQL (security-extended), OpenSSF Scorecard (public repo only), tag-triggered release workflow (Chromium zip + unsigned Firefox xpi, SHA256SUMS, build provenance attestation), Dependabot (npm + actions), least-privilege workflow permissions

### Security
- `pdfjs-dist` 6.0.227 → 6.4.299: fixes arbitrary JavaScript execution when opening a malicious PDF (affected < 6.2.108) — the extension parses user-attached PDFs
- `@xmldom/xmldom` 0.8.13 → 0.8.15 (DOCX parsing via mammoth): XML injection advisories
- `vitest` / `@vitest/coverage-v8` 4.1.6 → 4.1.11 (dev only): `@vitest/mocker` path traversal
- Known, not applicable: `sprintf-js` (moderate) via mammoth's CLI dependency `argparse` — the CLI is not part of the extension bundle
- Defensive Unicode normalization before scanning (`src/core/detection/normalize.ts`): zero-width/BOM/soft-hyphen removed, Unicode spaces (NBSP, narrow NBSP…) folded to ASCII space, strict Cyrillic/Greek homoglyphs folded to Latin, NFKC on ASCII-lookalike compatibility forms (fullwidth, ligatures, superscripts, circled digits, math alphanumerics). Match offsets are mapped back to the original text so redaction covers what the user actually typed
- IBAN detection accepts dash separators (`DE89-3704-…`)
- Closes known bypasses B1 (IBAN dash/NBSP), B2 (card NBSP/narrow NBSP), B4 (zero-width, BOM, homoglyphs, fullwidth)
- Allowlist matching applies the same normalization

### Changed
- Dependencies: React 19.3, mammoth 1.13, Vite 8.3, Playwright 1.64, happy-dom 21, GitHub Actions (checkout/setup-node v7, codeql-action v4, attest-build-provenance v4, scorecard-action 2.5)
- First-run notice no longer claims that metadata is shared with the organization (nothing is transmitted)
- `CLAUDE.md` rewritten in English for contributors using coding agents
- Project relicensed under **Apache-2.0** (`LICENSE`, `NOTICE`); previously unlicensed/ISC
- All features are available to everyone: PII rules (IBAN, card, internal IP, work email, phone), PDF/DOCX/text attachment scanning and allowlist no longer require a license
- Popup shows an "Open source" badge and a source-code link instead of the upgrade CTA
- Store listings, privacy policy and permission justifications updated: no third-party service, no network request by default

### Removed
- Internal working docs (`.ai/`: commercial plans, sprint tracking, agent prompts, pilot checklists) and `.cursorrules`; public docs moved to `docs/` (threat model, bypass log, ReDoS audit, ADRs, compliance notes, per-site selectors, manual test matrix). `.ai/` is now git-ignored for private notes
- Express backend (policies API, telemetry ingestion, API keys, Postgres/Drizzle schema and migrations, Clerk JWT auth, dunning jobs), Dockerfile and docker-compose — archived on branch `archive/saas-portal`
- Extension network code: policy sync, telemetry queue, feedback sender, tenant credentials in options, background alarms; `alarms` permission and optional `http://localhost/*` host permission
- "Report false positive" now opens a prefilled GitHub issue (rule, site, chosen context, version — never typed text) instead of sending an event to a backend
- Lemon Squeezy licensing: `src/core/licensing/*`, background `license-manager`, daily license alarm, `GET_ENTITLEMENT` / `ACTIVATE_LICENSE` / `DEACTIVATE_LICENSE` messages, `VITE_LEMONSQUEEZY_*` build config, license UI in popup and options
- `https://api.lemonsqueezy.com/*` host permission (Chromium + Firefox manifests)
- Next.js Clerk portal skeleton (`apps/portal`) and the `@clerk/nextjs` dependency — archived on branch `archive/saas-portal`
- Store screenshots showing the former Free/Pro UI

## Sprint 1 (Make it sellable) — unreleased, superseded by 1.0.0

### Added
- Support for 5 new LLM sites: Mistral Le Chat (chat.mistral.ai), DeepSeek (chat.deepseek.com), Perplexity (perplexity.ai), Grok (grok.com), Microsoft Copilot (copilot.microsoft.com) — prompt + text/code attachment interception with the same guard as Claude/ChatGPT/Gemini (8 sites total)
- PDF/DOCX attachment scanning (Pro): local text extraction (pdfjs-dist, mammoth), same block/redact-as-block decision pipeline as text files
- Pro licensing via Lemon Squeezy license key (client-side verification, no server secret) with 7-day offline grace period and daily background re-check
- Redact/Block rules table in the options page, with visible confirmation before applying a change
- Fail-closed adapter health-check: broken site adapter falls back to the configured `fail_mode` instead of silently allowing traffic
- False positive signal in extension (safe schema, no prompt text)
- Multi-tenant Postgres schema (tenants, api_keys, policies, telemetry_events, audit_log) and tenant isolation middleware for the Express backend — scaffolding, not wired to the extension's licensing flow
- API key issuance/revocation/rotation with scopes and grace period
- Aggregated events endpoint `/events/aggregate` (cached) and CSV export endpoint `/events/export`
- Background jobs: DB purge, aggregation warm-up, dunning check (generic overdue-tenant suspension, not tied to a specific payment provider)
- Next.js portal skeleton with Clerk authentication (sign-up/sign-in, EN/FR) and a placeholder dashboard page — early scaffolding, not part of the sellable extension surface
- E2E Playwright suite (real extension build, fixtures for all 8 sites): block on Enter, block on send click, benign text passes, Pro redact, Pro file-guard, adapter health-check banner

### Changed
- Reduced `host_permissions` to minimum required (MV3 store compliance)
- Migrated Pro billing from Gumroad to Lemon Squeezy (subscription pricing, EU VAT/US tax handled by Lemon Squeezy as merchant of record)

### Security
- Tenant data isolation enforced at query layer (no cross-tenant leakage) — backend scaffolding, not yet exposed to end users
- API keys stored as bcrypt hash

---

## [0.1.0] — 2026-05-20 — MVP Pilote

### Added
- Chrome + Firefox MV3 extension (dual build via crxjs + Vite)
- Detection engine: API keys, IBAN, phone (FR + E.164), internal IP, pro email, generic secrets (Bearer, Basic, JWT)
- Block and Redact modes per rule type
- Policy sync from remote API endpoint
- Offline telemetry queue with retry
- First-run employee notice (FR/EN)
- Site adapters: claude.ai, chatgpt.com, gemini.google.com
- File upload guard (text file content scanning)
- RGPD compliance: no prompt content in telemetry, schema validation
- 94 automated tests (Vitest), 17 test files, 81% statement coverage
- ReDoS audit completed — all patterns safe
