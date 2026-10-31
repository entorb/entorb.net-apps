#!/bin/sh
# deploy only tools/web, without the entorb.net root files of scripts/deploy.sh
set -e
cd "$(dirname "$0")/../.."
./scripts/run_checks.sh tools
./scripts/run_spelling.sh
# trailing slash instead of glob, so dotfiles like .htaccess are copied
rsync -rhv --delete --no-perms tools/web/ "entorb8@mab.uberspace.de:/var/www/virtual/entorb8/html/tools/"
echo "deploy DONE"
