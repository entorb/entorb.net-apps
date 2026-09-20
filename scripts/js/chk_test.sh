#!/bin/sh
# tests for the node project in $1 (path relative to the repo root)

cd "$(dirname "$0")/../.." || exit 1
cd "${1:?usage: $0 <dir>}" || exit 1

# apps without vitest have no tests to run
if ! grep -q '"vitest"' package.json; then
  echo "OK (no vitest)"
  exit 0
fi

out=$(mktemp)
trap 'rm -f "$out"' EXIT INT TERM

pnpm exec vitest --watch=false --silent=passed-only --reporter=minimal >"$out" 2>&1
status=$?

if [ $status -ne 0 ]; then
  head -n 100 "$out"
else
  echo OK
fi
exit $status
