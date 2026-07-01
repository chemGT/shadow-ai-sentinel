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

## Pro tier (no config needed once a Pro license is active)
| Rule | Paste this |
|------|-----------|
| `iban` | `DE89 3704 0044 0532 0130 00` (checksum-valid test IBAN) |
| `internal_ip` | `192.168.1.42` (also try `10.0.0.5`, `172.16.4.9`) |
| `phone` | `+33 6 12 34 56 78` |

## Pro tier (requires config in Options → custom)
| Rule | Setup |
|------|-------|
| `pro_email` | Add a domain (e.g. `acme.com`) in Options, then paste `john.doe@acme.com` |

---

## Capture recipe (target: 1280×800)

Take raw screenshots at any size, drop them in `store-assets/screenshots/raw/`,
then run `node scripts/resize-screenshots.mjs` to normalise them to 1280×800.
Name the raw files by their scene number so the order is predictable:

1. `01-block-modal.png` — on chatgpt.com, paste the Block-modal prompt above → capture the block warning.
2. `02-redact.png` — on claude.ai, paste a secret and let it be masked inline.
3. `03-popup-free.png` — click the extension icon: Free badge, blocked/redacted counters, "Upgrade to Pro" CTA.
4. `04-popup-pro.png` — with a Pro license active: license activated state.
5. `05-options-allowlist.png` — Options page: Pro license section + allowlist textarea.

Tips for clean shots:
- Use a fresh chat with no personal history visible.
- Zoom the browser to ~110–125% so UI text is crisp when downscaled.
- Light or dark, but keep it consistent across the five shots.
