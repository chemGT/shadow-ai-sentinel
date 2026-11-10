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

---

## Addendum — 2026-11 (detector extension)

Re-audited after the detector set was extended (new vendor keys, PEM private keys, credential
URLs, `name=value` secrets, grouped E.164). The "100,000-character truncation" described above is
obsolete: the engine scans overlapping 100k windows up to 2,000,000 characters
(`detection/limits.ts`).

| File | Change | Why it stays linear / bounded |
|------|--------|-------------------------------|
| `api-key.ts` | Fixed-prefix patterns for GitHub `gh[pousr]_`, Stripe `whsec_`, Slack `xapp-` and webhook URLs, Google `AIza`, npm, Hugging Face, SendGrid, Twilio, DigitalOcean | Literal prefix + one bounded character class |
| `api-key.ts` | PEM private key: `BEGIN…[\s\S]{1,4096}?…END` and `BEGIN…[A-Za-z0-9+/=\s]{0,4096}` | Lazy/greedy scan capped at 4096 per header; worst case measured below |
| `api-key.ts` | Azure: optional `AccountKey=…{20,128}`, `SharedAccessSignature=…{20,512}` | Bounded, single class |
| `generic-secret.ts` | Bearer `{20,4096}`, Basic `{16,512}` end with a negative lookahead instead of `\b` | Single class, bounded; over-length tokens are now matched instead of silently skipped |
| `generic-secret.ts` | Credential URL `scheme://user:pass@host` | Three disjoint bounded classes separated by literals |
| `generic-secret.ts` | `name[:=]value` secrets | Keyword alternation + `{0,24}` + `{8,128}`; no nesting |
| `card.ts`, `phone.ts`, `internal-ip.ts` | Lookbehind/lookahead guards (adjacent digit, date separators) | Fixed-width or `?`-bounded lookarounds |
| `iban.ts` | `.` accepted as group separator | Same shape as before |
| `pro-email.ts` | Sub-domain labels bounded `{1,63}` × `{0,8}` (was unbounded `+` / `*`) | Removes the only unbounded quantifiers left in the engine |
| `merge-matches.ts` | Linear merge (was quadratic: 22.9 s for 120k matches) | Not a regex, but it was the only real freeze found |

Measured on ~2,000,000-character adversarial inputs (36 cases, Node 22, all rules enabled):
worst case 0.7 s (e-mail labels), every other case under 0.6 s. A reduced version of these inputs
runs in CI (`src/core/detection/corpus.test.ts`, "temps de scan borné").
