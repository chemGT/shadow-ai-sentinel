# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] — Sprint 1 (Make it sellable)

### Added
- Multi-tenant Postgres schema (tenants, api_keys, policies, telemetry_events, audit_log)
- Tenant isolation middleware for Express backend
- API key rotation with scopes and grace period
- Audit log append-only
- Aggregated events endpoint `/events/aggregate` with cache
- CSV export endpoint `/events/export`
- Background jobs (purge, aggregation, Paddle dunning hook)
- Next.js portal skeleton with Clerk auth (EN/FR)
- Organizations, members, roles (owner/admin/viewer)
- Dashboard read-only charts (Recharts)
- Policy JSON editor (Monaco) with validation
- API key management in portal
- Paddle live setup: products, pricing, checkout overlay
- Paddle webhooks → tenant entitlements sync
- Feature gating middleware + UI
- 4-step signup wizard with policy presets
- Extension deep-link provisioning `chrome-extension://…#config=…`
- False positive signal in extension (safe schema, no prompt text)
- Marketing landing + pricing page (EN/FR)
- Trust/Security/Privacy/CGU/DPA pages
- Monitoring: Sentry + Better Stack + PostHog
- E2E Playwright suite: signup → install → first alert

### Changed
- Reduced `host_permissions` to minimum required (MV3 store compliance)

### Security
- Tenant data isolation enforced at query layer (no cross-tenant leakage)
- API keys stored as bcrypt hash
- Paddle webhook HMAC signature verification

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
