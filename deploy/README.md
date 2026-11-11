# Deployment kit

Scripts and templates to roll out Shadow AI Sentinel on a fleet and configure it centrally.
Background and policy reference: [`docs/deployment.md`](../docs/deployment.md).

**How it works.** The browser installs and updates the extension itself, from its store. Nothing
here installs a binary or a service: each artifact only writes the browser policy that says
"force-install this extension" and, optionally, the extension's managed configuration.
The extension makes no network request.

## Status of this kit

| Artifact | Checked how |
|----------|-------------|
| `linux/shadow-ai-sentinel-policy.sh` | Automated tests run it in a temporary root (`src/test/deploy-artifacts.test.ts`): install, idempotence, status, uninstall, refusals |
| `policy/*.json`, `firefox/policies.json` | Validated in CI by the same parser the extension uses |
| `macos/chrome-force-install.mobileconfig` | Well-formed XML only. **Not tested on a Mac or through an MDM** |
| `windows/*.ps1` | Reviewed by hand. **Not executed and not parsed by PowerShell**: no Windows host was available. Test on one machine before a fleet rollout |
| Intune / GPO steps below | Written from the browsers' documented policy mechanisms. **Not tested on a real tenant or domain** |

## Prerequisite: a store listing

Force-install needs a stable extension ID and an update channel, which only a store listing (or a
self-hosted signed package) provides. Until the Chrome Web Store and Firefox Add-ons listings are
live (checklist: [`store-assets/README.md`](../store-assets/README.md)), none of the fleet
procedures below can work. For a single machine without a listing, see the
[README](../README.md#install) (developer-mode load, no auto-update).

You need:

| Value | Where it comes from |
|-------|---------------------|
| `<extension-id>` | 32 letters at the end of the Chrome Web Store listing URL. Edge can install the same listing |
| AMO slug | Last path segment of the Firefox Add-ons listing URL |
| Managed configuration | Start from [`policy/managed-policy.recommended.json`](policy/managed-policy.recommended.json) (strict) or [`policy/managed-policy.minimal.json`](policy/managed-policy.minimal.json); replace `example.com` with your email domain(s) or drop the `pro_email` rule |

## Quickstart (one machine, under 5 minutes)

Windows, elevated PowerShell:

```powershell
cd deploy\windows
.\ShadowAISentinel.ps1 -Action Install -ExtensionId <extension-id> -PolicyFile ..\policy\managed-policy.recommended.json
```

Linux:

```bash
sudo deploy/linux/shadow-ai-sentinel-policy.sh install --id <extension-id> --policy deploy/policy/managed-policy.recommended.json
```

Then, on any OS:

1. Restart the browser, open `chrome://policy` (or `edge://policy`) and click **Reload policies**.
2. Open the extension's options page and read the **Diagnostic** section: every line should be `OK`.

## Commands

| Goal | Windows | Linux |
|------|---------|-------|
| Install / update (idempotent) | `.\ShadowAISentinel.ps1 -Action Install -ExtensionId <id> [-PolicyFile f.json] [-Browser Chrome,Edge]` | `sudo ./shadow-ai-sentinel-policy.sh install --id <id> [--policy f.json] [--browser chrome,chromium,edge]` |
| Check (exit 0 = in place) | `.\ShadowAISentinel.ps1 -Action Status -ExtensionId <id>` | `./shadow-ai-sentinel-policy.sh status --id <id>` |
| Uninstall | `.\ShadowAISentinel.ps1 -Action Uninstall -ExtensionId <id>` | `sudo ./shadow-ai-sentinel-policy.sh uninstall` |
| Roll back to the previous policy | `-Action Uninstall`, then `reg import "%ProgramData%\ShadowAISentinel\backup-<timestamp>-<browser>.reg"` | Restore `shadow-ai-sentinel.json.bak` in the policy directory |

Exit codes: `0` done / in place, `1` a check failed (the output says which and how to fix it),
`2` bad arguments or missing rights.

Removing the policy makes the browser uninstall a force-installed extension at its next policy
refresh.

## Windows: Intune

Two routes. Use A for force-install alone; use B when you also push the managed configuration.

**A. Settings catalog (no package).**
*Devices → Configuration → Create → Windows 10 and later → Settings catalog*, then:

| Browser | Setting | Value |
|---------|---------|-------|
| Edge | Microsoft Edge → Extensions → *Control which extensions are installed silently* | `<extension-id>;https://clients2.google.com/service/update2/crx` |
| Chrome | Google Chrome → Extensions → *Configure the list of force-installed apps and extensions* (requires the Chrome ADMX ingested in Intune) | same |

**B. Win32 app (force-install + managed configuration).**

1. Put `ShadowAISentinel.ps1`, `Detect-ShadowAISentinel.ps1` and your policy JSON in one folder.
2. Edit the two variables at the top of `Detect-ShadowAISentinel.ps1`.
3. Package: `IntuneWinAppUtil.exe -c <folder> -s ShadowAISentinel.ps1 -o <output-folder>`.
4. Create the app (*Apps → Windows → Add → Windows app (Win32)*):

| Field | Value |
|-------|-------|
| Install command | `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ShadowAISentinel.ps1 -Action Install -ExtensionId <extension-id> -PolicyFile managed-policy.recommended.json` |
| Uninstall command | `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ShadowAISentinel.ps1 -Action Uninstall -ExtensionId <extension-id>` |
| Install behavior | System |
| Detection rules | Custom script: `Detect-ShadowAISentinel.ps1` |
| Return codes | `0` success, `1` and `2` failed |

To change the configuration later, upload a new package version: `Install` replaces the managed
values and leaves the force-install entry in place.

## Windows: Group Policy

| Need | How |
|------|-----|
| Force-install | Import the official Chrome and Edge ADMX templates, then *Computer Configuration → Administrative Templates → Google Chrome (or Microsoft Edge) → Extensions → Configure the list of force-installed extensions*: `<extension-id>;https://clients2.google.com/service/update2/crx` |
| Managed configuration | No ADMX exists for a third-party extension's settings. Either run `ShadowAISentinel.ps1 -Action Install …` as a **computer startup script**, or create **Group Policy Preferences → Registry** items under `HKLM\SOFTWARE\Policies\Google\Chrome\3rdparty\extensions\<extension-id>\policy` (Edge: `…\Microsoft\Edge\…`) |

Registry value types for the managed configuration:

| Setting | Type | Example |
|---------|------|---------|
| `fail_mode` | `REG_SZ` | `closed` |
| `lock_settings` | `REG_DWORD` | `1` |
| `rules`, `emailDomains`, `allowlist` | `REG_SZ` holding JSON | `["example.com"]` |

## macOS

[`macos/chrome-force-install.mobileconfig`](macos/chrome-force-install.mobileconfig): replace the
extension ID, generate two UUIDs, upload to your MDM. Removing the profile removes the policy.
The managed configuration goes in a payload for the preference domain
`com.google.Chrome.extensions.<extension-id>` (Edge: `com.microsoft.Edge.extensions.<extension-id>`).

## Firefox (all OS)

Copy [`firefox/policies.json`](firefox/policies.json), replace the AMO slug, and place it at the
location for your OS (table in [`docs/deployment.md`](../docs/deployment.md#firefox--policiesjson--extensionsettings)).
Firefox reads it at startup only. Check in `about:policies`.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Extension never appears | Wrong ID or update URL; device not domain-joined or MDM-managed (Chrome/Edge ignore force-install otherwise) | `chrome://policy`: check `ExtensionInstallForcelist` shows no error; verify device management state |
| Policy missing from `chrome://policy` | Policy not refreshed, or written for the other browser | **Reload policies**; run the `Status` / `status` command |
| Linux: `already sets ExtensionInstallForcelist` | Another JSON file in `policies/managed` owns that list; Chrome does not merge lists across files | Add the entry to that file, then re-run `status` |
| Options page: red banner "Policy de l'organisation partiellement ignorée" | A managed value is invalid (wrong type, unknown rule, bad `fail_mode`) | Fix the value named in the banner, redeploy, reload policies |
| Diagnostic: "Access to protected sites" (FR: "Accès aux sites protégés") fails | Site access not granted (Firefox lets users revoke it) | Grant access in the extension's permissions page |
| Diagnostic: "Last visited site" (FR: "Dernier site visité") fails; banner "Protection inactive" on a site | The site changed its page structure | Update the extension; if already current, open a `site-broken` issue |
| All sends blocked on one site | `fail_mode: closed` and the site adapter is broken | Update the extension, or temporarily deploy `fail_mode: warn` |
| Users can still change rules | `lock_settings` absent | Add `"lock_settings": true` to the managed configuration |
| Settings changed but pages behave as before | Firefox reads `policies.json` at startup only | Restart Firefox |
| Windows script: "Administrator rights are required" | Not elevated | Elevated PowerShell, or deploy as SYSTEM |
