#!/usr/bin/env bash
# SessionStart hook (.claude/settings.json): installs dependencies in Claude Code cloud sessions only.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
    exit 0
fi
cd "$CLAUDE_PROJECT_DIR" || exit 1

python3 -c 'import jsonschema' 2>/dev/null || pip install --quiet jsonschema

hashes=vendor/.session-start.sha256
if ! sha256sum --check --status "$hashes" 2>/dev/null; then
    rm -f "$hashes"
    if BUNDLE_PATH=vendor/bundle bundle install --quiet; then
        sha256sum Gemfile scripts/session-start.sh > "$hashes" || rm -f "$hashes"
    fi
fi
exit 0
