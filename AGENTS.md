# Agent guidelines

This repository is the product introduction of the TYPO3 Action API, published
with GitHub Pages. Several agents and people work on it in parallel, locally
and in Claude Code cloud sessions (claude.ai/code). Follow these rules so that
work can be handed over and merged without conflicts.

## Data first

- **All content lives in `_data/*.json`.** Facts, texts, code examples, patch
  numbers, scopes, screenshots: everything a reader can learn from the page.
  Never write content directly into HTML, SCSS or JavaScript. Templates only
  decide how data is presented.
- Every data file has a JSON Schema in `schemas/<name>.schema.json`. When you
  add a field, extend the schema in the same change.
- Text fields are Markdown (inline code with backticks, `**bold**`). Do not put
  HTML into data.
- Code examples are objects `{"language": …, "code": …}` and are highlighted
  by Rouge at build time.
- The data is also meant to be read by agents as the central source of truth.
  To answer questions about the Action API or the patch chain, read `_data/`
  instead of the rendered page.

### Generated data

`_data/patches.json` and `_data/issues.json` are generated. Do not edit them
by hand:

```bash
python3 scripts/update-patches.py   # patch chain from review.typo3.org
python3 scripts/update-issues.py    # issues from forge.typo3.org
```

The tip of the chain is stored in `patches.json` (`source.tip`); pass a new
change number to follow another tip. Cloud sessions need `review.typo3.org`
and `forge.typo3.org` in the environment's allowed domains; otherwise run
these scripts locally.

### Where things are

| Content | Data | Template |
|---|---|---|
| Hero, key facts, channel tiles | `_data/intro.json` | `_includes/hero.html` |
| Order, titles and leads of sections | `_data/sections.json` | `index.html` |
| Problems it solves | `_data/problems.json` | `_includes/sections/problems.html`, `assets/js/components/problem-comparison.js` |
| Annotated example action | `_data/concept.json` | `_includes/sections/concept.html`, `assets/js/components/action-anatomy.js` |
| One action in every channel | `_data/channels.json` | `_includes/sections/channels.html` |
| Stack layers and scenarios | `_data/stack.json` | `_includes/sections/stack.html`, `assets/js/components/stack-explorer.js` |
| Security model, scope calculator | `_data/security.json` | `_includes/sections/security.html`, `assets/js/components/scope-calculator.js` |
| Use cases | `_data/use_cases.json` | `_includes/sections/use-cases.html` |
| Screenshots | `_data/screenshots.json`, `images/` | `_includes/screenshot.html`, `_includes/sections/in-action.html` |
| Guide for extension developers | `_data/extend.json` | `_includes/sections/build.html` |
| Diagrams and reference tables | `_data/deep_dive.json` | `_includes/sections/deep-dive.html` |
| Patch chain and issues | `_data/patches.json`, `_data/issues.json` | `_includes/sections/status.html` |

Styles are split per component in `_sass/_<component>.scss` and imported by
`assets/site.scss`. Scripts are ES modules in `assets/js/`, one per
component, started by `assets/js/main.js`.

### Components

New and reworked interactive parts are [Lit](https://lit.dev/) web
components in `assets/js/components/`, one file per component, so that their
styles cannot leak into the rest of the page or be broken by it:

- Jekyll renders the content from `_data/` as the element's children (light
  DOM), so it is in the HTML without JavaScript. The component arranges and
  styles it in its shadow root; its styles live in `static styles` of the
  component, not in `_sass/`.
- The page passes design tokens (`--accent`, `--surface`, …) and a few
  documented custom properties such as `--code-font-size` into components.
  Global CSS must not style a component's internals.
- Font sizes use the type scale in `_sass/_base.scss` (`--font-size-base`,
  `--font-size-text`, `--font-size-small`, `--font-size-label`), also inside
  components; do not introduce new pixel sizes for text.
- Code snippets always go through `_includes/code.html`, which renders
  `<code-block>` (highlighting theme, copy button, marks).
- Lit is vendored as `assets/vendor/lit-core.min.js` (3.3.1, from
  `https://cdn.jsdelivr.net/gh/lit/dist@<version>/core/lit-core.min.js`,
  source map comment removed) and imported as `lit` through the import map in
  `_layouts/default.html`. There is no build step.

