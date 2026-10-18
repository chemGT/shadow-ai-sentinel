# CLAUDE.md — Shadow AI Sentinel

Entry point for Claude Code (and other coding agents).

## Project

Open-source (Apache-2.0) **MV3 browser extension** acting as a **DLP for public LLMs** (Claude,
ChatGPT, Gemini, Le Chat, DeepSeek, Perplexity, Grok, Copilot): detects secrets and personal data
**locally, before sending**, then **blocks** or **redacts**.

Hard constraints:
- **Zero network.** No backend, no telemetry, no analytics. Never add a `fetch`, a host permission or
  remote code. The only outbound action is a user click opening a prefilled GitHub issue
  (`src/extension/content/reporting.ts`) — never include typed text in it.
- Never log or persist prompt content.
- Every regex bounded (no nested quantifiers) — see `docs/security/redos-audit.md`.
- Public identity is the pseudonym `chemGT`: no real name, no personal domain or email anywhere.

## Commands (must stay green)

| Command | Purpose |
|---------|---------|
| `npm test` | Vitest unit tests |
| `npx tsc --noEmit` | Typecheck — must be empty |
| `npm run test:e2e` | Build + Playwright on the real extension, fixtures of the 8 sites |
| `npm run build` / `npm run build:firefox` | Chromium → `dist/`, Firefox → `dist-firefox/` |

## Architecture

- `src/core/regex-engine.ts` → `normalizeForScan` (`detection/normalize.ts`: invisible chars, Unicode
  spaces, homoglyphs, targeted NFKC, sparse offset map back to the original text) → bounded chunks →
  `run-detectors.ts` → merge.
- Policy (`sentinel_policy`) and allowlist (`sentinel_allowlist`) live in `chrome.storage.local`;
  the background only caches the policy and broadcasts updates to LLM tabs.
- Site adapters: `src/extension/sites/<site>/` (selectors) + `sites/shared/` (send guard, file guard).
- Known bypasses are tests: `src/core/detection/evasion-corpus.test.ts` (`[BYPASS CONNU]` = asserted
  gap; fixing one means flipping the test and updating `docs/security/bypasses-2026-09.md`).

## Conventions

- Code comments and internal docs are in French; public-facing docs (README, CONTRIBUTING,
  SECURITY) in English, with `README.fr.md`.
- Update `CHANGELOG.md` (Keep a Changelog) with every user-visible change.
- Roadmap: `ROADMAP.md`. The former SaaS backend/portal is archived on branch `archive/saas-portal`
  — do not reintroduce it.
