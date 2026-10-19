# Threat Model — Local DLP Engine Evasions

French original: `evasion-threat-model.fr.md`.

**Date:** 2026-09-15 · **Scope:** detection engine `src/core/detection/**` +
pipeline `src/core/regex-engine.ts` + content-script interception
(`src/extension/sites/shared/{guard-adapter,file-guard}.ts`, `src/extension/content/analyze.ts`).
**Method:** every claim below is verified against the **actual code** (regexes copied
verbatim and executed); cases confirmed by execution are tracked in the test corpus
`src/core/detection/evasion-corpus.test.ts` and in the report `bypasses-2026-09.md`.

## 0. How it works (attack surface)

- Interception triggers on **three events only**: `keydown` (Enter **without**
  a modifier, outside IME composition), `click` on the send button, and on files
  (`change` / `drop` / `paste`) — cf. `guard-adapter.ts:133-165`, `file-guard.ts:286-363`.
- The text analyzed is the text **extracted from the composer** (`extractTextFromInput`:
  `textarea.value` or `innerText/textContent` — `input-text.ts:1-6`).
- Detection = **regex + validators** (Luhn for card, mod-97 for IBAN, FR format for phone),
  **no** decoding layer (base64/hex/URL), **no** OCR. Since 2026-10-18: a
  **defensive Unicode normalization** precedes the scan (`normalize.ts`, cf. §3 and bypass D).
- Since going open source (2026-10-18), there is no more Free/Pro tier: all rules and
  file scanning are available; their activation depends solely on the policy.

**Feasibility** — scale used: *Accidental* (leak with no intent, e.g. a common copy-paste
format) · *Easy* (a trivial manipulation, no tool) · *Deliberate* (requires encoding /
a tool / a clear intent to bypass).

---

## 1. Encodings (no decoding layer)

The engine decodes **nothing** before scanning. Any reversible transform of the secret
makes it invisible. Verified: `base64("AKIA…")`, `hex("AKIA…")`, URL-encoding → **0 detections**.

| Vector | Mechanism | Feasibility | Impact | Detected? |
|---|---|---|---|---|
| **Full base64** | `QUtJQUlPU0ZP…` matches no pattern | Deliberate | Data leaves | ❌ No |
| **Partial base64** | only a portion of the secret is encoded | Deliberate | Leaves | ❌ No |
| **hex** | `414b4941…` | Deliberate | Leaves | ❌ No |
| **URL-encoding** | `AKIA%20IOSF…` (the `%20` breaks the `\b…\b`) | Deliberate | Leaves | ❌ No |
| **Double encoding** | base64(base64(x)) | Deliberate | Leaves | ❌ No |
| **Escaped JSON** | `"AK…"` — the source string does not contain the raw bytes | Deliberate | Leaves | ❌ No |

**Analysis.** Expected by design: a general-purpose decoder would blow up false positives
and CPU cost. This is a **deliberate choice**, not a bug — but it must be documented as a
known limit: a user who *wants* to exfiltrate data can do so trivially. The product's value
is blocking **inadvertent leaks** (pasting a `.env`), not motivated exfiltration. Should not
be marketed as a barrier against a malicious insider.

---

## 2. String manipulations

| Vector | Mechanism (code reference) | Feasibility | Impact | Detected? |
|---|---|---|---|---|
| **Splitting across multiple lines** | `AKIA\nIOSF…`: the pattern is contiguous, `\n` breaks the match (`api-key.ts:7`) | Easy | Leaves | ❌ No |
| **Splitting across multiple messages** | half in msg 1, half in msg 2: each send is scanned in isolation (`guard-adapter.ts:97`) | Easy | Leaves | ❌ No |
| **Internal separators (secret)** | inserting spaces/hyphens in a key `AKIA-IOSF-…`: breaks `[0-9A-Z]{16}` | Easy | Leaves | ❌ No |
| **Separators (IBAN/card)** | see §5: hyphen on IBAN, dot on card → **undetected** | Accidental/Easy | Leaves | ❌ No |
| **Alternating case** | `sK-AbC…`: `api_key` patterns are **case-sensitive** (`api-key.ts`, no `i` flag) | Easy | Leaves | ❌ No* |
| **Reversal** | `ELPMAXE7NNDOFSOIAIKA` | Deliberate | Leaves | ❌ No |
| **Word wrapping** | `_AKIAIOSFODNN7EXAMPLE_`: `_` is a `\w` character, the `\b` boundary **fails** | Easy | Leaves | ❌ No |

