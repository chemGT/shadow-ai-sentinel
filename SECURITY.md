# Security Policy

Shadow AI Sentinel is a data-loss-prevention tool: a bug in it can mean a secret silently reaching a
public AI service. Security reports are taken seriously and handled privately.

## Reporting a vulnerability

**Do not open a public issue.** Use GitHub's private reporting:
[**Report a vulnerability**](https://github.com/chemGT/shadow-ai-sentinel/security/advisories/new).

Please include the affected version, browser, AI site, and a reproduction that uses **fake**
secrets only (e.g. `AKIAIOSFODNN7EXAMPLE`, IBAN `DE89 3704 0044 0532 0130 00`, card
`4111 1111 1111 1111`).

What to expect (best effort, single maintainer):

| Step | Target |
|------|--------|
| Acknowledgement | 5 days |
| Triage and severity assessment | 14 days |
| Fix or documented decision | depends on severity; critical issues first |

Reporters are credited in the advisory and the changelog unless they ask otherwise.

## In scope

- **Detection bypasses** of an ordinary, non-adversarial format (e.g. a common key layout that
  slips through) — these are leaks by accident and the highest priority.
- Adversarial evasion techniques not yet listed in the
  [threat model](.ai/security/evasion-threat-model.md).
- Interception failures: a supported site sending a message without it being scanned.
- Anything that causes prompt content to be **stored, logged or transmitted** by the extension.
- ReDoS or freezes triggered by crafted input.
- Vulnerabilities in the extension's own pages (popup, options) or permissions.

## Out of scope (documented limits)

These are known and documented, not vulnerabilities — but ideas to address them are welcome as
regular issues:

- encoded secrets (base64, hex, URL-encoding), reversed or deliberately split values;
- file formats that are not scanned (images, XLSX/PPTX, archives, image-only PDFs);
- requests sent outside the page's message box (direct API calls, other applications);
- the card-number-with-dots format (`4111.1111.1111.1111`), excluded on purpose to avoid false
  positives on version numbers.

## Supported versions

Only the latest release receives fixes.
