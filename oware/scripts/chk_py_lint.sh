#!/bin/sh

cd "$(dirname "$0")/../python"
out=$(mktemp)
trap 'rm -f "$out"' EXIT INT TERM

uvx ruff format --quiet >"$out" 2>&1 && uvx ruff check --fix --quiet >>"$out" 2>&1
status=$?

if [ $status -ne 0 ]; then
  echo "Issues remaining, you can try:\nuvx ruff check --fix --unsafe-fixes"
  head -n 100 "$out"
else
  echo OK
fi
exit $status
