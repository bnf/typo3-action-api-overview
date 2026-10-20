import { LitElement, css, html, nothing } from 'lit';

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

/**
 * Lets readers comment on a text of the page on GitHub. When a reader selects
 * text in the content, a button appears; it finds the line in _data/ that the
 * text comes from and opens
 *
 * - in a preview, the line in the diff of the pull request, if the pull
 *   request changed the line, so that the comment is part of the review,
 * - otherwise a new issue with the quote, the section and a permalink to the
 *   line.
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
    if (!this.position) {
      return nothing;
    }
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
    // Open the window now: browsers block windows that open after an await
    const target = window.open('about:blank', '_blank');
    if (target) {
      target.opener = null;
    }
    let url;
    try {
      url = await this.targetUrl(text);
    } catch {
      url = this.issueUrl(text, null);
    }
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
    const section = this.selected?.range.startContainer.parentElement?.closest('section.chapter')?.querySelector('h2')?.textContent.replace(/^#/, '').trim();
    const quote = text.length > 300 ? `${text.slice(0, 300)}…` : text;
    const lines = [
      `> ${quote}`,
      '',
      section ? `Section: ${section}` : null,
      `Page: ${location.href.split('#')[0]}`,
      source ? `Source: https://github.com/${this.repository}/blob/${revision}/${source.file}#L${source.line}` : null,
      '',
      '',
    ].filter((line) => line !== null);
    const title = `Comment: ${quote.slice(0, 60)}${quote.length > 60 ? '…' : ''}`;
    return `https://github.com/${this.repository}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(lines.join('\n'))}`;
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
