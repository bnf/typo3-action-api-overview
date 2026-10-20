#!/usr/bin/env bash
#
# Keeps the review pull request (review-head → review-base) in step with main.
# review-base holds the repository without the content files in _data/ and
# without workflows;
# review-head holds the same tree plus the content files of HEAD. The diff of
# the pull request therefore shows every line of every content file as new,
# and readers can comment on any line of the live site, see
# assets/js/components/github-comments.js.
#
# Usage: scripts/update-review-branch.sh           (update review-head from HEAD)
#        scripts/update-review-branch.sh --init    (create both branches once)

set -euo pipefail
cd "$(dirname "$0")/.."

BASE=review-base
HEAD_BRANCH=review-head
# Generated files are not content to comment on
GENERATED='^_data/(patches|issues)\.json$'

# A separate index; git refuses an empty file as index, so it must not exist yet
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
export GIT_INDEX_FILE=$tmp/index

# Adds the content files of HEAD to the index
add_content() {
    git ls-tree HEAD _data/ | while read -r mode type object path; do
        if [[ ! $path =~ $GENERATED ]]; then
            git update-index --add --cacheinfo "$mode,$object,$path"
        fi
    done
}

if [ "${1:-}" = "--init" ]; then
    git read-tree HEAD
    git ls-tree --name-only HEAD _data/ | grep -Ev "$GENERATED" | xargs git update-index --force-remove
    # Without workflows, no checks or previews run for the review pull request
    git ls-files .github | xargs git update-index --force-remove
    base=$(git commit-tree "$(git write-tree)" -m "Base of the review pull request: the repository without content files")
    add_content
    head=$(git commit-tree "$(git write-tree)" -p "$base" -m "Content of $(git rev-parse --short HEAD)")
    git push origin "$base:refs/heads/$BASE" "$head:refs/heads/$HEAD_BRANCH"
    exit 0
fi

git fetch -q --depth=1 origin "+refs/heads/$BASE:refs/remotes/origin/$BASE" "+refs/heads/$HEAD_BRANCH:refs/remotes/origin/$HEAD_BRANCH"
git read-tree "origin/$BASE"
add_content
tree=$(git write-tree)
if [ "$tree" = "$(git rev-parse "origin/$HEAD_BRANCH^{tree}")" ]; then
    echo "$HEAD_BRANCH is up to date"
    exit 0
fi
commit=$(git commit-tree "$tree" -p "origin/$HEAD_BRANCH" -m "Content of $(git rev-parse --short HEAD)")
git push origin "$commit:refs/heads/$HEAD_BRANCH"
