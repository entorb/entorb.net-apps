#!/bin/sh

cd "$(dirname "$0")/../web"
out=$(mktemp)
trap 'rm -f "$out"' EXIT INT TERM

# check = format + lint
pnpm dlx @biomejs/biome@2.5.12 check --write --reporter=concise . >>"$out" 2>&1
status=$?

if [ $status -ne 0 ]; then
  echo "Issues remaining, you can try:\npnpm dlx @biomejs/biome@2.5.12 check --write --unsafe ."
  head -n 100 "$out"
else
  echo OK
fi
exit $status
