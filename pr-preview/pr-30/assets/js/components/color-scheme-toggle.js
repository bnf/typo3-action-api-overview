import { LitElement, css, html, svg } from 'lit';

const storageKey = 'color-scheme';
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
const systemScheme = () => (systemDark.matches ? 'dark' : 'light');

/**
 * Switches between light and dark, following the logic of the TYPO3 backend
 * (typo3-backend-color-scheme-switch): a click shows the other scheme; if
 * that is the current system setting, the page goes back to "auto" and
 * follows the system, otherwise the scheme is fixed and stays when the
 * system setting changes. A fixed scheme is stored per browser and applied
 * as <html data-color-scheme="light|dark">, which _sass/_base.scss
 * evaluates; an inline script in _layouts/default.html sets it before the
 * page is rendered.
 */
export class ColorSchemeToggle extends LitElement {
  static properties = {
    fixed: { state: true },
    system: { state: true },
  };

  static styles = css`
    :host { display: inline-block; }
    button {
      display: inline-grid;
      place-items: center;
      width: 34px;
      height: 34px;
      padding: 0;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: var(--surface);
      color: var(--muted);
      cursor: pointer;
      transition: border-color .15s, color .15s;
    }
    button:hover { border-color: var(--accent); color: var(--fg); }
    button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    svg { width: 18px; height: 18px; }
  `;

  constructor() {
    super();
    this.system = systemScheme();
    const fixed = document.documentElement.dataset.colorScheme;
    this.fixed = fixed === 'light' || fixed === 'dark' ? fixed : null;
    this.onSystemChange = () => { this.system = systemScheme(); };
  }

  connectedCallback() {
    super.connectedCallback();
    systemDark.addEventListener('change', this.onSystemChange);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    systemDark.removeEventListener('change', this.onSystemChange);
  }

  render() {
    const current = this.fixed ?? this.system;
    const setting = this.fixed ?? `auto (${this.system})`;
    const label = `The colour scheme is ${setting}. Switch to ${current === 'dark' ? 'light' : 'dark'}.`;
    return html`
      <button type="button" aria-label=${label} title=${label} @click=${this.toggle}>
        ${icons[this.fixed ?? 'auto']}
      </button>
    `;
  }

  toggle() {
    const next = (this.fixed ?? this.system) === 'dark' ? 'light' : 'dark';
    // Switching to the system setting means following the system again
    this.apply(next === this.system ? null : next);
  }

  apply(fixed) {
    this.fixed = fixed;
    if (fixed) {
      document.documentElement.dataset.colorScheme = fixed;
    } else {
      delete document.documentElement.dataset.colorScheme;
    }
    try {
      if (fixed) {
        localStorage.setItem(storageKey, fixed);
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch {
      // Storage may be unavailable (private mode); the choice then lasts for this page view
    }
  }
}

const icon = (content) => html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${content}</svg>`;
const icons = {
  auto: icon(svg`<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>`),
  light: icon(svg`<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>`),
  dark: icon(svg`<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`),
};

customElements.define('color-scheme-toggle', ColorSchemeToggle);
