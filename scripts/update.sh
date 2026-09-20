#!/bin/sh

DIR=$(cd "$(dirname "$0")" && pwd) || exit 1
cd "$DIR/.." || exit 1
# shellcheck source-path=SCRIPTDIR source=apps.sh
. "$DIR/apps.sh"

# exit upon error
set -e

echo "## Node and PNPM versions"
# use the versions provided by the system, never install them here
NODE_VER=$(node --version | sed 's/v//')
# query outside of the repo, inside pnpm reports the version pinned in package.json
PNPM_VER=$(cd / && pnpm --version)

for app in $APPS; do
  echo ""
  echo "# $app"
  cd "$(js_dir "$app")"

  node -e "
    const pkg = JSON.parse(require('fs').readFileSync('package.json','utf8'));
    pkg.packageManager = 'pnpm@$PNPM_VER';
    pkg.engines ??= {};
    pkg.engines.node = '>=$NODE_VER';
    pkg.engines.pnpm = '>=$PNPM_VER';
    require('fs').writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  "

  echo "## delete old node_modules and lock"
  rm -rf node_modules
  rm -f pnpm-lock.yaml

  echo "## update node packages"
  pnpm up --latest
  cd "$DIR/.."

  # app specific updates, e.g. oware python and go
  if [ -x "$app/scripts/update.sh" ]; then
    "$app/scripts/update.sh"
  fi
done

echo ""
echo "# repo"
echo "## Prek autoupdate"
prek autoupdate

echo "## run_checks.sh"
"$DIR/run_checks.sh"

echo "## Git"
# build the file lists from the app list, globs would reach into node_modules
LOCKS="oware/python/uv.lock"
PKGS=".pre-commit-config.yaml biome.json cspell-words.txt oware/python/pyproject.toml oware/go/go.mod"
if [ -f oware/go/go.sum ]; then LOCKS="$LOCKS oware/go/go.sum"; fi
for app in $APPS; do
  dir=$(js_dir "$app")
  LOCKS="$LOCKS $dir/pnpm-lock.yaml"
  PKGS="$PKGS $dir/package.json $app/cspell-words.txt"
  if [ -f "$dir/pnpm-workspace.yaml" ]; then PKGS="$PKGS $dir/pnpm-workspace.yaml"; fi
done

# shellcheck disable=SC2086 # word splitting of the file lists is intended
git add -- $LOCKS $PKGS
# shellcheck disable=SC2086
git diff --staged --quiet -- $LOCKS || git commit -m "chore(deps): Lock" -- $LOCKS
# shellcheck disable=SC2086
git diff --staged --quiet -- $PKGS || git commit -m "chore(deps): Package update" -- $PKGS
git push

echo "update DONE, not yet deployed"
