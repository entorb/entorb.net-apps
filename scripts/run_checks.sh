#!/bin/sh
# Usage: run_checks.sh [app ...]
# no args: repo-wide checks + every app; with args: only those apps

DIR=$(cd "$(dirname "$0")" && pwd) || exit 1
cd "$DIR/.." || exit 1
# shellcheck source-path=SCRIPTDIR source=apps.sh
. "$DIR/apps.sh"

failures=0
failed_list=""

run() {
  name=$1
  shift
  echo ""
  echo "## $name"
  if ! "$@"; then
    failures=$((failures + 1))
    failed_list="$failed_list $name"
  fi
}

if [ $# -gt 0 ]; then
  apps="$*"
else
  apps="$APPS"
  echo "# repo"
  for f in "$DIR"/chk_*.sh; do
    run "$(basename "$f" .sh)" sh "$f"
  done
fi

for app in $apps; do
  echo ""
  echo "# $app"
  for f in "$DIR"/js/chk_*.sh; do
    run "$(basename "$f" .sh)" sh "$f" "$(js_dir "$app")"
  done
  # app specific checks, e.g. oware go and python
  for f in "$app"/scripts/chk_*.sh; do
    [ -f "$f" ] || continue
    run "$(basename "$f" .sh)" sh "$f"
  done
done

echo ""
if [ "$failures" -eq 0 ]; then
  echo "All checks passed."
else
  echo "$failures checks failed:$failed_list"
  exit 1
fi
