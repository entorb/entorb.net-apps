#!/bin/sh

cd "$(dirname "$0")/../go"
out=$(mktemp)
trap 'rm -f "$out"' EXIT INT TERM

go run honnef.co/go/tools/cmd/staticcheck@latest ./... >"$out" 2>&1
status=$?

if [ $status -ne 0 ]; then
  head -n 100 "$out"
else
  echo OK
fi
exit $status
