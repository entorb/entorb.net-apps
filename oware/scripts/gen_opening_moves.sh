#!/bin/sh
# Regenerate sim-opening-moves.md from both go simulate opening rankings.
set -e

cd "$(dirname "$0")/../go"
go run ./simulate -seed 42 -openings -B=random -openings-md
go run ./simulate -seed 42 -openings -B=greedy -openings-md
echo "Wrote sim-opening-moves.md"
