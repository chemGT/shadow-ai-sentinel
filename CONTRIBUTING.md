# Contributing

Thanks for helping make AI usage safer. Small, focused pull requests are the easiest to review.

## Ground rules

- **Privacy first.** No network call, no analytics, no logging of prompt content — ever. A PR that
  adds any of these will not be merged.
- **Never commit a real secret**, not even a revoked one. Use documented fake values
  (`AKIAIOSFODNN7EXAMPLE`, IBAN `DE89370400440532013000`, card `4111111111111111`).
- Security issues go through [SECURITY.md](SECURITY.md), not public issues.
- Be kind: [Code of Conduct](CODE_OF_CONDUCT.md).

## Setup

Node.js 20+.

```bash
npm ci
npm test              # unit tests — must stay green
npx tsc --noEmit      # typecheck — must stay clean
npm run test:e2e      # builds, then Playwright on the real extension (needs Chromium:
                      # npx playwright install chromium)
```

Load the build in a browser: `npm run build`, then `chrome://extensions` → Developer mode →
*Load unpacked* → `dist/`.

## Project layout

| Path | Content |
|------|---------|
| `src/core/detection/` | One file per detector, plus `normalize.ts` (Unicode folding), `limits.ts` (chunking), `run-detectors.ts` |
| `src/core/regex-engine.ts` | Entry point: normalize → chunk → detect → map offsets back → merge |
| `src/extension/sites/<site>/` | Site adapters (selectors + wiring) |
| `src/extension/sites/shared/` | Shared guard (send interception) and file guard (attachments) |
| `src/extension/content/` | Guard decision (`analyze.ts`), local counters, alert host |
| `e2e/` | Playwright suite; `fixtures.ts` holds minimal HTML replicas of the 8 sites |

## Adding a detector

1. Create `src/core/detection/<name>.ts` exporting `find<Name>Matches(text): RawMatch[]`.
2. **Bound every quantifier** and avoid nested quantifiers (ReDoS). Anchor on fixed prefixes when the
   format has one. If the format has a checksum (Luhn, mod-97, …), validate it.
3. Add the rule type to `RuleType` (`src/core/types.ts`), `DEFAULT_RULES` and the redaction token in
   `src/core/constants.ts`, the label in `src/extension/options/main.ts`, then wire it in
   `run-detectors.ts`.
4. Tests, in `src/core/regex-engine.test.ts` or a dedicated file:
   - positives: contiguous, grouped, inside a sentence, at start/end of text;
   - **negatives**: look-alike legitimate strings (order numbers, versions, timestamps…);
   - a case in `src/core/detection/evasion-corpus.test.ts` if the format has known bypasses.
5. Document the format and its false-positive risk in the PR.

## Fixing a site adapter

AI sites change their DOM often. When an adapter breaks:

1. Update the selectors in `src/extension/sites/<site>/selectors.ts`.
2. Update the matching fixture in `e2e/fixtures.ts` so the e2e suite reproduces the new DOM.
3. Run `npm run test:e2e`.

## Detection bypasses

The adversarial corpus (`src/core/detection/evasion-corpus.test.ts`) uses two kinds of tests:

- `SOLIDE` / `CORRECTIF` — must be detected; regressions fail the build;
- `[BYPASS CONNU]` — known gaps asserted as **not** detected, so that fixing one forces the test
  (and the docs) to be updated.

Closing a known bypass = flip its test to a positive assertion and update
`docs/security/bypasses-2026-09.md`.

## Commits and pull requests

- One logical change per PR; describe **what** and **why**, link the issue.
- Fill in the PR template checklist.
- CI must be green (unit tests + coverage, typecheck, Chromium and Firefox builds, e2e, CodeQL).
- By contributing, you agree that your contribution is licensed under [Apache-2.0](LICENSE).
