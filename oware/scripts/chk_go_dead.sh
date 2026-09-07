#!/bin/sh

cd "$(dirname "$0")/../go"
out=$(mktemp)
trap 'rm -f "$out"' EXIT INT TERM

go run golang.org/x/tools/cmd/deadcode@latest ./... >"$out" 2>&1
status=$?

if [ $status -eq 0 ] && [ ! -s "$out" ]; then
  echo OK
  exit 0
fi
head -n 100 "$out"
exit 1
