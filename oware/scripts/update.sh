#!/bin/sh
# python and go updates, the node part and the git commits are done by ../../scripts/update.sh

cd "$(dirname "$0")/.." || exit 1

# exit upon error
set -e

echo "## Python packages"
cd python
uv sync --upgrade
cd ..

echo "## Go"
cd go
go mod edit -go="$(go env GOVERSION | sed 's/^go//')"
go get -u ./...
go mod tidy