*Case: altering a key's case makes it **invalid as a real key** (a real AWS key has fixed
case) — the "bypass" then exfiltrates data that is no longer the secret. Low practical
severity, but the `\b` wrapping by `_` (`api-key.ts:7-20`) is a real hole: `x=_AKIA…_`
passes even though the key is intact.

**Cross-cutting root cause.** Every `\b` boundary in the `api_key` patterns fails as soon as
a `\w` character (letter, digit, `_`) is adjacent to the secret with no space. The `iban`/
`card`/`phone` detectors are more robust because they tolerate internal separators — but
**inconsistently** so (see §5).

---

## 3. Unicode

The engine **does not normalize** (`grep normalize|NFK` → no normalization in the
detection pipeline). Key verified point: the regex class `\s` (used by `phone.ts:5`)
**matches** NBSP (U+00A0), NNBSP (U+202F), thin space (U+2009), BOM/ZWNBSP (U+FEFF) — but
**not** ZWSP (U+200B). Conversely, the `iban.ts:10` and `card.ts:12` detectors use
**literal** classes (`[ ]`, `[ -]`) that tolerate **none** of these characters.

| Vector | Mechanism | Feasibility | Impact | Detected? |
|---|---|---|---|---|
| **Zero-width (U+200B) inside the secret** | `AKIA​IOSF…`: breaks any contiguous pattern; `\s` does not cover it | Deliberate | Leaves | ❌ No |
| **BOM / ZWNBSP (U+FEFF) inserted** | same, breaks `api_key`/`card`/`iban` patterns | Deliberate | Leaves | ❌ No |
| **NBSP as separator — card/IBAN** | `4111 1111…` / `DE89 3704…` in NBSP → **undetected** (literal classes) | **Accidental** | Leaves | ❌ No |
| **NBSP as separator — phone** | `\s` covers NBSP → **detected** | — | — | ✅ Yes |
| **Cyrillic/Greek homoglyphs** | `АKIA` (А = U+0410): no longer the ASCII pattern | Deliberate | Leaves | ❌ No |
| **Full-width digits** | `４111 1111…`: `\d` does not match U+FF14 → the prefix is skipped | Deliberate | Leaves | ❌ No |
| **NFKC vs NFD** | the decomposed (NFD) secret differs byte-for-byte from the ASCII pattern | Deliberate | Leaves | ❌ No |
| **RLO/LRO (U+202E/202D)** | reverses the display without changing the logical order — does not help bypass a *logical* scan; mainly serves to **deceive the human** proofreading it | Deliberate | Variable | N/A |
| **Combining characters / ligatures** | `ﬁ` (U+FB01) etc.: not relevant for ASCII secrets | Deliberate | Leaves | ❌ No |

**Case of "the site normalizes on its own".** Some composers apply NFC normalization or
strip zero-width characters on paste. Two opposite consequences: (a) if the site **removes**
the zero-width characters, the text becomes detectable again — but the extension reads the
composer *before* submission, so it sees the text as it is in the DOM at that instant;
(b) if the site NFKC-normalizes homoglyphs (rare), likewise. In practice **the engine sees
what `extractTextFromInput` reads in the DOM** at guard time — there is no second pass. A
site that rebuilds the payload at `submit` time (see §4) is the real risk.

**Underlying recommendation.** A **defensive normalization pass before scanning** (strip
zero-width + NFKC + fold Unicode spaces to the ASCII space) would close the NBSP/ZWSP/
full-width/compatibility-homoglyph lines in one shot, **with no** false positive on
legitimate text. This is the highest-leverage fix (see `bypasses-2026-09.md`).

---

## 4. Form context (DOM interception)

The guard only intercepts 3 triggers (cf. §0). Any send path that avoids them leaks.

