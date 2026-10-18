# Privacy Policy — Shadow AI Sentinel

**Last updated: 18 October 2026**

Shadow AI Sentinel is a browser extension that helps you avoid pasting sensitive
data into public AI assistants (Claude, ChatGPT, Gemini, Mistral Le Chat,
DeepSeek, Perplexity, Grok, Microsoft Copilot). This policy explains
exactly what the extension does — and does not do — with your data.

## The short version
- Your prompts are analysed **entirely on your own device**.
- **The extension makes no network requests at all.** Nothing you type leaves your browser.
- We do not sell your data, show ads, or track you across the web.

## What is processed locally (and never transmitted)
When you type or paste text on a supported AI site, the extension scans that text
**in memory, on your device** to detect secrets and personal data. The text is not stored and is not sent to us or to any third party. Only
small, non-sensitive settings are saved in your browser's local storage:
your rule configuration, allowlist, and
anonymous local counters (e.g. "12 secrets blocked").

## Network requests

**None.** The extension never contacts any server: there is no backend, no
analytics and no telemetry.

The only exception is a link you click yourself: "Report false positive" opens a
prefilled GitHub issue form in a new tab (rule type, AI site, the context you chose,
extension version). None of your typed text is included, and nothing is sent unless
you submit the form on GitHub.

## What we never collect
- The content of your prompts or the AI's responses.
- The content of your attachments.
- Your browsing history, cookies, or activity on non-AI sites.
- Any personally identifying analytics or advertising identifiers.

## Data sharing
We do not sell, rent, or share your data with third parties. No external service
is involved.

## Your control
You can disable any rule or uninstall the extension at any
time. Uninstalling removes all locally stored settings.

## Contact
Questions about this policy: open an issue at
https://github.com/chemGT/shadow-ai-sentinel/issues

The source code is public (Apache-2.0): every claim above can be verified in it.

---
*Shadow AI Sentinel is not affiliated with Anthropic, OpenAI, Google, Mistral AI,
DeepSeek, Perplexity, xAI, or Microsoft.*
