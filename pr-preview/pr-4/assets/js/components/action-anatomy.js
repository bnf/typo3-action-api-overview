import { LitElement, css, html } from 'lit';

/**
 * The annotated example action (_includes/sections/concept.html): a
 * <code-block> and one <anatomy-part> per highlighted part, linked both ways.
 * The code stays in view while the parts are read.
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
      align-items: start;
    }
    .code {
      position: sticky;
      top: calc(var(--topbar-height, 56px) + 16px);
      min-width: 0;
    }
    ::slotted(code-block) { --code-font-size: 13px; }
    .parts { display: grid; gap: 8px; }
    @media (max-width: 1100px) {
      .grid { grid-template-columns: minmax(0, 1fr); }
      .code { position: static; }
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
 * text in the code it explains). The explanation is the element's content.
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
      width: 100%;
      margin: 0;
      padding: 12px 14px;
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
    .heading { display: block; color: var(--fg); font-weight: 700; font-size: 16px; line-height: 1.4; }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'listitem');
  }

  render() {
    return html`
      <button type="button" aria-pressed=${this.active ? 'true' : 'false'}
        @click=${this.select} @mouseenter=${this.select} @focus=${this.select}>
        <span class="badge" aria-hidden="true">${this.ref}</span>
        <span><span class="heading">${this.heading}</span><slot></slot></span>
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