| Vector | Mechanism (code reference) | Feasibility | Impact | Detected? |
|---|---|---|---|---|
| **Direct text paste** | no `paste` listener on *text* (only on files, `file-guard.ts:337`) → pasted text is only scanned **at send time** (Enter/click). This is fine **as long as** the send goes through one of the 3 triggers. | — | — | ✅ at send |
| **Ctrl/Cmd/Alt/Shift + Enter** | `guard-adapter.ts:134`: `return` if a modifier is present → **no scan** on that keydown | Easy | Leaks if the site sends this way | ❌ No (keydown) |
| **IME composition** | `event.isComposing` → `return` (`guard-adapter.ts:137`) | Easy | Leaks if sent during composition | ❌ No |
| **`execCommand('insertText')`** | this is the redaction **write** path (`input-text.ts:27`), not an input vector; no impact on detection | — | — | N/A |
| **Character-by-character typing** | no impact: the scan reads the composer's final state at send time | — | — | ✅ |
| **`paste` blocked by the site** | if the site prevents pasting, the user types — no impact | — | — | ✅ |
| **iframe** | the content-script is injected per `manifest.json:42-57` **without `all_frames`** → **only the top frame** is protected. A composer inside a same-origin iframe or a third-party widget **is not scanned** | Deliberate/Variable | Leaves | ❌ No |
| **shadow DOM** | listening is done in capture mode at the `document` level; a send encapsulated such that it does not bubble up to `document`, or a composer found via selectors that do not pierce the shadow (`selectors.ts`), escapes | Variable | Leaves | ⚠️ depends on site |
| **Non-standard `contenteditable`** | `extractTextFromInput` reads `innerText ?? textContent` (`input-text.ts:5`); an editor that stores its value elsewhere (e.g. React state serialized at submit) can diverge from the scanned `innerText` | Variable | Leaves | ⚠️ depends |
| **Site rebuilds the input at submit** | if the actual payload is rebuilt in JS at `submit`/`fetch` from state not reflected in the DOM, the scan (which reads the DOM) sees something different from what leaves | Deliberate | Leaves | ❌ No |
| **Direct `fetch`/`XHR` from the page** | a user script / devtools posting to the LLM's API without going through the composer → **never** intercepted (the extension does not observe the network) | Deliberate | Leaves | ❌ No |
| **Broken selectors (site drift)** | `findComposerInput`/`isSendButtonTarget` return `null` if the site changes its DOM; the `adapter-health-monitor` detects this and applies `fail_mode` (default **`warn`** = **fail-open**, `guard-adapter.ts:180`) | Accidental (publisher side) | Leaves | ⚠️ fail-open by default |

