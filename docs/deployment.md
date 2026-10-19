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
[roadmap](../ROADMAP.md)). Until then, the `release.yml` workflow is the source of signed-off
builds: each tagged release publishes `shadow-ai-sentinel-<tag>-chromium.zip`,
`shadow-ai-sentinel-<tag>-firefox-unsigned.xpi` and a `SHA256SUMS.txt` (plus a provenance
attestation, since the repository is public) to the
[GitHub Releases page](https://github.com/chemGT/shadow-ai-sentinel/releases). You can also build
locally with `npm run build` (Chromium → `dist/`) and `npm run build:firefox` (→ `dist-firefox/`).

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
domains, fail-open/closed behavior) is separate from the install policies above. Today that policy
lives in `chrome.storage.local` and is set per browser profile from the extension's **options
page** (`chrome://extensions` → Shadow AI Sentinel → *Extension options*), where you can paste or
import a JSON policy. [`docs/policy.example.json`](policy.example.json) is a working example of the
full shape (`version`, `emailDomains`, `fail_mode`, `rules[]`) to start from and adapt.

There is no centrally-pushed policy yet — see the next section for how that's expected to work.

## Managed storage (`chrome.storage.managed`) — proposed design

This section is a **design proposal only** (tracked in issue #14); nothing described here is
implemented. It documents the intended shape before any code is written.

**Goal**: let admins push the same policy JSON described above (`docs/policy.example.json`) via
Chrome/Edge/Firefox's native managed-storage mechanism, instead of requiring a manual paste into
the options page on every machine.

**Mechanism**: declare `"storage": { "managed_schema": "schema.json" }` in `manifest.json` /
`manifest.firefox.json`, where `schema.json` is a JSON Schema matching the policy shape. The
browser validates incoming admin policy against that schema and exposes the result, read-only,
through `chrome.storage.managed.get(...)`. Firefox uses the same API, sourced from its native
manifest / `3rdparty` policy, and also requires a restart to pick up changes.

**Precedence**: managed value overrides local value, **field by field**. A field that is `null` or
absent from managed storage means "no managed policy for this field" — it must fall back to the
local value, never implicitly clear it. There is no partial-object merge beyond that: each field in
`rules[]`, `emailDomains`, `fail_mode`, etc. is resolved independently.

**Failure modes**:
- No `managed_schema` declared, or managed storage empty → unchanged from today: the local policy
  (`sentinel_policy` in `chrome.storage.local`) is authoritative.
- Managed value present but failing the JSON Schema → the browser itself rejects it and managed
  storage stays empty for that key; the extension should surface this visibly in its own console
  rather than fail silently or block the user.

**Zero network**: reading `chrome.storage.managed` triggers no outbound call — the value was
already delivered to the browser by the OS/admin policy. This stays fully compatible with the
project's no-network constraint.

**Open question**: whether `sentinel_allowlist` should also be manageable this way, or stay
local-only. Not decided; flagging it here rather than picking silently.

**Planned tests** (once this is implemented): managed value wins over local value on the same
field; no managed value → behavior unchanged; invalid schema → conservative fallback (local policy
kept, error visible in the console).

## Tell your employees

Deploying this via policy is a technical control, not a substitute for telling people it's there.
Two ready-to-adapt templates: [English](compliance/employee-notice-en.md) ·
[Français](compliance/employee-notice-fr.md). See also [`docs/compliance/README.md`](compliance/README.md)
for how the extension maps to GDPR/NIS2/AI Act obligations.

*Not legal advice — have your DPO / legal team review the deployment in your context.*
