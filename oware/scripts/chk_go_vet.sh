#!/bin/sh

cd "$(dirname "$0")/../go"
out=$(mktemp)
trap 'rm -f "$out"' EXIT INT TERM

{
  gofmt -l .
  go vet ./...
  go build ./...
} >"$out" 2>&1
status=$?

if [ $status -eq 0 ]; then
  # a non-empty gofmt -l listing means unformatted files
  if [ -s "$out" ]; then
    echo "files need gofmt:"
    cat "$out"
    exit 1
  fi
  echo OK
else
  head -n 100 "$out"
fi
exit $status
