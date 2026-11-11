# Test values for screenshots (all FAKE — safe to paste publicly)

None of these are real credentials or real personal data. They only match the
detection regexes so you can trigger each rule for the store screenshots.

## Free tier (no config needed)
| Rule | Paste this into the AI prompt box |
|------|-----------------------------------|
| `api_key` (AWS) | `AKIAIOSFODNN7EXAMPLE` |
| `api_key` (OpenAI proj) | `sk-proj-abcdEFGH1234ijklMNOP5678` |
| `api_key` (Slack) | `xoxb-1234567890-abcdEFGHijklMNOP` |
| `generic_secret` (Bearer) | `Bearer abcdefghijklmnop1234567890` |
| `generic_secret` (JWT) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U` |

**Suggested Block-modal prompt (screenshot #1):**
> `Please debug this: my AWS key AKIAIOSFODNN7EXAMPLE returns AccessDenied`

## PII rules (no config needed)
| Rule | Paste this |
|------|-----------|
| `iban` | `DE89370400440532013000` or spaced `FR76 3000 6000 0112 3456 7890 189` (both checksum-valid, both detected) |
| `internal_ip` | `192.168.1.42` (also try `10.0.0.5`, `172.16.4.9`) |
| `phone` | `+33 6 12 34 56 78` |

## PII rules (requires config in Options → custom)
| Rule | Setup |
|------|-------|
| `pro_email` | Add a domain (e.g. `acme.com`) in Options, then paste `john.doe@acme.com` |

---

## Capture recipe (target: 1280×800)

Take raw screenshots at their native size (no upscaling), name them in kebab-case, drop them in
`store-assets/screenshots/raw/`, add a scene in `scripts/compose-screenshots.mjs`, then run
`npm i --no-save sharp && node scripts/compose-screenshots.mjs` → `store-assets/screenshots/NN-*.png`.
Set English as the browser's first language so the dialog and the options page are in English.

Tips for clean shots:
- Use a fresh chat with no personal history visible; no account name, email or open tabs.
- Use only the fake values above.
- Keep the same theme (light or dark) across the set.
