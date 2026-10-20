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
| One action in every channel | `_data/channels.json` | `_includes/sections/channels.html`, `assets/js/components/channel-tabs.js` |
| Stack layers and scenarios | `_data/stack.json` | `_includes/sections/stack.html`, `assets/js/components/stack-explorer.js` |
| Security model, scope calculator | `_data/security.json` | `_includes/sections/security.html`, `assets/js/components/scope-calculator.js` |
| Use cases | `_data/use_cases.json` | `_includes/sections/use-cases.html` |
| Screenshots | `_data/screenshots.json`, `images/` | `_includes/screenshot.html`, `_includes/sections/in-action.html`, `assets/js/components/screen-shot.js`, `zoom-viewer.js` |
| Guide for extension developers | `_data/extend.json` | `_includes/sections/build.html` |
| Diagrams and reference tables | `_data/deep_dive.json` | `_includes/sections/deep-dive.html`, `assets/js/components/mermaid-diagram.js` |
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
- Keep content visible where it fits; avoid accordions and `<details>`, readers
  rarely open them. Where variants of the same thing would take too much room
  (like the channels of the example action), use tabs that invite a click:
  cards that say what is behind them, and a link to the next one, see
  `assets/js/components/channel-tabs.js`.
- Code snippets always go through `_includes/code.html`, which renders
  `<code-block>` (highlighting theme, copy button, marks).
- Lit is vendored as `assets/vendor/lit-core.min.js` (3.3.1, from
  `https://cdn.jsdelivr.net/gh/lit/dist@<version>/core/lit-core.min.js`,
  source map comment removed) and imported as `lit` through the import map in
  `_layouts/default.html`. There is no build step.

The remaining scripts (`stack.js`, `calculator.js`, `tabs.js`, …) are plain
modules and are moved to components step by step.

A new section needs an entry in `_data/sections.json` and a template
`_includes/sections/<id>.html`; the sidebar (`assets/js/components/page-navigation.js`)
lists every `h2` and `h3` with an id automatically.

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

## Writing rules