The remaining scripts (`stack.js`, `calculator.js`, `tabs.js`, …) are plain
modules and are moved to components step by step.

A new section needs an entry in `_data/sections.json` and a template
`_includes/sections/<id>.html`; the sidebar is built automatically.

## Accuracy

- The page describes code that is under review. Verify every statement against
  the TYPO3 Core checkout or the changes on review.typo3.org before writing it.
  When something is planned or unverified, say so in the text.
- The status of features (in review, work in progress) is derived from
  `patches.json`. Reference change numbers in data (`use_cases.json` →
  `patches`) instead of writing a status by hand.
- Screenshots must not show personal data, tokens or private URLs. Blur them
  before adding the image.
- Content is English. Write for developers and decision makers: start with
  what something is and does, not with a justification.

## Checks

```bash
python3 scripts/validate.py         # schemas, cross-references, JSON formatting
python3 scripts/validate.py --fix   # rewrites formatting only
scripts/check.sh                    # validation + Jekyll build, same as CI
./serve.sh                          # preview on http://127.0.0.1:4000/
```

`validate.py` needs `pip install jsonschema`. `scripts/jekyll.sh` uses a local
Ruby/Bundler if present, otherwise a podman or docker container. Run
`scripts/check.sh` before every commit; CI runs the same checks on every push
and pull request.

GitHub Pages builds with an old Sass compiler: use `rgba(r, g, b, a)` instead
of `rgb(r g b / a)`, and plain CSS features only.

## Working in parallel

- Work on a branch per task and open a pull request against `main`. Never push
  to `main` directly; `main` is deployed to GitHub Pages.
- Keep changes small and focused on one concern. The split into one data
  file, one template, one stylesheet and one script per component exists so
  that parallel changes rarely touch the same file.
- Rebase on `main` before opening or updating a pull request, and run
  `scripts/check.sh` afterwards.
- Keep JSON formatted with `scripts/validate.py --fix` and keep the order of
  existing entries, so diffs stay small and merge conflicts readable.
- Do not regenerate `patches.json` or `issues.json` in a branch that changes
  other things; refresh them in a separate pull request.

## Pull request workflow

Every change, however small, goes through these steps:

1. Branch off the current `main` (`git fetch origin main`, then
   `git checkout -b <topic> origin/main`). Agents use the prefix of their
   tool, e.g. `claude/<topic>`.
2. Make the change and run `scripts/check.sh` until it passes.
3. Commit (see [Commits](#commits)), push the branch and open a pull request
   against `main`. The description says what changed, why, and how it was
   tested; list any manual steps a maintainer has to do after merging.
4. Two workflows run on the pull request: `check.yml` (validation and build)
   and `pages.yml` (preview). Wait for both and fix failures before asking for
   review.
5. `pages.yml` publishes a preview at
   `https://bnf.github.io/typo3-action-api-overview/pr-preview/pr-<number>/`
   and posts the link as a comment. Open it and check the changed parts in
   the browser, desktop and narrow widths, before handing over. Point
   reviewers to it instead of describing visual changes. Previews are public.
6. The maintainer reviews the preview and merges. Agents merge only when
   asked to. After the merge, `main` is deployed to the root of the site and
   the preview is removed.
7. For follow-up work after a merge, start a new branch from `main`; never
   add commits to a merged branch.

The `gh-pages` branch is written only by `.github/workflows/pages.yml`: it
holds the built site with a deployment history of its own. Never edit it by
hand.

### Notes for Claude Code cloud sessions

- `gh pr create` and other GraphQL based `gh` commands are blocked; use the
  REST API, e.g. `gh api repos/bnf/typo3-action-api-overview/pulls -f base=main
  -f head=<branch> -f title=… -F body=@description.md`, and
  `gh api -X PUT repos/bnf/typo3-action-api-overview/pulls/<number>/merge`
  to merge.
- Deleting remote branches is refused; leave merged branches for the
  maintainer.
- A shallow clone only tracks `main`. To see pushed branches, add
  `git config --add remote.origin.fetch '+refs/heads/claude/*:refs/remotes/origin/claude/*'`.
- Workflow runs: `gh api 'repos/bnf/typo3-action-api-overview/actions/runs?branch=<branch>'`.

## Commits

Imperative subject line, a body that explains why.

This repository is self-contained. Do not rely on instructions, scripts or
files outside of it.
