#!/usr/bin/env bash
# Everything CI checks: data validation and a full Jekyll build. Run before every commit.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/validate.py
scripts/jekyll.sh build
