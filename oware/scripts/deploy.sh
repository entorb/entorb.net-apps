#!/bin/sh

cd "$(dirname "$0")/.."

# exit upon error
set -e

./scripts/run_checks.sh

cd web
pnpm run build
rsync -rhv --delete --no-perms dist/* entorb@entorb.net:html/oware/
cd ..
