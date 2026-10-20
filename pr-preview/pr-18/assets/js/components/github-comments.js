import { LitElement, css, html, nothing } from 'lit';

const shaHex = async (text) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const snapdomUrl = new URL('../../vendor/snapdom.mjs', import.meta.url).href;
let snapdomLoader = null;

// The block that a screenshot of a selection shows: the nearest card, component or paragraph
const captureTargets = 'problem-item, anatomy-part, channel-tabs, stack-explorer, scope-calculator, screen-shot, mermaid-diagram, '
  + '.card, .fact, .channel, table, figure, p, li, h2, h3';

// Words for a text fragment (#:~:text=…); "-", "," and "&" have a meaning in the directive
const fragmentPart = (text) => encodeURIComponent(text).replace(/-/g, '%2D');

// Compares rendered text with a line of JSON: no Markdown marks, no escapes, single spaces
const normalize = (text) => text
  .replace(/\\n/g, ' ')
  .replace(/\\"/g, '"')
  .replace(/[`*_]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

/**
 * Lets readers comment on a text of the page on GitHub. When a reader selects
 * text in the content, a button appears; it finds the line in _data/ that the
 * text comes from and opens
 *
 * - in a preview, the line in the diff of the pull request, if the pull
 *   request changed the line, so that the comment is part of the review,
 * - otherwise a new issue with the quote, a link that shows the text on the
 *   page (text fragment), the section and a permalink to the line, which
 *   GitHub embeds as a code snippet.
 *
 * In both cases, a screenshot of the block around the selection, with the
 * selection highlighted, is copied to the clipboard, so that the reader can
 * paste it into the comment. The screenshot is rendered with SnapDOM
 * (assets/vendor/snapdom.mjs), which is loaded on the first selection.
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
    busy: { state: true },
    notice: { state: true },
  };

  static styles = css`
    :host { position: absolute; top: 0; left: 0; z-index: 25; }
    button {
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
      font: 600 var(--font-size-label, 13px) "Source Sans 3", sans-serif;
      box-shadow: var(--shadow-lg);
      cursor: pointer;
    }
    button:hover, button:focus-visible { background: var(--accent-soft); outline: none; }
    svg { width: 14px; height: 14px; }
    .notice {
      position: fixed;
      left: 50%;
      bottom: 24px;
      transform: translateX(-50%);
      padding: 8px 16px;
      border-radius: 999px;
      background: var(--fg);
      color: var(--bg);
      font: 600 var(--font-size-small, 15.5px) "Source Sans 3", sans-serif;
      box-shadow: var(--shadow-lg);
      white-space: nowrap;
    }
  `;

  constructor() {
    super();
    this.position = null;
    this.busy = false;
    this.cache = new Map();
    this.onSelection = () => {
      clearTimeout(this.selectionTimer);
      this.selectionTimer = setTimeout(() => this.updatePosition(), 150);
    };
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('selectionchange', this.onSelection);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('selectionchange', this.onSelection);
  }

  render() {
    return html`
      ${this.position ? this.renderButton() : nothing}
      ${this.notice ? html`<div class="notice" role="status">${this.notice}</div>` : nothing}
    `;
  }

  renderButton() {
    return html`
      <button type="button" style="left: ${this.position.x}px; top: ${this.position.y}px"
        @mousedown=${(event) => event.preventDefault()} @click=${this.comment}>
        <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M1 2.75C1 1.78 1.78 1 2.75 1h10.5c.97 0 1.75.78 1.75 1.75v7.5A1.75 1.75 0 0 1 13.25 12H9.06l-2.57 2.57A1.46 1.46 0 0 1 4 13.54V12H2.75A1.75 1.75 0 0 1 1 10.25Z"/></svg>
        ${this.busy ? 'Opening GitHub…' : 'Comment on GitHub'}
      </button>
    `;
  }

  selectedText() {
    const selection = document.getSelection();
    if (!selection || selection.isCollapsed) {
      return null;
    }
    const range = selection.getRangeAt(0);
    const content = document.querySelector('.content');
    if (!content?.contains(range.commonAncestorContainer)) {
      return null;
    }
    const text = selection.toString().replace(/\s+/g, ' ').trim();
    return text.length >= 3 ? { text, range } : null;
  }

  updatePosition() {
    const selected = this.selectedText();
    if (!selected) {
      this.position = null;
      return;
    }
    const box = selected.range.getBoundingClientRect();
    this.position = { x: box.left + box.width / 2 + scrollX, y: box.top + scrollY };
    this.selected = selected;
    // Render the screenshot now: the click must write it to the clipboard without waiting
    this.screenshot = this.capture(selected.range.cloneRange()).catch(() => null);
  }

  // Renders the block around the selection and highlights the selection in it
  async capture(range) {
    const node = range.commonAncestorContainer;
    const target = (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement)?.closest(captureTargets);
    if (!target) {
      return null;
    }
    snapdomLoader ??= import(snapdomUrl);
    const { snapdom } = await snapdomLoader;
    const box = target.getBoundingClientRect();
    const marks = [...range.getClientRects()].map((rect) => ({
      x: rect.left - box.left, y: rect.top - box.top, width: rect.width, height: rect.height,
    }));
    const background = getComputedStyle(document.body).backgroundColor;
    const scale = 2;
    const image = await (await snapdom(target, { scale, embedFonts: true, backgroundColor: background })).toCanvas();

    // Long blocks (the stack, the calculator) are cut to the part around the selection
    const top = Math.max(0, Math.min(...marks.map((mark) => mark.y)) - 240);
    const bottom = Math.min(box.height, Math.max(...marks.map((mark) => mark.y + mark.height)) + 240);
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
    for (const mark of marks) {
      context.globalAlpha = 0.25;
      context.fillStyle = accent;
      context.fillRect(padding + mark.x, padding + mark.y - top, mark.width, mark.height);
      context.globalAlpha = 1;
      context.fillRect(padding + mark.x, padding + mark.y - top + mark.height - 2, mark.width, 2);
    }
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  }

  // Writes the screenshot to the clipboard; must run during the click
  copyScreenshot() {
    if (!this.screenshot || !navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
      return Promise.resolve(false);
    }
    const blob = this.screenshot.then((value) => value ?? Promise.reject(new Error('No screenshot')));
    return navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(() => true, () => false);
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

  // Finds the line of a data file that contains the beginning of the text
  async findLine(text, revision) {
    const needle = normalize(text).slice(0, 60);
    for (const file of (this.files || '').split(',').filter(Boolean)) {
      const lines = (await this.loadFile(file, revision)).split('\n');
      const index = lines.findIndex((line) => normalize(line).includes(needle));
      if (index >= 0) {
        return { file: `_data/${file}`, line: index + 1 };
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
    const { text } = this.selected ?? {};
    if (!text) {
      return;
    }
    this.busy = true;
    // Copy and open now: browsers block both after an await
    const copied = this.copyScreenshot();
    const target = window.open('about:blank', '_blank');
    if (target) {
      target.opener = null;
    }
    this.copied = await copied;
    let url;
    try {
      url = await this.targetUrl(text);
    } catch {
      url = this.issueUrl(text, null);
    }
    this.showNotice(this.copied
      ? 'The screenshot is in the clipboard. Paste it into the comment on GitHub.'
      : 'GitHub opens in a new tab.');
    try {
      if (target) {
        target.location = url;
      } else {
        location.href = url;
      }
    } finally {
      this.busy = false;
      this.position = null;
    }
  }

  async targetUrl(text) {
    const revision = this.revision || 'main';
    const source = await this.findLine(text, revision);
    if (source && this.pullRequest) {
      const changed = (await this.changedLines()).get(source.file);
      if (changed?.has(source.line)) {
        return `https://github.com/${this.repository}/pull/${this.pullRequest}/files#diff-${await shaHex(source.file)}R${source.line}`;
      }
    }
    return this.issueUrl(text, source);
  }

  issueUrl(text, source) {
    const revision = this.revision || 'main';
    const page = location.href.split('#')[0];
    const heading = this.selected?.range.startContainer.parentElement?.closest('section.chapter')?.querySelector('h2[id]');
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
      ...(this.copied ? ['### Screenshot', '', '_The screenshot of the text is in the clipboard. Paste it here with Ctrl+V or ⌘V._', ''] : []),
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
