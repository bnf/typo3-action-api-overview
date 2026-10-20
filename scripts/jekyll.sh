#!/usr/bin/env bash
#
# Runs Jekyll with the github-pages gem, the same setup GitHub Pages uses.
# Uses a local Ruby/Bundler if available (e.g. in Claude Code cloud sessions),
# otherwise a ruby:3.3 container via podman or docker.
#
# Usage: scripts/jekyll.sh build
#        scripts/jekyll.sh serve      (http://127.0.0.1:4000/, live reload)
# Set CONTAINER_ENGINE=podman|docker to force a container, PORT and
# LIVERELOAD_PORT to change the ports.

set -euo pipefail
cd "$(dirname "$0")/.."

COMMAND="${1:-build}"
PORT="${PORT:-4000}"
LIVERELOAD_PORT="${LIVERELOAD_PORT:-35729}"
case "$COMMAND" in
    build) ARGS=(build) ;;
    serve) ARGS=(serve --host 0.0.0.0 --port 4000 --livereload --livereload-port "$LIVERELOAD_PORT" --force_polling) ;;
    *) echo "Usage: $0 build|serve" >&2; exit 1 ;;
esac

if [ -z "${CONTAINER_ENGINE:-}" ] && command -v bundle >/dev/null 2>&1; then
    export BUNDLE_PATH="${BUNDLE_PATH:-vendor/bundle}"
    bundle install --quiet
    if [ "$COMMAND" = serve ]; then
        ARGS=(serve --host 127.0.0.1 --port "$PORT" --livereload --livereload-port "$LIVERELOAD_PORT")
    fi
    exec bundle exec jekyll "${ARGS[@]}"
fi

ENGINE="${CONTAINER_ENGINE:-$(command -v podman || command -v docker || true)}"
if [ -z "$ENGINE" ]; then
    echo "Neither Ruby/Bundler nor podman/docker found." >&2
    exit 1
fi
TTY_ARGS=()
PORT_ARGS=()
if [ -t 0 ]; then
    TTY_ARGS=(-it)
fi
if [ "$COMMAND" = serve ]; then
    PORT_ARGS=(-p "${PORT}:4000" -p "${LIVERELOAD_PORT}:${LIVERELOAD_PORT}")
    echo "Starting on http://127.0.0.1:${PORT}/ (the first start installs gems, this takes a minute)"
fi
exec "$ENGINE" run --rm "${TTY_ARGS[@]}" "${PORT_ARGS[@]}" \
    -v "$PWD":/site:Z \
    -v action-api-overview-bundle:/usr/local/bundle \
    -w /site \
    docker.io/library/ruby:3.3 \
    bash -c "bundle install --quiet && bundle exec jekyll ${ARGS[*]}"
