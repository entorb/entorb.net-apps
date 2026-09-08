#!/bin/sh
# Regenerate sim-model-ranking.md from deterministic round-robin games.
set -e

cd "$(dirname "$0")/.."
uv run --project python python/gen_model_ranking.py
echo "Wrote sim-model-ranking.md"
