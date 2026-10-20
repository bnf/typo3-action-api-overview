# The TYPO3 Action API – overview

An introduction to the TYPO3 Action API for developers and decision makers:
what it is, which problems it solves, how the stack is built, how security
works and what it can be used for. Published with GitHub Pages.

Related epic: [#111053](https://forge.typo3.org/issues/111053) on
forge.typo3.org.

## How it works

All content is stored as JSON in `_data/`, validated against the schemas in
`schemas/`. Jekyll renders it with the templates in `_includes/`, the styles
in `_sass/` and the scripts in `assets/js/`. The patch chain and the issues
are generated from Gerrit and Forge by the scripts in `scripts/`.

`AGENTS.md` describes the structure and the rules for changes in detail, for
people and coding agents alike.

## Getting started

```bash
./serve.sh                    # preview on http://127.0.0.1:4000/
pip install jsonschema        # once, for the checks
scripts/check.sh              # validation + build, run before committing
```

The preview and the build need Ruby with Bundler, or podman/docker.

## Working with Claude Code

- **Locally**: start `claude` in the repository. It reads `CLAUDE.md` and
  `AGENTS.md`. For parallel sessions, use one git worktree per session.
- **In the browser** ([claude.ai/code](https://claude.ai/code)): select this
  repository. A SessionStart hook (`.claude/settings.json`) installs the
  dependencies in cloud sessions. Each session works on its own branch and
  delivers a pull request.
- **Refreshing the patch chain in the cloud** needs `review.typo3.org` and
  `forge.typo3.org` in the cloud environment's allowed domains (custom network
  access). Without them, run `scripts/update-patches.py` and
  `scripts/update-issues.py` locally.

## Handover

Changes go through pull requests against `main`; every merge to `main` is
published. CI validates the data and builds the site for every pull request.

Every pull request from a branch of this repository also gets a public
preview at `https://bnf.github.io/typo3-action-api-overview/pr-preview/pr-<number>/`;
the link is posted as a comment on the pull request and the preview is
removed when it is closed. The workflow `.github/workflows/pages.yml` builds
the site and publishes it to the `gh-pages` branch, which GitHub Pages serves
(Settings › Pages › Deploy from a branch › `gh-pages`).

Readers can comment on any text. They select it on the site and click
"Comment on GitHub". In a preview, a changed line opens in the diff of the
pull request; every other text opens a new issue with a quote and a
permalink. `AGENTS.md` describes how this works.
