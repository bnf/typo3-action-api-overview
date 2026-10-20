import { LitElement, css, html } from 'lit';

const storageKey = 'color-scheme';
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

/**
 * Toggles between "auto" (follow the system setting) and "inverse" (the
 * opposite of the system setting). The choice is stored per browser and
 * applied as <html data-color-scheme="inverse">, which _sass/_base.scss
 * evaluates; an inline script in _layouts/default.html sets it before the
 * page is rendered.
 */
export class ColorSchemeToggle extends LitElement {
  static properties = {
    mode: { state: true },
    dark: { state: true },
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
    this.mode = document.documentElement.dataset.colorScheme === 'inverse' ? 'inverse' : 'auto';
    this.dark = systemDark.matches !== (this.mode === 'inverse');
    this.onSystemChange = () => { this.dark = systemDark.matches !== (this.mode === 'inverse'); };
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
    const target = this.dark ? 'light' : 'dark';
    const label = this.mode === 'inverse'
      ? `Use ${target} mode (follow the system setting)`
      : `Use ${target} mode (opposite of the system setting)`;
    return html`
      <button type="button" aria-pressed=${this.mode === 'inverse' ? 'true' : 'false'}
        aria-label=${label} title=${label} @click=${this.toggle}>
        ${this.dark ? sun : moon}
      </button>
    `;
  }

  toggle() {
    this.mode = this.mode === 'inverse' ? 'auto' : 'inverse';
    this.dark = systemDark.matches !== (this.mode === 'inverse');
    if (this.mode === 'inverse') {
      document.documentElement.dataset.colorScheme = 'inverse';
    } else {
      delete document.documentElement.dataset.colorScheme;
    }
    try {
      if (this.mode === 'inverse') {
        localStorage.setItem(storageKey, 'inverse');
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
