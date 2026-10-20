import { LitElement, css, html } from 'lit';

/**
 * A code snippet highlighted by Rouge at build time (see _includes/code.html).
 * The <pre> rendered by Jekyll is moved into the shadow root, so the
 * highlighting theme, the copy button and the marks are scoped to it.
 *
 * Properties: marks ([{ref, match}], wraps the first occurrence of each match),
 * active (ref of the highlighted mark). Fires `mark-select` with {ref}.
 * Size and spacing follow --code-font-size and --code-padding. The code fills
 * the height of the element, so a layout can stretch it.
 */
export class CodeBlock extends LitElement {
  static properties = {
    marks: { attribute: false },
    active: {},
    copied: { state: true },
  };

  static styles = css`
    :host { display: block; position: relative; }
    .code { height: 100%; }
    pre {
      box-sizing: border-box;
      height: 100%;
      margin: 0;
      background: var(--code-bg);
      color: var(--code-fg);
      border-radius: 12px;
      padding: var(--code-padding, 16px 20px);
      overflow-x: auto;
      font: var(--code-font-size, 14px)/1.6 "Source Code Pro", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
    .c, .c1, .cm, .cd, .cs, .ch { color: #7f8896; font-style: italic; }
    .k, .kd, .kn, .kr, .kc, .kt, .kp { color: #ff9e64; }
    .nc, .nn, .no { color: #7dcfff; }
    .nf, .fm, .nx { color: #9ece6a; }
    .s, .s1, .s2, .sb, .sd, .se, .sh, .si, .sx { color: #e0c27a; }
    .mi, .mf, .m, .mh, .il { color: #bb9af7; }
    .nv, .vi, .vg { color: #f7768e; }
    .na, .nl, .nt, .py, .nd { color: #7aa2f7; font-style: normal; }
    .nb, .bp { color: #2ac3de; }
    .o, .p, .ow { color: #b4bac4; }

    .copy {
      position: absolute;
      top: 8px;
      right: 8px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: rgba(255, 255, 255, 0.08);
      color: #c9ced6;
      border-radius: 6px;
      font: 600 12px "Source Sans 3", sans-serif;
      padding: 3px 9px;
      cursor: pointer;
      opacity: 0;
      transition: opacity .15s;
    }
    :host(:hover) .copy, .copy:focus-visible { opacity: 1; }

    .mark {
      cursor: pointer;
      border-bottom: 1px dashed rgba(255, 255, 255, 0.4);
      transition: background .15s, box-shadow .15s;
    }
    .mark.on { background: rgba(255, 135, 0, 0.32); border-bottom-color: var(--accent); box-shadow: 0 2px 0 var(--accent); }
    .badge {
      font: normal 700 10px/1.5 "Source Sans 3", sans-serif;
      color: #1d1f23;
      background: var(--accent);
      border-radius: 999px;
      padding: 0 5px;
      margin-left: 2px;
      vertical-align: super;
    }
  `;

  constructor() {
    super();
    this.marks = [];
    this.copied = false;
  }

  connectedCallback() {
    super.connectedCallback();
    if (!this.pre) {
      this.pre = this.querySelector('pre');
      this.text = this.pre?.textContent.trim() ?? '';
      fixPhpAttributes(this.pre);
    }
  }

  render() {
    return html`
      <div class="code" @click=${this.onPointer} @mouseover=${this.onPointer}>${this.pre}</div>
      <button class="copy" type="button" @click=${this.copy}>${this.copied ? 'Copied' : 'Copy'}</button>
    `;
  }

  updated(changed) {
    if (changed.has('marks') && this.pre) {
      const code = this.pre.querySelector('code') || this.pre;
      // Wrap from the end, so that earlier offsets stay valid
      this.marks
        .map((mark) => ({ ref: String(mark.ref), start: code.textContent.indexOf(mark.match), length: mark.match.length }))
        .filter((mark) => mark.start >= 0)
        .sort((a, b) => b.start - a.start)
        .forEach((mark) => wrapRange(code, mark.start, mark.start + mark.length, mark.ref));
    }
    if (changed.has('active') || changed.has('marks')) {
      for (const mark of this.renderRoot.querySelectorAll('.mark')) {
        mark.classList.toggle('on', mark.dataset.ref === this.active);
      }
    }
  }

  onPointer(event) {
    const mark = event.target.closest('.mark');
    if (mark && mark.dataset.ref !== this.active) {
      this.dispatchEvent(new CustomEvent('mark-select', { detail: { ref: mark.dataset.ref }, bubbles: true, composed: true }));
    }
  }

  async copy() {
    await navigator.clipboard.writeText(this.text);
    this.copied = true;
    setTimeout(() => { this.copied = false; }, 1500);
  }
}

// Rouge on GitHub Pages predates PHP attributes and highlights `#[…]` as a comment
function fixPhpAttributes(pre) {
  if (!pre?.closest('.language-php')) {
    return;
  }
  for (const comment of pre.querySelectorAll('.c1')) {
    if (comment.textContent.startsWith('#[')) {
      comment.className = 'nd';
    }
  }
}

// Wraps the characters [start, end) below root, which may span several highlighted tokens
function wrapRange(root, start, end, ref) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const pieces = [];
  let offset = 0;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const length = node.textContent.length;
    const from = Math.max(start, offset);
    const to = Math.min(end, offset + length);
    if (from < to) {
      pieces.push({ node, from: from - offset, to: to - offset });
    }
    offset += length;
  }
  let last = null;
  for (const { node, from, to } of pieces) {
    const range = document.createRange();
    range.setStart(node, from);
    range.setEnd(node, to);
    const mark = document.createElement('span');
    mark.className = 'mark';
    mark.dataset.ref = ref;
    range.surroundContents(mark);
    last = mark;
  }
  if (last) {
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = ref;
    last.append(badge);
  }
}

// Wraps code rendered from Markdown at runtime (e.g. the stack panel) in <code-block>
export function upgradeCode(root) {
  for (const rouge of root.querySelectorAll('div.highlighter-rouge')) {
    // Fill the element before it is connected, connectedCallback() takes the <pre>
    const block = document.createElement('code-block');
    const [parent, next] = [rouge.parentNode, rouge.nextSibling];
    block.append(rouge);
    parent.insertBefore(block, next);
  }
}

customElements.define('code-block', CodeBlock);
