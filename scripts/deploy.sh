#!/bin/sh
set -e
cd "$(dirname "$0")/.."
DIR=$(pwd)/scripts

# Usage: deploy.sh [app ...]   (no args: all apps)

# shellcheck source-path=SCRIPTDIR source=apps.sh
. "$DIR/apps.sh"

if [ $# -gt 0 ]; then
  apps="$*"
  "$DIR/run_checks.sh" "$@"
else
  apps="$APPS"
  "$DIR/run_checks.sh"
fi
"$DIR/run_spelling.sh"

for app in $apps; do
  echo ""
  echo "# $app"
  cd "$(js_dir "$app")"
  # apps without node project deploy their files as-is
  src=./
  if [ -f package.json ]; then
    pnpm run build
    src=dist/
  fi
  # trailing slash instead of glob, so dotfiles like .htaccess are copied
  rsync -rhv --delete --no-perms "$src" "entorb@entorb.net:html/$app/"
  cd "$DIR/.."
done

echo "deploy DONE"