**Analysis.** These vectors are **structural** (inherent to an MV3 extension hooking into a
third-party site's DOM) and not testable outside E2E. The most concerning in practice:
**(a)** default `fail_mode` = `warn` (fail-open) — a simple site update silently disarms the
DLP; **(b)** sending via a keyboard modifier (Ctrl+Enter is a send shortcut on several
sites); **(c)** lack of `all_frames`.

---

## 5. Detectors: regex false negatives (verified by execution)

Results obtained by running the code's **exact** patterns against values with a **valid**
checksum.

### 5.1 Phone — `phone.ts` — **major gap, non-adversarial**
FR pattern: `/\b(?:(?:\+33|0033)…|0[1-9]…)\b/` (`phone.ts:4-5`); E.164:
`/\+[1-9]\d{7,14}\b/` with, in the code, the exclusion `!value.startsWith('+33')` (`phone.ts:55`).

- `+33612345678` (international, contiguous) → **❌ undetected**.
- `+33 6 12 34 56 78` (international, spaced, **standard** format) → **❌ undetected**.
- `+33.6.12.34.56.78` (international, dotted) → **❌ undetected**.
- `0612345678`, `06 12 34 56 78` (national) → ✅ detected.

**Root cause** (`phone.ts:4` + `phone.ts:55`): the FR pattern starts with `\b`, but `\b`
**cannot** exist right before a `+` preceded by a space or start of string (`+` and space
are both non-`\w`). The FR pattern therefore **never** matches a `+33…` number in a real
context. In parallel, the E.164 pattern **explicitly excludes** `+33`, wrongly assuming the
FR pattern covers it. Result: **neither** pattern sees a French number in international
format. Feasibility: **Accidental** (it's the format of an address book). ✅ **Fix applied**
(see `bypasses-2026-09.md`).

### 5.2 IBAN — `iban.ts:10`
Pattern: `…(?:[ ]?[A-Z0-9]{4}){2,7}…` — separator = **literal ASCII space only**.

- `DE89370400440532013000` (contiguous) → ✅.
- `DE89 3704 0044 0532 0130 00` (ASCII spaces) → ✅.
- `DE89-3704-0044-0532-0130-00` (**hyphens**) → **❌ undetected**.
- `DE89 3704…` (**NBSP**) → **❌ undetected**.

**Root cause** `iban.ts:10`: literal `[ ]` class. The hyphen is a plausible IBAN format;
the NBSP arrives via copy-paste from Word/PDF/web pages with French typography. The mod-97
checksum (`iban.ts:12`) remains a strong safety net → adding these separators carries
**low FP risk**.

### 5.3 Card number — `card.ts:12`
Pattern: `/\b(?:\d[ -]?){12,18}\d\b/` — separator = **ASCII space or hyphen**.

- `4111 1111 1111 1111`, `4111-1111-1111-1111`, `4111111111111111` → ✅.
- `4111.1111.1111.1111` (**dots**) → **❌ undetected**.
- `4111 1111…` (**NBSP**) → **❌ undetected**.

**Root cause** `card.ts:12`: literal `[ -]` class. ⚠️ **FP warning**: adding the **dot** as
a separator would match version numbers, ratios, and dotted 13-19 digit sequences that pass
Luhn by chance (~10%) — **should not be done** in a code-heavy context. **NBSP**, on the
other hand (pure whitespace), is safe.

### 5.4 Corporate email — `pro-email.ts:8-17`
Pattern: `\b([a-z0-9._%+-]{1,64}@(?:<domains>))\b`.

- `jean@acme.com`, `jean@ACME.COM` (case) → ✅.
- `jean@sub.acme.com` (**subdomain**, e.g. `@mail.acme.com`, `@eu.acme.com`) → **❌ undetected**.

**Root cause** `pro-email.ts:14`: the `@` must **immediately** precede the configured
domain; no `(?:[a-z0-9-]+\.)*` allows for subdomains. A corporate email on a subdomain
escapes detection. Medium severity, depends on admin configuration.

### 5.5 api_key / generic_secret — bounds
- `api_key` is **case-sensitive**, with `\b` boundaries (§2) → `_` wrapping and zero-width
  characters bypass it.
- `sk-` capped at 255 characters (`api-key.ts:9`): a secret > 255 chars after `sk-` → ❌
  (minor: real keys are shorter).
- `generic_secret`: `Bearer`/`Basic` are **case-sensitive** (`generic-secret.ts:6-7`); JWT
  requires **3 segments** `eyJ…` (`generic-secret.ts:8`) — a non-JWT opaque token is not
  covered (expected).

### 5.6 Internal IP — `internal-ip.ts:4`
Pattern anchored on RFC1918 ranges with `\b…\b` and literal dots `\.`. A spaced
`192 . 168 . 1 . 5` is not detected (unrealistic format → low severity). Robust on the
canonical format.

---

## 6. Engine limits (size / chunking / truncation)

References: `limits.ts`, `regex-engine.ts:15-29`.

| Mechanism | Behavior | Evasion impact |
|---|---|---|
| **100k windows (`DETECTION_CHUNK_SIZE`)** | scanning via overlapping windows; covers **all** text ≤ the cap, with no loss | No evasion via simple padding < 2M (fixed, cf. `limits` test) |
| **10k overlap (`DETECTION_CHUNK_OVERLAP`)** | a secret > 10k straddling a boundary would be missed; but the longest pattern is ≈ 8.7k (JWT) | Not exploitable for short secrets |
| **Absolute cap 2M (`MAX_DETECTION_TOTAL_LENGTH`)** | beyond this, **real** truncation: any secret placed after 2M of padding **escapes** — but a **warning** `wasTextTruncated` is raised (`analyze.ts:30`, toast `guard-adapter.ts:100`) | ⚠️ Evasion via padding > 2M, **flagged** to the user (detectable) |
| **Text file: 5 MB (`text-file.ts:2`)** | beyond this, `readFileAsText` rejects → `processTextFile` returns `{status:'ok'}` (**silent fail-open**, `file-guard.ts:143-147`) | ❌ A `.txt`/`.csv` > 5 MB with a secret **passes with no warning** |
| **Binary file: 10 MB (`binary-file.ts:2`)** | beyond this → `warn` + let through (`file-guard.ts:163-165`) | ⚠️ PDF/DOCX > 10 MB passes (warned) |

**Important note**: a `.txt` > 5 MB is **silently fail-open** (`catch → status ok`), while
pasted text > 2 MB is fail-open **with a warning**. An inconsistency to fix (at minimum,
raise the same truncation toast for an oversized text file).

---

## 7. Files

References: `file-guard.ts`, `binary-extract.ts`, `text-file.ts`, `binary-file.ts`.

| Vector | Mechanism | Feasibility | Impact | Detected? |
|---|---|---|---|---|
| **Unscanned format** | only text/PDF/DOCX/XLSX/PPTX are scanned (`file-guard.ts`). **RTF, ODT, images, ZIP/archives, binaries** → `isScannableFile` is false → **pass with no scan** | Easy | Leaves | ❌ No |
| **Image-only PDF (no text layer)** | `extractPdfText` reads `getTextContent()` (`binary-extract.ts:42`), **no OCR** → empty text → `allow` | Easy (scan→PDF) | Leaves | ❌ No |
| **Encrypted / corrupted PDF** | `extractBinaryText` throws → `catch` → `warn` + **let through** (`file-guard.ts:168-171`) | Easy | Leaves | ⚠️ Warned |
| **DOCX: comments** | `mammoth.extractRawText` (`binary-extract.ts:60`) reads `document.xml` (body); **comments** (`comments.xml`) are not extracted → a secret in a comment **escapes** | Deliberate | Leaves | ❌ No* |
| **DOCX: tracked changes** | **deleted** text (`w:delText`) is not rendered by `extractRawText`; a secret that was "deleted" but still present in the file escapes | Deliberate | Leaves | ❌ No* |
| **Secret split across body + attachment** | each stream is scanned in isolation (`file-guard.ts` vs `guard-adapter.ts`); half in the message, half in a `.txt` → neither matches | Easy | Leaves | ❌ No |
| **Misleading extension** | a binary renamed `.txt` → `readFileAsText` reads it as text (often unreadable → no match); a real `.pdf` is unaffected | Variable | Leaves | ⚠️ |

*DOCX comments / tracked changes: an **architectural** gap inferred from the behavior of
`mammoth.extractRawText`; flagged as "to confirm with a fixture" in the corpus (not
confirmed by execution for lack of a binary fixture — the rest of the file-related lines
are confirmed by code / existing tests `file-guard.test.ts`).

---

## 8. Summary — prioritization

**Confirmed by execution, cleanly fixable (low FP risk):**
1. `+33…` phone (all formats) — **fixed** in this batch.
2. IBAN separated by hyphens / NBSP — **fixed** on 2026-10-18 (`normalize.ts` + `[ -]` separator).
3. Card separated by NBSP (not the dot) — **fixed** on 2026-10-18 (`normalize.ts`).
4. Zero-width / homoglyphs / full-width digits — **fixed** on 2026-10-18 (`normalize.ts`).

**Confirmed, to document (risky fix or out of regex scope):**
5. `pro_email` subdomains.
6. `.txt` > 5 MB silent fail-open.
7. Unscanned file formats (RTF/ODF/archives/images; XLSX/PPTX fixed 2026-10-19), image PDF, encrypted PDF, DOCX comments.

**Accepted limits (do not "fix", document as scope):**
8. Encodings (base64/hex/URL), reversal, deliberate splitting, direct `fetch`, iframe/shadow
   DOM, sending via keyboard modifier, default fail-open `fail_mode`.

The guiding principle: the product protects against **inadvertent leaks** and the careless
user, **not** against a determined insider. Fixes should be prioritized for those that close
**accidental leaks** (common copy-paste formats: `+33`, NBSP, IBAN hyphens) — not an
endless race against deliberate encoding.
