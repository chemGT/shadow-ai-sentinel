# Permission Justifications (Chrome Web Store / AMO review)

Reviewers require a single, specific reason per permission. Copy these into the
CWS "Privacy practices" tab and the AMO submission notes.

| Permission | Why it is required |
|------------|--------------------|
| `storage` | Persist the user's local policy (which rule types are enabled, Block vs Redact), Pro entitlement, license key, allowlist, and anonymous local counters. All data stays in `chrome.storage.local` on the user's device. |
| `alarms` | Schedule a low-frequency background alarm to re-verify the Pro license (once/day) so a refunded or cancelled license is eventually downgraded, and to run optional enterprise policy sync when configured. |
| Host: `*://claude.ai/*`, `*://chatgpt.com/*`, `*://gemini.google.com/*`, `*://chat.mistral.ai/*`, `*://chat.deepseek.com/*`, `*://perplexity.ai/*`, `*://www.perplexity.ai/*`, `*://grok.com/*`, `*://copilot.microsoft.com/*` | Inject the content script that reads the prompt being typed/pasted **on these eight AI sites only**, so it can detect and block/redact sensitive data before submission. The extension does not run on any other site. Note: the Grok surface embedded in x.com is deliberately excluded — matching `x.com` would inject the script on all of X/Twitter, far beyond the extension's single purpose. |
| Host: `https://api.lemonsqueezy.com/*` | Verify the Pro license key the user enters, against Lemon Squeezy's public license API. Sends only the license key and the public product ID. No prompt content is ever sent. |
| Optional host: `http://localhost/*` | **Optional, off by default.** Requested only if an enterprise user opts in to sync a managed policy from a self-hosted backend on localhost. Never granted unless the user explicitly enables it. |

## Single-purpose statement (CWS requires one)
> Shadow AI Sentinel has a single purpose: to detect sensitive data (secrets, API keys, and — in the Pro tier — personal data) in the text a user is about to send to a public AI chatbot, and to block or redact it before it leaves the browser.

## Remote code
> The extension does **not** load or execute any remote code. All logic ships inside the package. Network calls are limited to (1) the Lemon Squeezy license verification API and (2) an optional, user-configured enterprise backend.

## Data usage disclosures (CWS "Data practices" checkboxes)
- Does the extension collect personal/sensitive user data? **No** (for the standard free/Pro user; prompt content is processed locally and never transmitted).
- Is data sold to third parties? **No.**
- Is data used for purposes unrelated to the single purpose? **No.**
- Is data used to determine creditworthiness / for lending? **No.**
