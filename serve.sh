#!/usr/bin/env bash
# Serves the page locally on http://127.0.0.1:4000/ with live reload, see scripts/jekyll.sh
exec "$(dirname "$0")/scripts/jekyll.sh" serve