Every text follows ASD-STE100 Simplified Technical English: every string in
`_data/`, the labels in templates and components, the captions and the alt
texts. Adapted from the writing rules of
[TYPO3GmbH/concept-visual-editing](https://github.com/TYPO3GmbH/concept-visual-editing/blob/main/AGENTS.md#2-writing-rules-the-most-important-rules-of-this-repository).
No script checks these rules: read every changed text against them before you
commit.

1. **Write from the content.** Before you write a sentence, know what the
   section says. Say it in one sentence in plain words first, then write it to
   the rules. A lead or a summary says what its section says, with its subject:
   when the section is about how the core checks scopes, the core is the
   subject, not the app.
2. **Sentences and paragraphs.** Short sentences, one thing per sentence; one
   topic per paragraph. A list of three or more items becomes a list or a
   table. What a sentence says counts, not its words: never cut a sentence to
   fit a length.
3. **Active voice.** Name who does what: "The action core validates the
   arguments", not "the arguments are validated".
4. **Verb forms.** Infinitive, imperative, simple present, simple past, future.
   No -ing form except in technical names ("routing", "settings"). No perfect
   tense: "the team decided", not "has decided".
5. **One word, one meaning.** Use the same term for the same thing and no
   synonym: "action" (not "endpoint" or "feature" for an action), "scope",
   "app" (an app record in EXT:hub), "channel", "MCP tool", "backend user".
6. **Approved words.** but (not however), make sure (not ensure), do (not
   perform), let (not allow), need (not require), must (not should), can (not
   may, might), when or during (not while), because (not since), if (not
   whether), also (not additionally), for example (not e.g.), that is (not
   i.e.), no "etc.".
   Never "give" or "provide": the verb says nothing about the action. Name the
   action. Bad: "TYPO3 provides actions for the dashboard". Good: "TYPO3 ships
   actions for the dashboard". The same for "own": only a person or a group
   owns something. A thing never owns. Bad: "every feature has its own AJAX
   controller". Good: "every feature has a separate AJAX controller".
7. **Noun clusters.** Three nouns at most in a row: "the output schema of the
   action", not "action output schema validation".
8. **Articles.** Write "the" and "a"; do not drop them.
9. **Short and precise.** No filler ("in order to", "it is important to
   note"), no marketing, no slogans, no hedging. Delete a sentence that says
   nothing new.
10. **Name the content.** Every text says what it means by itself.
    a. **Labels are nouns that name their content**: section titles, table
       heads, column heads, card titles, tab labels. No pronoun, no question
       word. Bad: "What the app can call", "Who calls". Good: "Callable
       actions", "Callers".
    b. **No empty phrase.** Name the thing instead of pointing at it. Bad:
       "the rest", "the others", "see below", "That is all." Good: "the other
       four channels".
    c. **A pronoun only for a noun in the same sentence.** A cell, a line, a
       lead and a paragraph start with their subject named, never with "It",
       "This" or "They" for something before them.
    d. **Every line stands alone.** A table cell, a list line, a card and a
       lead are clear without the line before them.
    e. **No colon in running text**, in a label or in a table cell. Bad:
       "Identifier and route: `/typo3/api/…`". Good: "The name is also the
       identifier and the route `/typo3/api/…`." A colon may only end a
       paragraph that a list or a code block follows.
    f. **No sentence starts with a number, a count or a number word.** Bad:
       "Six layers, each with one responsibility." Good: "The stack has six
       layers, each with one responsibility."
    g. **Name what you refer to.** A lead and a summary name the things they
       compare, so that a reader who reads only this part can check them.
    h. **No word that repeats the frame.** The page is about the TYPO3 Action
       API, so "TYPO3", "Action API" or "API" as a qualifier add nothing where
       the frame is clear. Keep the word where it separates two things ("an
       action of TYPO3" against "an action of an extension").
    i. **Say what happens, with its direct term.** Name the actor and the
       plain action (validate, check, call, return), not a picture of it. Bad:
       "never reaches the action", "the hard parts". Good: "the action core
       rejects the call", "scope checks, validation and invocation". Test:
       would a developer say the sentence to a colleague like that?
11. **Meaning before numbers.** A lead or a summary says what the numbers
    mean, in words, and the consequence for the reader. A count without its
    consequence is no finding. No count that only describes the structure
    ("in six groups"): name the groups or leave the count out. At most one
    number in a lead, never at its start.
12. **No typed numbers.** A count that comes from data (changes on Gerrit,
    issues, patch sets) is rendered by the template from `_data/`, never
    typed into a text.
13. **People and software.** "Editor" is only a person of the user group
    Editor, who changes content. All people who work with TYPO3 are **users**
    or **backend users**; name the group where only one is meant
    (administrators, integrators, developers). An app acts **for** a user; the
    software is **the backend** and its modules ("the page tree", "the API Hub
    module"). Another tool keeps its name ("Claude", "MCP Inspector", "Swagger
    UI").
14. **Headings and leads.** A section heading names the topic in a short,
    plain noun phrase ("Security model", "Stack"). No sentence, no claim, no
    metaphor, no pun. The lead below it says the finding in one sentence (rule
    11 for numbers); a lead that only retells the cards, the table or the
    figure below it is no finding, so leave it out.

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
6. The maintainer reviews the pull request, its preview and the related
   issues and review comments, and merges. Agents never merge on their own,
   also not so that the maintainer can test a change on the live site, and
   also not for a pull request that fixes an issue. A request to merge
   applies only to the pull requests it names. After the merge, `main` is
   deployed to the root of the site and the preview is removed.
7. For follow-up work after a merge, start a new branch from `main`; never
   add commits to a merged branch.

The `gh-pages` branch is written only by `.github/workflows/pages.yml`: it
holds the built site with a deployment history of its own. Never edit it by
hand.

### Comments on GitHub

Readers comment on the site with "Comment on GitHub"
(`assets/js/components/github-comments.js`) in two ways: they select a text
(the button appears at the selection, or in a bar below the top bar on
touch screens, where the browser shows its own menu at the selection and its
own bars at the bottom), or they
switch on the comment mode with the round button at the bottom right and
click or tap a group. The comment mode shows every group with a dashed
outline and switches off the text selection. The component
finds the line in `_data/` that the text comes from and opens

- in a preview, the line in the diff of the pull request, if the pull
  request changed the line; the comment is then part of the review,
- otherwise a new issue with the quote, a link that shows the text on the
  page (text fragment, with the section as fallback) and a permalink to the
  line, which GitHub embeds as a code snippet.

A group is an element with a `data-comment` attribute in a template: a
section intro, a card, a paragraph, a table, a component. The value is the id
of the group in the issue and must be unique on the page; groups can be
nested (`concept-example` holds `concept-part-1`, …), and a text selection
belongs to the innermost group around it. A new block of content needs a
`data-comment` id. `_includes/screenshot.html` takes a `context` parameter
for the id, so that the same screenshot can appear in two places.

The issue shows an image of the group. `pages.yml` renders every visible
group of the built site with Playwright (`scripts/render-screenshots.mjs`)
into `screenshots/<hash>.png`, with `screenshots/<commit>.json` as the map
from group to image; the script fails when two groups have the same id. For
a group in a hidden tab, the issue shows the image of the next group around
it. The deployment of `main` keeps older images, so that
older issues still show the group as it was. Images of a preview disappear
with the preview. With a mouse, a screenshot of the group around the
selection, with the selection highlighted, also goes to the clipboard, so
that the reader can paste it into the comment. SnapDOM renders it; it is vendored as
`assets/vendor/snapdom.mjs` (3.3.0, `dist/snapdom.mjs` of the npm package
`@zumer/snapdom`, MIT) and loaded on the first selection.

Handle these issues in normal pull requests (see the steps above, the
maintainer merges). Reference an issue with `Refs #<number>` in the commit
message and the pull request, not with `Fixes` or `Closes`: the issue stays
open until the maintainer has reviewed the result and closes it. The workflow `pages.yml` writes the commit and the pull
request of each build to `_build.yml` (`site.build`) for the links.

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
