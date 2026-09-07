#!/bin/sh

cd "$(dirname "$0")/../python"
out=$(mktemp)
trap 'rm -f "$out"' EXIT INT TERM

uvx vulture >"$out" 2>&1
status=$?

if [ $status -ne 0 ]; then
  head -n 100 "$out"
else
  echo OK
fi
exit $status
