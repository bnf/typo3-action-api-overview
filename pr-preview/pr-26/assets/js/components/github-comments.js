import { LitElement, css, html, nothing } from 'lit';

const snapdomUrl = new URL('../../vendor/snapdom.mjs', import.meta.url).href;
let snapdomLoader = null;

// Blocks that readers can comment on as a whole, and that a screenshot of a selection shows
const blocks = 'problem-item, anatomy-part, channel-tabs, stack-explorer, scope-calculator, screen-shot, mermaid-diagram, '
  + 'code-block, .card, .fact, .channel, table, figure, p, li, h2, h3';

// Touch screens show their own menu at a selection, so the controls move to the bottom
const touch = window.matchMedia('(pointer: coarse)');

// Words for a text fragment (#:~:text=…); "-", "," and "&" have a meaning in the directive
const fragmentPart = (text) => encodeURIComponent(text).replace(/-/g, '%2D');

const shaHex = async (text) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

// Compares rendered text with a line of JSON: no Markdown marks, no escapes, single spaces
const normalize = (text) => text
  .replace(/\\n/g, ' ')
  .replace(/\\"/g, '"')
  .replace(/[`*_]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const commentIcon = html`<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M1 2.75C1 1.78 1.78 1 2.75 1h10.5c.97 0 1.75.78 1.75 1.75v7.5A1.75 1.75 0 0 1 13.25 12H9.06l-2.57 2.57A1.46 1.46 0 0 1 4 13.54V12H2.75A1.75 1.75 0 0 1 1 10.25Z"/></svg>`;

/**
 * Lets readers comment on a text of the page on GitHub, in two ways:
 *
 * - Select text: on screens with a mouse, a button appears at the selection;
 *   on touch screens, a bar below the top bar, because the browser shows its
 *   own menu at the selection and its own bars at the bottom.
 * - Comment mode (round button at the bottom right): click or tap a block
 *   (card, paragraph, table, component) to comment on the whole block.
 *
 * The comment opens, in a preview, the line in the diff of the pull request
 * if the pull request changed the line, and otherwise a new issue with the
 * quote, a link that shows the text on the page (text fragment), the section
 * and a permalink to the line in _data/, which GitHub embeds as a code
 * snippet. A screenshot of the block, with a selection highlighted, goes to
 * the clipboard, so that the reader can paste it into the comment. SnapDOM
 * (assets/vendor/snapdom.mjs) renders it and is loaded on first use.
 *
 * Attributes: repository (owner/name), revision (commit of the build),
 * pull-request (number, in previews), files (data files as a comma-separated
 * list).
 */
export class GithubComments extends LitElement {
  static properties = {
    repository: {},
    revision: {},
    pullRequest: { attribute: 'pull-request' },
    files: {},
    position: { state: true },
    current: { state: true },
    mode: { state: true },
    hoverBox: { state: true },
    busy: { state: true },
    notice: { state: true },
  };

  static styles = css`
    :host { position: absolute; top: 0; left: 0; z-index: 25; font-family: "Source Sans 3", sans-serif; }
    button { font: inherit; cursor: pointer; }
    svg { width: 14px; height: 14px; flex: none; }
    .at-selection {
      position: absolute;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      transform: translate(-50%, calc(-100% - 8px));
      border: 1px solid var(--accent);
      background: var(--surface);
      color: var(--fg);
      border-radius: 999px;
      padding: 4px 12px;
      font-size: var(--font-size-label, 13px);
      font-weight: 600;
      box-shadow: var(--shadow-lg);
    }
    .at-selection:hover, .at-selection:focus-visible { background: var(--accent-soft); outline: none; }

    .outline {
      position: absolute;
      pointer-events: none;
      border-radius: 10px;
      outline: 2px solid var(--accent);
      outline-offset: 3px;
      background: rgba(255, 135, 0, 0.08);
      transition: top .1s, left .1s, width .1s, height .1s;
    }
    .outline.hover { outline-style: dashed; background: none; }

    .toggle {
      position: fixed;
      right: 16px;
      bottom: calc(16px + env(safe-area-inset-bottom));
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--muted);
      box-shadow: var(--shadow-lg);
    }
    .toggle svg { width: 18px; height: 18px; }
    .toggle:hover, .toggle:focus-visible { border-color: var(--accent); color: var(--fg); outline: none; }

    .bar {
      position: fixed;
      left: 50%;
      bottom: calc(16px + env(safe-area-inset-bottom));
      transform: translateX(-50%);
      width: min(560px, calc(100vw - 32px));
      box-sizing: border-box;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 10px 10px 16px;
      border: 1px solid var(--accent);
      border-radius: 16px;
      background: var(--surface);
      color: var(--fg);
      box-shadow: var(--shadow-lg);
    }
    .quote {
      flex: 1;
      min-width: 0;
      color: var(--muted);
      font-size: var(--font-size-small, 15.5px);
      line-height: 1.35;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .primary {
      flex: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 0;
      border-radius: 999px;
      padding: 8px 14px;
      background: var(--accent);
      color: #1d1f23;
      font-weight: 600;
      font-size: var(--font-size-small, 15.5px);
    }
    .close {
      flex: none;
      width: 36px;
      height: 36px;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: var(--surface);
      color: var(--muted);
      font-size: 18px;
      line-height: 1;
    }
    .primary:focus-visible, .close:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .primary:disabled, .at-selection:disabled { opacity: .7; cursor: progress; }
    /* On touch screens, the browser shows its own bars at the bottom during a selection (Google Lens) */
    @media (pointer: coarse) {
      .bar { bottom: auto; top: calc(var(--topbar-height, 56px) + 12px); }
      .notice { bottom: auto; top: calc(var(--topbar-height, 56px) + 12px); }
    }
    @media (max-width: 560px) {
      .bar { flex-wrap: wrap; padding: 12px; }
      .quote { flex-basis: 100%; }
      .primary { flex: 1; justify-content: center; }
    }

    .notice {
      position: fixed;
      left: 50%;
      bottom: calc(84px + env(safe-area-inset-bottom));
      transform: translateX(-50%);
      max-width: calc(100vw - 32px);
      padding: 8px 16px;
      border-radius: 999px;
      background: var(--fg);
      color: var(--bg);
      font-size: var(--font-size-small, 15.5px);
      font-weight: 600;
      box-shadow: var(--shadow-lg);
      text-align: center;
    }
  `;

  constructor() {
    super();
    this.position = null;
    this.current = null;
    this.mode = false;
    this.hoverBox = null;
    this.busy = false;
    this.notice = null;
    this.cache = new Map();
    this.onSelection = () => {
      clearTimeout(this.selectionTimer);
      this.selectionTimer = setTimeout(() => this.selectText(), 200);
    };
    this.onPointerMove = (event) => {
      const block = this.blockAt(event);
      this.hoverBox = block && block !== this.current?.block ? this.box(block) : null;
    };
    this.onClick = (event) => {
      const block = this.blockAt(event);
      if (block) {
        event.preventDefault();
        event.stopPropagation();
        this.selectBlock(block);
      }
    };
    this.onKey = (event) => {
      if (event.key === 'Escape' && (this.mode || this.current)) {
        this.reset();
      }
    };
    this.onResize = () => {
      if (this.current?.block) {
        this.current = { ...this.current, box: this.box(this.current.block) };
      }
    };
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('selectionchange', this.onSelection);
    document.addEventListener('keydown', this.onKey);
    window.addEventListener('resize', this.onResize);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.setMode(false);
    document.removeEventListener('selectionchange', this.onSelection);
    document.removeEventListener('keydown', this.onKey);
    window.removeEventListener('resize', this.onResize);
  }

  render() {
    const bar = this.mode || (this.current && (this.current.block || touch.matches));
    return html`
      ${this.position && !touch.matches && !this.mode ? html`
        <button type="button" class="at-selection" ?disabled=${!this.current?.ready} style="left: ${this.position.x}px; top: ${this.position.y}px"
          @mousedown=${(event) => event.preventDefault()} @click=${this.comment}>
          ${commentIcon} ${this.label('Opening GitHub…')}
        </button>
      ` : nothing}
      ${this.hoverBox ? html`<div class="outline hover" style=${this.boxStyle(this.hoverBox)}></div>` : nothing}
      ${this.current?.box ? html`<div class="outline" style=${this.boxStyle(this.current.box)}></div>` : nothing}
      ${bar ? this.renderBar() : html`
        <button type="button" class="toggle" aria-label="Comment on a block of the page"
          title="Comment on a block of the page" @click=${() => this.setMode(true)}>${commentIcon}</button>
      `}
      ${this.notice ? html`<div class="notice" role="status">${this.notice}</div>` : nothing}
    `;
  }

  // The buttons wait for the screenshot: copying it after GitHub opened in a new tab can fail
  label(opening) {
    if (this.busy) {
      return opening;
    }
    return this.current?.ready ? 'Comment on GitHub' : 'Preparing screenshot…';
  }

  renderBar() {
    return html`
      <div class="bar" role="region" aria-label="Comment on GitHub">
        ${this.current ? html`
          <span class="quote">“${this.current.text}”</span>
          <button type="button" class="primary" ?disabled=${!this.current.ready} @mousedown=${(event) => event.preventDefault()} @click=${this.comment}>
            ${commentIcon} ${this.label('Opening…')}
          </button>
        ` : html`
          <span class="quote">Click or tap a block of the page to comment on it.</span>
        `}
        <button type="button" class="close" aria-label="Cancel" title="Cancel (Esc)" @click=${this.reset}>×</button>
      </div>
    `;
  }

  boxStyle(box) {
    return `top: ${box.top}px; left: ${box.left}px; width: ${box.width}px; height: ${box.height}px`;
  }

  // Position of an element in document coordinates
  box(element) {
    const rect = element.getBoundingClientRect();
    return { top: rect.top + scrollY, left: rect.left + scrollX, width: rect.width, height: rect.height };
  }

  setMode(on) {
    this.mode = on;
    const content = document.querySelector('.content');
    for (const [type, handler] of [['click', this.onClick], ['pointermove', this.onPointerMove]]) {
      if (on) {
        content?.addEventListener(type, handler, true);
      } else {
        content?.removeEventListener(type, handler, true);
      }
    }
    if (!on) {
      this.hoverBox = null;
    }
  }

  reset() {
    this.setMode(false);
    this.current = null;
    this.position = null;
    getSelection()?.removeAllRanges();
  }

  // The block under the pointer; the event path also covers the shadow roots of components
  blockAt(event) {
    const content = document.querySelector('.content');
    return event.composedPath().find((node) => node instanceof Element && node.matches(blocks) && content.contains(node)) ?? null;
  }

  selectText() {
    if (this.mode) {
      return;
    }
    const selection = document.getSelection();
    const range = selection && !selection.isCollapsed ? selection.getRangeAt(0) : null;
    const content = document.querySelector('.content');
    const text = range && content?.contains(range.commonAncestorContainer) ? selection.toString().replace(/\s+/g, ' ').trim() : '';
    if (text.length < 3) {
      this.position = null;
      if (!this.current?.block) {
        this.current = null;
      }
      return;
    }
    const node = range.commonAncestorContainer;
    const anchor = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    const box = range.getBoundingClientRect();
    this.position = { x: box.left + box.width / 2 + scrollX, y: box.top + scrollY };
    const marks = [...range.getClientRects()];
    // A selection across several blocks shows the section around it, cut to the selection
    const block = anchor.closest(blocks) ?? anchor.closest('section.chapter, .hero');
    this.prepare({ text, anchor }, block, marks);
  }

  selectBlock(block) {
    const clean = (value) => (value || '').replace(/\s+/g, ' ').trim();
    const heading = clean(block.getAttribute('heading'));
    // The heading and the texts of the children are separate strings in _data/
    const parts = [heading, ...[...block.children].map((child) => clean(child.innerText))].filter((part) => part.length >= 3);
    const text = clean([heading, block.innerText].join(' '));
    this.hoverBox = null;
    this.prepare({ text, parts, anchor: block, block, box: this.box(block) }, block, []);
  }

  // Renders the screenshot before the click: the click must copy it without waiting
  prepare(current, block, marks) {
    const token = Symbol('selection');
    this.current = { ...current, token, ready: !block, image: null };
    if (!block) {
      return;
    }
    this.capture(block, marks).catch(() => null).then((image) => {
      // Only if the reader did not select something else in the meantime
      if (this.current?.token === token) {
        this.current = { ...this.current, ready: true, image };
      }
    });
  }

  // Renders a block and highlights the given client rects of a selection in it
  async capture(target, rects) {
    snapdomLoader ??= import(snapdomUrl);
    const { snapdom } = await snapdomLoader;
    const box = target.getBoundingClientRect();
    const marks = rects.map((rect) => ({ x: rect.left - box.left, y: rect.top - box.top, width: rect.width, height: rect.height }));
    const background = getComputedStyle(document.body).backgroundColor;
    const scale = 2;
    const image = await (await snapdom(target, { scale, embedFonts: true, backgroundColor: background })).toCanvas();

    // Long blocks (the stack, the calculator) are cut to the part around the selection
    const top = marks.length ? Math.max(0, Math.min(...marks.map((mark) => mark.y)) - 240) : 0;
    const bottom = marks.length ? Math.min(box.height, Math.max(...marks.map((mark) => mark.y + mark.height)) + 240) : Math.min(box.height, 1200);
    const padding = 24;
    const canvas = document.createElement('canvas');
    canvas.width = (box.width + 2 * padding) * scale;
    canvas.height = (bottom - top + 2 * padding) * scale;
    const context = canvas.getContext('2d');
    context.scale(scale, scale);
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, top * scale, box.width * scale, (bottom - top) * scale, padding, padding, box.width, bottom - top);
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff8700';
    context.fillStyle = accent;
    for (const mark of marks) {
      context.globalAlpha = 0.25;
      context.fillRect(padding + mark.x, padding + mark.y - top, mark.width, mark.height);
      context.globalAlpha = 1;
      context.fillRect(padding + mark.x, padding + mark.y - top + mark.height - 2, mark.width, 2);
    }
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  }

  // Writes the screenshot to the clipboard; must run during the click
  copyScreenshot() {
    const image = this.current?.image;
    if (!image) {
      return Promise.resolve('none');
    }
    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
      return Promise.resolve('failed');
    }
    return navigator.clipboard.write([new ClipboardItem({ 'image/png': image })]).then(() => 'copied', () => 'failed');
  }

  showNotice(text) {
    this.notice = text;
    clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => { this.notice = null; }, 6000);
  }

  async loadFile(file, revision) {
    const key = `${revision}/${file}`;
    if (!this.cache.has(key)) {
      this.cache.set(key, fetch(`https://raw.githubusercontent.com/${this.repository}/${revision}/_data/${file}`)
        .then((response) => (response.ok ? response.text() : ''))
        .catch(() => ''));
    }
    return this.cache.get(key);
  }

  // Finds the line of a data file that contains the beginning of one of the texts.
  // A short text such as `fetch` occurs in several files: the files that the
  // templates around the element name in data-source are searched first.
  async findLine(texts, revision, element) {
    const all = (this.files || '').split(',').filter(Boolean);
    const near = [];
    for (let node = element; node; node = node.parentElement ?? node.getRootNode().host) {
      near.push(...(node.dataset?.source ?? '').split(',').filter(Boolean).map((name) => `${name}.json`));
    }
    const first = [...new Set(near)].filter((file) => all.includes(file));
    for (const files of [first, all.filter((file) => !first.includes(file))]) {
      const contents = await Promise.all(files.map((file) => this.loadFile(file, revision)));
      for (const text of texts) {
        const needle = normalize(text).slice(0, 60);
        for (const [index, file] of files.entries()) {
          // The shortest line that contains the text: a table cell `fetch` rather than a code example with `fetch` in it
          const rows = contents[index].split('\n').map((row, line) => ({ row: normalize(row), line }))
            .filter(({ row }) => row.includes(needle))
            .sort((a, b) => a.row.length - b.row.length);
          if (rows.length > 0) {
            return { file: `_data/${file}`, line: rows[0].line + 1 };
          }
        }
      }
    }
    return null;
  }

  // Lines that the pull request added or changed, from the patches of its files
  async changedLines() {
    if (!this.changes) {
      this.changes = fetch(`https://api.github.com/repos/${this.repository}/pulls/${this.pullRequest}/files?per_page=100`)
        .then((response) => (response.ok ? response.json() : []))
        .then((files) => new Map(files.map((entry) => [entry.filename, addedLines(entry.patch || '')])))
        .catch(() => new Map());
    }
    return this.changes;
  }

  async comment() {
    const current = this.current;
    if (!current?.text || !current.ready) {
      return;
    }
    this.busy = true;
    // Copy and open now: browsers block both after an await
    const copied = this.copyScreenshot();
    const target = window.open('about:blank', '_blank');
    if (target) {
      target.opener = null;
    }
    const copy = await copied;
    current.copied = copy === 'copied';
    let url;
    try {
      url = await this.targetUrl(current);
    } catch {
      url = this.issueUrl(current, null);
    }
    try {
      if (target) {
        target.location = url;
      } else {
        location.href = url;
      }
    } finally {
      this.busy = false;
      this.reset();
      this.showNotice({
        copied: 'The screenshot is in the clipboard. Paste it into the comment on GitHub.',
        failed: 'Your browser did not let the page copy the screenshot. GitHub opens in a new tab.',
        none: 'GitHub opens in a new tab.',
      }[copy]);
    }
  }

  async targetUrl(current) {
    const revision = this.revision || 'main';
    const source = await this.findLine([current.text, ...(current.parts ?? [])], revision, current.anchor);
    if (source && this.pullRequest) {
      const changed = (await this.changedLines()).get(source.file);
      if (changed?.has(source.line)) {
        return `https://github.com/${this.repository}/pull/${this.pullRequest}/files#diff-${await shaHex(source.file)}R${source.line}`;
      }
    }
    return this.issueUrl(current, source);
  }

  issueUrl(current, source) {
    const { text, anchor, copied } = current;
    const revision = this.revision || 'main';
    const page = location.href.split('#')[0];
    const heading = anchor?.closest('section.chapter')?.querySelector('h2[id]');
    const section = heading ? { title: heading.textContent.replace(/^#/, '').trim(), id: heading.id } : null;
    const words = text.split(' ');
    const fragment = words.length > 10
      ? `${fragmentPart(words.slice(0, 5).join(' '))},${fragmentPart(words.slice(-5).join(' '))}`
      : fragmentPart(text);
    const quote = text.length > 400 ? `${text.slice(0, 400)}…` : text;
    const body = [
      '### Comment',
      '',
      '',
      '',
      '### Text on the page',
      '',
      `> ${quote}`,
      '',
      `[Show the text on the page](${page}#${section?.id ?? ''}:~:text=${fragment})`
        + (section ? ` in the section [${section.title}](${page}#${section.id})` : ''),
      '',
      ...(source ? ['Source of the text in the repository:', '', `https://github.com/${this.repository}/blob/${revision}/${source.file}#L${source.line}`, ''] : []),
      ...(copied ? ['### Screenshot', '', '_The screenshot of the text is in the clipboard. Paste it here with Ctrl+V or ⌘V._', ''] : []),
    ].join('\n');
    const short = quote.length > 50 ? `${quote.slice(0, 50).trim()}…` : quote;
    const title = section ? `${section.title}: “${short}”` : `“${short}”`;
    return `https://github.com/${this.repository}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
  }
}

// Line numbers in the new file that a unified diff adds
function addedLines(patch) {
  const added = new Set();
  let line = 0;
  for (const row of patch.split('\n')) {
    const hunk = row.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
    if (hunk) {
      line = Number(hunk[1]);
    } else if (row.startsWith('+')) {
      added.add(line++);
    } else if (!row.startsWith('-')) {
      line++;
    }
  }
  return added;
}

customElements.define('github-comments', GithubComments);
