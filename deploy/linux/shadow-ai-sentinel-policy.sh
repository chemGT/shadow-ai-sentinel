#!/bin/sh
# Install, remove or check the Shadow AI Sentinel browser-extension policy on Linux
# (Chrome, Chromium, Edge), machine-wide. POSIX sh, no dependency (no jq, no python).
#
# The browser installs the extension itself from its store: this script only writes the managed
# policy file that tells it to (ExtensionInstallForcelist) and, optionally, the extension's
# managed configuration (3rdparty.extensions.<id>). Nothing is downloaded.
#
# Usage:
#   sudo ./shadow-ai-sentinel-policy.sh install   --id <32-letter-id> [--policy file.json] [--browser chrome,chromium,edge]
#   sudo ./shadow-ai-sentinel-policy.sh uninstall [--browser ...]
#        ./shadow-ai-sentinel-policy.sh status    --id <32-letter-id> [--browser ...]
#
# Idempotent. Rollback: the previous file, if any, is kept next to the new one as
# shadow-ai-sentinel.json.bak; "uninstall" removes both.
#
# Caveat: Chrome does not merge list policies across files in policies/managed. If another file
# there already sets ExtensionInstallForcelist, add this extension to THAT file instead — the
# script refuses to install in that case and tells you which file.
set -eu

FILE_NAME="shadow-ai-sentinel.json"
UPDATE_URL="https://clients2.google.com/service/update2/crx"
ACTION="${1:-}"
[ $# -gt 0 ] && shift
ID=""
POLICY=""
BROWSERS="chrome,chromium,edge"
ROOT=""        # test hook: prefix for all paths (--root /tmp/x)
PROBLEMS=0

die() { echo "[FAIL] $*" >&2; exit 2; }
usage() { sed -n '2,19p' "$0" | sed 's/^# \{0,1\}//'; exit 2; }

while [ $# -gt 0 ]; do
  case "$1" in
    --id) ID="${2:-}"; shift 2 ;;
    --policy) POLICY="${2:-}"; shift 2 ;;
    --browser) BROWSERS="${2:-}"; shift 2 ;;
    --update-url) UPDATE_URL="${2:-}"; shift 2 ;;
    --root) ROOT="${2:-}"; shift 2 ;;
    -h|--help) usage ;;
    *) die "unknown argument: $1 (see --help)" ;;
  esac
done

dir_for() {
  case "$1" in
    chrome) echo "$ROOT/etc/opt/chrome/policies/managed" ;;
    chromium) echo "$ROOT/etc/chromium/policies/managed" ;;
    edge) echo "$ROOT/etc/opt/edge/policies/managed" ;;
    *) die "unknown browser: $1 (chrome, chromium, edge)" ;;
  esac
}

check_id() {
  [ -n "$ID" ] || die "--id is required (32-letter extension ID from the store listing URL)"
  echo "$ID" | grep -Eq '^[a-p]{32}$' || die "invalid extension ID '$ID' (expected 32 letters a-p)"
}

# Minimal sanity check of the managed configuration: a JSON object, known keys only.
check_policy() {
  [ -f "$POLICY" ] || die "policy file not found: $POLICY"
  first=$(tr -d ' \t\r\n' < "$POLICY" | cut -c1)
  [ "$first" = "{" ] || die "policy file must be a JSON object: $POLICY"
  for key in $(grep -o '"[A-Za-z_]*"[[:space:]]*:' "$POLICY" | tr -d '": \t' | sort -u); do
    case "$key" in
      fail_mode|lock_settings|emailDomains|rules|allowlist|type|action|enabled) ;;
      *) die "unknown setting '$key' in $POLICY (allowed: fail_mode, lock_settings, emailDomains, rules, allowlist)" ;;
    esac
  done
}

install_one() {
  dir=$(dir_for "$1")
  target="$dir/$FILE_NAME"
  if [ -d "$dir" ]; then
    for other in "$dir"/*.json; do
      [ -e "$other" ] || continue
      [ "$other" = "$target" ] && continue
      if grep -q '"ExtensionInstallForcelist"' "$other"; then
        echo "[FAIL] $1: $other already sets ExtensionInstallForcelist. Fix: add \"$ID;$UPDATE_URL\" to that file instead (list policies are not merged across files)."
        PROBLEMS=1
        return 0
      fi
    done
  fi
  mkdir -p "$dir"
  [ -f "$target" ] && cp -p "$target" "$target.bak"
  tmp="$target.tmp.$$"
  {
    printf '{\n  "ExtensionInstallForcelist": ["%s;%s"]' "$ID" "$UPDATE_URL"
    if [ -n "$POLICY" ]; then
      printf ',\n  "3rdparty": { "extensions": { "%s": ' "$ID"
      cat "$POLICY"
      printf ' } }'
    fi
    printf '\n}\n'
  } > "$tmp"
  chmod 644 "$tmp"
  mv "$tmp" "$target"
  echo "[OK] $1: wrote $target"
}

uninstall_one() {
  dir=$(dir_for "$1")
  # ${var:?} aborts instead of expanding to a root-level path if a variable is ever empty.
  rm -f "${dir:?}/${FILE_NAME:?}" "${dir:?}/${FILE_NAME:?}.bak"
  echo "[OK] $1: removed $dir/$FILE_NAME"
}

status_one() {
  target="$(dir_for "$1")/$FILE_NAME"
  if [ ! -f "$target" ]; then
    echo "[FAIL] $1: $target missing. Fix: run 'install'."
    PROBLEMS=1
    return 0
  fi
  if grep -q "\"$ID;" "$target"; then
    echo "[OK] $1: force-install entry present in $target"
  else
    echo "[FAIL] $1: $target does not list $ID. Fix: re-run 'install --id $ID'."
    PROBLEMS=1
  fi
  if grep -q '"3rdparty"' "$target"; then
    echo "[OK] $1: managed configuration present"
  else
    echo "[INFO] $1: no managed configuration (users keep local settings)"
  fi
  echo "[INFO] $1: confirm in the browser at chrome://policy or edge://policy, then options page > Diagnostic"
}

case "$ACTION" in
  install)
    check_id
    [ -n "$POLICY" ] && check_policy
    [ -n "$ROOT" ] || [ "$(id -u)" -eq 0 ] || die "root is required. Fix: re-run with sudo."
    for b in $(echo "$BROWSERS" | tr ',' ' '); do install_one "$b"; done
    ;;
  uninstall)
    [ -n "$ROOT" ] || [ "$(id -u)" -eq 0 ] || die "root is required. Fix: re-run with sudo."
    for b in $(echo "$BROWSERS" | tr ',' ' '); do uninstall_one "$b"; done
    ;;
  status)
    check_id
    for b in $(echo "$BROWSERS" | tr ',' ' '); do status_one "$b"; done
    ;;
  *) usage ;;
esac

exit "$PROBLEMS"
