# Compliance notes

Shadow AI Sentinel is a **technical safeguard** that supports — but does not replace — an
organization's policy on the use of generative AI.

| Topic | How the extension relates |
|-------|---------------------------|
| **GDPR art. 25 / 32** (privacy by design, security of processing) | Reduces the risk of personal data (IBAN, card, phone, work email, internal IP) being disclosed to third-party AI providers. The extension itself processes data **only locally** and transmits nothing: it does not create a new data flow to the deploying organization. |
| **Employee information** | Even without data collection, tell employees what the tool does. Templates: [EN](employee-notice-en.md) · [FR](employee-notice-fr.md). |
| **NIS2** (cyber hygiene, art. 21) | Helps prevent leakage of credentials and secrets (API keys, tokens, connection strings) through AI chatbots. |
| **EU AI Act** | Not an AI system itself (deterministic rules). Useful as part of an organization's controls around employee use of general-purpose AI services. |

## Limits to state in your policy

Accidental leaks only — see the [threat model](../security/evasion-threat-model.md). Encoded or
deliberately transformed data, unsupported file formats and channels outside the supported web
chats are not covered.

*Not legal advice. Have your DPO / legal team validate the deployment in your context.*
