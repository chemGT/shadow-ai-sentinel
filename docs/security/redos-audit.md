# ReDoS Audit — Shadow AI Sentinel

**Date**: 2026-06-12
**Author**: Claude Code (S0-8)
**Scope**: all regex patterns in `src/core/detection/`

French original: `redos-audit.fr.md`.

---

## Summary

| File | Patterns | Risk | Action |
|---------|----------|--------|--------|
| `api-key.ts` | 10 | LOW | None |
| `iban.ts` | 1 | LOW | None |
| `phone.ts` | 2 | LOW | None |
| `internal-ip.ts` | 1 | LOW | None |
| `pro-email.ts` | 1 dynamic | LOW | None |
| `generic-secret.ts` | 3 (incl. JWT) | LOW after fix | Fixed |

**Overall status: SAFE** — no catastrophic ReDoS risk. A defensive fix was applied to the JWT pattern.

---

## Detailed analysis

### `api-key.ts`

10 patterns (AWS AKIA/ASIA, OpenAI sk-, GitHub ghp_/github_pat_, GitLab glpat-, Slack xox*, Azure).

Common characteristics:
- Fixed literal prefix (unambiguous start anchor)
- `\b` at start and end
- A single character group with no overlap
- Bounded quantifiers: `{16}`, `{20,255}`, `{10,255}`, `{36,255}`, `{22,255}`, `{3,24}`

**Verdict: SAFE** — linear backtracking at worst.

---

### `iban.ts`

Pattern: `/\b([A-Z]{2}\d{2}[A-Z0-9]{11,30})\b/gi`

- `{2}` and `{11,30}` bounded
- Disjoint character classes (uppercase, digits, alphanumeric)

**Verdict: SAFE**

---

### `phone.ts`

`FR_PHONE_PATTERN`: `/\b(?:(?:\+33|0033)[\s.-]?[1-9](?:[\s.-]?\d{2}){4}|0[1-9](?:[\s.-]?\d{2}){4})\b/g`

- `{4}` fixed repetition (not `{4,}`)
- `[\s.-]?` bounded to 0 or 1
- Alternation at the head (`\+33|0033`), both branches are linear

`E164_PATTERN`: `/\+[1-9]\d{7,14}\b/g` — simple, bounded.

**Verdict: SAFE**

---

### `internal-ip.ts`

IPv4 RFC1918 pattern with three alternatives (`10.x`, `172.16-31.x`, `192.168.x`).

- Each octet: `\d{1,3}` bounded
- Top-level alternation, independent branches
- Post-match validation via `isPrivateIpv4()` + `isValidOctet()`

**Verdict: SAFE**

---

### `pro-email.ts`

Dynamic pattern: `` `\\b([a-zA-Z0-9._%+-]{1,64}@(?:${domainPart}))\\b` ``

- `[a-zA-Z0-9._%+-]{1,64}`: bounded to 64 (RFC 5321 local-part max)
- `domainPart`: list of domains escaped via `escapeRegex()`, which neutralizes `[.*+?^${}()|[\]\\]`
- After escaping, the domains are literal strings with no nested quantifiers

Verification of `escapeRegex()` (line 4-6): `/[.*+?^${}()|[\]\\]/g` — covers all PCRE metacharacters. **Regex injection from the policy is impossible.**

**Verdict: SAFE**

---

### `generic-secret.ts`

| Pattern | Before | After | Note |
|---------|-------|-------|------|
| Bearer | `{20,512}` | unchanged | Already bounded |
| Basic | `{20,512}` | unchanged | Already bounded |
| JWT | `{10,}` unbounded | `{10,4096}\.[10,4096}\.[10,512}` | Defensive fix |

**JWT before the fix**: `/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g`

Analysis: the `.` separator is a literal character **disjoint** from the `[A-Za-z0-9_-]` class. Backtracking on `{10,}` is therefore linear (O(n)), not catastrophic. Still, an explicit upper bound is recommended:
- JWT base64url header: typically 36-100 chars → `{10,4096}` (generous)
- JWT payload: can exceed 1 KB → `{10,4096}`
- Signature (HS256: 43c, RS256: 342c, PS512: 683c) → `{10,512}`

**JWT after the fix**: `/\beyJ[A-Za-z0-9_-]{10,4096}\.[A-Za-z0-9_-]{10,4096}\.[A-Za-z0-9_-]{10,512}\b/g`

The `MAX_DETECTION_INPUT_LENGTH = 100_000` safety net (in `limits.ts`) remains the primary defense against any input-level DoS.

**Verdict after fix: SAFE**

---

## Cross-cutting protection

`src/core/detection/limits.ts`: `truncateForDetection()` truncates every input to 100,000 characters before analysis. Even if a pattern had super-linear complexity, the input is bounded.

---

## Actions taken

- [x] Fix in `generic-secret.ts` line 8: JWT `{10,}` → `{10,4096}` / `{10,4096}` / `{10,512}`
- [x] Tests re-run: 94/94 ✅

## Remaining actions

- [ ] Consider `vuln-regex-detector` or `safe-regex` in CI for future regression protection (optional Sprint 1)
