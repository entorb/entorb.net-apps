#!/bin/bash

set -e

rsync -rtuh --delete --delete-excluded \
  --exclude="__pycache__/" \
  --exclude="assets/" \
  --exclude="db.php" \
  --exclude="docs/*.pdf" \
  --exclude="mediawiki-*/" \
  --exclude="mediawiki-*/LocalSettings.php" \
  --exclude="pix/*/*.jpg" \
  --exclude="stats/matomo/" \
  --exclude="stats/matomo/config/config.ini.php" \
  --exclude="strom/.htaccess" \
  --exclude="wiki" \
  --exclude="wiki/LocalSettings.php" \
  entorb8@mab.uberspace.de:/var/www/virtual/entorb8/html/ entorb.net/
