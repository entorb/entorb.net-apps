#!/bin/sh
# Usage: deploy.sh [app ...]   (no args: all apps)

DIR=$(cd "$(dirname "$0")" && pwd) || exit 1
cd "$DIR/.." || exit 1
# shellcheck source-path=SCRIPTDIR source=apps.sh
. "$DIR/apps.sh"

# exit upon error
set -e

if [ $# -gt 0 ]; then
  apps="$*"
  "$DIR/run_checks.sh" "$@"
else
  apps="$APPS"
  "$DIR/run_checks.sh"
fi

for app in $apps; do
  echo ""
  echo "# $app"
  cd "$(js_dir "$app")"
  pnpm run build
  rsync -rhv --delete --no-perms dist/* "entorb@entorb.net:html/$app/"
  cd "$DIR/.."
done

echo "deploy DONE"
