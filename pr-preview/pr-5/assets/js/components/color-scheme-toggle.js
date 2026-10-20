import { LitElement, css, html } from 'lit';

const storageKey = 'color-scheme';
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
const systemScheme = () => (systemDark.matches ? 'dark' : 'light');

/**
 * Toggles between "auto" (follow the system setting) and the opposite of the
 * current system setting, which then stays fixed, also when the system
 * setting changes, until the toggle returns to "auto". The fixed scheme is
 * stored per browser and applied as
 * <html data-color-scheme="light|dark">, which _sass/_base.scss evaluates;
 * an inline script in _layouts/default.html sets it before the page is
 * rendered.
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
    button[aria-pressed="true"] { border-color: var(--accent); color: var(--accent); }
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
    const label = this.fixed
      ? `Follow the system setting (${this.system} mode)`
      : `Use ${current === 'dark' ? 'light' : 'dark'} mode`;
    return html`
      <button type="button" aria-pressed=${this.fixed ? 'true' : 'false'}
        aria-label=${label} title=${label} @click=${this.toggle}>
        ${current === 'dark' ? sun : moon}
      </button>
    `;
  }

  toggle() {
    this.apply(this.fixed ? null : (this.system === 'dark' ? 'light' : 'dark'));
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

const sun = html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`;
const moon = html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

customElements.define('color-scheme-toggle', ColorSchemeToggle);
