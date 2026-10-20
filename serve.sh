#!/usr/bin/env bash
#
# Serves the page locally on http://127.0.0.1:4000 with the same Jekyll
# setup as GitHub Pages and reloads the browser when a file changes.
#
# Requires podman or docker. Set CONTAINER_ENGINE to choose one and PORT
# to use another port.

set -euo pipefail
cd "$(dirname "$0")"

ENGINE="${CONTAINER_ENGINE:-$(command -v podman || command -v docker || true)}"
if [ -z "$ENGINE" ]; then
    echo "Neither podman nor docker found." >&2
    exit 1
fi
PORT="${PORT:-4000}"
TTY_ARGS=()
if [ -t 0 ]; then
    TTY_ARGS=(-it)
fi

echo "Starting on http://127.0.0.1:${PORT}/ (first start installs gems, this takes a minute)"
exec "$ENGINE" run --rm "${TTY_ARGS[@]}" \
    -v "$PWD":/site:Z \
    -v action-api-overview-bundle:/usr/local/bundle \
    -w /site \
    -p "${PORT}:4000" \
    -p 35729:35729 \
    docker.io/library/ruby:3.3 \
    bash -c 'bundle install --quiet && bundle exec jekyll serve --host 0.0.0.0 --livereload --force_polling'
