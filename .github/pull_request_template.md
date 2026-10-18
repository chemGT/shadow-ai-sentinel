## What

<!-- One or two sentences: what changes and why. Link the issue: Closes #… -->

## How it was tested

- [ ] `npm test` green
- [ ] `npx tsc --noEmit` clean
- [ ] `npm run test:e2e` green (if a site adapter, the guard or the UI changed)

## Detector changes (if any)

- [ ] Positive **and** negative tests added
- [ ] Evasion corpus updated (`src/core/detection/evasion-corpus.test.ts`) when a bypass is closed or documented
- [ ] Regex is bounded (no nested quantifiers) — see `.ai/security/redos-audit-results.md`

## Privacy

- [ ] No network call added, no prompt content logged or stored
