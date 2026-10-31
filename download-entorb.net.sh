#!/bin/bash

set -e

rsync -rtuh --delete --delete-excluded \
  --exclude="__pycache__/" \
  --exclude="assets/" \
  --exclude="docs/*.pdf" \
  --exclude="pix/*/*.jpg" \
  --exclude="matomo/" \
  --exclude="db.php" \
  --exclude="mediawiki-1.43.11/" \
  entorb8@mab.uberspace.de:/var/www/virtual/entorb8/html/ entorb.net/
