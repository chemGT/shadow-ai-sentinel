# Managed deployment guide

This guide is for IT admins who want to roll out Shadow AI Sentinel across an organization's
Chrome, Edge or Firefox fleet, and to configure its policy centrally. It does not cover personal,
single-browser installs — see the [README](../README.md#install) for that.

Shadow AI Sentinel makes **zero network requests**: every mechanism below is a browser/OS admin
policy, not something the extension calls out to. The extension only ever reads policy values that
the browser already delivered to it locally.

## Chrome / Edge — forced installation

Two policies control this, both documented by Chromium and shared by Edge:

- **[`ExtensionInstallForcelist`](https://chromium.googlesource.com/chromium/src/+/HEAD/components/policy/resources/templates/policy_definitions/Extensions/ExtensionInstallForcelist.yaml)**
  — a list of `"<extension-id>;<update_url>"` entries. `update_url` is optional (defaults to the
  Chrome Web Store) and, if set, must point to an
  [update manifest XML](https://developer.chrome.com/extensions/autoupdate), not the extension
  itself. The policy only drives the *initial* install; subsequent updates follow that update
  manifest.
  ```
  abcdefghijklmnopabcdefghijklmnop;https://intranet.example.org/extensions/update.xml
  ```
- **[`ExtensionSettings`](https://firefox-admin-docs.mozilla.org/reference/policies/extensionsettings/)**
  — a per-extension (or `"*"` default) policy object with `installation_mode` (`allowed`,
  `blocked`, `force_installed`, `normal_installed`), `update_url`, `runtime_blocked_hosts`,
  `blocked_permissions`, etc. `ExtensionSettings` is honored by Chrome, Edge **and** Firefox, so a
  single shape can be adapted across all three (see the Firefox section below for its exact keys).

### Where to set the policy

| Platform | Mechanism |
|----------|-----------|
| Windows | GPO/ADMX, registry key `Software\Policies\Google\Chrome\ExtensionInstallForcelist` (Edge: `Software\Policies\Microsoft\Edge\ExtensionInstallForcelist`), values named `1`, `2`, … — or Intune |
| macOS | A configuration profile delivering `/Library/Managed Preferences/<bundle-id>.plist` |
| Linux (Chrome) | JSON file under `/etc/opt/chrome/policies/managed/` |
| Linux (Edge) | JSON file under `/etc/opt/edge/policies/managed/` |
| Cloud-managed fleets | Google Admin console (Chrome Enterprise) or Microsoft 365 admin center |

### Verifying the policy applied

Open `chrome://policy` (or `edge://policy`) on a managed machine, click **Reload policies**, and
confirm `ExtensionInstallForcelist` / `ExtensionSettings` shows up with no error next to it. If the
extension doesn't appear, check the extension ID and `update_url` first — a bad update manifest is
the most common cause.

## Firefox — `policies.json` / `ExtensionSettings`

Firefox reads policies from a `policies.json` file:

| Platform | Location |
|----------|----------|
| Windows | `distribution\policies.json`, next to `firefox.exe` |
| macOS | `Firefox.app/Contents/Resources/distribution/policies.json` |
| Linux | `/etc/firefox/policies/policies.json` (or `/usr/lib/firefox/distribution/policies.json`) |
| Windows (GPO) | Registry `Software\Policies\Mozilla\Firefox\ExtensionSettings` (as a `REG_MULTI_SZ` JSON blob); other policies live under `Software\Policies\Mozilla\Firefox\` |

`policies.json` is the mechanism Mozilla recommends for managed deployment; see the
[Firefox admin docs](https://firefox-admin-docs.mozilla.org/) for which release channels support
it in your environment — this guide does not assert that beyond what Mozilla documents.

Example `ExtensionSettings` entry, using this project's real Firefox add-on ID
(`browser_specific_settings.gecko.id` in `manifest.firefox.json`):

```json
{
  "policies": {
    "ExtensionSettings": {
      "shadow-ai-sentinel@pilot.sentinel": {
        "installation_mode": "force_installed",
        "install_url": "https://intranet.example.org/shadow/shadow-ai-sentinel.xpi"
      }
    }
  }
}
```

- `install_url` must be an HTTPS URL or a `file:///` path to the `.xpi`. It is **optional** if the
  add-on is published on addons.mozilla.org (Firefox ≥ 153); from Firefox 158 onward, if
  `install_url` is omitted and `update_url` is set, Firefox installs from that update manifest
  instead.
- A `file:///` `install_url` is re-installed by Firefox whenever the file changes, which is a
  convenient way to push updates from a file share.
- Firefox needs to restart to pick up a change to `policies.json` or to the native policy manifest.

## Self-hosted distribution (until store listings are live)

Shadow AI Sentinel isn't on the Chrome Web Store or Firefox Add-ons yet (see the
[roadmap](../ROADMAP.md)). Until then, the `release.yml` workflow is the source of attested
builds (build provenance, not code signing): each tagged release publishes `shadow-ai-sentinel-<tag>-chromium.zip`,
`shadow-ai-sentinel-<tag>-firefox-unsigned.xpi`, `shadow-ai-sentinel-<tag>-source.zip` and a `SHA256SUMS.txt` (plus a provenance
attestation, since the repository is public) to the
[GitHub Releases page](https://github.com/chemGT/shadow-ai-sentinel/releases). You can also build
locally with `npm run package` (same archives in `release/`), or `npm run build` (Chromium → `dist/`)
and `npm run build:firefox` (→ `dist-firefox/`).

Loading `dist/` via `chrome://extensions` → *Load unpacked*, or `dist-firefox/` via
`about:debugging` → *Load Temporary Add-on*, is a **per-machine developer action**, not a managed
deployment — don't rely on it for a fleet rollout.

Two things to get right before you point a force-install policy at a self-hosted build:

- **Firefox**: the add-on ID is already stable (`shadow-ai-sentinel@pilot.sentinel`), but the
  published `.xpi` is **unsigned**. `force_installed` needs a signature from AMO. Either list the
  build on AMO (public or "unlisted") and use its `install_url`/`update_url`, or get it
  AMO-signed and serve the signed `.xpi` yourself. (Disabling signature enforcement via
  `xpinstall.signatures.required=false` only exists on ESR/Developer Edition and is not a
  production option.)
- **Chromium**: `manifest.json` has no `key` field, so a self-hosted CRX build's extension ID is
  **not stable** across rebuilds — it's only stable once the extension goes through the Chrome Web
  Store (public or unlisted listing) or a fixed signing key is added to the manifest. Pin down the
  ID *before* writing an `ExtensionInstallForcelist` entry for it, otherwise the policy will target
  the wrong extension after the next rebuild.

## Configure the policy from the admin side

The *content* of Shadow AI Sentinel's policy (which rules are on, block vs. redact, your email
domains, fail-open/closed behavior, allowlist) is separate from the install policies above. Two
layers exist:

1. **Local policy** — `chrome.storage.local`, set per browser profile from the extension's
   **options page** (`chrome://extensions` → Shadow AI Sentinel → *Extension options*), where a
   JSON policy can be pasted or imported. [`docs/policy.example.json`](policy.example.json) is a
   working example of the full shape (`version`, `emailDomains`, `fail_mode`, `rules[]`).
2. **Managed policy** — pushed by the admin through the browser's native extension-policy
   mechanism (`chrome.storage.managed`). Read-only for the user, and it wins over the local policy.

### Managed policy (`chrome.storage.managed`)

The extension declares a managed schema
([`public/managed_schema.json`](../public/managed_schema.json), shipped as `managed_schema.json`
at the root of the Chromium build). Four keys are supported:

| Key | Type | Effect |
|-----|------|--------|
| `rules` | array of `{ "type", "action", "enabled" }` | Each entry **replaces the local rule of the same type**. Types you don't list stay user-configurable. |
| `emailDomains` | array of strings | Replaces the local list (used by the `pro_email` rule). |
| `fail_mode` | `"open"` \| `"warn"` \| `"closed"` | Replaces the local value. |
| `allowlist` | array of strings | **Added** to the user's own allowlist (union); users can't remove admin entries. |

Rule `type` values: `api_key`, `generic_secret`, `iban`, `card`, `internal_ip`, `pro_email`,
`phone`. `action`: `block` or `redact`.

**Precedence**: managed overrides local **field by field** (and rule by rule). A key that is absent
or `null` means "not managed": the local value applies, it is never implicitly cleared. An invalid
key or rule entry is ignored (with a console warning in the extension) and the local value applies
— the extension never blocks the user because of a malformed admin policy. Chromium also rejects
values that don't match the schema before the extension sees them (visible in `chrome://policy`);
Firefox doesn't validate against the schema, so the extension re-validates every value itself.

**What the user sees**: on the options page, a banner says some settings are managed by the
organization; managed rules carry a *Géré* badge and their switches are disabled; the number of
admin allowlist entries is shown under the allowlist.

**Live updates**: when the admin policy changes (policy refresh, `chrome://policy` → *Reload
policies*), the extension recomputes the effective policy and pushes it to open AI tabs, without a
browser restart (Firefox still needs a restart to re-read `policies.json`).

**Zero network**: reading `chrome.storage.managed` triggers no outbound call — the value was
already delivered to the browser by the OS/admin policy.

#### Example payload

```json
{
  "fail_mode": "closed",
  "emailDomains": ["example.com"],
  "rules": [
    { "type": "api_key", "action": "block", "enabled": true },
    { "type": "generic_secret", "action": "block", "enabled": true },
    { "type": "pro_email", "action": "redact", "enabled": true }
  ],
  "allowlist": ["AKIAIOSFODNN7EXAMPLE"]
}
```

#### Chrome / Edge

Extension policies live under the `3rdparty` → `extensions` → `<extension-id>` node of the browser
policy. Replace `<extension-id>` with the ID pinned in your `ExtensionInstallForcelist` entry.

| Platform | Where |
|----------|-------|
| Linux (Chrome) | `/etc/opt/chrome/policies/managed/shadow-ai-sentinel.json` (Edge: `/etc/opt/edge/policies/managed/`) |
| Windows | Registry `HKLM\Software\Policies\Google\Chrome\3rdparty\extensions\<extension-id>\policy` (Edge: `…\Microsoft\Edge\3rdparty\extensions\<extension-id>\policy`); one value per key, arrays as a JSON string (`REG_SZ`) |
| macOS | Configuration profile for the preference domain `com.google.Chrome.extensions.<extension-id>` (Edge: `com.microsoft.Edge.extensions.<extension-id>`) |
| Google Admin console | *Devices → Chrome → Apps & extensions* → the extension → *Policy for extensions* (paste the JSON payload) |

Linux example (`/etc/opt/chrome/policies/managed/shadow-ai-sentinel.json`):

```json
{
  "3rdparty": {
    "extensions": {
      "<extension-id>": {
        "fail_mode": "closed",
        "rules": [{ "type": "api_key", "action": "block", "enabled": true }]
      }
    }
  }
}
```

Check it in `chrome://policy` (or `edge://policy`): the values appear under the extension's name,
with a validation error next to any value that doesn't match the schema.

#### Firefox

Use the `3rdparty` policy in `policies.json` (same locations as above), keyed by the add-on ID:

```json
{
  "policies": {
    "3rdparty": {
      "Extensions": {
        "shadow-ai-sentinel@pilot.sentinel": {
          "fail_mode": "closed",
          "rules": [{ "type": "api_key", "action": "block", "enabled": true }],
          "allowlist": ["AKIAIOSFODNN7EXAMPLE"]
        }
      }
    }
  }
}
```

Check it in `about:policies`. Firefox reads `policies.json` at startup only.

## Tell your employees

Deploying this via policy is a technical control, not a substitute for telling people it's there.
Two ready-to-adapt templates: [English](compliance/employee-notice-en.md) ·
[Français](compliance/employee-notice-fr.md). See also [`docs/compliance/README.md`](compliance/README.md)
for how the extension maps to GDPR/NIS2/AI Act obligations.

*Not legal advice — have your DPO / legal team review the deployment in your context.*
