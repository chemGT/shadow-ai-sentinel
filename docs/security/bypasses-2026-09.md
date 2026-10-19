# Confirmed DLP Bypasses — September 2026

French original: `bypasses-2026-09.fr.md`.

**Date**: 2026-09-15 · **Method**: every bypass listed is **confirmed by executing**
the corpus `src/core/detection/evasion-corpus.test.ts` (`npx vitest run src/core/detection/evasion-corpus.test.ts`,
35 passing tests) — these are **not** hypotheses. Detailed threat model:
`evasion-threat-model.md`. Full suite: **325 passing tests**, clean `tsc`.

Severity: **high** = likely leak with no intent to bypass (common format) · **medium** =
realistic leak, a simple action or copy-paste · **low** = requires a clear intent to
bypass (encoding/tool), the product does not claim to stop it.

---

## A. Bypasses fixed in this batch

### A1 — [HIGH] International-format phone `+33…` entirely undetected — **FIXED**
- **Repro (before the fix)**: `+33612345678`, `+33 6 12 34 56 78`, `+33.6.12.34.56.78` → no detection.
- **Lock-in test**: `describe('CORRECTIF — téléphone +33 (international) désormais détecté')`.
- **Root cause**: `src/core/detection/phone.ts:4` (the FR pattern started with `\b`, impossible
  before a `+` preceded by a space/start of string) **combined with** `phone.ts:55` (the E.164
  pattern explicitly excludes `+33`, wrongly assuming the FR pattern covers it). Result: neither
  one saw a French number in international notation — a standard address-book format, hence an
  **inadvertent leak**.
- **Fix applied**: head anchor `\b` → `(?<![\w+])` (`phone.ts:11`). Covers all three `+33`
  forms, leaves the national behavior and the negative cases unchanged
  (`ticketX0612345678` still ignored). 0 regressions across the 290 pre-existing tests.

---

## B. Confirmed bypasses — to fix (proposed fix, not implemented)

### B1 — [MEDIUM] IBAN separated by hyphens or NBSP escapes detection — **FIXED (2026-10-18)**
- **Fix applied**: IBAN separator `[ -]?` + strip `[\s-]` in the mod-97 check (`iban.ts`);
  NBSP folded by normalization **D**. Lock-in: `CORRECTIF — unicode normalisé avant scan`.
- **Repro**: tests `[BYPASS CONNU] IBAN séparé par tirets` and `… par NBSP`
  (`DE89-3704-0044-0532-0130-00`, `DE89 3704 …` in U+00A0) → undetected, while the ASCII-space
  version and the contiguous version are detected.
- **Root cause**: `src/core/detection/iban.ts:10` — separator `[ ]?` (literal ASCII space).
- **Proposed fix**: widen the separator class to Unicode spaces + hyphen,
  e.g. `(?:[   -]?[A-Z0-9]{4}){2,7}`. The mod-97 safety net (`iban.ts:12`) makes the false-positive
  risk negligible. (Better: a shared defensive normalization — see **D**.)

### B2 — [MEDIUM] Card number separated by NBSP / thin space escapes detection — **FIXED (2026-10-18)**
- **Fix applied**: normalization **D** (Unicode spaces → ASCII, BOM stripped). The dot
  remains excluded (C2).
- **Repro**: tests `[BYPASS CONNU] carte séparée par NBSP` and `… par NNBSP fine`
  (`4111 1111 1111 1111` in U+00A0 / U+202F) → undetected.
- **Root cause**: `src/core/detection/card.ts:12` — separator `[ -]` (ASCII space / hyphen).
- **Proposed fix**: add NBSP + NNBSP to the class, e.g. `(?:\d[   -]?){12,18}\d`.
  **Do not** add the dot (see C2). Luhn (`card.ts:15`) bounds the false positives.

### B3 — [MEDIUM] `pro_email`: subdomains of the configured domain escape detection — ✅ **FIXED 2026-10-19 (issue #11)**
- **Repro** (before the fix): test `[BYPASS CONNU] sous-domaine du domaine configuré`
  (`jean@mail.acme.com`, `jean@eu.acme.com` with policy `acme.com`) → undetected.
- **Root cause**: `src/core/detection/pro-email.ts:14` — the `@` has to immediately precede the
  domain; no subdomain prefix is allowed.
