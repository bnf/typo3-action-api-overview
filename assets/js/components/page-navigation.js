import { LitElement, css, html } from 'lit';

/**
 * The table of contents in the sidebar (_layouts/default.html), built from the
 * h2 and h3 elements with an id in the element named by the attribute "for"
 * (a selector). It adds an anchor link to each heading, marks the section in
 * view, and opens and closes the sidebar on narrow screens through the button
 * with aria-controls set to the id of the sidebar.
 */
export class PageNavigation extends LitElement {
  static properties = {
    for: {},
    entries: { state: true },
    active: { state: true },
  };

  static styles = css`
    :host { display: block; }
    .label {
      font-size: var(--font-size-label, 13px);
      font-weight: 700;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: var(--muted);
      margin: 0 0 10px 12px;
    }
    ol { list-style: none; margin: 0; padding: 0; }
    a {
      display: block;
      padding: 6px 12px;
      border-radius: 8px;
      color: var(--fg);
      text-decoration: none;
      font-size: var(--font-size-text, 17px);
      line-height: 1.35;
      border-left: 3px solid transparent;
    }
    a:hover { background: var(--surface-2); }
    a:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
    a[aria-current] { background: var(--accent-soft); border-left-color: var(--accent); font-weight: 600; }
    .sub a { padding-left: 30px; font-size: var(--font-size-small, 15.5px); color: var(--muted); }
    .sub a[aria-current] { color: var(--fg); }
    .num { color: var(--muted); font-variant-numeric: tabular-nums; margin-right: 6px; }
  `;

  constructor() {
    super();
    this.entries = [];
    this.active = null;
    this.onScroll = () => {
      if (!this.scrollFrame) {
        this.scrollFrame = requestAnimationFrame(() => {
          this.scrollFrame = null;
          this.updateActive();
        });
      }
    };
    this.onToggle = () => this.setOpen(!document.body.classList.contains('nav-open'));
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.entries.length === 0) {
      this.readHeadings();
    }
    document.addEventListener('scroll', this.onScroll, { passive: true });
    this.toggleButton = this.closest('[id]') && document.querySelector(`[aria-controls="${this.closest('[id]').id}"]`);
    this.toggleButton?.addEventListener('click', this.onToggle);
    this.updateActive();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('scroll', this.onScroll);
    this.toggleButton?.removeEventListener('click', this.onToggle);
  }

  readHeadings() {
    const content = document.querySelector(this.for);
    let chapter = 0;
    for (const heading of content?.querySelectorAll('h2[id], h3[id]') ?? []) {
      const title = heading.textContent.trim();
      const anchor = Object.assign(document.createElement('a'), { className: 'anchor', href: `#${heading.id}`, textContent: '#' });
      anchor.setAttribute('aria-hidden', 'true');
      anchor.tabIndex = -1;
      heading.prepend(anchor);
      const main = heading.tagName === 'H2';
      if (main) {
        chapter++;
      }
      this.entries = [...this.entries, { heading, id: heading.id, title, number: main ? String(chapter).padStart(2, '0') : null }];
    }
  }

  updateActive() {
    let current = this.entries[0]?.id ?? null;
    for (const entry of this.entries) {
      if (entry.heading.getBoundingClientRect().top < 160) {
        current = entry.id;
      }
    }
    this.active = current;
  }

  render() {
    return html`
      <p class="label" id="label">Contents</p>
      <ol aria-labelledby="label" @click=${this.onNavigate}>
        ${this.entries.map((entry) => html`
          <li class=${entry.number ? '' : 'sub'}>
            <a href="#${entry.id}" aria-current=${entry.id === this.active ? 'location' : ''}>
              ${entry.number ? html`<span class="num">${entry.number}</span>` : ''}${entry.title}
            </a>
          </li>
        `)}
      </ol>
    `;
  }

  updated() {
    // aria-current="" is not a valid value, remove it from inactive links
    for (const link of this.renderRoot.querySelectorAll('a[aria-current=""]')) {
      link.removeAttribute('aria-current');
    }
  }

  onNavigate(event) {
    if (event.target.closest('a')) {
      this.setOpen(false);
    }
  }

  setOpen(open) {
    document.body.classList.toggle('nav-open', open);
    this.toggleButton?.setAttribute('aria-expanded', String(open));
  }
}

customElements.define('page-navigation', PageNavigation);
