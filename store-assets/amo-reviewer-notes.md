# Notes for reviewers (AMO "Notes to reviewer" / CWS submission)

Paste the relevant parts into the AMO submission form ("Notes to Reviewer") and upload
`shadow-ai-sentinel-vX.Y.Z-source.zip` as the source code. Both files come from the same
GitHub Release (or from `npm run package` locally).

## Why source code is attached

The shipped JavaScript is bundled and minified by Vite. The source archive is `git archive` of the
tagged commit; the build is deterministic from the lockfile.

## Build instructions

Tested environment: Ubuntu 24.04 (any Linux/macOS works), **Node.js 22 LTS** (22.22), **npm 10**
(10.9), `zip`.

```bash
unzip shadow-ai-sentinel-vX.Y.Z-source.zip
cd shadow-ai-sentinel-vX.Y.Z
npm ci                     # exact versions from package-lock.json
npm run build:firefox      # typecheck + Vite build → dist-firefox/
```

`dist-firefox/` is the content of the uploaded `.xpi`. Optional: `npm run package` rebuilds both
targets and writes the archives to `release/`.

## Third-party libraries (bundled, unmodified, from npm)

| Package | Use | Bundled as |
|---------|-----|------------|
| `react`, `react-dom` | Alert UI | `assets/*.js` |
| `pdfjs-dist` (legacy build) | Extract text from PDF attachments locally | `assets/pdf-*.js`, `assets/pdf.worker.min-*.mjs` |
| `mammoth` (+ `underscore`, `jszip`) | Extract text from DOCX attachments locally | `assets/lib-*.js` |

## Linter warnings (expected)

- **`DANGEROUS_EVAL` (Function constructor)** in `lib-*.js`, `pdf-*.js`, `pdf.worker.min-*.mjs`:
  third-party code (underscore's global-object fallback, a `setImmediate` polyfill, pdf.js
  feature detection). The extension never builds code from strings; the MV3 extension CSP forbids
  `eval`/`Function` anyway, so these paths either are not reached or fail closed.
- **`UNSAFE_VAR_ASSIGNMENT` (dynamic `import()`)** in pdf.js: loads its own bundled worker via
  `runtime.getURL()`. No remote code.
- **`UNSAFE_VAR_ASSIGNMENT` (`innerHTML`)**: options page assigns one of two static SVG icon
  constants and clears a table (`innerHTML = ''`); React's DOM layer. No user or page content is
  ever written as HTML.

## Data and network

- **No network request at all** — no backend, telemetry, analytics or remote code.
  `data_collection_permissions.required = ["none"]`.
- Prompt text is scanned in memory on the 8 listed AI sites and never stored or transmitted.
  `storage` holds only the local policy, allowlist and counters.
- The only outbound action is a user-initiated click that opens a prefilled GitHub issue
  (false-positive report) in a new tab; it never includes the typed text.

## How to test

1. Open one of the supported sites (e.g. https://chatgpt.com, https://claude.ai — an account is
   needed by the sites themselves, not by the extension).
2. Paste `Please debug this: my AWS key AKIAIOSFODNN7EXAMPLE returns AccessDenied` and press
   Enter → a block dialog appears and nothing is sent.
3. Paste the IBAN `FR76 3000 6000 0112 3456 7890 189` → detected as personal data.
4. Toolbar icon → popup with local counters; "Advanced settings" → options page (rules, allowlist).

More fake values: [`test-values.md`](test-values.md). All values are public test fixtures.
