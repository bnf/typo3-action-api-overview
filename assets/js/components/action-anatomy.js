import { LitElement, css, html } from 'lit';

/**
 * The annotated example action (_includes/sections/concept.html): a
 * <code-block> and one <anatomy-part> per highlighted part, linked both ways.
 * Side by side, only the selected part shows its explanation, so that the
 * list and the code end at the same height.
 */
export class ActionAnatomy extends LitElement {
  static properties = {
    active: { reflect: true },
  };

  static styles = css`
    :host { display: block; }
    .grid {
      display: grid;
      grid-template-columns: minmax(0, max-content) minmax(16rem, 1fr);
      gap: 20px;
    }
    .code { min-width: 0; }
    ::slotted(code-block) { --code-font-size: 13px; height: 100%; }
    .parts { display: grid; gap: 6px; align-content: start; }
    ::slotted(anatomy-part:not([active])) { --part-text-display: none; }
    @media (max-width: 1100px) {
      .grid { grid-template-columns: minmax(0, 1fr); }
      ::slotted(code-block) { height: auto; }
      ::slotted(anatomy-part:not([active])) { --part-text-display: block; }
    }
  `;

  constructor() {
    super();
    this.active = '1';
    this.addEventListener('mark-select', (event) => { this.active = event.detail.ref; });
    this.addEventListener('part-select', (event) => { this.active = event.detail.ref; });
  }

  get parts() {
    return [...this.querySelectorAll(':scope > anatomy-part')];
  }

  render() {
    return html`
      <div class="grid">
        <div class="code"><slot name="code"></slot></div>
        <div class="parts" role="list"><slot></slot></div>
      </div>
    `;
  }

  firstUpdated() {
    const code = this.querySelector(':scope > code-block');
    if (code) {
      code.marks = this.parts.map((part) => ({ ref: part.ref, match: part.match }));
    }
    this.resizeObserver = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width !== this.measuredWidth) {
        this.measuredWidth = entry.contentRect.width;
        this.reserveHeight();
      }
    });
    this.resizeObserver.observe(this);
    document.fonts.ready.then(() => this.reserveHeight());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.resizeObserver?.disconnect();
    this.measuredWidth = undefined;
  }

  // Side by side, the list keeps the height it has with the longest explanation
  // open, so that selecting another part does not move the rest of the page
  async reserveHeight() {
    const parts = this.parts;
    await Promise.all(parts.map((part) => part.updateComplete));
    const list = this.renderRoot.querySelector('.parts');
    list.style.minHeight = '';
    const columns = getComputedStyle(this.renderRoot.querySelector('.grid')).gridTemplateColumns.split(' ');
    if (columns.length < 2) {
      return;
    }
    const height = (part, display) => {
      part.style.setProperty('--part-text-display', display);
      const value = part.offsetHeight;
      part.style.removeProperty('--part-text-display');
      return value;
    };
    const collapsed = parts.map((part) => height(part, 'none'));
    const opened = parts.map((part) => height(part, 'block'));
    const gaps = parseFloat(getComputedStyle(list).rowGap) * (parts.length - 1);
    const longest = Math.max(...opened.map((value, index) => value - collapsed[index]));
    list.style.minHeight = `${collapsed.reduce((sum, value) => sum + value, 0) + gaps + longest}px`;
  }

  updated(changed) {
    if (changed.has('active')) {
      const code = this.querySelector(':scope > code-block');
      if (code) {
        code.active = this.active;
      }
      for (const part of this.parts) {
        part.active = part.ref === this.active;
      }
    }
  }
}

/**
 * One explained part of the action. Attributes: ref, heading, match (the
 * text in the code it explains). The explanation is the element's content,
 * hidden when --part-text-display is none.
 */
export class AnatomyPart extends LitElement {
  static properties = {
    ref: {},
    heading: {},
    match: {},
    active: { type: Boolean, reflect: true },
  };

  static styles = css`
    :host { display: block; }
    button {
      display: grid;
      grid-template-columns: 24px minmax(0, 1fr);
      gap: 12px;
      align-items: start;
      width: 100%;
      margin: 0;
      padding: 9px 14px;
      text-align: left;
      font: inherit;
      font-size: 15px;
      line-height: 1.5;
      color: var(--muted);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      cursor: pointer;
      transition: border-color .15s, background .15s;
    }
    button:hover { border-color: var(--accent); }
    button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    :host([active]) button { border-color: var(--accent); background: var(--accent-soft); }
    .badge {
      width: 24px;
      height: 24px;
      border-radius: 999px;
      background: var(--accent);
      color: #1d1f23;
      display: grid;
      place-items: center;
      font-size: 13px;
      font-weight: 700;
      line-height: 1;
    }
    .heading { display: block; color: var(--fg); font-weight: 700; font-size: 16px; line-height: 24px; }
    .text { display: var(--part-text-display, block); margin-top: 2px; }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'listitem');
  }

  render() {
    return html`
      <button type="button" aria-pressed=${this.active ? 'true' : 'false'}
        @click=${this.select} @focus=${this.select}>
        <span class="badge" aria-hidden="true">${this.ref}</span>
        <span><span class="heading">${this.heading}</span><span class="text"><slot></slot></span></span>
      </button>
    `;
  }

  select() {
    if (!this.active) {
      this.dispatchEvent(new CustomEvent('part-select', { detail: { ref: this.ref }, bubbles: true, composed: true }));
    }
  }
}

customElements.define('action-anatomy', ActionAnatomy);
customElements.define('anatomy-part', AnatomyPart);