- **Fix applied 2026-10-19** (issue #11): insert `(?:[a-z0-9-]+\.)*` before the domain:
  `@(?:[a-z0-9-]+\.)*(?:${domainPart})`. Verified that a domain `acme.com` does not match
  `evilacme.com` (the literal `.` already prevents it) — verified by the tests
  `CORRECTIF — pro_email sous-domaines (B3)` in `src/core/detection/evasion-corpus.test.ts`
  (the matching `[BYPASS CONNU]` test was flipped to positive).

### B4 — [MEDIUM] Zero-width / BOM / homoglyphs / full-width digits in a secret — **FIXED (2026-10-18)**
- **Fix applied**: normalization **D** + a strict Cyrillic/Greek homoglyph table
  (NFKC alone does not fold Cyrillic `А`).
- **Repro**: tests `[BYPASS CONNU] zero-width … dans une clé`, `BOM … dans une carte`,
  `homoglyphe cyrillique …`, `chiffre pleine chasse …`.
- **Root cause**: no **Unicode normalization** before scanning (`run-detectors.ts` /
  `regex-engine.ts` pipeline). Patterns are ASCII; any interspersed invisible character or
  compatibility homoglyph breaks the match.
- **Proposed fix**: a defensive normalization pass before `runAllDetectors` (see **D**).
  Closes B1, B2 and B4 in one shot (zero-width, NBSP, full-width digits, NFKC compatibility homoglyphs).

### B5 — [MEDIUM] File formats not scanned (XLSX, PPTX, RTF, ZIP, images)
- **Repro**: test `[BYPASS CONNU] XLSX / PPTX / archives / images ne sont ni texte ni binaire
  scannable` — `isTextLikeFile` and `isBinaryScannableFile` both return `false` → the file
  passes **with no scan at all**.
- **Root cause**: `src/extension/sites/shared/file-guard.ts:277-284` (`isScannableFile`) +
  `src/core/binary-file.ts:23` + `src/core/text-file.ts:44` — only text/PDF/DOCX are covered.
- **Proposed fix**: at minimum **block by default** (or explicitly warn) for non-extractable
  office formats (XLSX/PPTX/ODT) instead of silently letting them through; longer term, add an
  XLSX extractor (`sheetjs`) to the binary pipeline. Product decision — cost vs. surface.

---

## C. Confirmed bypasses — to **document, not fix** (accepted limit or false-positive risk)

### C1 — [LOW] Encodings (base64, hex, URL-encoding) and reversible transforms
- **Repro**: tests `[BYPASS CONNU] encodages` (base64/hex/URL) + `manipulations de chaîne`
  (splitting across two lines, internal separators within the key, `_` wrapping, reversal).
- **Root cause**: the engine scans **raw text**, with no decoding (an accepted choice:
  `run-detectors.ts`). A general-purpose decoder would blow up false positives and CPU cost.
- **Decision**: a **scope limit**, not a defect to fix. The product stops inadvertent leaks,
  not motivated exfiltration. To be reflected in the sales pitch / privacy page.

### C2 — [LOW] Card number separated by dots
- **Repro**: test `[BYPASS CONNU] carte séparée par des points`.
- **Root cause**: `card.ts:12`.
- **Decision**: **do not fix**. Adding `.` as a separator would match version numbers, ratios,
  and dotted 13-19 digit sequences that pass Luhn by chance (~10%) — the customer cost (false
  positives on code/technical text) outweighs the gap. Cf. the project's constraints.

---

## D. Cross-cutting, highest-leverage recommendation — **IMPLEMENTED (2026-10-18)**

> Implementation: `src/core/detection/normalize.ts`, called by `detectSensitiveData`
> (`regex-engine.ts`). Chosen approach for offsets: **sparse index map** (only the code
> points whose folding changes length are recorded, binary search) → `start/end` refer to the
> original text, redaction covers the segment actually typed (including interspersed
> invisibles). NFKC limited to compatibility forms that mimic ASCII (full-width, ligatures,
> superscripts, circled digits, mathematical alphanumerics). The allowlist applies the same
> folding. Measured cost (2 MB, CI container): ASCII/French ~15 ms (unchanged), dense
> Cyrillic ~150–200 ms, a single pass on send.
> Tests: `normalize.test.ts`, `evasion-corpus.test.ts`, `analyze.test.ts`.

Original text of the recommendation:


A **defensive normalization pass before scanning** — inserted at the head of `runAllDetectors`
(`src/core/detection/run-detectors.ts`) or in `detectSensitiveData`
(`src/core/regex-engine.ts`) — would close B1, B2 and B4 with a single localized fix, at low
false-positive risk:

1. **Remove** zero-width characters: `U+200B`, `U+200C`, `U+200D`, `U+FEFF`.
2. **Fold** Unicode spaces (`U+00A0`, `U+202F`, `U+2000-200A`, `U+3000`) to the ASCII space.
3. **Normalize with NFKC** (folds full-width digits and compatibility ligatures/homoglyphs).

⚠️ **Offsets** subtlety: normalization can change the text length; the returned `start/end`
are used for redaction on the **original** text (`analyze.ts:59`). Either scan the
normalized text while keeping an index map back to the original, or — simpler and safer —
use the normalized version only to **decide** (block/allow) and widen the redaction to the
corresponding original segment. This needs design work before implementation: it is not a
one-liner, hence the "recommendation" label rather than "fix applied".

---

## E. What was tested and turned out to be **SOLID**

Confirmed by the `describe('SOLIDE — détections robustes')` block (permanent regressions):

- Raw **API keys** in context: AWS `AKIA…`, OpenAI `sk-…`, JWT/`Bearer` tokens.
- **IBAN** contiguous **and** ASCII-spaced (with the mod-97 safety net: an IBAN with a bad checksum is rejected).
- **Card** contiguous, spaced, **and** ASCII-hyphenated (with Luhn: a 16-digit order number passes through).
- **RFC1918 IP** in canonical format (a public IP `8.8.8.8` is ignored).
- **Corporate email** on exact domain, case-insensitive.
- **FR phone** national contiguous/spaced, **NBSP tolerated** (the `\s` class of the phone
  pattern covers the non-breaking space — exactly what IBAN/card are missing), and now
  **international `+33`** (fix A1).
- **Size robustness**: chunking (`limits.ts`) covers all text ≤ 2 MB with no loss; beyond that,
  truncation is **flagged** to the user (`wasTextTruncated`).
- **No false positives** on innocuous text, non-card digit sequences, public IPs.

The core "inadvertent leak of a pasted secret" case is correctly covered. The remaining gaps
are either unusual **separator formats** (B1/B2, fixable) or **deliberate evasions** (C1)
outside the scope of a client-side local DLP.
