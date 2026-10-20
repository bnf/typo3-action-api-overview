import { LitElement, css, html } from 'lit';
import { ZoomViewer } from './zoom-viewer.js';

const mermaidUrl = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';

// Mermaid themes for the light and dark colour scheme of the page, see _sass/_base.scss
const themes = {
  light: {
    primaryColor: '#fff3e6',
    primaryBorderColor: '#ff8700',
    primaryTextColor: '#1d1f23',
    lineColor: '#5c6370',
    secondaryColor: '#eef4ff',
    tertiaryColor: '#f6f7f9',
    clusterBkg: '#fafafb',
    clusterBorder: '#d5d8de',
    noteBkgColor: '#fff8d6',
    noteBorderColor: '#e8cf6a',
    noteTextColor: '#1d1f23',
    actorBkg: '#fff3e6',
    actorBorder: '#ff8700',
    actorTextColor: '#1d1f23',
    signalColor: '#3b4048',
    signalTextColor: '#1d1f23',
    labelBoxBkgColor: '#fff3e6',
    labelBoxBorderColor: '#ff8700',
    loopTextColor: '#1d1f23',
  },
  dark: {
    background: '#191c20',
    primaryColor: '#3a2611',
    primaryBorderColor: '#ff8700',
    primaryTextColor: '#e7e9ec',
    lineColor: '#9aa1ac',
    secondaryColor: '#172443',
    tertiaryColor: '#22262b',
    clusterBkg: '#22262b',
    clusterBorder: '#3a4048',
    noteBkgColor: '#3a3315',
    noteBorderColor: '#8a7a2a',
    noteTextColor: '#e7e9ec',
    actorBkg: '#3a2611',
    actorBorder: '#ff8700',
    actorTextColor: '#e7e9ec',
    signalColor: '#c9ced6',
    signalTextColor: '#e7e9ec',
    labelBoxBkgColor: '#3a2611',
    labelBoxBorderColor: '#ff8700',
    loopTextColor: '#e7e9ec',
  },
};

let mermaidLoader = null;
let queue = Promise.resolve();
let counter = 0;

// Mermaid keeps global configuration, so diagrams are rendered one after another
async function renderMermaid(source, scheme) {
  mermaidLoader ??= import(mermaidUrl).then((module) => module.default);
  const mermaid = await mermaidLoader;
  const result = queue.then(async () => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      fontFamily: '"Source Sans 3", sans-serif',
      themeVariables: { ...themes[scheme], fontSize: '16px' },
    });
    // Mermaid measures labels when rendering, so the web font has to be available first
    await document.fonts.load('400 16px "Source Sans 3"');
    await document.fonts.ready;
    return (await mermaid.render(`mermaid-${++counter}`, source)).svg;
  });
  queue = result.catch(() => {});
  return result;
}

const pageScheme = () => (getComputedStyle(document.documentElement).colorScheme.includes('dark') ? 'dark' : 'light');

/**
 * A Mermaid diagram from _data/deep_dive.json (_includes/sections/deep-dive.html).
 * The source is the text of the <pre> child, the caption the attribute caption.
 * Rendered in the colours of the current colour scheme and rendered again
 * when it changes. A click opens the zoom viewer.
 */
export class MermaidDiagram extends LitElement {
  static properties = {
    caption: {},
    failed: { state: true },
  };

  static styles = css`
    :host { display: block; margin: 1.4em 0; }
    figure {
      margin: 0;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius, 14px);
      box-shadow: var(--shadow);
      overflow: hidden;
    }
    .frame {
      display: block;
      width: 100%;
      min-height: 120px;
      margin: 0;
      padding: 20px;
      border: 0;
      background: var(--surface);
      cursor: zoom-in;
    }
    .frame:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
    .frame svg { display: block; margin: 0 auto; max-width: 100%; height: auto; }
    .error { color: var(--muted); font-size: var(--font-size-small, 15.5px); }
    figcaption {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 16px;
      border-top: 1px solid var(--border);
      color: var(--muted);
      font-size: var(--font-size-small, 15.5px);
    }
    .zoom {
      flex: none;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--fg);
      border-radius: 999px;
      padding: 2px 12px;
      font: 600 var(--font-size-label, 13px) "Source Sans 3", sans-serif;
      cursor: pointer;
    }
    .zoom:hover { border-color: var(--accent); }
  `;

  constructor() {
    super();
    this.failed = false;
    this.onSchemeChange = () => this.draw();
  }

  connectedCallback() {
    super.connectedCallback();
    this.source ??= this.querySelector(':scope > pre')?.textContent ?? '';
    this.schemeObserver = new MutationObserver(this.onSchemeChange);
    this.schemeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-color-scheme'] });
    this.systemScheme = window.matchMedia('(prefers-color-scheme: dark)');
    this.systemScheme.addEventListener('change', this.onSchemeChange);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.schemeObserver.disconnect();
    this.systemScheme.removeEventListener('change', this.onSchemeChange);
  }

  render() {
    return html`
      <figure>
        <button type="button" class="frame" aria-label="Enlarge diagram: ${this.caption}" @click=${this.zoom}>
          <div class="svg"></div>
          ${this.failed ? html`<span class="error">The diagram could not be loaded.</span>` : ''}
        </button>
        <figcaption>
          <span>${this.caption}</span>
          <button type="button" class="zoom" @click=${this.zoom}>Enlarge</button>
        </figcaption>
      </figure>
    `;
  }

  firstUpdated() {
    this.draw();
  }

  async draw() {
    const scheme = pageScheme();
    if (scheme === this.scheme) {
      return;
    }
    this.scheme = scheme;
    try {
      const svg = await renderMermaid(this.source, scheme);
      if (scheme === this.scheme) {
        this.failed = false;
        await this.updateComplete;
        this.renderRoot.querySelector('.svg').innerHTML = svg;
      }
    } catch (error) {
      console.error(error);
      this.failed = true;
    }
  }

  zoom() {
    const svg = this.renderRoot.querySelector('.svg svg');
    if (!svg) {
      return;
    }
    // A copy in the viewer's shadow root keeps the diagram's scoped styles
    const copy = svg.cloneNode(true);
    const viewBox = svg.viewBox.baseVal;
    copy.style.maxWidth = 'none';
    copy.style.width = `${viewBox.width}px`;
    copy.style.height = `${viewBox.height}px`;
    ZoomViewer.open(copy);
  }
}

customElements.define('mermaid-diagram', MermaidDiagram);
