#!/bin/sh

cd "$(dirname "$0")/.."
out=$(mktemp)
trap 'rm -f "$out"' EXIT INT TERM

# check = format + lint
pnpm dlx biome check --reporter=concise . >>"$out" 2>&1
status=$?

if [ $status -ne 0 ]; then
  echo "Issues remaining, you can try:\npnpm dlx biome check --write --unsafe ."
  head -n 100 "$out"
else
  echo OK
fi
exit $status
